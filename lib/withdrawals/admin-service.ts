import "server-only";
import { ApiClientError } from "@/lib/api/client";
import { getOptionalServerEnv } from "@/lib/env/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { withdrawalSchema, withdrawalsResultSchema } from "@/schemas/withdrawal";
import type {
  AdminWithdrawalFilters,
  AdminWithdrawalsResult,
  Withdrawal,
} from "@/types/withdrawal";
import { getPreviewAdminWithdrawals } from "./preview-data";

interface WithdrawalRow {
  id: string;
  user_id: string;
  token_id: string | null;
  amount: number | string | null;
  fee_amount: number | string | null;
  net_amount: number | string | null;
  amount_cents: number | bigint | null;
  fee_cents: number | bigint;
  net_amount_cents: number | bigint | null;
  token_symbol: string;
  network: string;
  destination_address: string;
  status: string;
  flags: string[];
  admin_note: string | null;
  payout_tx_hash: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  paid_by: string | null;
  paid_at: string | null;
  created_at: string;
  tokens?:
    | { last_price_cents?: number | null; base_price_cents?: number | null }
    | { last_price_cents?: number | null; base_price_cents?: number | null }[]
    | null;
}

const resolveTokenPriceCents = (tokens: WithdrawalRow["tokens"]): number => {
  if (!tokens) return 0;
  const t = Array.isArray(tokens) ? tokens[0] : tokens;
  if (!t) return 0;
  return toNum(t.last_price_cents ?? t.base_price_cents ?? 0);
};

const toNum = (v: number | bigint | string | null | undefined): number => {
  if (v == null) return 0;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string") return Number(v);
  return v;
};

const mapRow = (row: WithdrawalRow): Withdrawal => {
  const amount = row.amount != null ? toNum(row.amount) : null;
  const priceCents = resolveTokenPriceCents(row.tokens);
  const usdValueCents = amount != null && priceCents > 0
    ? Math.round(amount * priceCents)
    : null;
  return withdrawalSchema.parse({
    id: row.id,
    userId: row.user_id,
    tokenId: row.token_id,
    amount,
    feeAmount: row.fee_amount != null ? toNum(row.fee_amount) : null,
    netAmount: row.net_amount != null ? toNum(row.net_amount) : null,
    amountCents: toNum(row.amount_cents),
    usdValueCents,
    feeCents: toNum(row.fee_cents),
    netAmountCents: toNum(row.net_amount_cents),
    tokenSymbol: row.token_symbol,
    network: row.network,
    destinationAddress: row.destination_address,
    status: row.status,
    flags: row.flags ?? [],
    adminNote: row.admin_note ?? null,
    payoutTxHash: row.payout_tx_hash ?? null,
    reviewedBy: row.reviewed_by ?? null,
    reviewedAt: row.reviewed_at ?? null,
    paidBy: row.paid_by ?? null,
    paidAt: row.paid_at ?? null,
    createdAt: row.created_at,
  });
};

const SELECT =
  "id, user_id, token_id, amount, fee_amount, net_amount, amount_cents, fee_cents, net_amount_cents, token_symbol, network, destination_address, status, flags, admin_note, payout_tx_hash, reviewed_by, reviewed_at, paid_by, paid_at, created_at, tokens(last_price_cents, base_price_cents)";

