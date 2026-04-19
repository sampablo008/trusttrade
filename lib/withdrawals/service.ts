import "server-only";
import { ApiClientError } from "@/lib/api/client";
import { getOptionalServerEnv } from "@/lib/env/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { withdrawalSchema, withdrawalsResultSchema } from "@/schemas/withdrawal";
import type {
  RequestWithdrawalInput,
  Withdrawal,
  WithdrawalsResult,
} from "@/types/withdrawal";
import {
  getPreviewWithdrawals,
  previewRequestWithdrawal,
} from "./preview-data";

interface WithdrawalRow {
  id: string;
  user_id: string;
  amount_cents: number | bigint;
  fee_cents: number | bigint;
  net_amount_cents: number | bigint;
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
}

const toNum = (v: number | bigint | null | undefined): number => {
  if (v == null) return 0;
  if (typeof v === "bigint") return Number(v);
  return v;
};

const mapRow = (row: WithdrawalRow): Withdrawal =>
  withdrawalSchema.parse({
    id: row.id,
    userId: row.user_id,
    amountCents: toNum(row.amount_cents),
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

const SELECT = "id, user_id, amount_cents, fee_cents, net_amount_cents, token_symbol, network, destination_address, status, flags, admin_note, payout_tx_hash, reviewed_by, reviewed_at, paid_by, paid_at, created_at";

export const listUserWithdrawals = async (userId: string): Promise<WithdrawalsResult> => {
  if (!getOptionalServerEnv()) {
    return getPreviewWithdrawals();
  }

  const admin = createSupabaseAdminClient();
  const { data, error, count } = await admin
    .from("withdrawals")
    .select(SELECT, { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new ApiClientError(error.message, 500, "WITHDRAWALS_FETCH_FAILED", error);
  }

  return withdrawalsResultSchema.parse({
    items: (data ?? []).map((r) => mapRow(r as unknown as WithdrawalRow)),
    total: count ?? 0,
  });
};

export const requestWithdrawal = async (
  userId: string,
  input: RequestWithdrawalInput,
): Promise<Withdrawal> => {
  if (!getOptionalServerEnv()) {
    return previewRequestWithdrawal(input);
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("request_withdrawal", {
    p_user_id: userId,
    p_amount_cents: input.amountCents,
    p_token_symbol: input.tokenSymbol,
    p_network: input.network,
    p_destination_address: input.destinationAddress,
  });

  if (error) {
    const msg = error.message ?? "Withdrawal failed.";
    const code = msg.includes("DEST_REQUIRED") ? "DEST_REQUIRED"
      : msg.includes("BELOW_MIN_WITHDRAW") ? "BELOW_MIN_WITHDRAW"
      : msg.includes("INSUFFICIENT_WITHDRAWABLE") ? "INSUFFICIENT_WITHDRAWABLE"
      : msg.includes("FEE_EXCEEDS_AMOUNT") ? "FEE_EXCEEDS_AMOUNT"
      : "INTERNAL_ERROR";
    throw new ApiClientError(msg, 422, code, error);
  }

  return mapRow(data as unknown as WithdrawalRow);
};

export const cancelWithdrawal = async (
  userId: string,
  withdrawalId: string,
): Promise<Withdrawal> => {
  if (!getOptionalServerEnv()) {
    const list = getPreviewWithdrawals();
    const w = list.items.find((x) => x.id === withdrawalId);
    if (!w) throw new ApiClientError("Not found.", 404, "NOT_FOUND");
    return { ...w, status: "cancelled" };
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("cancel_withdrawal", {
    p_withdrawal_id: withdrawalId,
    p_user_id: userId,
  });

  if (error) {
    const msg = error.message ?? "Cancel failed.";
    const code = msg.includes("NOT_CANCELLABLE") ? "NOT_CANCELLABLE"
      : msg.includes("NOT_FOUND") ? "NOT_FOUND"
      : "INTERNAL_ERROR";
    throw new ApiClientError(msg, code === "NOT_FOUND" ? 404 : 409, code, error);
  }

  return mapRow(data as unknown as WithdrawalRow);
};
