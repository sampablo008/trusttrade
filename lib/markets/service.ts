import "server-only";
import { ApiClientError } from "@/lib/api/client";
import { getOptionalServerEnv } from "@/lib/env/server";
import { getPreviewCandles, getPreviewMarketTokens, getPreviewTradePeriods } from "@/lib/markets/preview-data";
import { getLiveUsdPrices } from "@/lib/markets/live-prices";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { publicCandlesQuerySchema, publicCandlesResultSchema, publicTokenSchema, publicTokensResultSchema, publicTradePeriodSchema, publicTradePeriodsResultSchema } from "@/schemas/market";
import type { ChartTimeframeValue, PublicCandle, PublicCandlesResult, PublicTokensResult, PublicTradePeriodsResult } from "@/types/market";
import { formatCompactUsd } from "@/lib/utils/format";

interface TokenRow {
  base_price_cents: number | string;
  feed_source: "synthetic" | "shadow" | "replay" | "frozen";
  icon_path: string | null;
  id: string;
  is_enabled: boolean;
  last_price_at: string | null;
  last_price_cents: number | string | null;
  last_shadow_price_cents: number | string | null;
  name: string;
  price_offset_cents: number | string;
  price_scale: number | string;
  shadow_symbol: string | null;
  symbol: string;
  volatility_factor: number | string;
  decimals: number | string | null;
  min_deposit: number | string | null;
  swap_fee_bps: number | string | null;
  min_withdrawal: number | string | null;
  withdraw_fee_bps: number | string | null;
}

interface TradePeriodRow {
  duration_seconds: number | string;
  id: string;
  is_enabled: boolean;
  label: string;
  max_amount_cents: number | string;
  min_amount_cents: number | string;
  payout_bps: number | string;
}

interface CandleRow {
  bucket_start: string;
  close_cents: number | string;
  high_cents: number | string;
  low_cents: number | string;
  open_cents: number | string;
  volume: number | string | null;
}

const directCandleTables: Partial<Record<ChartTimeframeValue, string>> = {
  "1d": "candles_1d",
  "1h": "candles_1h",
  "1m": "candles_1m",
  "1s": "candles_1s",
  "4h": "candles_4h",
  "5m": "candles_5m",
  "15m": "candles_15m",
};

const toNumber = (value: number | string | null | undefined) => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    return Number(value);
  }

  return 0;
};

const aggregateCandles = (rows: CandleRow[], bucketSeconds: number): PublicCandle[] => {
  const candlesByBucket = new Map<string, PublicCandle>();
  const sortedRows = [...rows].sort((left, right) =>
    left.bucket_start.localeCompare(right.bucket_start),
  );

  for (const row of sortedRows) {
    const bucketStartMs =
      Math.floor(new Date(row.bucket_start).getTime() / (bucketSeconds * 1000)) *
      bucketSeconds *
      1000;
    const key = new Date(bucketStartMs).toISOString();
    const openCents = toNumber(row.open_cents);
    const closeCents = toNumber(row.close_cents);
    const highCents = toNumber(row.high_cents);
    const lowCents = toNumber(row.low_cents);
    const volume = toNumber(row.volume);
    const existing = candlesByBucket.get(key);

    if (!existing) {
      candlesByBucket.set(key, {
        closeCents,
        highCents,
        lowCents,
        openCents,
        time: key,
        volume,
      });
      continue;
    }

    candlesByBucket.set(key, {
      closeCents,
      highCents: Math.max(existing.highCents, highCents),
      lowCents: Math.min(existing.lowCents, lowCents),
      openCents: existing.openCents,
      time: key,
      volume: Number((existing.volume + volume).toFixed(2)),
    });
  }

  return Array.from(candlesByBucket.values());
};

const mapLiveToken = (row: TokenRow, liveUsd?: number) => {
  const basePriceCents = toNumber(row.base_price_cents);
  const liveCents = liveUsd && liveUsd > 0 ? Math.round(liveUsd * 100) : 0;
  // Prefer a freshly-fetched live price, then DB-cached cron values, then
  // the configured base price as a last resort. The DB columns are stale
  // or NULL for many tokens because the cron only refreshes a subset.
  const priceCents =
    liveCents ||
    toNumber(row.last_price_cents) ||
    toNumber(row.last_shadow_price_cents) ||
    basePriceCents;
  const shadowOffsetPercent =
    (toNumber(row.price_scale) - 1) * 100 +
    (toNumber(row.price_offset_cents) / Math.max(basePriceCents, 1)) * 100;
  const dayChangePercent =
    ((priceCents - basePriceCents) / Math.max(basePriceCents, 1)) * 100;
  const volumeEstimateUsd = Math.max(
    priceCents * Math.max(toNumber(row.volatility_factor), 1) * 24,
    priceCents,
  );

  return publicTokenSchema.parse({
    dayChangePercent: Number(dayChangePercent.toFixed(2)),
    feedSource: row.feed_source,
    iconPath: row.icon_path,
    id: row.id,
    lastPriceAt: row.last_price_at,
    name: row.name,
    priceCents: Math.max(Math.round(priceCents), 1),
    shadowOffsetPercent: Number(shadowOffsetPercent.toFixed(2)),
    symbol: row.symbol,
    volumeLabel: formatCompactUsd(volumeEstimateUsd),
    decimals: row.decimals != null ? Math.round(toNumber(row.decimals)) : 8,
    minDeposit: toNumber(row.min_deposit),
    swapFeeBps: row.swap_fee_bps != null ? Math.round(toNumber(row.swap_fee_bps)) : 0,
    minWithdrawal: toNumber(row.min_withdrawal),
    withdrawFeeBps: row.withdraw_fee_bps != null ? Math.round(toNumber(row.withdraw_fee_bps)) : 0,
  });
};

