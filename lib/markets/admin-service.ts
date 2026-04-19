import "server-only";
import { ApiClientError } from "@/lib/api/client";
import { getOptionalServerEnv } from "@/lib/env/server";
import {
  createPreviewAdminToken,
  deletePreviewAdminToken,
  listPreviewAdminTokens,
  updatePreviewAdminToken,
} from "@/lib/markets/preview-data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  adminTokenSchema,
  adminTokensResultSchema,
  deleteAdminTokenResultSchema,
  upsertAdminTokenInputSchema,
} from "@/schemas/market";
import type { AdminToken, AdminTokensResult, DeleteAdminTokenResult } from "@/types/market";

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

const mapAdminTokenRow = (row: AdminTokenRow): AdminToken =>
  adminTokenSchema.parse({
    basePriceCents: Math.round(toNumber(row.base_price_cents)),
    createdAt: row.created_at,
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
    updatedAt: row.updated_at,
    volatilityFactor: Number(toNumber(row.volatility_factor).toFixed(4)),
  });

const selectAdminTokenFields =
  "id, symbol, name, icon_path, feed_source, base_price_cents, shadow_symbol, price_scale, price_offset_cents, volatility_factor, is_enabled, last_price_cents, last_shadow_price_cents, created_at, updated_at";

export const listAdminTokens = async (): Promise<AdminTokensResult> => {
  if (!getOptionalServerEnv()) {
    return listPreviewAdminTokens();
  }

  const adminClient = createSupabaseAdminClient();
  const { data, error } = await adminClient
    .from("tokens")
    .select(selectAdminTokenFields)
    .order("symbol", { ascending: true });

  if (error) {
    throw new ApiClientError(error.message, 500, "ADMIN_TOKENS_FETCH_FAILED", error);
  }

  if (!data?.length) {
    return listPreviewAdminTokens();
  }

  return adminTokensResultSchema.parse({
    items: data.map((row) => mapAdminTokenRow(row as AdminTokenRow)),
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
    })
    .select(selectAdminTokenFields)
    .single();

  if (error) {
    throw new ApiClientError(error.message, 500, "ADMIN_TOKEN_CREATE_FAILED", error);
  }

  return mapAdminTokenRow(data as AdminTokenRow);
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

  return mapAdminTokenRow(data as AdminTokenRow);
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
