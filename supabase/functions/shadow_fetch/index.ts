/**
 * shadow_fetch — Binance REST poller.
 *
 * Invoked by pg_cron every ~5s. Each invocation:
 *   1. Loads enabled tokens with feed_source in ('shadow','replay').
 *   2. Batches their shadow_symbols into a single Binance /ticker/price call.
 *   3. Applies the per-token scale + offset and writes the result into
 *      tokens.last_shadow_price_cents / last_shadow_at.
 *
 * Why REST and not WebSocket: Edge Functions are short-lived and isolated
 * per invocation — long-lived WebSockets stack up across cold starts and are
 * killed unpredictably. A simple poller is deterministic and idempotent.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BINANCE_TICKER_URL = "https://api.binance.com/api/v3/ticker/price";

interface TokenRow {
  id: string;
  symbol: string;
  shadow_symbol: string | null;
  feed_source: string;
  price_scale: number;
  price_offset_cents: number;
  base_price_cents: number;
}

interface BinanceTicker {
  symbol: string;
  price: string;
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function loadShadowTokens(): Promise<TokenRow[]> {
  const { data, error } = await db
    .from("tokens")
    .select(
      "id, symbol, shadow_symbol, feed_source, price_scale, price_offset_cents, base_price_cents",
    )
    .eq("is_enabled", true)
    .in("feed_source", ["shadow", "replay"]);

  if (error) {
    console.error("[shadow_fetch] Failed to load tokens:", error.message);
    return [];
  }
  return (data ?? []) as TokenRow[];
}

async function fetchBinancePrices(
  symbols: string[],
): Promise<Map<string, number>> {
  if (symbols.length === 0) return new Map();
  const url = `${BINANCE_TICKER_URL}?symbols=${encodeURIComponent(JSON.stringify(symbols))}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`Binance ticker HTTP ${res.status}`);
  }
  const rows = (await res.json()) as BinanceTicker[];
  const out = new Map<string, number>();
  for (const r of rows) {
    const price = parseFloat(r.price);
    if (isFinite(price) && price > 0) out.set(r.symbol, price);
  }
  return out;
}

function applyShadow(rawPriceUsd: number, token: TokenRow): number {
  const rawCents = Math.round(rawPriceUsd * 100);
  const scaled = Math.round(rawCents * token.price_scale);
  return Math.max(scaled + token.price_offset_cents, 1);
}

Deno.serve(async () => {
  try {
    const tokens = await loadShadowTokens();
    const symbols = [
      ...new Set(
        tokens
          .map((t) => t.shadow_symbol)
          .filter((s): s is string => Boolean(s)),
      ),
    ];

    const prices = await fetchBinancePrices(symbols);
    const nowIso = new Date().toISOString();

    const updates = tokens
      .filter((t) => t.shadow_symbol && prices.has(t.shadow_symbol))
      .map((t) => {
        const usd = prices.get(t.shadow_symbol!)!;
        const cents = applyShadow(usd, t);
        return db
          .from("tokens")
          .update({ last_shadow_price_cents: cents, last_shadow_at: nowIso })
          .eq("id", t.id);
      });

    const results = await Promise.allSettled(updates);
    const failed = results.filter((r) => r.status === "rejected").length;

    return new Response(
      JSON.stringify({
        ok: true,
        updated: results.length - failed,
        failed,
        at: nowIso,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[shadow_fetch] error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
