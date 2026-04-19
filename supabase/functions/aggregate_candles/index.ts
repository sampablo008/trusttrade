/**
 * aggregate_candles — runs every 1 minute via Supabase pg_cron.
 *
 * Rolls up candles_1s → candles_1m, _5m, _15m, _1h, _4h, _1d.
 * Each invocation processes the last 2 minutes of 1s candles to handle
 * any late-arriving rows from tick_candles.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const TIMEFRAMES: { table: string; seconds: number }[] = [
  { table: "candles_1m", seconds: 60 },
  { table: "candles_5m", seconds: 300 },
  { table: "candles_15m", seconds: 900 },
  { table: "candles_1h", seconds: 3600 },
  { table: "candles_4h", seconds: 14400 },
  { table: "candles_1d", seconds: 86400 },
];

async function aggregateForToken(
  tokenId: string,
  lookbackSec: number,
  tf: { table: string; seconds: number },
): Promise<void> {
  const since = new Date(Date.now() - lookbackSec * 1000).toISOString();

  const { data: rows, error } = await db
    .from("candles_1s")
    .select("bucket_start, open_cents, high_cents, low_cents, close_cents, volume")
    .eq("token_id", tokenId)
    .gte("bucket_start", since)
    .order("bucket_start", { ascending: true });

  if (error || !rows?.length) return;

  // Group by bucket
  const buckets = new Map<
    number,
    { open: number; high: number; low: number; close: number; volume: number }
  >();

  for (const row of rows) {
    const t = new Date(row.bucket_start as string).getTime();
    const bucket = Math.floor(t / (tf.seconds * 1000)) * (tf.seconds * 1000);

    const existing = buckets.get(bucket);
    if (!existing) {
      buckets.set(bucket, {
        open: row.open_cents as number,
        high: row.high_cents as number,
        low: row.low_cents as number,
        close: row.close_cents as number,
        volume: Number(row.volume),
      });
    } else {
      existing.high = Math.max(existing.high, row.high_cents as number);
      existing.low = Math.min(existing.low, row.low_cents as number);
      existing.close = row.close_cents as number;
      existing.volume += Number(row.volume);
    }
  }

  if (!buckets.size) return;

  const upsertRows = Array.from(buckets.entries()).map(([bucketMs, ohlcv]) => ({
    bucket_start: new Date(bucketMs).toISOString(),
    close_cents: ohlcv.close,
    high_cents: ohlcv.high,
    low_cents: ohlcv.low,
    open_cents: ohlcv.open,
    source: "aggregate",
    token_id: tokenId,
    volume: ohlcv.volume,
  }));

  const { error: upsertError } = await db
    .from(tf.table)
    .upsert(upsertRows, { onConflict: "token_id,bucket_start" });

  if (upsertError) {
    console.error(`[aggregate_candles] ${tf.table} upsert failed for ${tokenId}:`, upsertError.message);
  }
}

Deno.serve(async () => {
  const { data: tokens, error } = await db
    .from("tokens")
    .select("id, symbol")
    .eq("is_enabled", true);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const tokenIds = (tokens ?? []).map((t) => t.id as string);
  const tasks: Promise<void>[] = [];

  for (const tokenId of tokenIds) {
    for (const tf of TIMEFRAMES) {
      const lookback = tf.seconds * 3;
      tasks.push(aggregateForToken(tokenId, lookback, tf));
    }
  }

  await Promise.allSettled(tasks);

  return new Response(
    JSON.stringify({ ok: true, tokens: tokenIds.length, timeframes: TIMEFRAMES.length }),
    { headers: { "Content-Type": "application/json" } },
  );
});
