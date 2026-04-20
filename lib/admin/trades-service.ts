import "server-only";
import { ApiClientError } from "@/lib/api/client";
import { getOptionalServerEnv } from "@/lib/env/server";
import { previewAdminTrades } from "@/lib/admin/preview-data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  adminTradeListResultSchema,
  adminTradeSchema,
  bulkSettleInputSchema,
  forceTradeOutcomeInputSchema,
  settleTradeInputSchema,
} from "@/schemas/admin";
import type {
  AdminTrade,
  AdminTradeFilters,
  AdminTradeListResult,
  AdminTradeFlag,
  BulkSettleInput,
  BulkSettleResult,
} from "@/types/admin";

const toNumber = (v: number | string | bigint | null | undefined): number => {
  if (v == null) return 0;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "number") return v;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};

interface AdminTradeRow {
  admin_forced_outcome: "win" | "lose" | "void" | null;
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
  trade_periods?: { duration_seconds: number } | { duration_seconds: number }[] | null;
  user_id: string;
  profiles?: {
    username: string;
    email: string;
    created_at?: string;
  } | null;
}

const formatPeriodLabel = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${seconds / 60}m`;
  return `${seconds / 3600}h`;
};

const resolveSymbol = (tokens: AdminTradeRow["tokens"]): string => {
  if (!tokens) return "";
  if (Array.isArray(tokens)) return tokens[0]?.symbol ?? "";
  return tokens.symbol;
};

const resolvePeriodLabel = (periods: AdminTradeRow["trade_periods"]): string => {
  if (!periods) return "";
  const secs = Array.isArray(periods)
    ? periods[0]?.duration_seconds
    : periods?.duration_seconds;
  return secs != null ? formatPeriodLabel(secs) : "";
};

const computeFlags = (trade: AdminTradeRow, joinedAt?: string): AdminTradeFlag[] => {
  const flags: AdminTradeFlag[] = [];
  const nowMs = Date.now();
  const endMs = new Date(trade.end_time).getTime();
  const remainingMs = endMs - nowMs;

  if (remainingMs < 15_000) flags.push("EXPIRING_SOON");
  if (toNumber(trade.stake_cents) >= 100_000) flags.push("HIGH_STAKE");

  if (joinedAt) {
    const ageMs = nowMs - new Date(joinedAt).getTime();
    if (ageMs < 7 * 86_400_000) flags.push("NEW_USER");
  }

  return flags;
};

const mapAdminTradeRow = (row: AdminTradeRow): AdminTrade => {
  const nowMs = Date.now();
  const endMs = new Date(row.end_time).getTime();
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;

  return adminTradeSchema.parse({
    adminForcedOutcome: row.admin_forced_outcome ?? null,
    direction: row.direction,
    endTime: row.end_time,
    entryPriceCents: toNumber(row.entry_price_cents),
    flags: computeFlags(row, profile?.created_at),
    id: row.id,
    outcome: row.outcome ?? null,
    payoutBps: toNumber(row.payout_bps),
    periodId: row.period_id,
    periodLabel: resolvePeriodLabel(row.trade_periods),
    stakeCents: toNumber(row.stake_cents),
    startedAt: row.started_at,
    status: row.status,
    strikePriceCents: row.strike_price_cents != null ? toNumber(row.strike_price_cents) : null,
    timeRemainingMs: Math.max(endMs - nowMs, 0),
    tokenId: row.token_id,
    tokenSymbol: resolveSymbol(row.tokens),
    userEmail: profile?.email ?? "",
    userId: row.user_id,
    username: profile?.username ?? "",
  });
};

const ADMIN_TRADE_SELECT =
  "id, user_id, token_id, period_id, direction, stake_cents, payout_bps, entry_price_cents, strike_price_cents, status, outcome, admin_forced_outcome, started_at, end_time, tokens(symbol), trade_periods(duration_seconds), profiles!user_trades_user_id_fkey(username, email, created_at)";

export const listAdminTrades = async (
  filters: AdminTradeFilters = {},
): Promise<AdminTradeListResult> => {
  if (!getOptionalServerEnv()) {
    const items = previewAdminTrades
      .filter((t) => !filters.status || t.status === filters.status)
      .filter((t) => !filters.direction || t.direction === filters.direction)
      .filter((t) => !filters.tokenId || t.tokenId === filters.tokenId)
      .filter((t) => !filters.userId || t.userId === filters.userId)
      .sort((a, b) => a.timeRemainingMs - b.timeRemainingMs);

    const limit = filters.limit ?? 100;
    const offset = filters.offset ?? 0;
    return adminTradeListResultSchema.parse({
      items: items.slice(offset, offset + limit),
      total: items.length,
    });
  }

  const admin = createSupabaseAdminClient();
  let query = admin
    .from("user_trades")
    .select(ADMIN_TRADE_SELECT, { count: "exact" });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.direction) query = query.eq("direction", filters.direction);
  if (filters.tokenId) query = query.eq("token_id", filters.tokenId);
  if (filters.userId) query = query.eq("user_id", filters.userId);
  if (filters.minStakeCents != null) query = query.gte("stake_cents", filters.minStakeCents);
  if (filters.maxStakeCents != null) query = query.lte("stake_cents", filters.maxStakeCents);

  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;
  const { data, error, count } = await query
    .order("end_time", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new ApiClientError(error.message, 500, "ADMIN_TRADES_FETCH_FAILED", error);
  }

  return adminTradeListResultSchema.parse({
    items: (data ?? []).map((r) => mapAdminTradeRow(r as unknown as AdminTradeRow)),
    total: count ?? 0,
  });
};

export const settleTrade = async (
  tradeId: string,
  input: unknown,
  adminId: string,
): Promise<AdminTrade> => {
  const parsed = settleTradeInputSchema.parse(input);

  if (!getOptionalServerEnv()) {
    const trade = previewAdminTrades.find((t) => t.id === tradeId);
    if (!trade) throw new ApiClientError("Trade not found.", 404, "TRADE_NOT_FOUND");
    const settled = { ...trade, status: "settled" as const, outcome: parsed.outcome };
    return adminTradeSchema.parse(settled);
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("settle_trade", {
    p_admin_id: adminId,
    p_outcome: parsed.outcome,
    p_reason: parsed.reason ?? null,
    p_trade_id: tradeId,
  });

  if (error) {
    const msg = error.message ?? "Settle failed.";
    const code = msg.includes("TRADE_NOT_FOUND") ? "TRADE_NOT_FOUND"
      : msg.includes("TRADE_NOT_ACTIVE") ? "TRADE_NOT_ACTIVE"
      : "INTERNAL_ERROR";
    const status = code === "TRADE_NOT_FOUND" ? 404 : code === "TRADE_NOT_ACTIVE" ? 409 : 500;
    throw new ApiClientError(msg, status, code, error);
  }

  const row = data as AdminTradeRow;
  return mapAdminTradeRow(row);
};

export const forceTradeOutcome = async (
  tradeId: string,
  input: unknown,
  adminId: string,
): Promise<AdminTrade> => {
  const parsed = forceTradeOutcomeInputSchema.parse(input);

  if (!getOptionalServerEnv()) {
    const trade = previewAdminTrades.find((t) => t.id === tradeId);
    if (!trade) throw new ApiClientError("Trade not found.", 404, "TRADE_NOT_FOUND");
    const forced = { ...trade, adminForcedOutcome: parsed.outcome };
    return adminTradeSchema.parse(forced);
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("force_trade_outcome", {
    p_admin_id: adminId,
    p_outcome: parsed.outcome,
    p_reason: parsed.reason ?? null,
    p_trade_id: tradeId,
  });

  if (error) {
    const msg = error.message ?? "Force outcome failed.";
    const code = msg.includes("TRADE_NOT_FOUND") ? "TRADE_NOT_FOUND"
      : msg.includes("TRADE_NOT_ACTIVE") ? "TRADE_NOT_ACTIVE"
      : "INTERNAL_ERROR";
    const status = code === "TRADE_NOT_FOUND" ? 404 : code === "TRADE_NOT_ACTIVE" ? 409 : 500;
    throw new ApiClientError(msg, status, code, error);
  }

  // RPC returns a user_trades row; refetch with joins so the admin UI gets
  // username/email/token symbol without a second mapping path.
  const { data: joined, error: joinErr } = await admin
    .from("user_trades")
    .select(ADMIN_TRADE_SELECT)
    .eq("id", (data as { id: string }).id)
    .maybeSingle();

  if (joinErr || !joined) {
    throw new ApiClientError(joinErr?.message ?? "Force outcome row missing.", 500, "INTERNAL_ERROR", joinErr);
  }

  return mapAdminTradeRow(joined as unknown as AdminTradeRow);
};

export const bulkSettleTrades = async (
  input: unknown,
  adminId: string,
): Promise<BulkSettleResult> => {
  const parsed = bulkSettleInputSchema.parse(input) as BulkSettleInput;

  if (!getOptionalServerEnv()) {
    return { failed: [], settled: parsed.tradeIds };
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("bulk_settle_trades", {
    p_admin_id: adminId,
    p_outcome: parsed.outcome,
    p_reason: parsed.reason ?? null,
    p_trade_ids: parsed.tradeIds,
  });

  if (error) {
    throw new ApiClientError(error.message, 500, "BULK_SETTLE_FAILED", error);
  }

  const settled = ((data as AdminTradeRow[]) ?? []).map((r) => r.id);
  const failed = parsed.tradeIds.filter((id) => !settled.includes(id));
  return { failed, settled };
};
