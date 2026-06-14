import "server-only";
import { ApiClientError } from "@/lib/api/client";
import { getOptionalServerEnv } from "@/lib/env/server";
import { findTopCoin } from "@/lib/markets/top-coins";
import {
  createPreviewAdminTradePeriod,
  createPreviewAdminToken,
  deletePreviewAdminTradePeriod,
  deletePreviewAdminToken,
  listPreviewAdminTradePeriods,
  listPreviewAdminTokens,
  updatePreviewAdminTradePeriod,
  updatePreviewAdminToken,
  updatePreviewAdminTokenIconPath,
} from "@/lib/markets/preview-data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  adminTradePeriodSchema,
  adminTradePeriodsResultSchema,
  adminTokenSchema,
  adminTokensResultSchema,
  deleteAdminTradePeriodResultSchema,
  deleteAdminTokenResultSchema,
  upsertAdminTradePeriodInputSchema,
  upsertAdminTokenInputSchema,
} from "@/schemas/market";
import type {
  AdminToken,
  AdminTokensResult,
  AdminTradePeriod,
  AdminTradePeriodsResult,
  DeleteAdminTokenResult,
  DeleteAdminTradePeriodResult,
} from "@/types/market";

interface AdminTokenRow {
  base_price_cents: number | string;
  created_at: string;
  feed_source: "synthetic" | "shadow" | "replay" | "frozen";
  icon_path: string | null;
  id: string;
  is_enabled: boolean;
  last_price_cents: number | string | null;
  last_shadow_price_cents: number | string | null;
  name: string;
  price_offset_cents: number | string;
  price_scale: number | string;
  shadow_symbol: string | null;
  symbol: string;
  updated_at: string;
  volatility_factor: number | string;
  decimals: number | string | null;
  min_deposit: number | string | null;
  min_swap: number | string | null;
  coingecko_id: string | null;
  min_withdrawal: number | string | null;
}

interface AdminTradePeriodRow {
  created_at: string;
  duration_seconds: number | string;
  id: string;
  is_enabled: boolean;
  label: string;
  max_amount_cents: number | string;
  min_amount_cents: number | string;
  payout_bps: number | string;
  payout_min_bps: number | string | null;
  payout_max_bps: number | string | null;
  updated_at: string;
}

const toNumber = (value: number | string | null | undefined) => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    return Number(value);
  }

  return 0;
};

const toIsoZ = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString();
};

const mapAdminTokenRow = (row: AdminTokenRow, withdrawFeeBps: number): AdminToken =>
  adminTokenSchema.parse({
    basePriceCents: Math.round(toNumber(row.base_price_cents)),
    createdAt: toIsoZ(row.created_at),
    feedSource: row.feed_source,
    iconPath: row.icon_path,
    id: row.id,
    isEnabled: row.is_enabled,
    lastPriceCents: row.last_price_cents ? Math.round(toNumber(row.last_price_cents)) : null,
    lastShadowPriceCents: row.last_shadow_price_cents
      ? Math.round(toNumber(row.last_shadow_price_cents))
      : null,
    name: row.name,
    priceOffsetCents: Math.round(toNumber(row.price_offset_cents)),
    priceScale: Number(toNumber(row.price_scale).toFixed(6)),
    shadowSymbol: row.shadow_symbol,
    symbol: row.symbol,
    updatedAt: toIsoZ(row.updated_at),
    volatilityFactor: Number(toNumber(row.volatility_factor).toFixed(4)),
    decimals: row.decimals != null ? Math.round(toNumber(row.decimals)) : 8,
    minDeposit: toNumber(row.min_deposit),
    minSwap: toNumber(row.min_swap),
    coingeckoId: row.coingecko_id ?? null,
    minWithdrawal: toNumber(row.min_withdrawal),
    withdrawFeeBps,
  });

