import "server-only";
import { ApiClientError } from "@/lib/api/client";
import { getBinanceUsdPrices } from "@/lib/markets/live-prices";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { applyBalanceAdjustment } from "@/lib/transactions/adjust-balance";
import {
  adjustBalanceInputSchema,
  adjustTokenBalanceInputSchema,
  adminUserListResultSchema,
  adminUserSchema,
  freezeUserInputSchema,
  setForcedOutcomeInputSchema,
} from "@/schemas/admin";
import type {
  AdminTokenBalance,
  AdminUser,
  AdminUserListResult,
  AdjustBalanceInput,
  AdjustTokenBalanceInput,
  FreezeUserInput,
  SetForcedOutcomeInput,
} from "@/types/admin";
import type { TradeOutcome } from "@/types/trade";

const toNumber = (v: number | string | bigint | null | undefined): number => {
  if (v == null) return 0;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "number") return v;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};

interface UserRow {
  avatar_path: string | null;
  created_at: string;
  display_name: string | null;
  email: string;
  forced_outcome: TradeOutcome | null;
  is_frozen: boolean;
  role: "user" | "admin";
  user_id: string;
  username: string;
  user_balances?: {
    balance_cents: number;
    locked_in_trades_cents: number;
    locked_bonus_cents: number;
  } | null;
}

const PROFILE_SELECT =
  "user_id, email, role, username, display_name, avatar_path, is_frozen, forced_outcome, created_at, user_balances(balance_cents, locked_in_trades_cents, locked_bonus_cents)";

const mapUserRow = (
  row: UserRow,
  stats?: { total: number; stake: number },
  tokenBalances?: AdminTokenBalance[],
): AdminUser =>
  adminUserSchema.parse({
    avatarPath: row.avatar_path ?? null,
    balanceCents: toNumber(row.user_balances?.balance_cents),
    displayName: row.display_name ?? null,
    email: row.email,
    forcedOutcome: row.forced_outcome ?? null,
    isFrozen: row.is_frozen ?? false,
    joinedAt: row.created_at,
    lockedBonusCents: toNumber(row.user_balances?.locked_bonus_cents),
    lockedInTradesCents: toNumber(row.user_balances?.locked_in_trades_cents),
    role: row.role,
    totalSettledTrades: stats?.total ?? 0,
    totalStakeCents: stats?.stake ?? 0,
    userId: row.user_id,
    username: row.username,
    tokenBalances: tokenBalances ?? undefined,
  });

const ensureUserBalanceRow = async (
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
) => {
  const { error } = await admin.from("user_balances").insert({
    balance_cents: 0,
    locked_bonus_cents: 0,
    locked_in_trades_cents: 0,
    user_id: userId,
  });

  if (error && error.code !== "23505") {
    throw new ApiClientError(error.message, 500, "BALANCE_ROW_ENSURE_FAILED", error);
  }
};

export const listAdminUsers = async (
  search = "",
  limit = 50,
  offset = 0,
  role?: "user" | "admin",
): Promise<AdminUserListResult> => {
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("profiles")
    .select(PROFILE_SELECT, { count: "exact" });

  if (role) {
    query = query.eq("role", role);
  }

  if (search) {
    query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new ApiClientError(error.message, 500, "USERS_FETCH_FAILED", error);
  }

  return adminUserListResultSchema.parse({
    items: (data ?? []).map((r) => mapUserRow(r as unknown as UserRow)),
    total: count ?? 0,
  });
};

export const getAdminUser = async (userId: string): Promise<AdminUser> => {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new ApiClientError(error.message, 500, "USER_FETCH_FAILED", error);
  if (!data) throw new ApiClientError("User not found.", 404, "USER_NOT_FOUND");

  const [statsRes, tokenBalancesRes, tokensRes] = await Promise.all([
    admin
      .from("user_trades")
      .select("stake_cents")
      .eq("user_id", userId)
      .eq("status", "settled"),
    admin
      .from("user_token_balances")
      .select("token_id, balance, locked_balance")
      .eq("user_id", userId),
    admin
      .from("tokens")
      .select("id, symbol, name, icon_path, decimals, shadow_symbol, base_price_cents")
      .eq("is_enabled", true)
      .order("symbol"),
  ]);

  const stats = statsRes.data
    ? {
        stake: statsRes.data.reduce((s, r) => s + toNumber(r.stake_cents), 0),
        total: statsRes.data.length,
      }
    : { stake: 0, total: 0 };

  const balanceByTokenId = new Map<string, { balance: number; locked: number }>();
  for (const row of (tokenBalancesRes.data ?? []) as Array<{
    token_id: string;
    balance: number | string;
    locked_balance: number | string | null;
  }>) {
    balanceByTokenId.set(row.token_id, {
      balance: toNumber(row.balance),
      locked: toNumber(row.locked_balance),
    });
  }

  const tokens = (tokensRes.data ?? []) as Array<{
    id: string;
    symbol: string;
    name: string;
    icon_path: string | null;
    decimals: number | string | null;
    shadow_symbol: string | null;
    base_price_cents: number | string;
  }>;

  const shadowSymbols = tokens
    .map((t) => t.shadow_symbol)
    .filter((s): s is string => Boolean(s));
  let prices: Record<string, number> = {};
  try {
    prices = await getBinanceUsdPrices(shadowSymbols);
  } catch {
    prices = {};
  }

  const tokenBalances: AdminTokenBalance[] = tokens.map((t) => {
    const bal = balanceByTokenId.get(t.id) ?? { balance: 0, locked: 0 };
    const livePriceUsd = t.shadow_symbol ? prices[t.shadow_symbol] : undefined;
    const usdPriceCents =
      livePriceUsd != null
        ? Math.round(livePriceUsd * 100)
        : Math.round(toNumber(t.base_price_cents));
    const usdValueCents = Math.round((bal.balance + bal.locked) * usdPriceCents);
    return {
      tokenId: t.id,
      symbol: t.symbol,
      name: t.name,
      iconPath: t.icon_path ?? null,
      decimals: t.decimals != null ? Math.round(toNumber(t.decimals)) : 8,
      balance: bal.balance,
      lockedBalance: bal.locked,
      usdPriceCents,
      usdValueCents,
    };
  });

  tokenBalances.sort((a, b) => b.usdValueCents - a.usdValueCents);

  return mapUserRow(data as unknown as UserRow, stats, tokenBalances);
};

