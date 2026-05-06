import "server-only";
import { ApiClientError } from "@/lib/api/client";
import { getOptionalServerEnv } from "@/lib/env/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface Transaction {
  id: string;
  userId: string;
  kind: string;
  amountCents: number;
  balanceAfterCents: number | null;
  referenceId: string | null;
  memo: string | null;
  createdAt: string;
  // Token-denominated fields. Populated for kinds whose ledger movement is in
  // tokens (post USD→token migration); null for legacy USD-only rows.
  tokenId: string | null;
  tokenSymbol: string | null;
  tokenAmount: number | null;
}

export interface TransactionsResult {
  items: Transaction[];
  total: number;
}

const PREVIEW_TXNS: Transaction[] = [
  { id: "tx-1", userId: "preview", kind: "deposit", amountCents: 50000, balanceAfterCents: 50000, referenceId: null, memo: "Deposit approved", createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), tokenId: null, tokenSymbol: null, tokenAmount: null },
  { id: "tx-2", userId: "preview", kind: "trade_debit", amountCents: 0, balanceAfterCents: null, referenceId: null, memo: "Trade placed: ETH long", createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), tokenId: "preview-eth", tokenSymbol: "ETH", tokenAmount: -0.1085 },
  { id: "tx-3", userId: "preview", kind: "trade_win", amountCents: 0, balanceAfterCents: null, referenceId: null, memo: "Trade won", createdAt: new Date(Date.now() - 86400000).toISOString(), tokenId: "preview-eth", tokenSymbol: "ETH", tokenAmount: 0.22785 },
];

const toNum = (v: unknown): number => {
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

const toIntOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "number") return Number.isFinite(v) ? Math.trunc(v) : null;
  if (typeof v === "string") {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

type Metadata = Record<string, unknown> | null;

const readString = (m: Metadata, key: string): string | null => {
  const v = m?.[key];
  return typeof v === "string" && v.length > 0 ? v : null;
};

// Derive the token-denominated movement for a transaction row.
// Returns null when the kind has no token-side movement (legacy USD-only kinds
// like deposit, withdrawal, bonus, swap-USD-leg, or pre-0036 admin credits).
const deriveTokenMovement = (
  kind: string,
  metadata: Metadata,
): { tokenId: string; amount: number } | null => {
  if (!metadata) return null;

  switch (kind) {
    case "trade_debit": {
      const tokenId = readString(metadata, "token_id");
      const stake = toNum(metadata.stake_amount);
      if (!tokenId || stake === 0) return null;
      return { tokenId, amount: -Math.abs(stake) };
    }
    case "trade_win":
    case "trade_void": {
      const tokenId = readString(metadata, "lock_token_id") ?? readString(metadata, "token_id");
      const payout = toNum(metadata.payout_amount);
      if (!tokenId) return null;
      return { tokenId, amount: payout };
    }
    case "trade_lose": {
      const tokenId = readString(metadata, "lock_token_id") ?? readString(metadata, "token_id");
      if (!tokenId) return null;
      return { tokenId, amount: 0 };
    }
    case "trade_cancel_refund": {
      const tokenId = readString(metadata, "token_id") ?? readString(metadata, "lock_token_id");
      const amt = toNum(metadata.token_amount ?? metadata.stake_amount);
      if (!tokenId) return null;
      return { tokenId, amount: Math.abs(amt) };
    }
    case "admin_credit":
    case "admin_debit": {
      const tokenId = readString(metadata, "token_id");
      if (!tokenId) return null;
      const delta = toNum(metadata.delta);
      return { tokenId, amount: delta };
    }
    case "swap": {
      // Swaps store both legs in metadata. We can't pick one side without
      // more context (from/to symbol), so leave token side null and let the
      // caller render the memo + USD leg.
      return null;
    }
    default:
      return null;
  }
};

export const listTransactions = async (
  userId: string,
  limit: number,
  offset: number,
  excludeKinds: string[] = [],
): Promise<TransactionsResult> => {
  if (!getOptionalServerEnv()) {
    const filtered = excludeKinds.length
      ? PREVIEW_TXNS.filter((t) => !excludeKinds.includes(t.kind))
      : PREVIEW_TXNS;
    return { items: filtered, total: filtered.length };
  }

  const admin = createSupabaseAdminClient();
  let query = admin
    .from("transactions")
    .select(
      "id, user_id, kind, amount_cents, balance_after_cents, reference_id, memo, metadata, created_at",
      { count: "exact" },
    )
    .eq("user_id", userId);

  if (excludeKinds.length > 0) {
    query = query.not("kind", "in", `(${excludeKinds.map((k) => `"${k}"`).join(",")})`);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new ApiClientError(error.message, 500, "TRANSACTIONS_FETCH_FAILED", error);
  }

  const rows = (data ?? []) as Array<{
    id: string;
    user_id: string;
    kind: string;
    amount_cents: number | string | null;
    balance_after_cents: number | string | null;
    reference_id: string | null;
    memo: string | null;
    metadata: Metadata;
    created_at: string;
  }>;

  // Resolve token symbols for any token IDs referenced in the page.
  const movements = rows.map((r) => deriveTokenMovement(r.kind, r.metadata));
  const tokenIds = Array.from(
    new Set(movements.filter((m): m is { tokenId: string; amount: number } => m !== null).map((m) => m.tokenId)),
  );

  const symbolByTokenId = new Map<string, string>();
  if (tokenIds.length > 0) {
    const { data: tokenRows } = await admin
      .from("tokens")
      .select("id, symbol")
      .in("id", tokenIds);
    for (const t of (tokenRows ?? []) as Array<{ id: string; symbol: string }>) {
      symbolByTokenId.set(t.id, t.symbol);
    }
  }

  const items: Transaction[] = rows.map((r, i) => {
    const movement = movements[i];
    return {
      id: r.id,
      userId: r.user_id,
      kind: r.kind,
      amountCents: toIntOrNull(r.amount_cents) ?? 0,
      balanceAfterCents: toIntOrNull(r.balance_after_cents),
      referenceId: r.reference_id,
      memo: r.memo,
      createdAt: r.created_at,
      tokenId: movement?.tokenId ?? null,
      tokenSymbol: movement ? symbolByTokenId.get(movement.tokenId) ?? null : null,
      tokenAmount: movement?.amount ?? null,
    };
  });

  return { items, total: count ?? 0 };
};
