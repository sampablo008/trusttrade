import "server-only";
import { ApiClientError } from "@/lib/api/client";

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
const CACHE_TTL_MS = 60_000;
const REDIS_TTL_SECONDS = 60;
const REDIS_KEY_PREFIX = "tp:price:usd:";

interface CacheEntry {
  expiresAt: number;
  usd: number;
}

const cache = new Map<string, CacheEntry>();

type RedisClient = {
  mget: (...keys: string[]) => Promise<(string | number | null)[]>;
  set: (key: string, value: string, opts: { ex: number }) => Promise<unknown>;
};

let redis: RedisClient | null = null;
let redisInitialized = false;

const getRedis = async (): Promise<RedisClient | null> => {
  if (redisInitialized) return redis;
  redisInitialized = true;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const { Redis } = await import("@upstash/redis");
  redis = new Redis({ url, token }) as unknown as RedisClient;
  return redis;
};

const readFromRedis = async (
  ids: string[],
): Promise<Record<string, number>> => {
  const client = await getRedis();
  if (!client || ids.length === 0) return {};
  try {
    const values = await client.mget(...ids.map((id) => REDIS_KEY_PREFIX + id));
    const out: Record<string, number> = {};
    ids.forEach((id, idx) => {
      const raw = values[idx];
      if (raw == null) return;
      const num = typeof raw === "number" ? raw : Number(raw);
      if (Number.isFinite(num) && num > 0) out[id] = num;
    });
    return out;
  } catch (err) {
    console.error("[markets/prices] redis mget failed, falling back", err);
    return {};
  }
};

const writeToRedis = async (entries: Record<string, number>): Promise<void> => {
  const client = await getRedis();
  if (!client) return;
  const keys = Object.keys(entries);
  if (keys.length === 0) return;
  try {
    await Promise.all(
      keys.map((id) =>
        client.set(REDIS_KEY_PREFIX + id, String(entries[id]), {
          ex: REDIS_TTL_SECONDS,
        }),
      ),
    );
  } catch (err) {
    console.error("[markets/prices] redis set failed, ignoring", err);
  }
};

const previewUsdPrices: Record<string, number> = {
  bitcoin: 65_000,
  ethereum: 3_200,
  binancecoin: 580,
  ripple: 0.55,
  solana: 145,
  dogecoin: 0.13,
  cardano: 0.45,
  "avalanche-2": 32,
  chainlink: 14,
  "the-open-network": 5.6,
  tether: 1,
  "usd-coin": 1,
};

const previewPrice = (id: string): number => previewUsdPrices[id] ?? 1;

const fetchFromCoinGecko = async (ids: string[]): Promise<Record<string, number>> => {
  const params = new URLSearchParams({
    ids: ids.join(","),
    vs_currencies: "usd",
  });

  const res = await fetch(`${COINGECKO_BASE}/simple/price?${params.toString()}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new ApiClientError(
      `CoinGecko price fetch failed (${res.status})`,
      502,
      "PRICE_FEED_FAILED",
    );
  }

  const json = (await res.json()) as Record<string, { usd?: number }>;
  const out: Record<string, number> = {};
  for (const id of ids) {
    const usd = json[id]?.usd;
    if (typeof usd === "number" && usd > 0) {
      out[id] = usd;
    }
  }
  return out;
};

export const getUsdPrices = async (
  coingeckoIds: string[],
): Promise<Record<string, number>> => {
  const unique = [...new Set(coingeckoIds.filter(Boolean))];
  if (unique.length === 0) return {};

  const now = Date.now();
  const fresh: Record<string, number> = {};
  const missing: string[] = [];

  for (const id of unique) {
    const hit = cache.get(id);
    if (hit && hit.expiresAt > now) {
      fresh[id] = hit.usd;
    } else {
      missing.push(id);
    }
  }

  if (missing.length === 0) return fresh;

  const redisHits = await readFromRedis(missing);
  const stillMissing: string[] = [];
  for (const id of missing) {
    const usd = redisHits[id];
    if (usd != null) {
      cache.set(id, { usd, expiresAt: now + CACHE_TTL_MS });
      fresh[id] = usd;
    } else {
      stillMissing.push(id);
    }
  }

  if (stillMissing.length === 0) return fresh;

  let fetched: Record<string, number> = {};
  try {
    fetched = await fetchFromCoinGecko(stillMissing);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      for (const id of stillMissing) {
        fresh[id] = previewPrice(id);
      }
      return fresh;
    }
    throw err;
  }

  for (const id of stillMissing) {
    const usd = fetched[id];
    if (usd != null) {
      cache.set(id, { usd, expiresAt: now + CACHE_TTL_MS });
      fresh[id] = usd;
    }
  }

  await writeToRedis(fetched);

  return fresh;
};

export const getUsdPrice = async (coingeckoId: string): Promise<number> => {
  const map = await getUsdPrices([coingeckoId]);
  const usd = map[coingeckoId];
  if (usd == null) {
    throw new ApiClientError(
      `No USD price available for ${coingeckoId}.`,
      502,
      "PRICE_UNAVAILABLE",
    );
  }
  return usd;
};

export const usdToCents = (usd: number): number => Math.round(usd * 100);

export const nativeToUsdCents = (nativeAmount: number, usdPrice: number): number =>
  Math.round(nativeAmount * usdPrice * 100);