const mapAdminTradePeriodRow = (row: AdminTradePeriodRow): AdminTradePeriod => {
  const minBps = row.payout_min_bps != null ? Math.round(toNumber(row.payout_min_bps)) : Math.round(toNumber(row.payout_bps));
  const maxBps = row.payout_max_bps != null ? Math.round(toNumber(row.payout_max_bps)) : Math.round(toNumber(row.payout_bps));
  return adminTradePeriodSchema.parse({
    createdAt: toIsoZ(row.created_at),
    durationSeconds: Math.round(toNumber(row.duration_seconds)),
    id: row.id,
    isEnabled: row.is_enabled,
    label: row.label,
    maxAmountCents: Math.round(toNumber(row.max_amount_cents)),
    minAmountCents: Math.round(toNumber(row.min_amount_cents)),
    payoutBps: Math.round(toNumber(row.payout_bps)),
    payoutMinBps: minBps,
    payoutMaxBps: maxBps,
    updatedAt: toIsoZ(row.updated_at),
  });
};

const selectAdminTokenFields =
  "id, symbol, name, icon_path, feed_source, base_price_cents, shadow_symbol, price_scale, price_offset_cents, volatility_factor, is_enabled, last_price_cents, last_shadow_price_cents, created_at, updated_at, decimals, min_deposit, min_swap, coingecko_id, min_withdrawal";

const fetchGlobalWithdrawFeeBps = async (
  client: ReturnType<typeof createSupabaseAdminClient>,
): Promise<number> => {
  const { data } = await client.from("app_config").select("withdraw_fee_bps").maybeSingle();
  return data?.withdraw_fee_bps != null
    ? Math.round(toNumber(data.withdraw_fee_bps as number | string))
    : 0;
};
const selectAdminTradePeriodFields =
  "id, label, duration_seconds, min_amount_cents, max_amount_cents, payout_bps, payout_min_bps, payout_max_bps, is_enabled, created_at, updated_at";

export const listAdminTokens = async (): Promise<AdminTokensResult> => {
  if (!getOptionalServerEnv()) {
    return listPreviewAdminTokens();
  }

  const adminClient = createSupabaseAdminClient();
  const [tokensRes, withdrawFeeBps] = await Promise.all([
    adminClient.from("tokens").select(selectAdminTokenFields).order("symbol", { ascending: true }),
    fetchGlobalWithdrawFeeBps(adminClient),
  ]);

  if (tokensRes.error) {
    throw new ApiClientError(tokensRes.error.message, 500, "ADMIN_TOKENS_FETCH_FAILED", tokensRes.error);
  }

  return adminTokensResultSchema.parse({
    items: (tokensRes.data ?? []).map((row) => mapAdminTokenRow(row as AdminTokenRow, withdrawFeeBps)),
  });
};

export const createAdminToken = async (payload: unknown): Promise<AdminToken> => {
  const input = upsertAdminTokenInputSchema.parse(payload);

  if (!getOptionalServerEnv()) {
    return createPreviewAdminToken(input);
  }

  const adminClient = createSupabaseAdminClient();
  const { data, error } = await adminClient
    .from("tokens")
    .insert({
      base_price_cents: input.basePriceCents,
      feed_source: input.feedSource,
      icon_path: input.iconPath,
      is_enabled: input.isEnabled,
      name: input.name,
      price_offset_cents: input.priceOffsetCents,
      price_scale: input.priceScale,
      shadow_symbol: input.shadowSymbol,
      symbol: input.symbol,
      volatility_factor: input.volatilityFactor,
      decimals: input.decimals,
      min_deposit: input.minDeposit,
      min_swap: input.minSwap,
      coingecko_id: input.coingeckoId,
      min_withdrawal: input.minWithdrawal,
    })
    .select(selectAdminTokenFields)
    .single();

  if (error) {
    throw new ApiClientError(error.message, 500, "ADMIN_TOKEN_CREATE_FAILED", error);
  }

  const withdrawFeeBps = await fetchGlobalWithdrawFeeBps(adminClient);
  return mapAdminTokenRow(data as AdminTokenRow, withdrawFeeBps);
};

