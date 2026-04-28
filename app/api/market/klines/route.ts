import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BINANCE_HOSTS = [
  "https://data-api.binance.vision",
  "https://api.binance.com",
  "https://api1.binance.com",
  "https://api2.binance.com",
  "https://api3.binance.com",
];

const ALLOWED_INTERVALS = new Set([
  "1s", "1m", "3m", "5m", "15m", "30m",
  "1h", "2h", "4h", "6h", "8h", "12h",
  "1d", "3d", "1w", "1M",
]);

const INTERVAL_MS: Record<string, number> = {
  "1s": 1_000,
  "1m": 60_000,
  "3m": 3 * 60_000,
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "30m": 30 * 60_000,
  "1h": 60 * 60_000,
  "2h": 2 * 60 * 60_000,
  "4h": 4 * 60 * 60_000,
  "6h": 6 * 60 * 60_000,
  "8h": 8 * 60 * 60_000,
  "12h": 12 * 60 * 60_000,
  "1d": 24 * 60 * 60_000,
  "3d": 3 * 24 * 60 * 60_000,
  "1w": 7 * 24 * 60 * 60_000,
  "1M": 30 * 24 * 60 * 60_000,
};

const PAGE_SIZE = 1000;
const MAX_LIMIT = 10000;
const MIN_TTL_MS = 5_000;
const MAX_TTL_MS = 5 * 60_000;

interface CacheEntry {
  data: unknown[][];
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function ttlFor(interval: string): number {
  const intervalMs = INTERVAL_MS[interval] ?? 60_000;
  return Math.max(MIN_TTL_MS, Math.min(intervalMs / 2, MAX_TTL_MS));
}

async function fetchPage(
  host: string,
  symbol: string,
  interval: string,
  limit: number,
  endTime?: number,
): Promise<unknown[][] | null> {
  const params = new URLSearchParams({
    symbol,
    interval,
    limit: String(limit),
  });
  if (endTime !== undefined) params.set("endTime", String(endTime));

  try {
    const upstream = await fetch(`${host}/api/v3/klines?${params}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!upstream.ok) return null;
    return (await upstream.json()) as unknown[][];
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") ?? "").toUpperCase();
  const interval = searchParams.get("interval") ?? "1m";
  const limitRaw = Number(searchParams.get("limit") ?? "500");
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), MAX_LIMIT)
    : 500;

  if (!/^[A-Z0-9]{3,20}$/.test(symbol)) {
    return Response.json({ error: "invalid symbol" }, { status: 400 });
  }
  if (!ALLOWED_INTERVALS.has(interval)) {
    return Response.json({ error: "invalid interval" }, { status: 400 });
  }

  const cacheKey = `${symbol}:${interval}:${limit}`;
  const now = Date.now();
  const hit = cache.get(cacheKey);
  if (hit && hit.expiresAt > now) {
    return Response.json(hit.data, {
      headers: {
        "Cache-Control": "no-store",
        "X-Cache": "HIT",
      },
    });
  }

  // Probe hosts with the first page; reuse the first working host for subsequent pages.
  let workingHost: string | null = null;
  let firstPage: unknown[][] | null = null;
  for (const host of BINANCE_HOSTS) {
    const page = await fetchPage(host, symbol, interval, Math.min(limit, PAGE_SIZE));
    if (page) {
      workingHost = host;
      firstPage = page;
      break;
    }
  }

  if (!workingHost || !firstPage) {
    if (hit) {
      // Serve stale on upstream failure rather than a hard error.
      return Response.json(hit.data, {
        headers: { "Cache-Control": "no-store", "X-Cache": "STALE" },
      });
    }
    return Response.json({ error: "upstream unavailable" }, { status: 502 });
  }

  const candles = firstPage.slice();
  let remaining = limit - candles.length;

  while (remaining > 0 && candles.length > 0) {
    const earliestOpenTime = candles[0][0] as number;
    const pageLimit = Math.min(remaining, PAGE_SIZE);
    const page = await fetchPage(
      workingHost,
      symbol,
      interval,
      pageLimit,
      earliestOpenTime - 1,
    );
    if (!page || page.length === 0) break;
    candles.unshift(...page);
    remaining -= page.length;
  }

  cache.set(cacheKey, { data: candles, expiresAt: now + ttlFor(interval) });

  return Response.json(candles, {
    headers: {
      "Cache-Control": "no-store",
      "X-Cache": "MISS",
    },
  });
}
