import "server-only";
import { verifyWithdrawalPin } from "@/lib/account/pin-service";
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
  const v = t.last_price_cents ?? t.base_price_cents ?? 0;
  return typeof v === "bigint" ? Number(v) : Number(v) || 0;
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
  await verifyWithdrawalPin(userId, input.withdrawalPin);

  if (!getOptionalServerEnv()) {
    return previewRequestWithdrawal(input);
  }

  const admin = createSupabaseAdminClient();

  const { data: tokenRow, error: tokenErr } = await admin
    .from("tokens")
    .select("id")
    .eq("symbol", input.tokenSymbol.toUpperCase())
    .maybeSingle();

  if (tokenErr || !tokenRow) {
    throw new ApiClientError("Token not found.", 404, "TOKEN_NOT_FOUND");
  }

  const { data, error } = await admin.rpc("request_withdrawal", {
    p_user_id: userId,
    p_token_id: tokenRow.id,
    p_amount: input.amount,
    p_network: input.network,
    p_destination_address: input.destinationAddress,
  });

  if (error) {
    const msg = error.message ?? "Withdrawal failed.";
    const code = msg.includes("DEST_REQUIRED") ? "DEST_REQUIRED"
      : msg.includes("BELOW_MIN_WITHDRAW") ? "BELOW_MIN_WITHDRAW"
      : msg.includes("INSUFFICIENT_TOKEN_BALANCE") ? "INSUFFICIENT_TOKEN_BALANCE"
      : msg.includes("FEE_EXCEEDS_AMOUNT") ? "FEE_EXCEEDS_AMOUNT"
      : msg.includes("AMOUNT_INVALID") ? "AMOUNT_INVALID"
      : msg.includes("TOKEN_NOT_FOUND") ? "TOKEN_NOT_FOUND"
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
