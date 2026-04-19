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
  "id, user_id, token_id, period_id, direction, stake_cents, payout_bps, entry_price_cents, strike_price_cents, status, outcome, started_at, end_time, tokens(symbol)";

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
  const { data, error } = await admin.rpc("place_trade", {
    p_user_id: userId,
    p_token_id: parsed.tokenId,
    p_period_id: parsed.periodId,
    p_direction: parsed.direction,
    p_amount_cents: parsed.amountCents,
  });

  if (error) {
    const message = error.message ?? "Place trade failed.";
    const code = message.includes("TRADING_FROZEN") ? "TRADING_FROZEN"
      : message.includes("TOKEN_UNAVAILABLE") ? "TOKEN_UNAVAILABLE"
      : message.includes("PERIOD_UNAVAILABLE") ? "PERIOD_UNAVAILABLE"
      : message.includes("AMOUNT_OUT_OF_RANGE") ? "AMOUNT_OUT_OF_RANGE"
      : message.includes("INSUFFICIENT_FUNDS") ? "INSUFFICIENT_FUNDS"
      : "INTERNAL_ERROR";

    throw new ApiClientError(message, code === "INSUFFICIENT_FUNDS" ? 422 : 400, code, error);
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

  // Fetch trade to check 2s grace window
  const { data: trade, error: fetchError } = await admin
    .from("user_trades")
    .select("id, user_id, status, started_at, stake_cents")
    .eq("id", tradeId)
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) {
    throw new ApiClientError(fetchError.message, 500, "TRADE_FETCH_FAILED", fetchError);
  }

  if (!trade) {
    throw new ApiClientError("Trade not found.", 404, "TRADE_NOT_FOUND");
  }

  if (trade.status !== "active") {
    throw new ApiClientError("Trade is not active.", 409, "TRADE_NOT_ACTIVE");
  }

  const ageMs = Date.now() - new Date(trade.started_at as string).getTime();
  if (ageMs > 2_000) {
    throw new ApiClientError("Cancel window has expired.", 422, "CANCEL_WINDOW_EXPIRED");
  }

  const { error: updateError } = await admin
    .from("user_trades")
    .update({ status: "cancelled" })
    .eq("id", tradeId)
    .eq("user_id", userId);

  if (updateError) {
    throw new ApiClientError(updateError.message, 500, "CANCEL_FAILED", updateError);
  }

  // Refund stake
  // Best-effort refund — the DB trigger handles balance rollback if this RPC doesn't exist yet
  await admin
    .rpc("apply_balance_adjustment", {
      p_delta_cents: trade.stake_cents as number,
      p_memo: "Trade cancelled (grace window)",
      p_unlock_trades_cents: trade.stake_cents as number,
      p_user_id: userId,
    })
    .then(() => null, () => null);

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
