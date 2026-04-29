import "server-only";

const BINANCE_BASE = "https://api.binance.com/api/v3";
const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
const CACHE_TTL_MS = 5_000;

interface CacheEntry {
  expiresAt: number;
  usd: number;
}

// Cache keyed by token symbol (e.g. "ETH"), not by exchange-specific pair.
const cache = new Map<string, CacheEntry>();

// Fallback symbol → CoinGecko id mapping. Used when Binance is unreachable
// (e.g. api.binance.com is geo-blocked from US server regions and returns 451).
const COINGECKO_BY_SYMBOL: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "binancecoin",
  SOL: "solana",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  AVAX: "avalanche-2",
  LINK: "chainlink",
  TON: "the-open-network",
  USDT: "tether",
  USDC: "usd-coin",
  TRX: "tron",
  DOT: "polkadot",
  MATIC: "matic-network",
  POL: "polygon-ecosystem-token",
  LTC: "litecoin",
  BCH: "bitcoin-cash",
};

interface BinanceTickerResponse {
  symbol: string;
  price: string;
}

const fetchFromBinance = async (
  shadowSymbols: string[],
): Promise<Record<string, number>> => {
  if (shadowSymbols.length === 0) return {};
  const url = new URL(`${BINANCE_BASE}/ticker/price`);
  url.searchParams.set("symbols", JSON.stringify(shadowSymbols));

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Binance HTTP ${res.status}`);

  const json = (await res.json()) as BinanceTickerResponse[];
  const out: Record<string, number> = {};
  for (const row of json) {
    const usd = Number(row.price);
    if (isFinite(usd) && usd > 0) out[row.symbol] = usd;
  }
  return out;
};

const fetchFromCoinGecko = async (
  ids: string[],
): Promise<Record<string, number>> => {
  if (ids.length === 0) return {};
  const params = new URLSearchParams({
    ids: ids.join(","),
    vs_currencies: "usd",
  });
  const res = await fetch(`${COINGECKO_BASE}/simple/price?${params.toString()}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);

  const json = (await res.json()) as Record<string, { usd?: number }>;
  const out: Record<string, number> = {};
  for (const id of ids) {
    const usd = json[id]?.usd;
    if (typeof usd === "number" && usd > 0) out[id] = usd;
  }
  return out;
};

interface TokenPriceLookup {
  symbol: string;
  shadowSymbol?: string | null;
}

/**
 * Resolves live USD prices keyed by token symbol (e.g. "ETH").
 *
 * Strategy: try Binance via shadowSymbol first. For anything missing
 * (Binance unreachable, geoblocked, or symbol unmapped), fall back to
 * CoinGecko keyed by a hardcoded base-symbol → CoinGecko-id map.
 *
 * Stablecoin shadow_symbol pairs like USDCUSDT return ~1.0 (USDC priced in
 * USDT) which is close enough to USD. The fallback for those goes through
 * CoinGecko using the actual token symbol (USDT → tether, USDC → usd-coin).
 */
export const getLiveUsdPrices = async (
  tokens: TokenPriceLookup[],
): Promise<Record<string, number>> => {
  if (tokens.length === 0) return {};
  const now = Date.now();

  const result: Record<string, number> = {};
  const remaining: TokenPriceLookup[] = [];

  for (const t of tokens) {
    const hit = cache.get(t.symbol);
    if (hit && hit.expiresAt > now) {
      result[t.symbol] = hit.usd;
    } else {
      remaining.push(t);
    }
  }

  if (remaining.length === 0) return result;

  // Try Binance for those with a shadowSymbol.
  const binanceCandidates = remaining.filter(
    (t): t is { symbol: string; shadowSymbol: string } => Boolean(t.shadowSymbol),
  );
  let binancePrices: Record<string, number> = {};
  if (binanceCandidates.length > 0) {
    try {
      binancePrices = await fetchFromBinance(
        binanceCandidates.map((t) => t.shadowSymbol),
      );
    } catch {
      binancePrices = {};
    }
  }

  for (const t of binanceCandidates) {
    const usd = binancePrices[t.shadowSymbol];
    if (typeof usd === "number" && usd > 0) {
      result[t.symbol] = usd;
      cache.set(t.symbol, { usd, expiresAt: now + CACHE_TTL_MS });
    }
  }

  // CoinGecko fallback for whatever is still missing.
  const stillMissing = remaining.filter((t) => result[t.symbol] == null);
  const idsToFetch: string[] = [];
  const idToSymbol: Record<string, string> = {};
  for (const t of stillMissing) {
    const id = COINGECKO_BY_SYMBOL[t.symbol.toUpperCase()];
    if (id && !idToSymbol[id]) {
      idsToFetch.push(id);
      idToSymbol[id] = t.symbol;
    }
  }

  if (idsToFetch.length > 0) {
    try {
      const cgPrices = await fetchFromCoinGecko(idsToFetch);
      for (const [id, usd] of Object.entries(cgPrices)) {
        const sym = idToSymbol[id];
        if (sym && typeof usd === "number" && usd > 0) {
          result[sym] = usd;
          cache.set(sym, { usd, expiresAt: now + CACHE_TTL_MS });
        }
      }
    } catch {
      // Both sources unreachable — caller will fall back to base_price_cents.
    }
  }

  return result;
};

/**
 * Convenience: resolve a single price by token symbol + optional shadow.
 */
export const getLiveUsdPrice = async (
  symbol: string,
  shadowSymbol?: string | null,
): Promise<number | null> => {
  const map = await getLiveUsdPrices([{ symbol, shadowSymbol }]);
  return map[symbol] ?? null;
};

/**
 * @deprecated Kept for callers that still pass raw shadow symbols. Resolves
 * ETHUSDT → ETH via the standard mapping then uses the unified resolver.
 */
export const getBinanceUsdPrices = async (
  shadowSymbols: string[],
): Promise<Record<string, number>> => {
  // Strip trailing USDT/USDC quote and treat remainder as base symbol.
  const lookups: TokenPriceLookup[] = [];
  const symbolFromShadow = (shadow: string): string => {
    if (shadow.endsWith("USDT")) return shadow.slice(0, -4);
    if (shadow.endsWith("USDC")) return shadow.slice(0, -4);
    return shadow;
  };
  const shadowBySymbol: Record<string, string> = {};
  for (const s of shadowSymbols) {
    const base = symbolFromShadow(s);
    if (!shadowBySymbol[base]) {
      shadowBySymbol[base] = s;
      lookups.push({ symbol: base, shadowSymbol: s });
    }
  }

  const bySymbol = await getLiveUsdPrices(lookups);
  const out: Record<string, number> = {};
  for (const [sym, usd] of Object.entries(bySymbol)) {
    const shadow = shadowBySymbol[sym];
    if (shadow) out[shadow] = usd;
  }
  return out;
};

export const getBinanceUsdPrice = async (
  shadowSymbol: string,
): Promise<number | null> => {
  const map = await getBinanceUsdPrices([shadowSymbol]);
  return map[shadowSymbol] ?? null;
};
