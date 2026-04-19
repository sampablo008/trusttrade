/**
 * tick_candles — runs every 1 second via Supabase pg_cron.
 *
 * For each enabled token, generates one OHLC candle second and upserts it into
 * candles_1s. Price is derived from:
 *   - feed_source = 'shadow'  → last_shadow_price_cents (+ micro-ticks)
 *   - feed_source = 'synthetic' → Ornstein-Uhlenbeck mean-reversion + jumps
 *   - feed_source = 'replay'  → read next row from candle_replay_bank
 *   - feed_source = 'frozen'  → skip
 *
 * Volume is proportional to the candle range with multiplicative jitter.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface TokenRow {
  base_price_cents: number;
  drift_bias_bps: number;
  feed_source: "synthetic" | "shadow" | "replay" | "frozen";
  freeze_price_cents: number | null;
  id: string;
  last_price_cents: number | null;
  last_shadow_price_cents: number | null;
  symbol: string;
  volatility_factor: number;
}

interface ReplayRow {
  close_cents: number;
  high_cents: number;
  low_cents: number;
  open_cents: number;
  volume: number;
}

// Seeded pseudo-random for deterministic micro-tick generation per token+second
function seededRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s ^ (s << 13)) | 0;
    s = (s ^ (s >>> 17)) | 0;
    s = (s ^ (s << 5)) | 0;
    return ((s >>> 0) / 4294967296);
  };
}

function gaussianPair(rng: () => number): [number, number] {
  const u = 1 - rng();
  const v = rng();
  const mag = Math.sqrt(-2 * Math.log(Math.max(u, 1e-10)));
  return [mag * Math.cos(2 * Math.PI * v), mag * Math.sin(2 * Math.PI * v)];
}

function generateSyntheticCandle(
  token: TokenRow,
  nowSec: number,
): { open: number; high: number; low: number; close: number; volume: number } {
  const base = token.last_price_cents ?? token.base_price_cents;
  const rng = seededRng(nowSec ^ token.id.charCodeAt(0) * 7919);
  const [z1, z2] = gaussianPair(rng);

  const drift = (token.drift_bias_bps / 10000) * base * 0.001;
  const sigma = base * 0.0012 * token.volatility_factor;
  const close = Math.max(Math.round(base + drift + sigma * z1), 1);
  const wickFactor = Math.abs(z2) * 0.0004 * base;

  const rawHigh = Math.round(Math.max(base, close) + wickFactor * (0.5 + rng() * 0.5));
  const rawLow = Math.max(Math.round(Math.min(base, close) - wickFactor * (0.5 + rng() * 0.5)), 1);

  const range = rawHigh - rawLow;
  const volumeBase = (token.base_price_cents / 100) * token.volatility_factor;
  const volume = Number((volumeBase * (1 + (range / Math.max(base, 1)) * 150) * (0.7 + rng() * 0.6)).toFixed(4));

  return { open: base, high: rawHigh, low: rawLow, close, volume };
}

function generateShadowCandle(
  token: TokenRow,
  nowSec: number,
): { open: number; high: number; low: number; close: number; volume: number } {
  const target = token.last_shadow_price_cents ?? token.last_price_cents ?? token.base_price_cents;
  const prev = token.last_price_cents ?? target;
  const rng = seededRng(nowSec ^ (token.id.charCodeAt(1) ?? 31) * 6271);

  const close = Math.max(target, 1);
  const wickFactor = Math.abs(target - prev) * 0.15 + prev * 0.0003 * token.volatility_factor;

  const rawHigh = Math.round(Math.max(prev, close) + wickFactor * (0.3 + rng() * 0.4));
  const rawLow = Math.max(Math.round(Math.min(prev, close) - wickFactor * (0.3 + rng() * 0.4)), 1);
  const range = rawHigh - rawLow;
  const volume = Number(((target / 100) * token.volatility_factor * (1 + (range / Math.max(target, 1)) * 120) * (0.8 + rng() * 0.5)).toFixed(4));

  return { open: prev, high: rawHigh, low: rawLow, close, volume };
}

async function getReplayCandle(tokenId: string): Promise<ReplayRow | null> {
  // Read current replay cursor
  const { data: stateRow } = await db
    .from("token_replay_state")
    .select("cursor_index, replay_speed, status")
    .eq("token_id", tokenId)
    .maybeSingle();

  if (!stateRow || stateRow.status !== "running") return null;

  const cursorIndex = stateRow.cursor_index as number;

  const { data: candleRow } = await db
    .from("candle_replay_bank")
    .select("open_cents, high_cents, low_cents, close_cents, volume")
    .eq("token_id", tokenId)
    .eq("row_index", cursorIndex)
    .maybeSingle();

  if (!candleRow) {
    // End of replay — stop
    await db.from("token_replay_state").update({ status: "ended" }).eq("token_id", tokenId);
    return null;
  }

  // Advance cursor
  await db
    .from("token_replay_state")
    .update({ cursor_index: cursorIndex + (stateRow.replay_speed as number ?? 1) })
    .eq("token_id", tokenId);

  return candleRow as ReplayRow;
}

async function tickToken(token: TokenRow, nowSec: number): Promise<void> {
  const bucketStart = new Date(nowSec * 1000).toISOString();

  let candle: { open: number; high: number; low: number; close: number; volume: number };

  if (token.feed_source === "frozen") return;

  if (token.feed_source === "replay") {
    const replayCandle = await getReplayCandle(token.id);
    if (!replayCandle) return;
    candle = {
      open: replayCandle.open_cents,
      high: replayCandle.high_cents,
      low: replayCandle.low_cents,
      close: replayCandle.close_cents,
      volume: replayCandle.volume,
    };
  } else if (token.feed_source === "shadow") {
    candle = generateShadowCandle(token, nowSec);
  } else {
    candle = generateSyntheticCandle(token, nowSec);
  }

  const { error: upsertError } = await db.from("candles_1s").upsert(
    {
      bucket_start: bucketStart,
      close_cents: candle.close,
      high_cents: candle.high,
      low_cents: candle.low,
      open_cents: candle.open,
      token_id: token.id,
      volume: candle.volume,
    },
    { onConflict: "token_id,bucket_start" },
  );

  if (upsertError) {
    console.error(`[tick_candles] candles_1s upsert failed for ${token.symbol}:`, upsertError.message);
    return;
  }

  await db
    .from("tokens")
    .update({ last_price_cents: candle.close, last_price_at: bucketStart })
    .eq("id", token.id);
}

Deno.serve(async () => {
  const nowSec = Math.floor(Date.now() / 1000);

  const { data: tokens, error } = await db
    .from("tokens")
    .select(
      "id, symbol, feed_source, base_price_cents, last_price_cents, last_shadow_price_cents, volatility_factor, drift_bias_bps, freeze_price_cents",
    )
    .eq("is_enabled", true)
    .neq("feed_source", "frozen");

  if (error) {
    console.error("[tick_candles] Failed to load tokens:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  await Promise.allSettled((tokens ?? []).map((t) => tickToken(t as TokenRow, nowSec)));

  return new Response(JSON.stringify({ ok: true, ticked: tokens?.length ?? 0, at: nowSec }), {
    headers: { "Content-Type": "application/json" },
  });
});