export const setForcedOutcome = async (
  userId: string,
  input: unknown,
  adminId: string,
): Promise<AdminUser> => {
  const parsed = setForcedOutcomeInputSchema.parse(input) as SetForcedOutcomeInput;

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ forced_outcome: parsed.forcedOutcome })
    .eq("user_id", userId);

  if (error) {
    throw new ApiClientError(error.message, 500, "FORCED_OUTCOME_UPDATE_FAILED", error);
  }

  await admin.from("admin_actions").insert({
    action_type: "set_user_forced_outcome",
    admin_user_id: adminId,
    after_state: { forced_outcome: parsed.forcedOutcome },
    note: parsed.reason ?? `forced_outcome=${parsed.forcedOutcome ?? "null"}`,
    target_id: userId,
    target_type: "profiles",
  });

  return getAdminUser(userId);
};

export const freezeUser = async (
  userId: string,
  input: unknown,
  adminId: string,
): Promise<AdminUser> => {
  const parsed = freezeUserInputSchema.parse(input) as FreezeUserInput;

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ is_frozen: parsed.isFrozen })
    .eq("user_id", userId);

  if (error) throw new ApiClientError(error.message, 500, "FREEZE_FAILED", error);

  await admin.from("admin_actions").insert({
    action_type: "freeze_user",
    admin_user_id: adminId,
    after_state: { is_frozen: parsed.isFrozen },
    note: parsed.reason ?? (parsed.isFrozen ? "Frozen" : "Unfrozen"),
    target_id: userId,
    target_type: "profiles",
  });

  return getAdminUser(userId);
};

export const adjustBalance = async (
  userId: string,
  input: unknown,
  adminId: string,
): Promise<AdminUser> => {
  const parsed = adjustBalanceInputSchema.parse(input) as AdjustBalanceInput;

  const admin = createSupabaseAdminClient();
  await ensureUserBalanceRow(admin, userId);

  await applyBalanceAdjustment(admin, {
    deltaCents: parsed.deltaCents,
    memo: parsed.note,
    unlockTradesCents: 0,
    userId,
  });

  await admin.from("admin_actions").insert({
    action_type: "adjust_balance",
    admin_user_id: adminId,
    after_state: { delta_cents: parsed.deltaCents },
    note: parsed.note,
    target_id: userId,
    target_type: "user_balances",
  });

  return getAdminUser(userId);
};

export const adjustTokenBalance = async (
  userId: string,
  input: unknown,
  adminId: string,
): Promise<AdminUser> => {
  const parsed = adjustTokenBalanceInputSchema.parse(input) as AdjustTokenBalanceInput;

  const admin = createSupabaseAdminClient();
  const { error } = await admin.rpc("admin_adjust_token_balance", {
    p_user_id: userId,
    p_token_id: parsed.tokenId,
    p_delta: parsed.deltaAmount,
    p_note: parsed.note,
    p_admin_id: adminId,
  });

  if (error) {
    const message = error.message ?? "Token balance adjustment failed.";
    const code =
      message.includes("DELTA_ZERO") ? "DELTA_ZERO"
      : message.includes("NOTE_REQUIRED") ? "NOTE_REQUIRED"
      : message.includes("TOKEN_NOT_FOUND") ? "TOKEN_NOT_FOUND"
      : message.includes("NEGATIVE_BALANCE") ? "NEGATIVE_BALANCE"
      : "TOKEN_BALANCE_ADJUST_FAILED";

    const friendly: Record<string, string> = {
      DELTA_ZERO: "Adjustment amount must be non-zero.",
      NOTE_REQUIRED: "A reason note is required.",
      TOKEN_NOT_FOUND: "Token not found.",
      NEGATIVE_BALANCE: "Adjustment would make the token balance negative.",
    };

    throw new ApiClientError(
      friendly[code] ?? message,
      code === "NEGATIVE_BALANCE" ? 422 : 400,
      code,
      error,
    );
  }

  return getAdminUser(userId);
};
