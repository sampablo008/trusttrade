import "server-only";
import { ApiClientError } from "@/lib/api/client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  adjustBalanceInputSchema,
  adminUserListResultSchema,
  adminUserSchema,
  freezeUserInputSchema,
} from "@/schemas/admin";
import type {
  AdminUser,
  AdminUserListResult,
  AdjustBalanceInput,
  FreezeUserInput,
} from "@/types/admin";

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
  "user_id, email, role, username, display_name, avatar_path, is_frozen, created_at, user_balances(balance_cents, locked_in_trades_cents, locked_bonus_cents)";

const mapUserRow = (row: UserRow, stats?: { total: number; stake: number }): AdminUser =>
  adminUserSchema.parse({
    avatarPath: row.avatar_path ?? null,
    balanceCents: toNumber(row.user_balances?.balance_cents),
    displayName: row.display_name ?? null,
    email: row.email,
    isFrozen: row.is_frozen ?? false,
    joinedAt: row.created_at,
    lockedBonusCents: toNumber(row.user_balances?.locked_bonus_cents),
    lockedInTradesCents: toNumber(row.user_balances?.locked_in_trades_cents),
    role: row.role,
    totalSettledTrades: stats?.total ?? 0,
    totalStakeCents: stats?.stake ?? 0,
    userId: row.user_id,
    username: row.username,
  });

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

  // Get trade stats
  const { data: statsData } = await admin
    .from("user_trades")
    .select("stake_cents")
    .eq("user_id", userId)
    .eq("status", "settled");

  const stats = statsData
    ? {
        stake: statsData.reduce((s, r) => s + toNumber(r.stake_cents), 0),
        total: statsData.length,
      }
    : { stake: 0, total: 0 };

  return mapUserRow(data as unknown as UserRow, stats);
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
  const { error } = await admin.rpc("apply_balance_adjustment", {
    p_delta_cents: parsed.deltaCents,
    p_memo: parsed.note,
    p_unlock_trades_cents: 0,
    p_user_id: userId,
  });

  if (error) throw new ApiClientError(error.message, 500, "BALANCE_ADJUST_FAILED", error);

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
