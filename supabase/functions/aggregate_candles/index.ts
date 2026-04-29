/**
 * aggregate_candles — single cron that powers all stored candle data.
 *
 * Runs once per minute via pg_cron. Per invocation:
 *   1. For each enabled token with a shadow_symbol, pulls the most recent
 *      ~10 one-minute klines from Binance and upserts them into candles_1m.
 *   2. Rolls candles_1m → candles_5m / 15m / 1h / 4h / 1d for the same window.
 *   3. Updates tokens.last_price_cents + last_shadow_price_cents from the
 *      latest close, so server-side readers (placeTrade fallback, wallet,
 *      admin) always see fresh data without any high-frequency cron.
 *
 * NOT in scope: candles_1s. Sub-minute charting is expected to use Binance
 * WebSocket directly from the client; we deliberately don't store 1s bars
 * to avoid the ~2M-writes/day cost of the previous tick_candles design.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BINANCE_KLINES = "https://api.binance.com/api/v3/klines";

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface TokenRow {
  id: string;
  symbol: string;
  shadow_symbol: string | null;
  price_scale: number;
  price_offset_cents: number;
}

const ROLLUPS: { table: string; seconds: number }[] = [
  { table: "candles_5m", seconds: 300 },
  { table: "candles_15m", seconds: 900 },
  { table: "candles_1h", seconds: 3600 },
  { table: "candles_4h", seconds: 14400 },
  { table: "candles_1d", seconds: 86400 },
];

interface OHLCV {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function applyShadow(
  rawCents: number,
  scale: number,
  offsetCents: number,
): number {
  return Math.max(Math.round(rawCents * scale) + offsetCents, 1);
}

async function fetchBinance1m(symbol: string, limit = 10): Promise<
  Array<{ openTime: number; open: number; high: number; low: number; close: number; volume: number }>
> {
  const url = `${BINANCE_KLINES}?symbol=${encodeURIComponent(symbol)}&interval=1m&limit=${limit}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Binance klines ${symbol} HTTP ${res.status}`);
  const rows = (await res.json()) as Array<
    [number, string, string, string, string, string, ...unknown[]]
  >;
  return rows.map((r) => ({
    openTime: r[0],
    open: parseFloat(r[1]),
    high: parseFloat(r[2]),
    low: parseFloat(r[3]),
    close: parseFloat(r[4]),
    volume: parseFloat(r[5]),
  }));
}

async function processToken(token: TokenRow): Promise<void> {
  if (!token.shadow_symbol) return;

  const klines = await fetchBinance1m(token.shadow_symbol, 10);
  if (klines.length === 0) return;

  const oneMinuteRows = klines.map((k) => ({
    bucket_start: new Date(k.openTime).toISOString(),
    open_cents: applyShadow(Math.round(k.open * 100), token.price_scale, token.price_offset_cents),
    high_cents: applyShadow(Math.round(k.high * 100), token.price_scale, token.price_offset_cents),
    low_cents: applyShadow(Math.round(k.low * 100), token.price_scale, token.price_offset_cents),
    close_cents: applyShadow(Math.round(k.close * 100), token.price_scale, token.price_offset_cents),
    volume: k.volume,
    token_id: token.id,
    source: "binance",
  }));

  const { error: upsert1mErr } = await db
    .from("candles_1m")
    .upsert(oneMinuteRows, { onConflict: "token_id,bucket_start" });
  if (upsert1mErr) {
    console.error(`[aggregate_candles] candles_1m upsert ${token.symbol}:`, upsert1mErr.message);
    return;
  }

  // Roll up to higher timeframes from the same in-memory window.
  for (const tf of ROLLUPS) {
    const buckets = new Map<number, OHLCV>();
    for (const row of oneMinuteRows) {
      const t = new Date(row.bucket_start).getTime();
      const bucketMs = Math.floor(t / (tf.seconds * 1000)) * (tf.seconds * 1000);
      const existing = buckets.get(bucketMs);
      if (!existing) {
        buckets.set(bucketMs, {
          open: row.open_cents,
          high: row.high_cents,
          low: row.low_cents,
          close: row.close_cents,
          volume: row.volume,
        });
      } else {
        existing.high = Math.max(existing.high, row.high_cents);
        existing.low = Math.min(existing.low, row.low_cents);
        existing.close = row.close_cents;
        existing.volume += row.volume;
      }
    }

    if (buckets.size === 0) continue;

    const rollupRows = Array.from(buckets.entries()).map(([bucketMs, o]) => ({
      bucket_start: new Date(bucketMs).toISOString(),
      open_cents: o.open,
      high_cents: o.high,
      low_cents: o.low,
      close_cents: o.close,
      volume: o.volume,
      token_id: token.id,
      source: "binance",
    }));

    const { error: tfErr } = await db
      .from(tf.table)
      .upsert(rollupRows, { onConflict: "token_id,bucket_start" });
    if (tfErr) {
      console.error(`[aggregate_candles] ${tf.table} upsert ${token.symbol}:`, tfErr.message);
    }
  }

  // Refresh tokens.last_price_cents / last_shadow_price_cents from the latest close.
  const lastClose = oneMinuteRows[oneMinuteRows.length - 1].close_cents;
  const nowIso = new Date().toISOString();
  await db
    .from("tokens")
    .update({
      last_price_cents: lastClose,
      last_price_at: nowIso,
      last_shadow_price_cents: lastClose,
      last_shadow_at: nowIso,
    })
    .eq("id", token.id);
}

Deno.serve(async () => {
  try {
    const { data: tokens, error } = await db
      .from("tokens")
      .select("id, symbol, shadow_symbol, price_scale, price_offset_cents")
      .eq("is_enabled", true)
      .in("feed_source", ["shadow", "replay"]);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    const results = await Promise.allSettled(
      (tokens ?? []).map((t) => processToken(t as TokenRow)),
    );
    const failed = results.filter((r) => r.status === "rejected").length;

    return new Response(
      JSON.stringify({
        ok: true,
        tokens: tokens?.length ?? 0,
        failed,
        at: new Date().toISOString(),
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[aggregate_candles] error:", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
