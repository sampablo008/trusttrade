import "server-only";
import { ApiClientError } from "@/lib/api/client";
import { getOptionalServerEnv } from "@/lib/env/server";
import { getLiveUsdPrices } from "@/lib/markets/live-prices";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { swapQuoteSchema, swapRecordSchema, swapsResultSchema } from "@/schemas/swap";
import type {
  ExecuteSwapInput,
  QuoteSwapInput,
  SwapQuote,
  SwapRecord,
  SwapsResult,
} from "@/types/swap";
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
  minSwap: number;
  shadowSymbol: string | null;
}

interface TokenRow {
  id: string;
  symbol: string;
  decimals: number | string | null;
  swap_fee_bps: number | string | null;
  min_swap: number | string | null;
  shadow_symbol: string | null;
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
    throw new ApiClientError(
      "USD swaps are no longer supported. Both sides must be tokens.",
      400,
      "USD_SWAP_DISABLED",
    );
  }

  const { data, error } = await admin
    .from("tokens")
    .select("id, symbol, decimals, swap_fee_bps, min_swap, shadow_symbol")
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
    minSwap: toNum(row.min_swap),
    shadowSymbol: row.shadow_symbol ?? null,
  };
};

const resolvePriceCentsForSides = async (
  sides: SideContext[],
): Promise<Record<string, number>> => {
  const live = await getLiveUsdPrices(
    sides.map((s) => ({ symbol: s.symbol, shadowSymbol: s.shadowSymbol })),
  );
  const out: Record<string, number> = {};
  for (const side of sides) {
    if (side.symbol === "USD") {
      out[side.symbol] = 100;
      continue;
    }
    const usd = live[side.symbol];
    if (usd == null || !(usd > 0)) {
      // Never fall back to base_price_cents for swaps — that placeholder is
      // typically $1 and produces wildly wrong conversions (e.g. 7000 USDT
      // → 7000 BTC). Refuse the swap until the live feed is back.
      throw new ApiClientError(
        `Live USD price unavailable for ${side.symbol}. Try again in a moment.`,
        503,
        "PRICE_UNAVAILABLE",
      );
    }
    out[side.symbol] = Math.round(usd * 100);
  }
  return out;
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

// Inverts the quote math: given a desired toAmount, what fromAmount produces
// it after fee? toAmount = (fromAmount - fee) * fromPrice / toPrice
// → fromAmount = toAmount * toPrice / fromPrice / (1 - feeBps/10000)
const fromAmountForToAmount = (
  fromSide: SideContext,
  toAmount: number,
  fromPriceCents: number,
  toPriceCents: number,
): number => {
  const netRatio = 1 - fromSide.swapFeeBps / 10_000;
  if (netRatio <= 0) {
    throw new ApiClientError("Fee makes swap impossible.", 422, "AMOUNT_BELOW_FEE");
  }
  const raw = (toAmount * toPriceCents) / fromPriceCents / netRatio;
  const decimals = Math.min(fromSide.decimals, 18);
  // Round UP so the resulting toAmount is at least the requested amount.
  const factor = 10 ** decimals;
  return Math.ceil(raw * factor) / factor;
};

const enforceMinSwap = (fromSide: SideContext, fromAmount: number): void => {
  if (fromSide.minSwap > 0 && fromAmount < fromSide.minSwap) {
    throw new ApiClientError(
      `Minimum swap is ${fromSide.minSwap} ${fromSide.symbol}.`,
      422,
      "AMOUNT_BELOW_MIN",
    );
  }
};

export const quoteSwap = async (input: QuoteSwapInput): Promise<SwapQuote> => {
  if (input.fromSymbol === input.toSymbol) {
    throw new ApiClientError("From and to must differ.", 422, "SAME_SIDE");
  }
  if ((input.fromAmount == null) === (input.toAmount == null)) {
    throw new ApiClientError(
      "Specify exactly one of fromAmount or toAmount.",
      422,
      "AMOUNT_INVALID",
    );
  }

  if (!getOptionalServerEnv()) {
    const amt =
      input.fromAmount ??
      // preview path: roughly invert at $65k/$3.2k/$1 placeholders
      (input.toAmount as number);
    return previewQuoteSwap(input.fromSymbol, input.toSymbol, amt);
  }

  const admin = createSupabaseAdminClient();
  const [fromSide, toSide] = await Promise.all([
    buildSideContext(admin, input.fromSymbol),
    buildSideContext(admin, input.toSymbol),
  ]);
  const prices = await resolvePriceCentsForSides([fromSide, toSide]);
  const fromPrice = prices[fromSide.symbol];
  const toPrice = prices[toSide.symbol];

  const fromAmount =
    input.fromAmount ??
    fromAmountForToAmount(fromSide, input.toAmount as number, fromPrice, toPrice);

  enforceMinSwap(fromSide, fromAmount);
  return computeQuote(fromSide, toSide, fromAmount, fromPrice, toPrice);
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
  enforceMinSwap(fromSide, input.fromAmount);
  const prices = await resolvePriceCentsForSides([fromSide, toSide]);
  const fromPriceCents = prices[fromSide.symbol];
  const toPriceCents = prices[toSide.symbol];

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
