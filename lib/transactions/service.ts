import "server-only";
import { ApiClientError } from "@/lib/api/client";
import { getOptionalServerEnv } from "@/lib/env/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface Transaction {
  id: string;
  userId: string;
  kind: string;
  amountCents: number;
  balanceAfterCents: number;
  referenceId: string | null;
  memo: string | null;
  createdAt: string;
}

export interface TransactionsResult {
  items: Transaction[];
  total: number;
}

const PREVIEW_TXNS: Transaction[] = [
  { id: "tx-1", userId: "preview", kind: "deposit", amountCents: 50000, balanceAfterCents: 50000, referenceId: null, memo: "Deposit approved", createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: "tx-2", userId: "preview", kind: "trade_debit", amountCents: -25000, balanceAfterCents: 25000, referenceId: null, memo: "Trade placed", createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: "tx-3", userId: "preview", kind: "trade_credit", amountCents: 46250, balanceAfterCents: 71250, referenceId: null, memo: "Trade won", createdAt: new Date(Date.now() - 86400000).toISOString() },
];

export const listTransactions = async (
  userId: string,
  limit: number,
  offset: number,
): Promise<TransactionsResult> => {
  if (!getOptionalServerEnv()) {
    return { items: PREVIEW_TXNS, total: PREVIEW_TXNS.length };
  }

  const admin = createSupabaseAdminClient();
  const { data, error, count } = await admin
    .from("transactions")
    .select("id, user_id, kind, amount_cents, balance_after_cents, reference_id, memo, created_at", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new ApiClientError(error.message, 500, "TRANSACTIONS_FETCH_FAILED", error);
  }

  const toNum = (v: unknown): number => {
    if (typeof v === "bigint") return Number(v);
    if (typeof v === "number") return v;
    if (typeof v === "string") return parseInt(v, 10) || 0;
    return 0;
  };

  const items: Transaction[] = (data ?? []).map((r) => ({
    id: r.id as string,
    userId: r.user_id as string,
    kind: r.kind as string,
    amountCents: toNum(r.amount_cents),
    balanceAfterCents: toNum(r.balance_after_cents),
    referenceId: r.reference_id as string | null,
    memo: r.memo as string | null,
    createdAt: r.created_at as string,
  }));

  return { items, total: count ?? 0 };
};