export const updateAdminToken = async (id: string, payload: unknown): Promise<AdminToken> => {
  const input = upsertAdminTokenInputSchema.parse(payload);

  if (!getOptionalServerEnv()) {
    return updatePreviewAdminToken(id, input);
  }

  const adminClient = createSupabaseAdminClient();
  const { data, error } = await adminClient
    .from("tokens")
    .update({
      base_price_cents: input.basePriceCents,
      feed_source: input.feedSource,
      icon_path: input.iconPath,
      is_enabled: input.isEnabled,
      name: input.name,
      price_offset_cents: input.priceOffsetCents,
      price_scale: input.priceScale,
      shadow_symbol: input.shadowSymbol,
      symbol: input.symbol,
      volatility_factor: input.volatilityFactor,
      decimals: input.decimals,
      min_deposit: input.minDeposit,
      min_swap: input.minSwap,
      coingecko_id: input.coingeckoId,
      min_withdrawal: input.minWithdrawal,
    })
    .eq("id", id)
    .select(selectAdminTokenFields)
    .maybeSingle();

  if (error) {
    throw new ApiClientError(error.message, 500, "ADMIN_TOKEN_UPDATE_FAILED", error);
  }

  if (!data) {
    throw new ApiClientError("Token not found.", 404, "TOKEN_NOT_FOUND");
  }

  const withdrawFeeBps = await fetchGlobalWithdrawFeeBps(adminClient);
  return mapAdminTokenRow(data as AdminTokenRow, withdrawFeeBps);
};

export const updateAdminTokenIconPath = async (
  symbol: string,
  iconPath: string | null,
): Promise<void> => {
  if (!getOptionalServerEnv()) {
    updatePreviewAdminTokenIconPath(symbol, iconPath);
    return;
  }

  const upperSymbol = symbol.toUpperCase();
  const adminClient = createSupabaseAdminClient();

  const { data: existing, error: lookupError } = await adminClient
    .from("tokens")
    .select("id")
    .eq("symbol", upperSymbol)
    .maybeSingle();

  if (lookupError) {
    throw new ApiClientError(lookupError.message, 500, "ADMIN_TOKEN_LOOKUP_FAILED", lookupError);
  }

  if (existing?.id) {
    const { error } = await adminClient
      .from("tokens")
      .update({ icon_path: iconPath })
      .eq("id", existing.id);
    if (error) {
      throw new ApiClientError(error.message, 500, "ADMIN_TOKEN_ICON_UPDATE_FAILED", error);
    }
    return;
  }

  const coin = findTopCoin(upperSymbol);
  const { error } = await adminClient.from("tokens").insert({
    base_price_cents: 100,
    feed_source: coin?.binanceSymbol ? "shadow" : "synthetic",
    icon_path: iconPath,
    is_enabled: true,
    name: coin?.name ?? upperSymbol,
    price_offset_cents: 0,
    price_scale: 1,
    shadow_symbol: coin?.binanceSymbol ? coin.binanceSymbol.toUpperCase() : null,
    symbol: upperSymbol,
    volatility_factor: 1,
  });

  if (error) {
    throw new ApiClientError(error.message, 500, "ADMIN_TOKEN_ICON_INSERT_FAILED", error);
  }
};

export const deleteAdminToken = async (id: string): Promise<DeleteAdminTokenResult> => {
  if (!getOptionalServerEnv()) {
    return deletePreviewAdminToken(id);
  }

  const adminClient = createSupabaseAdminClient();
  const { data, error } = await adminClient.from("tokens").delete().eq("id", id).select("id").maybeSingle();

  if (error) {
    throw new ApiClientError(error.message, 500, "ADMIN_TOKEN_DELETE_FAILED", error);
  }

  if (!data?.id) {
    throw new ApiClientError("Token not found.", 404, "TOKEN_NOT_FOUND");
  }

  return deleteAdminTokenResultSchema.parse({
    id: data.id,
  });
};