export const listAdminWithdrawals = async (
  filters: AdminWithdrawalFilters,
): Promise<AdminWithdrawalsResult> => {
  if (!getOptionalServerEnv()) {
    const result = getPreviewAdminWithdrawals();
    const filtered = filters.status
      ? { ...result, items: result.items.filter((w) => w.status === filters.status) }
      : result;
    return filtered;
  }

  const admin = createSupabaseAdminClient();
  let q = admin
    .from("withdrawals")
    .select(SELECT, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(filters.offset ?? 0, (filters.offset ?? 0) + (filters.limit ?? 50) - 1);

  if (filters.status) q = q.eq("status", filters.status);
  if (filters.userId) q = q.eq("user_id", filters.userId);

  const { data, error, count } = await q;

  if (error) {
    throw new ApiClientError(error.message, 500, "ADMIN_WITHDRAWALS_FETCH_FAILED", error);
  }

  return withdrawalsResultSchema.parse({
    items: (data ?? []).map((r) => mapRow(r as unknown as WithdrawalRow)),
    total: count ?? 0,
  });
};

export const approveAdminWithdrawal = async (
  withdrawalId: string,
  adminUserId: string,
  note?: string,
): Promise<Withdrawal> => {
  if (!getOptionalServerEnv()) {
    const all = getPreviewAdminWithdrawals();
    const w = all.items.find((x) => x.id === withdrawalId);
    if (!w) throw new ApiClientError("Not found.", 404, "NOT_FOUND");
    return { ...w, status: "approved", adminNote: note ?? null };
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("approve_withdrawal", {
    p_withdrawal_id: withdrawalId,
    p_admin_user_id: adminUserId,
    p_note: note ?? null,
  });

  if (error) {
    const msg = error.message ?? "Approve failed.";
    const code = msg.includes("NOT_PENDING") ? "NOT_PENDING"
      : msg.includes("NOT_FOUND") ? "NOT_FOUND"
      : "INTERNAL_ERROR";
    throw new ApiClientError(msg, code === "NOT_FOUND" ? 404 : 409, code, error);
  }

  return mapRow(data as unknown as WithdrawalRow);
};

export const markWithdrawalPaid = async (
  withdrawalId: string,
  adminUserId: string,
  txHash: string,
  addressConfirm: string,
  destinationAddress: string,
): Promise<Withdrawal> => {
  const last8 = destinationAddress.slice(-8);
  if (addressConfirm !== last8) {
    throw new ApiClientError(
      "Address confirmation does not match last 8 characters of destination.",
      422,
      "ADDRESS_CONFIRM_FAILED",
    );
  }

  if (!getOptionalServerEnv()) {
    const all = getPreviewAdminWithdrawals();
    const w = all.items.find((x) => x.id === withdrawalId);
    if (!w) throw new ApiClientError("Not found.", 404, "NOT_FOUND");
    return { ...w, status: "paid", payoutTxHash: txHash, paidAt: new Date().toISOString() };
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("mark_withdrawal_paid", {
    p_withdrawal_id: withdrawalId,
    p_admin_user_id: adminUserId,
    p_tx_hash: txHash,
  });

  if (error) {
    const msg = error.message ?? "Mark paid failed.";
    const code = msg.includes("TX_HASH_REQUIRED") ? "TX_HASH_REQUIRED"
      : msg.includes("NOT_APPROVED") ? "NOT_APPROVED"
      : msg.includes("NOT_FOUND") ? "NOT_FOUND"
      : "INTERNAL_ERROR";
    throw new ApiClientError(msg, code === "NOT_FOUND" ? 404 : 422, code, error);
  }

  return mapRow(data as unknown as WithdrawalRow);
};

export const rejectAdminWithdrawal = async (
  withdrawalId: string,
  adminUserId: string,
  note: string,
): Promise<Withdrawal> => {
  if (!getOptionalServerEnv()) {
    const all = getPreviewAdminWithdrawals();
    const w = all.items.find((x) => x.id === withdrawalId);
    if (!w) throw new ApiClientError("Not found.", 404, "NOT_FOUND");
    return { ...w, status: "rejected", adminNote: note };
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("reject_withdrawal", {
    p_withdrawal_id: withdrawalId,
    p_admin_user_id: adminUserId,
    p_note: note,
  });

  if (error) {
    const msg = error.message ?? "Reject failed.";
    const code = msg.includes("NOT_REFUNDABLE") ? "NOT_REFUNDABLE"
      : msg.includes("NOT_FOUND") ? "NOT_FOUND"
      : "INTERNAL_ERROR";
    throw new ApiClientError(msg, code === "NOT_FOUND" ? 404 : 409, code, error);
  }

  return mapRow(data as unknown as WithdrawalRow);
};
