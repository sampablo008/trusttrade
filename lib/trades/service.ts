import "server-only";
import { ApiClientError } from "@/lib/api/client";
import { getOptionalServerEnv } from "@/lib/env/server";
import {
  getPreviewActiveTrades,
  getPreviewBalance,
  getPreviewProfile,
  getPreviewSettledTrades,
  getPreviewTrade,
  previewCancelTrade,
  previewPlaceTrade,
} from "@/lib/trades/preview-data";
import { getBinanceUsdPrice } from "@/lib/markets/live-prices";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  activeTradesResultSchema,
  cancelTradeResultSchema,
  placeTradeInputSchema,
  placeTradeResultSchema,
  settledTradesResultSchema,
  userBalanceSchema,
  userProfileSchema,
  userTradeSchema,
} from "@/schemas/trade";
import type {
  ActiveTradesResult,
  CancelTradeResult,
  PlaceTradeResult,
  SettledTradesResult,
  UpdateProfileInput,
  UserBalance,
  UserProfile,
  UserTrade,
} from "@/types/trade";

const toNumber = (v: number | string | bigint | null | undefined): number => {
  if (v == null) return 0;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "number") return v;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};

interface TradeRow {
  direction: "long" | "short";
  end_time: string;
  entry_price_cents: number | string | bigint;
  id: string;
  outcome: "win" | "lose" | "void" | null;
  payout_bps: number | string;
  period_id: string;
  stake_cents: number | string | bigint;
  started_at: string;
  status: "active" | "settled" | "cancelled";
  strike_price_cents: number | string | bigint | null;
  token_id: string;
  tokens?: { symbol: string } | { symbol: string }[] | null;
  user_id: string;
}

const resolveTokenSymbol = (tokens: TradeRow["tokens"]): string => {
  if (!tokens) return "";
  if (Array.isArray(tokens)) return tokens[0]?.symbol ?? "";
  return tokens.symbol;
};

const mapTradeRow = (row: TradeRow): UserTrade =>
  userTradeSchema.parse({
    direction: row.direction,
    endTime: row.end_time,
    entryPriceCents: toNumber(row.entry_price_cents),
    id: row.id,
    outcome: row.outcome ?? null,
    payoutBps: toNumber(row.payout_bps),
    periodId: row.period_id,
    stakeCents: toNumber(row.stake_cents),
    startedAt: row.started_at,
    status: row.status,
    strikePriceCents: row.strike_price_cents != null ? toNumber(row.strike_price_cents) : null,
    tokenId: row.token_id,
    tokenSymbol: resolveTokenSymbol(row.tokens),
    userId: row.user_id,
  });

const TRADE_SELECT =
  "id, user_id, token_id, period_id, direction, stake_cents, payout_bps, entry_price_cents, strike_price_cents, status, outcome, started_at, end_time, tokens!token_id(symbol)";

