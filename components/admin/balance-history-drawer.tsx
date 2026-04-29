"use client";

import { useCallback, useEffect, useState } from "react";
import SideDrawer from "@/components/admin/shell/SideDrawer";
import { formatUsdFromCents } from "@/lib/utils/format";
import type { AdminTransaction } from "@/types/admin";

interface BalanceHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  refreshKey?: number;
  user: { email: string; userId: string; username: string } | null;
}

const PAGE_SIZE = 20;

const TRANSACTION_KIND_LABELS: Record<string, string> = {
  admin_credit: "Admin credit",
  admin_debit: "Admin debit",
  bonus_credit: "Bonus",
  bonus_expire: "Bonus expired",
  deposit: "Deposit",
  referral_payout: "Referral payout",
  swap: "Swap",
  trade_cancel_refund: "Trade cancelled",
  trade_credit: "Trade payout",
  trade_debit: "Trade stake",
  trade_lose: "Trade lost",
  trade_void: "Trade voided",
  trade_win: "Trade won",
  withdrawal: "Withdrawal",
};

const txTimestamp = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  year: "numeric",
});

const formatSignedUsd = (cents: number) =>
  `${cents > 0 ? "+" : cents < 0 ? "−" : ""}${formatUsdFromCents(Math.abs(cents))}`;

const formatTokenAmount = (amount: number, symbol: string | null) => {
  const abs = Math.abs(amount);
  // Show up to 8 decimals, trim trailing zeros, keep at least 2.
  const fixed = abs.toFixed(8).replace(/0+$/, "").replace(/\.$/, ".00");
  const sign = amount > 0 ? "+" : amount < 0 ? "−" : "";
  return `${sign}${fixed}${symbol ? ` ${symbol}` : ""}`;
};

type AmountDisplay = { text: string; tone: "up" | "down" | "neutral" };

const renderAmount = (tx: AdminTransaction): AmountDisplay => {
  if (tx.tokenAmount !== null && tx.tokenAmount !== 0) {
    return {
      text: formatTokenAmount(tx.tokenAmount, tx.tokenSymbol),
      tone: tx.tokenAmount > 0 ? "up" : "down",
    };
  }
  if (tx.tokenAmount === 0 && tx.tokenSymbol) {
    return { text: `0 ${tx.tokenSymbol}`, tone: "neutral" };
  }
  if (tx.amountCents !== 0) {
    return {
      text: formatSignedUsd(tx.amountCents),
      tone: tx.amountCents > 0 ? "up" : "down",
    };
  }
  return { text: "—", tone: "neutral" };
};

export default function BalanceHistoryDrawer({
  isOpen,
  onClose,
  refreshKey = 0,
  user,
}: BalanceHistoryDrawerProps) {
  const [items, setItems] = useState<AdminTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPage = useCallback(
    async (userId: string, offset: number, append: boolean) => {
      const setBusy = append ? setLoadingMore : setLoading;
      setBusy(true);
      try {
        const res = await fetch(
          `/api/admin/users/${userId}/transactions?limit=${PAGE_SIZE}&offset=${offset}`,
        );
        const data = (await res.json()) as { items: AdminTransaction[]; total: number };
        const next = data.items ?? [];
        setItems((prev) => (append ? [...prev, ...next] : next));
        setTotal(data.total ?? 0);
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!isOpen || !user) return;
    setItems([]);
    setTotal(0);
    fetchPage(user.userId, 0, false);
  }, [isOpen, user, refreshKey, fetchPage]);

  const handleLoadMore = () => {
    if (!user) return;
    fetchPage(user.userId, items.length, true);
  };

  const hasMore = items.length < total;

  return (
    <SideDrawer
      eyebrow={user ? `${user.username} · ${user.email}` : undefined}
      isOpen={isOpen}
      onClose={onClose}
      title="Balance history"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs text-muted">
          <span>
            {total === 0
              ? "No transactions yet"
              : `Showing ${items.length} of ${total}`}
          </span>
        </div>

        {loading && items.length === 0 ? (
          <p className="text-xs text-muted">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-muted">
            {user ? "No transactions yet" : "Select a user to view history"}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((tx) => {
              const amount = renderAmount(tx);
              const toneClass =
                amount.tone === "up"
                  ? "text-[#0ecb81]"
                  : amount.tone === "down"
                  ? "text-[#f6465d]"
                  : "text-muted";
              return (
                <li
                  key={tx.id}
                  className="rounded-[14px] border border-border bg-background/30 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-foreground">
                      {TRANSACTION_KIND_LABELS[tx.kind] ?? tx.kind}
                    </span>
                    <span className={`text-sm font-semibold ${toneClass}`}>
                      {amount.text}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-muted">
                    {txTimestamp.format(new Date(tx.createdAt))}
                  </div>
                  {tx.memo && <p className="mt-1 text-xs text-muted">{tx.memo}</p>}
                </li>
              );
            })}
          </ul>
        )}

        {hasMore && (
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="mt-2 self-center rounded-full border border-border bg-background/30 px-5 py-2 text-xs font-semibold text-foreground transition hover:border-brand disabled:opacity-40"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        )}
      </div>
    </SideDrawer>
  );
}
