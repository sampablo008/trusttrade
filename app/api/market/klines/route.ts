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

export async function GET(req: NextRequest): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") ?? "").toUpperCase();
  const interval = searchParams.get("interval") ?? "1m";
  const limitRaw = Number(searchParams.get("limit") ?? "500");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 1000) : 500;

  if (!/^[A-Z0-9]{3,20}$/.test(symbol)) {
    return Response.json({ error: "invalid symbol" }, { status: 400 });
  }
  if (!ALLOWED_INTERVALS.has(interval)) {
    return Response.json({ error: "invalid interval" }, { status: 400 });
  }

  for (const host of BINANCE_HOSTS) {
    try {
      const upstream = await fetch(
        `${host}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
        { cache: "no-store", signal: AbortSignal.timeout(5000) },
      );
      if (!upstream.ok) continue;
      const data = (await upstream.json()) as unknown[];
      return Response.json(data, {
        headers: { "Cache-Control": "no-store" },
      });
    } catch {
      // try next host
    }
  }

  return Response.json({ error: "upstream unavailable" }, { status: 502 });
}
