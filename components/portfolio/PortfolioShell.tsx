"use client";

import { useState, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronLeft,
  ChevronRight,
  Download,
  BarChart3,
} from "lucide-react";
import { formatUsdFromCents } from "@/lib/utils/format";
import type { UserTrade } from "@/types/trade";

interface PortfolioShellProps {
  initialItems: UserTrade[];
  initialTotal: number;
  pageSize: number;
}

type OutcomeFilter = "all" | "win" | "lose" | "void";

const OUTCOME_ICON = {
  win: <TrendingUp size={14} className="text-up" />,
  lose: <TrendingDown size={14} className="text-down" />,
  void: <Minus size={14} className="text-muted" />,
};

const OUTCOME_LABEL = {
  win: "text-up",
  lose: "text-down",
  void: "text-muted",
};

function payout(trade: UserTrade): number {
  if (trade.outcome === "win") return Math.round((trade.stakeCents * trade.payoutBps) / 10000);
  if (trade.outcome === "void") return trade.stakeCents;
  return 0;
}

function netPnl(trade: UserTrade): number {
  return payout(trade) - trade.stakeCents;
}

function exportCsv(items: UserTrade[]) {
  const rows = [
    ["Date", "Token", "Direction", "Stake", "Outcome", "Payout", "Net P&L"],
    ...items.map((t) => [
      new Date(t.endTime).toLocaleString(),
      t.tokenSymbol,
      t.direction,
      (t.stakeCents / 100).toFixed(2),
      t.outcome ?? "-",
      (payout(t) / 100).toFixed(2),
      (netPnl(t) / 100).toFixed(2),
    ]),
  ];
  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `trusttrade-trades-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PortfolioShell({
  initialItems,
  initialTotal,
  pageSize,
}: PortfolioShellProps) {
  const [page, setPage] = useState(0);
  const [items, setItems] = useState(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [filter, setFilter] = useState<OutcomeFilter>("all");
  const [loading, setLoading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const fetchPage = useCallback(
    async (nextPage: number, outcome: OutcomeFilter) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          status: "settled",
          limit: String(pageSize),
          offset: String(nextPage * pageSize),
        });
        if (outcome !== "all") params.set("outcome", outcome);
        const res = await fetch(`/api/trades?${params}`);
        const json = await res.json() as { data?: { items: UserTrade[]; total: number } };
        if (json.data) {
          setItems(json.data.items);
          setTotal(json.data.total);
        }
      } finally {
        setLoading(false);
      }
    },
    [pageSize],
  );

  const handleFilter = (next: OutcomeFilter) => {
    setFilter(next);
    setPage(0);
    fetchPage(0, next);
  };

  const handlePage = (next: number) => {
    setPage(next);
    fetchPage(next, filter);
  };

  const totalWins = items.filter((t) => t.outcome === "win").length;
  const totalNet = items.reduce((sum, t) => sum + netPnl(t), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <BarChart3 size={18} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand">
              Trade history
            </p>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
              Portfolio
            </h1>
          </div>
        </div>
        <button
          type="button"
          onClick={() => exportCsv(items)}
          className="flex items-center gap-2 rounded-full border border-border bg-background/30 px-4 py-2 text-sm font-semibold text-foreground transition hover:border-brand"
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-[24px] border border-border bg-surface-soft p-4">
          <p className="text-xs text-muted">Total trades</p>
          <p className="mt-1 font-display text-2xl text-foreground">{total}</p>
        </div>
        <div className="rounded-[24px] border border-border bg-surface-soft p-4">
          <p className="text-xs text-muted">Wins (this page)</p>
          <p className="mt-1 font-display text-2xl text-up">{totalWins}</p>
        </div>
        <div className="rounded-[24px] border border-border bg-surface-soft p-4">
          <p className="text-xs text-muted">Net P&L (this page)</p>
          <p className={`mt-1 font-display text-2xl ${totalNet >= 0 ? "text-up" : "text-down"}`}>
            {totalNet >= 0 ? "+" : ""}
            {formatUsdFromCents(totalNet)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(["all", "win", "lose", "void"] as OutcomeFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => handleFilter(f)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition ${
              filter === f
                ? "bg-brand text-background"
                : "border border-border bg-background/30 text-muted hover:border-brand"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <section className="rounded-[28px] border border-border bg-surface-soft overflow-hidden">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-muted">
            <BarChart3 size={36} className="opacity-30" />
            <p className="text-sm">No trades yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Token</th>
                  <th className="px-5 py-3">Direction</th>
                  <th className="px-5 py-3">Stake</th>
                  <th className="px-5 py-3">Outcome</th>
                  <th className="px-5 py-3 text-right">Net P&L</th>
                </tr>
              </thead>
              <tbody className={loading ? "opacity-50" : ""}>
                {items.map((t) => {
                  const nl = netPnl(t);
                  return (
                    <tr
                      key={t.id}
                      className="border-b border-border/50 transition hover:bg-background/20 last:border-0"
                    >
                      <td className="px-5 py-3 text-muted">
                        {new Date(t.endTime).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 font-semibold text-foreground">
                        {t.tokenSymbol}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold capitalize ${
                            t.direction === "long" ? "text-up" : "text-down"
                          }`}
                        >
                          {t.direction === "long" ? (
                            <TrendingUp size={13} />
                          ) : (
                            <TrendingDown size={13} />
                          )}
                          {t.direction}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-foreground">
                        {formatUsdFromCents(t.stakeCents)}
                      </td>
                      <td className="px-5 py-3">
                        {t.outcome ? (
                          <span
                            className={`inline-flex items-center gap-1.5 font-semibold capitalize ${OUTCOME_LABEL[t.outcome]}`}
                          >
                            {OUTCOME_ICON[t.outcome]}
                            {t.outcome}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td
                        className={`px-5 py-3 text-right font-semibold tabular-nums ${
                          nl > 0 ? "text-up" : nl < 0 ? "text-down" : "text-muted"
                        }`}
                      >
                        {nl > 0 ? "+" : ""}
                        {formatUsdFromCents(nl)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => handlePage(page - 1)}
            className="rounded-full border border-border p-2 transition hover:border-brand disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-muted">
            Page {page + 1} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages - 1}
            onClick={() => handlePage(page + 1)}
            className="rounded-full border border-border p-2 transition hover:border-brand disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
