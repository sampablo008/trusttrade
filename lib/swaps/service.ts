import "server-only";
import { ApiClientError } from "@/lib/api/client";
import { getOptionalServerEnv } from "@/lib/env/server";
import { getUsdPrices } from "@/lib/markets/prices";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { swapQuoteSchema, swapRecordSchema, swapsResultSchema } from "@/schemas/swap";
import type { ExecuteSwapInput, SwapQuote, SwapRecord, SwapsResult } from "@/types/swap";
import {
  previewExecuteSwap,
  previewListSwaps,
  previewQuoteSwap,
} from "./preview-data";

interface SideContext {
  symbol: string;
  tokenId: string | null;
  decimals: number;
  swapFeeBps: number;
  coingeckoId: string | null;
  basePriceCents: number;
}

interface AppConfigRow {
  usd_swap_fee_bps: number | string | null;
}

interface TokenRow {
  id: string;
  symbol: string;
  decimals: number | string | null;
  swap_fee_bps: number | string | null;
  coingecko_id: string | null;
  base_price_cents: number | string;
}

interface SwapRow {
  id: string;
  user_id: string;
  from_symbol: string;
  to_symbol: string;
  from_token_id: string | null;
  to_token_id: string | null;
  from_amount: number | string;
  to_amount: number | string;
  fee_amount: number | string;
  fee_bps_applied: number | string;
  from_price_usd_cents: number | string;
  to_price_usd_cents: number | string;
  created_at: string;
}

const toNum = (v: number | string | null | undefined): number => {
  if (v == null) return 0;
  if (typeof v === "string") return Number(v);
  return v;
};

const buildSideContext = async (
  admin: ReturnType<typeof createSupabaseAdminClient>,
  symbol: string,
): Promise<SideContext> => {
  if (symbol === "USD") {
    const { data, error } = await admin
      .from("app_config")
      .select("usd_swap_fee_bps")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      throw new ApiClientError(error.message, 500, "CONFIG_FETCH_FAILED", error);
    }

    const cfg = (data ?? null) as AppConfigRow | null;
    return {
      symbol: "USD",
      tokenId: null,
      decimals: 2,
      swapFeeBps: toNum(cfg?.usd_swap_fee_bps),
      coingeckoId: null,
      basePriceCents: 100,
    };
  }

  const { data, error } = await admin
    .from("tokens")
    .select("id, symbol, decimals, swap_fee_bps, coingecko_id, base_price_cents")
    .eq("symbol", symbol)
    .maybeSingle();

  if (error) {
    throw new ApiClientError(error.message, 500, "TOKEN_FETCH_FAILED", error);
  }
  if (!data) {
    throw new ApiClientError(`Token ${symbol} not found.`, 404, "TOKEN_NOT_FOUND");
  }
  const row = data as TokenRow;
  return {
    symbol: row.symbol,
    tokenId: row.id,
    decimals: row.decimals != null ? Math.round(toNum(row.decimals)) : 8,
    swapFeeBps: row.swap_fee_bps != null ? Math.round(toNum(row.swap_fee_bps)) : 0,
    coingeckoId: row.coingecko_id ?? null,
    basePriceCents: Math.round(toNum(row.base_price_cents)),
  };
};

const resolveUsdPriceCents = async (side: SideContext): Promise<number> => {
  if (side.symbol === "USD") return 100;
  if (side.coingeckoId) {
    try {
      const prices = await getUsdPrices([side.coingeckoId]);
      const usd = prices[side.coingeckoId];
      if (usd != null && usd > 0) return Math.round(usd * 100);
    } catch {
      // fall through to base price
    }
  }
  if (side.basePriceCents <= 0) {
    throw new ApiClientError(
      `No USD price available for ${side.symbol}.`,
      502,
      "PRICE_UNAVAILABLE",
    );
  }
  return side.basePriceCents;
};

const computeQuote = (
  fromSide: SideContext,
  toSide: SideContext,
  fromAmount: number,
  fromPriceCents: number,
  toPriceCents: number,
): SwapQuote => {
  const feeBps = fromSide.swapFeeBps;
  const feeAmount = Number(((fromAmount * feeBps) / 10_000).toFixed(18));
  const netAmount = fromAmount - feeAmount;
  if (netAmount <= 0) {
    throw new ApiClientError("Amount does not cover the fee.", 422, "AMOUNT_BELOW_FEE");
  }
  const displayDecimals = Math.min(toSide.decimals, 18);
  const toAmount = Number(((netAmount * fromPriceCents) / toPriceCents).toFixed(displayDecimals));
  if (toAmount <= 0) {
    throw new ApiClientError("Amount too small after conversion.", 422, "AMOUNT_TOO_SMALL");
  }
  return swapQuoteSchema.parse({
    fromSymbol: fromSide.symbol,
    toSymbol: toSide.symbol,
    fromAmount,
    feeAmount,
    feeBps,
    netAmount,
    toAmount,
    fromUsdPriceCents: fromPriceCents,
    toUsdPriceCents: toPriceCents,
    rate: fromPriceCents / toPriceCents,
  });
};

