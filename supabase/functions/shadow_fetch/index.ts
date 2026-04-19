/**
 * shadow_fetch — long-lived Supabase Edge Function
 *
 * Subscribes to Binance public WebSocket (miniTicker stream for all symbols).
 * For each enabled token with feed_source = 'shadow' or 'replay', applies the
 * configured scale + offset to get the shadow price, then writes it back into
 * tokens.last_shadow_price_cents.
 *
 * Invoked once and kept alive via Deno Deploy's long-lived worker pattern.
 * The Supabase scheduler (cron) calls this every 30s as a keepalive; the
 * WebSocket itself does the heavy lifting between ticks.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BINANCE_WS_URL = "wss://stream.binance.com:9443/ws/!miniTicker@arr";

interface BinanceMiniTicker {
  s: string; // symbol e.g. BTCUSDT
  c: string; // close price (string)
}

interface TokenRow {
  id: string;
  symbol: string;
  shadow_symbol: string | null;
  feed_source: string;
  price_scale: number;
  price_offset_cents: number;
  base_price_cents: number;
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function loadShadowTokens(): Promise<TokenRow[]> {
  const { data, error } = await db
    .from("tokens")
    .select("id, symbol, shadow_symbol, feed_source, price_scale, price_offset_cents, base_price_cents")
    .eq("is_enabled", true)
    .in("feed_source", ["shadow", "replay"]);

  if (error) {
    console.error("[shadow_fetch] Failed to load tokens:", error.message);
    return [];
  }

  return (data ?? []) as TokenRow[];
}

function applyShadow(rawPriceUsd: number, token: TokenRow): number {
  const rawCents = Math.round(rawPriceUsd * 100);
  const scaled = Math.round(rawCents * token.price_scale);
  return Math.max(scaled + token.price_offset_cents, 1);
}

async function updateShadowPrice(tokenId: string, shadowPriceCents: number): Promise<void> {
  const { error } = await db
    .from("tokens")
    .update({
      last_shadow_price_cents: shadowPriceCents,
      last_shadow_at: new Date().toISOString(),
    })
    .eq("id", tokenId);

  if (error) {
    console.error(`[shadow_fetch] Failed to update token ${tokenId}:`, error.message);
  }
}

let shadowTokens: TokenRow[] = [];
let tokensByShadowSymbol = new Map<string, TokenRow[]>();

async function refreshTokenIndex(): Promise<void> {
  shadowTokens = await loadShadowTokens();
  tokensByShadowSymbol = new Map();

  for (const token of shadowTokens) {
    if (!token.shadow_symbol) continue;
    const existing = tokensByShadowSymbol.get(token.shadow_symbol) ?? [];
    existing.push(token);
    tokensByShadowSymbol.set(token.shadow_symbol, existing);
  }
}

async function connectAndListen(): Promise<void> {
  await refreshTokenIndex();

  let reconnectDelayMs = 1000;
  const maxDelayMs = 30_000;

  const connect = () => {
    const ws = new WebSocket(BINANCE_WS_URL);

    ws.onopen = () => {
      console.log("[shadow_fetch] Binance WS connected");
      reconnectDelayMs = 1000;
    };

    ws.onmessage = async (event) => {
      try {
        const tickers: BinanceMiniTicker[] = JSON.parse(event.data);

        const updates: Promise<void>[] = [];

        for (const ticker of tickers) {
          const tokens = tokensByShadowSymbol.get(ticker.s);
          if (!tokens?.length) continue;

          const rawPrice = parseFloat(ticker.c);
          if (!isFinite(rawPrice) || rawPrice <= 0) continue;

          for (const token of tokens) {
            const shadowCents = applyShadow(rawPrice, token);
            updates.push(updateShadowPrice(token.id, shadowCents));
          }
        }

        await Promise.allSettled(updates);
      } catch (err) {
        console.error("[shadow_fetch] Message parse error:", err);
      }
    };

    ws.onerror = (err) => {
      console.error("[shadow_fetch] WS error:", err);
    };

    ws.onclose = () => {
      console.warn(`[shadow_fetch] WS closed — reconnecting in ${reconnectDelayMs}ms`);
      setTimeout(() => {
        reconnectDelayMs = Math.min(reconnectDelayMs * 2, maxDelayMs);
        connect();
      }, reconnectDelayMs);
    };
  };

  connect();

  // Refresh token index every 5 minutes so new tokens are picked up
  setInterval(() => {
    refreshTokenIndex().catch(console.error);
  }, 5 * 60 * 1000);
}

Deno.serve(async () => {
  connectAndListen().catch(console.error);
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