export const listMarketTokens = async (): Promise<PublicTokensResult> => {
  if (!getOptionalServerEnv()) {
    return getPreviewMarketTokens();
  }

  const adminClient = createSupabaseAdminClient();
  const { data, error } = await adminClient
    .from("tokens")
    .select(
      "id, symbol, name, icon_path, feed_source, base_price_cents, last_price_cents, last_shadow_price_cents, last_price_at, price_scale, price_offset_cents, volatility_factor, is_enabled, decimals, min_deposit, swap_fee_bps, min_withdrawal, withdraw_fee_bps, shadow_symbol",
    )
    .eq("is_enabled", true)
    .order("symbol", { ascending: true });

  if (error) {
    throw new ApiClientError(error.message, 500, "MARKET_TOKENS_FETCH_FAILED", error);
  }

  if (!data?.length) {
    return getPreviewMarketTokens();
  }

  const rows = data as TokenRow[];

  // Refresh prices for every enabled token via Binance/CoinGecko. The function
  // has a 5s in-memory cache, so repeated page loads share the call. Failures
  // are swallowed inside getLiveUsdPrices and we fall back to DB values.
  const livePrices = await getLiveUsdPrices(
    rows.map((row) => ({ symbol: row.symbol, shadowSymbol: row.shadow_symbol })),
  );

  return publicTokensResultSchema.parse({
    items: rows.map((row) => mapLiveToken(row, livePrices[row.symbol])),
  });
};

export const listTradePeriods = async (): Promise<PublicTradePeriodsResult> => {
  if (!getOptionalServerEnv()) {
    return getPreviewTradePeriods();
  }

  const adminClient = createSupabaseAdminClient();
  const { data, error } = await adminClient
    .from("trade_periods")
    .select("id, label, duration_seconds, min_amount_cents, max_amount_cents, payout_bps, is_enabled")
    .eq("is_enabled", true)
    .order("duration_seconds", { ascending: true });

  if (error) {
    throw new ApiClientError(error.message, 500, "MARKET_PERIODS_FETCH_FAILED", error);
  }

  if (!data?.length) {
    return getPreviewTradePeriods();
  }

  return publicTradePeriodsResultSchema.parse({
    items: data.map((row) =>
      publicTradePeriodSchema.parse({
        durationSeconds: Math.round(toNumber((row as TradePeriodRow).duration_seconds)),
        id: (row as TradePeriodRow).id,
        isEnabled: Boolean((row as TradePeriodRow).is_enabled),
        label: (row as TradePeriodRow).label,
        maxAmountCents: Math.round(toNumber((row as TradePeriodRow).max_amount_cents)),
        minAmountCents: Math.round(toNumber((row as TradePeriodRow).min_amount_cents)),
        payoutBps: Math.round(toNumber((row as TradePeriodRow).payout_bps)),
      }),
    ),
  });
};

export const listCandles = async (query: unknown): Promise<PublicCandlesResult> => {
  const input = publicCandlesQuerySchema.parse(query);

  if (!getOptionalServerEnv()) {
    return getPreviewCandles(input.symbol, input.tf, input.limit);
  }

  const adminClient = createSupabaseAdminClient();
  const { data: tokenData, error: tokenError } = await adminClient
    .from("tokens")
    .select("id, symbol, is_enabled")
    .eq("symbol", input.symbol)
    .eq("is_enabled", true)
    .limit(1)
    .maybeSingle();

  if (tokenError) {
    throw new ApiClientError(tokenError.message, 500, "MARKET_TOKEN_LOOKUP_FAILED", tokenError);
  }

  if (!tokenData?.id) {
    return getPreviewCandles(input.symbol, input.tf, input.limit);
  }

  const tableName = directCandleTables[input.tf];

  if (!tableName) {
    const { data, error } = await adminClient
      .from("candles_1s")
      .select("bucket_start, open_cents, high_cents, low_cents, close_cents, volume")
      .eq("token_id", tokenData.id)
      .order("bucket_start", { ascending: false })
      .limit(input.limit * 15);

    if (error) {
      throw new ApiClientError(error.message, 500, "MARKET_CANDLES_FETCH_FAILED", error);
    }

    const aggregatedItems = aggregateCandles((data ?? []) as CandleRow[], 15).slice(-input.limit);

    if (!aggregatedItems.length) {
      return getPreviewCandles(input.symbol, input.tf, input.limit);
    }

    return publicCandlesResultSchema.parse({
      items: aggregatedItems,
      symbol: tokenData.symbol,
      timeframe: input.tf,
    });
  }

  const { data, error } = await adminClient
    .from(tableName)
    .select("bucket_start, open_cents, high_cents, low_cents, close_cents, volume")
    .eq("token_id", tokenData.id)
    .order("bucket_start", { ascending: false })
    .limit(input.limit);

  if (error) {
    throw new ApiClientError(error.message, 500, "MARKET_CANDLES_FETCH_FAILED", error);
  }

  if (!data?.length) {
    return getPreviewCandles(input.symbol, input.tf, input.limit);
  }

  return publicCandlesResultSchema.parse({
    items: [...(data as CandleRow[])].reverse().map((row) => ({
      closeCents: Math.round(toNumber(row.close_cents)),
      highCents: Math.round(toNumber(row.high_cents)),
      lowCents: Math.round(toNumber(row.low_cents)),
      openCents: Math.round(toNumber(row.open_cents)),
      time: new Date(row.bucket_start).toISOString(),
      volume: Number(toNumber(row.volume).toFixed(2)),
    })),
    symbol: tokenData.symbol,
    timeframe: input.tf,
  });
};