export const quoteSwap = async (input: ExecuteSwapInput): Promise<SwapQuote> => {
  if (input.fromSymbol === input.toSymbol) {
    throw new ApiClientError("From and to must differ.", 422, "SAME_SIDE");
  }

  if (!getOptionalServerEnv()) {
    return previewQuoteSwap(input.fromSymbol, input.toSymbol, input.fromAmount);
  }

  const admin = createSupabaseAdminClient();
  const [fromSide, toSide] = await Promise.all([
    buildSideContext(admin, input.fromSymbol),
    buildSideContext(admin, input.toSymbol),
  ]);
  const [fromPriceCents, toPriceCents] = await Promise.all([
    resolveUsdPriceCents(fromSide),
    resolveUsdPriceCents(toSide),
  ]);
  return computeQuote(fromSide, toSide, input.fromAmount, fromPriceCents, toPriceCents);
};

const mapSwapRow = (row: SwapRow): SwapRecord =>
  swapRecordSchema.parse({
    id: row.id,
    userId: row.user_id,
    fromSymbol: row.from_symbol,
    toSymbol: row.to_symbol,
    fromTokenId: row.from_token_id,
    toTokenId: row.to_token_id,
    fromAmount: toNum(row.from_amount),
    toAmount: toNum(row.to_amount),
    feeAmount: toNum(row.fee_amount),
    feeBpsApplied: Math.round(toNum(row.fee_bps_applied)),
    fromPriceUsdCents: Math.round(toNum(row.from_price_usd_cents)),
    toPriceUsdCents: Math.round(toNum(row.to_price_usd_cents)),
    createdAt: row.created_at,
  });

export const executeSwap = async (
  userId: string,
  input: ExecuteSwapInput,
): Promise<SwapRecord> => {
  if (input.fromSymbol === input.toSymbol) {
    throw new ApiClientError("From and to must differ.", 422, "SAME_SIDE");
  }

  if (!getOptionalServerEnv()) {
    return previewExecuteSwap(input.fromSymbol, input.toSymbol, input.fromAmount);
  }

  const admin = createSupabaseAdminClient();
  const [fromSide, toSide] = await Promise.all([
    buildSideContext(admin, input.fromSymbol),
    buildSideContext(admin, input.toSymbol),
  ]);
  const [fromPriceCents, toPriceCents] = await Promise.all([
    resolveUsdPriceCents(fromSide),
    resolveUsdPriceCents(toSide),
  ]);

  const { data, error } = await admin.rpc("execute_swap", {
    p_user_id: userId,
    p_from_token_id: fromSide.tokenId,
    p_to_token_id: toSide.tokenId,
    p_from_amount: input.fromAmount,
    p_from_price_usd_cents: fromPriceCents,
    p_to_price_usd_cents: toPriceCents,
  });

  if (error) {
    const msg = error.message ?? "Swap failed.";
    const code = msg.includes("INSUFFICIENT") ? "INSUFFICIENT_BALANCE"
      : msg.includes("AMOUNT_BELOW_FEE") ? "AMOUNT_BELOW_FEE"
      : msg.includes("AMOUNT_TOO_SMALL") ? "AMOUNT_TOO_SMALL"
      : msg.includes("SAME_SIDE") ? "SAME_SIDE"
      : msg.includes("PRICE_INVALID") ? "PRICE_INVALID"
      : msg.includes("AMOUNT_INVALID") ? "AMOUNT_INVALID"
      : "INTERNAL_ERROR";
    throw new ApiClientError(msg, 422, code, error);
  }

  return mapSwapRow(data as unknown as SwapRow);
};

export const listUserSwaps = async (userId: string): Promise<SwapsResult> => {
  if (!getOptionalServerEnv()) {
    return previewListSwaps();
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("swaps")
    .select(
      "id, user_id, from_symbol, to_symbol, from_token_id, to_token_id, from_amount, to_amount, fee_amount, fee_bps_applied, from_price_usd_cents, to_price_usd_cents, created_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new ApiClientError(error.message, 500, "SWAPS_FETCH_FAILED", error);
  }

  return swapsResultSchema.parse({
    items: (data ?? []).map((row) => mapSwapRow(row as SwapRow)),
  });
};