export const listAdminTradePeriods = async (): Promise<AdminTradePeriodsResult> => {
  if (!getOptionalServerEnv()) {
    return listPreviewAdminTradePeriods();
  }

  const adminClient = createSupabaseAdminClient();
  const { data, error } = await adminClient
    .from("trade_periods")
    .select(selectAdminTradePeriodFields)
    .order("duration_seconds", { ascending: true });

  if (error) {
    throw new ApiClientError(error.message, 500, "ADMIN_PERIODS_FETCH_FAILED", error);
  }

  return adminTradePeriodsResultSchema.parse({
    items: (data ?? []).map((row) => mapAdminTradePeriodRow(row as AdminTradePeriodRow)),
  });
};

export const createAdminTradePeriod = async (payload: unknown): Promise<AdminTradePeriod> => {
  const input = upsertAdminTradePeriodInputSchema.parse(payload);

  if (!getOptionalServerEnv()) {
    return createPreviewAdminTradePeriod(input);
  }

  const adminClient = createSupabaseAdminClient();
  const midpointBps = Math.round((input.payoutMinBps + input.payoutMaxBps) / 2);
  const { data, error } = await adminClient
    .from("trade_periods")
    .insert({
      duration_seconds: input.durationSeconds,
      is_enabled: input.isEnabled,
      label: input.label,
      max_amount_cents: input.maxAmountCents,
      min_amount_cents: input.minAmountCents,
      payout_bps: midpointBps,
      payout_min_bps: input.payoutMinBps,
      payout_max_bps: input.payoutMaxBps,
    })
    .select(selectAdminTradePeriodFields)
    .single();

  if (error) {
    throw new ApiClientError(error.message, 500, "ADMIN_PERIOD_CREATE_FAILED", error);
  }

  return mapAdminTradePeriodRow(data as AdminTradePeriodRow);
};

export const updateAdminTradePeriod = async (
  id: string,
  payload: unknown,
): Promise<AdminTradePeriod> => {
  const input = upsertAdminTradePeriodInputSchema.parse(payload);

  if (!getOptionalServerEnv()) {
    return updatePreviewAdminTradePeriod(id, input);
  }

  const adminClient = createSupabaseAdminClient();
  const midpointBps = Math.round((input.payoutMinBps + input.payoutMaxBps) / 2);
  const { data, error } = await adminClient
    .from("trade_periods")
    .update({
      duration_seconds: input.durationSeconds,
      is_enabled: input.isEnabled,
      label: input.label,
      max_amount_cents: input.maxAmountCents,
      min_amount_cents: input.minAmountCents,
      payout_bps: midpointBps,
      payout_min_bps: input.payoutMinBps,
      payout_max_bps: input.payoutMaxBps,
    })
    .eq("id", id)
    .select(selectAdminTradePeriodFields)
    .maybeSingle();

  if (error) {
    throw new ApiClientError(error.message, 500, "ADMIN_PERIOD_UPDATE_FAILED", error);
  }

  if (!data) {
    throw new ApiClientError("Trade period not found.", 404, "TRADE_PERIOD_NOT_FOUND");
  }

  return mapAdminTradePeriodRow(data as AdminTradePeriodRow);
};

export const deleteAdminTradePeriod = async (
  id: string,
): Promise<DeleteAdminTradePeriodResult> => {
  if (!getOptionalServerEnv()) {
    return deletePreviewAdminTradePeriod(id);
  }

  const adminClient = createSupabaseAdminClient();
  const { data, error } = await adminClient
    .from("trade_periods")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new ApiClientError(error.message, 500, "ADMIN_PERIOD_DELETE_FAILED", error);
  }

  if (!data?.id) {
    throw new ApiClientError("Trade period not found.", 404, "TRADE_PERIOD_NOT_FOUND");
  }

  return deleteAdminTradePeriodResultSchema.parse({
    id: data.id,
  });
};
