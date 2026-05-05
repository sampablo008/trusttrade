"use client";

import { useState, useCallback, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronLeft,
  ChevronRight,
  Download,
  BarChart3,
  Activity,
} from "lucide-react";
import { formatUsdFromCents } from "@/lib/utils/format";
import type { UserTrade } from "@/types/trade";

interface PortfolioShellProps {
  initialItems: UserTrade[];
  initialTotal: number;
  initialActive: UserTrade[];
  pageSize: number;
}

type OutcomeFilter = "all" | "win" | "lose";

function payoutCents(trade: UserTrade): number {
  if (trade.outcome === "win") {
    return trade.stakeCents + Math.round((trade.stakeCents * trade.payoutBps) / 10000);
  }
  if (trade.outcome === "void") return trade.stakeCents;
  return 0;
}

function profitCents(trade: UserTrade): number {
  return payoutCents(trade) - trade.stakeCents;
}

function priceFromCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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
      (payoutCents(t) / 100).toFixed(2),
      (profitCents(t) / 100).toFixed(2),
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

function ActiveTradeCard({ trade }: { trade: UserTrade }) {
  const endMs = new Date(trade.endTime).getTime();
  const [remaining, setRemaining] = useState(() => endMs - Date.now());

  useEffect(() => {
    const id = setInterval(() => setRemaining(endMs - Date.now()), 1000);
    return () => clearInterval(id);
  }, [endMs]);

  const totalSeconds = Math.max(0, Math.ceil(remaining / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  const isLong = trade.direction === "long";
  const projectedReturn = trade.stakeCents + Math.round((trade.stakeCents * trade.payoutBps) / 10000);
  const rate = (trade.payoutBps / 100).toFixed(2);

  return (
    <div className="rounded-[24px] border border-brand/40 bg-brand/5 p-5 shadow-[0_0_0_1px_rgba(0,200,150,0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand">
            <Activity size={12} /> Active
          </span>
          <span className="text-sm font-semibold text-foreground">
            Trade for {(trade.stakeCents / 100).toFixed(2)} USD (In {trade.tokenSymbol})
          </span>
        </div>
        <span className="rounded-full border border-brand/40 px-3 py-1 text-xs font-bold tabular-nums text-brand">
          {m}:{String(s).padStart(2, "0")}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted">Type</p>
          <span
            className={`mt-0.5 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold uppercase ${
              isLong ? "bg-up/15 text-up" : "bg-down/15 text-down"
            }`}
          >
            {isLong ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {trade.direction}
          </span>
        </div>
        <div>
          <p className="text-xs text-muted">Started</p>
          <p className="text-foreground">{new Date(trade.startedAt).toLocaleTimeString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Entry Price</p>
          <p className="font-semibold text-foreground tabular-nums">
            {priceFromCents(trade.entryPriceCents)} USD
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">Rate of Return</p>
          <p className="font-semibold text-brand">{rate}%</p>
        </div>
        <div>
          <p className="text-xs text-muted">Potential Return</p>
          <p className="font-semibold text-foreground">
            {(projectedReturn / 100).toFixed(2)} USD
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">Closes</p>
          <p className="text-foreground">{new Date(trade.endTime).toLocaleTimeString()}</p>
        </div>
      </div>
    </div>
  );
}

function SettledTradeCard({ trade }: { trade: UserTrade }) {
  const isLong = trade.direction === "long";
  const isWin = trade.outcome === "win";
  const isVoid = trade.outcome === "void";
  const isCancelled = trade.status === "cancelled";
  const profit = profitCents(trade);
  const payout = payoutCents(trade);
  const rate = (trade.payoutBps / 100).toFixed(2);

  const resultStyle = isWin
    ? "bg-up/15 text-up"
    : isVoid
      ? "bg-muted/15 text-muted"
      : isCancelled
        ? "bg-muted/15 text-muted"
        : "bg-down/15 text-down";

  const resultLabel = isWin
    ? "Profit"
    : isVoid
      ? "Void"
      : isCancelled
        ? "Cancelled"
        : "Loss";

  return (
    <div className="rounded-[24px] border border-border bg-surface-soft">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 px-5 py-3">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold uppercase ${
              isCancelled ? "bg-muted/15 text-muted" : "bg-up/15 text-up"
            }`}
          >
            {isCancelled ? "Cancelled" : "Completed"}
          </span>
          <span className="text-sm font-semibold text-foreground">
            Trade for {(trade.stakeCents / 100).toFixed(2)} USD (In {trade.tokenSymbol})
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3 p-5 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted">Type</p>
          <span
            className={`mt-0.5 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold uppercase ${
              isLong ? "bg-up/15 text-up" : "bg-down/15 text-down"
            }`}
          >
            {isLong ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {trade.direction}
          </span>
        </div>
        <div>
          <p className="text-xs text-muted">Started</p>
          <p className="text-foreground">{new Date(trade.startedAt).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Closed</p>
          <p className="text-foreground">{new Date(trade.endTime).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Entry Price</p>
          <p className="font-semibold text-foreground tabular-nums">
            {priceFromCents(trade.entryPriceCents)} USD
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">Exit Price</p>
          <p className="font-semibold text-foreground tabular-nums">
            {trade.exitPriceCents != null
              ? `${priceFromCents(trade.exitPriceCents)} USD`
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">Result</p>
          <span className={`mt-0.5 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold uppercase ${resultStyle}`}>
            {resultLabel}
          </span>
        </div>
        {!isCancelled && (
          <>
            <div>
              <p className="text-xs text-muted">Rate of Return</p>
              <p className="font-semibold text-foreground">{rate}%</p>
            </div>
            <div>
              <p className="text-xs text-muted">Return</p>
              <p className="font-semibold text-foreground">
                {(payout / 100).toFixed(2)} USD
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">Profit</p>
              <p className={`font-semibold tabular-nums ${profit > 0 ? "text-up" : profit < 0 ? "text-down" : "text-muted"}`}>
                {profit > 0 ? "+" : ""}
                {(profit / 100).toFixed(2)} USD
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function PortfolioShell({
  initialItems,
  initialTotal,
  initialActive,
  pageSize,
}: PortfolioShellProps) {
  const [page, setPage] = useState(0);
  const [items, setItems] = useState(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [active, setActive] = useState(initialActive);
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
        const json = (await res.json()) as { data?: { items: UserTrade[]; total: number } };
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

  // Poll active trades every 5s so they disappear when settled.
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/trades?status=active");
        const json = (await res.json()) as { data?: { items: UserTrade[] } };
        if (json.data) setActive(json.data.items);
      } catch {
        /* ignore */
      }
    }, 5000);
    return () => clearInterval(id);
  }, []);

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
  const totalNet = items.reduce((sum, t) => sum + profitCents(t), 0);

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="hidden rounded-[24px] border border-border bg-surface-soft p-4 sm:block">
          <p className="text-xs text-muted">Total trades</p>
          <p className="mt-1 font-display text-2xl text-foreground">{total}</p>
        </div>
        <div className="hidden rounded-[24px] border border-border bg-surface-soft p-4 sm:block">
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

      {/* Active trades */}
      {active.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-brand" />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              Active positions
            </p>
            <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-bold text-brand">
              {active.length}
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {active.map((t) => (
              <ActiveTradeCard key={t.id} trade={t} />
            ))}
          </div>
        </section>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        {(["all", "win", "lose"] as OutcomeFilter[]).map((f) => (
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

      {/* Cards */}
      <section className={`flex flex-col gap-3 ${loading ? "opacity-50" : ""}`}>
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-[28px] border border-border bg-surface-soft py-16 text-muted">
            <BarChart3 size={36} className="opacity-30" />
            <p className="text-sm">No trades yet.</p>
          </div>
        ) : (
          items.map((t) => <SettledTradeCard key={t.id} trade={t} />)
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
