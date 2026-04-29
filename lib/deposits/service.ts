import "server-only";
import { ApiClientError } from "@/lib/api/client";
import { getOptionalServerEnv } from "@/lib/env/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { depositSchema, depositsResultSchema } from "@/schemas/deposit";
import type {
  Deposit,
  DepositsResult,
  SubmitDepositInput,
} from "@/types/deposit";
import {
  getPreviewDeposits,
  previewSubmitDeposit,
} from "./preview-data";

interface DepositRow {
  id: string;
  user_id: string;
  token_id: string;
  network: string;
  amount: number | string | null;
  amount_cents: number | bigint | null;
  proof_path: string;
  tx_hash: string | null;
  status: string;
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  tokens?: { symbol: string } | { symbol: string }[] | null;
}

const toNum = (v: number | bigint | string | null | undefined): number => {
  if (v == null) return 0;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string") return Number(v);
  return v;
};

const resolveSymbol = (tokens: DepositRow["tokens"]): string => {
  if (!tokens) return "";
  if (Array.isArray(tokens)) return tokens[0]?.symbol ?? "";
  return tokens.symbol;
};

const mapDepositRow = (row: DepositRow): Deposit =>
  depositSchema.parse({
    id: row.id,
    userId: row.user_id,
    tokenId: row.token_id,
    tokenSymbol: resolveSymbol(row.tokens),
    network: row.network,
    amount: row.amount != null ? toNum(row.amount) : null,
    amountCents: toNum(row.amount_cents),
    proofPath: row.proof_path,
    txHash: row.tx_hash ?? null,
    status: row.status,
    adminNote: row.admin_note ?? null,
    reviewedBy: row.reviewed_by ?? null,
    reviewedAt: row.reviewed_at ?? null,
    createdAt: row.created_at,
  });

const DEPOSIT_SELECT =
  "id, user_id, token_id, network, amount, amount_cents, proof_path, tx_hash, status, admin_note, reviewed_by, reviewed_at, created_at, tokens(symbol)";

export const listUserDeposits = async (userId: string): Promise<DepositsResult> => {
  if (!getOptionalServerEnv()) {
    return getPreviewDeposits();
  }

  const admin = createSupabaseAdminClient();
  const { data, error, count } = await admin
    .from("deposits")
    .select(DEPOSIT_SELECT, { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new ApiClientError(error.message, 500, "DEPOSITS_FETCH_FAILED", error);
  }

  return depositsResultSchema.parse({
    items: (data ?? []).map((r) => mapDepositRow(r as unknown as DepositRow)),
    total: count ?? 0,
  });
};

export const submitDeposit = async (
  userId: string,
  input: SubmitDepositInput,
): Promise<Deposit> => {
  if (!getOptionalServerEnv()) {
    return previewSubmitDeposit(input);
  }

  const admin = createSupabaseAdminClient();

  const { data: tokenRow, error: tokenErr } = await admin
    .from("tokens")
    .select("id, min_deposit")
    .eq("symbol", input.tokenSymbol.toUpperCase())
    .maybeSingle();

  if (tokenErr || !tokenRow) {
    throw new ApiClientError("Token not found.", 404, "TOKEN_NOT_FOUND");
  }

  const minDeposit = toNum(tokenRow.min_deposit as number | string | null);
  if (input.amount < minDeposit) {
    throw new ApiClientError(
      `Amount is below the minimum deposit (${minDeposit} ${input.tokenSymbol.toUpperCase()}).`,
      422,
      "AMOUNT_BELOW_MIN",
    );
  }

  const { data, error } = await admin.rpc("submit_deposit", {
    p_user_id: userId,
    p_token_id: tokenRow.id,
    p_network: input.network,
    p_amount: input.amount,
    p_proof_path: input.proofPath,
    p_tx_hash: input.txHash ?? null,
  });

  if (error) {
    const msg = error.message ?? "Submit deposit failed.";
    const code = msg.includes("WALLET_DISABLED") ? "WALLET_DISABLED"
      : msg.includes("AMOUNT_BELOW_MIN") ? "AMOUNT_BELOW_MIN"
      : msg.includes("PROOF_REQUIRED") ? "PROOF_REQUIRED"
      : msg.includes("DUPLICATE_TX_HASH") ? "DUPLICATE_TX_HASH"
      : "INTERNAL_ERROR";
    throw new ApiClientError(msg, 422, code, error);
  }

  const { data: row, error: fetchErr } = await admin
    .from("deposits")
    .select(DEPOSIT_SELECT)
    .eq("id", (data as { id: string }).id)
    .single();

  if (fetchErr || !row) {
    throw new ApiClientError("Deposit created but could not be fetched.", 500, "INTERNAL_ERROR");
  }

  return mapDepositRow(row as unknown as DepositRow);
};