export const listActiveTrades = async (userId: string): Promise<ActiveTradesResult> => {
  if (!getOptionalServerEnv()) {
    return getPreviewActiveTrades();
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_trades")
    .select(TRADE_SELECT)
    .eq("user_id", userId)
    .eq("status", "active")
    .order("end_time", { ascending: true });

  if (error) {
    throw new ApiClientError(error.message, 500, "TRADES_FETCH_FAILED", error);
  }

  return activeTradesResultSchema.parse({
    items: (data ?? []).map((r) => mapTradeRow(r as TradeRow)),
  });
};

export const listSettledTrades = async (
  userId: string,
  limit: number,
  offset: number,
): Promise<SettledTradesResult> => {
  if (!getOptionalServerEnv()) {
    return getPreviewSettledTrades();
  }

  const admin = createSupabaseAdminClient();
  const { data, error, count } = await admin
    .from("user_trades")
    .select(TRADE_SELECT, { count: "exact" })
    .eq("user_id", userId)
    .in("status", ["settled", "cancelled"])
    .order("end_time", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new ApiClientError(error.message, 500, "TRADES_FETCH_FAILED", error);
  }

  return settledTradesResultSchema.parse({
    items: (data ?? []).map((r) => mapTradeRow(r as TradeRow)),
    total: count ?? 0,
  });
};

export const getTradeById = async (
  userId: string,
  tradeId: string,
): Promise<UserTrade> => {
  if (!getOptionalServerEnv()) {
    const trade = getPreviewTrade(tradeId);
    if (!trade) throw new ApiClientError("Trade not found.", 404, "TRADE_NOT_FOUND");
    return trade;
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_trades")
    .select(TRADE_SELECT)
    .eq("id", tradeId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new ApiClientError(error.message, 500, "TRADE_FETCH_FAILED", error);
  }

  if (!data) {
    throw new ApiClientError("Trade not found.", 404, "TRADE_NOT_FOUND");
  }

  return mapTradeRow(data as TradeRow);
};

export const placeTrade = async (
  userId: string,
  input: unknown,
): Promise<PlaceTradeResult> => {
  const parsed = placeTradeInputSchema.parse(input);

  if (!getOptionalServerEnv()) {
    return previewPlaceTrade(parsed);
  }

  const admin = createSupabaseAdminClient();

  // Resolve a fresh USD price at trade time via Binance REST (same source
  // as the chart UI). DB-cached columns are a defensive fallback only —
  // we don't trust them for execution because they depend on edge-function
  // crons that may be stale or NULL.
  const { data: tokenRow } = await admin
    .from("tokens")
    .select("shadow_symbol, last_price_cents, last_shadow_price_cents, base_price_cents")
    .eq("id", parsed.tokenId)
    .maybeSingle();

  const t = tokenRow as {
    shadow_symbol?: string | null;
    last_price_cents?: number | null;
    last_shadow_price_cents?: number | null;
    base_price_cents?: number | null;
  } | null;

  let livePriceCents = 0;
  if (t?.shadow_symbol) {
    try {
      const usd = await getBinanceUsdPrice(t.shadow_symbol);
      if (usd != null && usd > 0) {
        livePriceCents = Math.round(usd * 100);
      }
    } catch {
      // Swallow — DB function will fall back to its own chain.
    }
  }

  // Opportunistically warm the cached column so other readers (charts,
  // wallet, admin dashboards) see fresh data without a Binance roundtrip.
  if (livePriceCents > 0) {
    void admin
      .from("tokens")
      .update({
        last_shadow_price_cents: livePriceCents,
        last_shadow_at: new Date().toISOString(),
      })
      .eq("id", parsed.tokenId)
      .then(() => null, () => null);
  }

  const lockPriceCents =
    livePriceCents > 0
      ? livePriceCents
      : t?.last_price_cents && t.last_price_cents > 0
        ? t.last_price_cents
        : t?.last_shadow_price_cents && t.last_shadow_price_cents > 0
          ? t.last_shadow_price_cents
          : 0;

  const { data, error } = await admin.rpc("place_trade", {
    p_user_id: userId,
    p_token_id: parsed.tokenId,
    p_period_id: parsed.periodId,
    p_direction: parsed.direction,
    p_amount_cents: parsed.amountCents,
    p_lock_price_usd_cents: lockPriceCents > 0 ? lockPriceCents : null,
  });

  if (error) {
    const message = error.message ?? "Place trade failed.";
    const code = message.includes("TRADING_FROZEN") ? "TRADING_FROZEN"
      : message.includes("TOKEN_UNAVAILABLE") ? "TOKEN_UNAVAILABLE"
      : message.includes("STABLE_NOT_TRADEABLE") ? "STABLE_NOT_TRADEABLE"
      : message.includes("USDT_TOKEN_MISSING") ? "USDT_TOKEN_MISSING"
      : message.includes("PERIOD_UNAVAILABLE") ? "PERIOD_UNAVAILABLE"
      : message.includes("AMOUNT_OUT_OF_RANGE") ? "AMOUNT_OUT_OF_RANGE"
      : message.includes("INSUFFICIENT_USDT_BALANCE") ? "INSUFFICIENT_USDT_BALANCE"
      : message.includes("INSUFFICIENT_TOKEN_BALANCE") ? "INSUFFICIENT_TOKEN_BALANCE"
      : message.includes("TOKEN_PRICE_UNAVAILABLE") ? "TOKEN_PRICE_UNAVAILABLE"
      : message.includes("STAKE_TOO_SMALL") ? "STAKE_TOO_SMALL"
      : "INTERNAL_ERROR";

    const friendlyMessages: Record<string, string> = {
      TRADING_FROZEN: "Trading is currently paused. Please try again later.",
      TOKEN_UNAVAILABLE: "This token is not available for trading.",
      STABLE_NOT_TRADEABLE: "Stablecoins cannot be traded.",
      PERIOD_UNAVAILABLE: "This trade duration is not available.",
      AMOUNT_OUT_OF_RANGE: "Amount is outside the allowed range for this period.",
      INSUFFICIENT_USDT_BALANCE: "Insufficient balance to cover this trade.",
      INSUFFICIENT_TOKEN_BALANCE: "Insufficient token balance to cover this trade. Check your available balance and try a smaller amount.",
      TOKEN_PRICE_UNAVAILABLE: "No live price available for this token. Please try again.",
      STAKE_TOO_SMALL: "Trade amount is too small.",
    };

    throw new ApiClientError(
      friendlyMessages[code] ?? message,
      code === "INSUFFICIENT_USDT_BALANCE" || code === "INSUFFICIENT_TOKEN_BALANCE" ? 422 : 400,
      code,
      error,
    );
  }

  // Fetch the full trade with token symbol
  const trade = await getTradeById(userId, (data as { id: string }).id);

  return placeTradeResultSchema.parse({ trade });
};

export const cancelTrade = async (
  userId: string,
  tradeId: string,
): Promise<CancelTradeResult> => {
  if (!getOptionalServerEnv()) {
    return previewCancelTrade(tradeId);
  }

  const admin = createSupabaseAdminClient();

  const { error: rpcError } = await admin.rpc("cancel_trade", {
    p_user_id: userId,
    p_trade_id: tradeId,
  });

  if (rpcError) {
    const message = rpcError.message ?? "Cancel failed.";
    const code = message.includes("TRADE_NOT_FOUND") ? "TRADE_NOT_FOUND"
      : message.includes("TRADE_NOT_ACTIVE") ? "TRADE_NOT_ACTIVE"
      : message.includes("CANCEL_WINDOW_EXPIRED") ? "CANCEL_WINDOW_EXPIRED"
      : "CANCEL_FAILED";
    const friendly: Record<string, string> = {
      TRADE_NOT_FOUND: "Trade not found.",
      TRADE_NOT_ACTIVE: "Trade is not active.",
      CANCEL_WINDOW_EXPIRED: "Cancel window has expired.",
    };
    throw new ApiClientError(
      friendly[code] ?? message,
      code === "TRADE_NOT_FOUND" ? 404
        : code === "TRADE_NOT_ACTIVE" ? 409
        : code === "CANCEL_WINDOW_EXPIRED" ? 422
        : 500,
      code,
      rpcError,
    );
  }

  return cancelTradeResultSchema.parse({ id: tradeId });
};

export const getProfile = async (userId: string): Promise<UserProfile> => {
  if (!getOptionalServerEnv()) {
    return getPreviewProfile();
  }

  const admin = createSupabaseAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("user_id, email, role, username, display_name, avatar_path")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError) {
    throw new ApiClientError(profileError.message, 500, "PROFILE_FETCH_FAILED", profileError);
  }

  if (!profile) {
    throw new ApiClientError("Profile not found.", 404, "PROFILE_NOT_FOUND");
  }

  const { data: balanceRow, error: balanceError } = await admin
    .from("user_balances")
    .select("balance_cents, locked_in_trades_cents, locked_bonus_cents")
    .eq("user_id", userId)
    .maybeSingle();

  if (balanceError) {
    throw new ApiClientError(balanceError.message, 500, "BALANCE_FETCH_FAILED", balanceError);
  }

  const br = balanceRow as { balance_cents?: number; locked_bonus_cents?: number; locked_in_trades_cents?: number } | null;

  return userProfileSchema.parse({
    avatarPath: profile.avatar_path ?? null,
    balanceCents: toNumber(br?.balance_cents),
    displayName: profile.display_name ?? null,
    email: profile.email,
    lockedBonusCents: toNumber(br?.locked_bonus_cents),
    lockedInTradesCents: toNumber(br?.locked_in_trades_cents),
    role: profile.role as "user" | "admin",
    userId: profile.user_id,
    username: profile.username,
  });
};

export const updateProfile = async (
  userId: string,
  input: UpdateProfileInput,
): Promise<UserProfile> => {
  if (!getOptionalServerEnv()) {
    return getPreviewProfile();
  }

  const admin = createSupabaseAdminClient();
  const updates: Record<string, unknown> = {};
  if (input.displayName !== undefined) updates.display_name = input.displayName;
  if (input.avatarPath !== undefined) updates.avatar_path = input.avatarPath;

  const { error } = await admin
    .from("profiles")
    .update(updates)
    .eq("user_id", userId);

  if (error) {
    throw new ApiClientError(error.message, 500, "PROFILE_UPDATE_FAILED", error);
  }

  return getProfile(userId);
};

export const getBalance = async (userId: string): Promise<UserBalance> => {
  if (!getOptionalServerEnv()) {
    return getPreviewBalance();
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_balances")
    .select("balance_cents, locked_in_trades_cents, locked_bonus_cents")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new ApiClientError(error.message, 500, "BALANCE_FETCH_FAILED", error);
  }

  const d = data as { balance_cents?: number; locked_in_trades_cents?: number; locked_bonus_cents?: number } | null;
  const balance = toNumber(d?.balance_cents);
  const lockedTrades = toNumber(d?.locked_in_trades_cents);
  const lockedBonus = toNumber(d?.locked_bonus_cents);

  return userBalanceSchema.parse({
    balanceCents: balance,
    lockedBonusCents: lockedBonus,
    lockedInTradesCents: lockedTrades,
    withdrawableCents: Math.max(balance - lockedTrades - lockedBonus, 0),
  });
};
