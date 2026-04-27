import "server-only";
import { ApiClientError } from "@/lib/api/client";
import { getOptionalServerEnv } from "@/lib/env/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { depositSchema, depositsResultSchema } from "@/schemas/deposit";
import type {
  AdminDepositFilters,
  AdminDepositsResult,
  Deposit,
} from "@/types/deposit";
import { getPreviewAdminDeposits } from "./preview-data";

interface DepositRow {
  id: string;
  user_id: string;
  token_id: string;
  network: string;
  amount_cents: number | bigint;
  proof_path: string;
  tx_hash: string | null;
  status: string;
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  tokens?: { symbol: string } | { symbol: string }[] | null;
}

const toNum = (v: number | bigint | null | undefined): number => {
  if (v == null) return 0;
  if (typeof v === "bigint") return Number(v);
  return v;
};

const resolveSymbol = (tokens: DepositRow["tokens"]): string => {
  if (!tokens) return "";
  if (Array.isArray(tokens)) return tokens[0]?.symbol ?? "";
  return tokens.symbol;
};

const mapRow = (row: DepositRow): Deposit =>
  depositSchema.parse({
    id: row.id,
    userId: row.user_id,
    tokenId: row.token_id,
    tokenSymbol: resolveSymbol(row.tokens),
    network: row.network,
    amountCents: toNum(row.amount_cents),
    proofPath: row.proof_path,
    txHash: row.tx_hash ?? null,
    status: row.status,
    adminNote: row.admin_note ?? null,
    reviewedBy: row.reviewed_by ?? null,
    reviewedAt: row.reviewed_at ?? null,
    createdAt: row.created_at,
  });

const SELECT = "id, user_id, token_id, network, amount_cents, proof_path, tx_hash, status, admin_note, reviewed_by, reviewed_at, created_at, tokens(symbol)";

export const listAdminDeposits = async (
  filters: AdminDepositFilters,
): Promise<AdminDepositsResult> => {
  if (!getOptionalServerEnv()) {
    const result = getPreviewAdminDeposits();
    const filtered = filters.status
      ? { ...result, items: result.items.filter((d) => d.status === filters.status) }
      : result;
    return filtered;
  }

  const admin = createSupabaseAdminClient();
  let q = admin
    .from("deposits")
    .select(SELECT, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(filters.offset ?? 0, (filters.offset ?? 0) + (filters.limit ?? 50) - 1);

  if (filters.status) q = q.eq("status", filters.status);
  if (filters.userId) q = q.eq("user_id", filters.userId);

  const { data, error, count } = await q;

  if (error) {
    throw new ApiClientError(error.message, 500, "ADMIN_DEPOSITS_FETCH_FAILED", error);
  }

  return depositsResultSchema.parse({
    items: (data ?? []).map((r) => mapRow(r as unknown as DepositRow)),
    total: count ?? 0,
  });
};

export const approveAdminDeposit = async (
  depositId: string,
  adminUserId: string,
  note?: string,
  amountCents?: number,
): Promise<Deposit> => {
  if (!getOptionalServerEnv()) {
    const all = getPreviewAdminDeposits();
    const d = all.items.find((x) => x.id === depositId);
    if (!d) throw new ApiClientError("Deposit not found.", 404, "DEPOSIT_NOT_FOUND");
    return {
      ...d,
      status: "approved",
      adminNote: note ?? null,
      amountCents: amountCents ?? d.amountCents,
    };
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("approve_deposit", {
    p_deposit_id: depositId,
    p_admin_user_id: adminUserId,
    p_note: note ?? null,
    p_amount_cents: amountCents ?? null,
  });

  if (error) {
    const msg = error.message ?? "Approve deposit failed.";
    const code = msg.includes("DEPOSIT_NOT_FOUND") ? "DEPOSIT_NOT_FOUND"
      : msg.includes("ALREADY_REVIEWED") ? "ALREADY_REVIEWED"
      : "INTERNAL_ERROR";
    throw new ApiClientError(msg, code === "DEPOSIT_NOT_FOUND" ? 404 : 409, code, error);
  }

  const row = data as unknown as DepositRow;
  return mapRow({ ...row, tokens: null });
};

export const rejectAdminDeposit = async (
  depositId: string,
  adminUserId: string,
  note: string,
): Promise<Deposit> => {
  if (!getOptionalServerEnv()) {
    const all = getPreviewAdminDeposits();
    const d = all.items.find((x) => x.id === depositId);
    if (!d) throw new ApiClientError("Deposit not found.", 404, "DEPOSIT_NOT_FOUND");
    return { ...d, status: "rejected", adminNote: note };
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("reject_deposit", {
    p_deposit_id: depositId,
    p_admin_user_id: adminUserId,
    p_note: note,
  });

  if (error) {
    const msg = error.message ?? "Reject deposit failed.";
    const code = msg.includes("DEPOSIT_NOT_FOUND") ? "DEPOSIT_NOT_FOUND"
      : msg.includes("ALREADY_REVIEWED") ? "ALREADY_REVIEWED"
      : "INTERNAL_ERROR";
    throw new ApiClientError(msg, code === "DEPOSIT_NOT_FOUND" ? 404 : 409, code, error);
  }

  const row = data as unknown as DepositRow;
  return mapRow({ ...row, tokens: null });
};
