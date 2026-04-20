"use client";

import { useEffect, useState } from "react";
import { formatUsdFromCents } from "@/lib/utils/format";
import type { AdminTrade } from "@/types/admin";

const OUTCOME_STYLES: Record<"win" | "lose" | "void", string> = {
  win: "bg-[#0ecb81]/15 text-[#0ecb81] border border-[#0ecb81]/30",
  lose: "bg-[#f6465d]/15 text-[#f6465d] border border-[#f6465d]/30",
  void: "bg-border text-muted border border-border",
};

const formatTime = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function TradeHistory() {
  const [trades, setTrades] = useState<AdminTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterDirection, setFilterDirection] = useState<"all" | "long" | "short">("all");
  const [filterOutcome, setFilterOutcome] = useState<"all" | "win" | "lose" | "void">("all");

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/trades?status=settled&limit=200");
      if (!alive) return;
      if (!res.ok) {
        const body = await res.json().catch(() => null) as { error?: { message?: string } } | null;
        setError(body?.error?.message ?? `Failed to load history (${res.status}).`);
        setLoading(false);
        return;
      }
      const body = await res.json() as { items: AdminTrade[] };
      setTrades(body.items);
      setLoading(false);
    };

    load();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = trades.filter((t) => {
    if (filterDirection !== "all" && t.direction !== filterDirection) return false;
    if (filterOutcome !== "all" && t.outcome !== filterOutcome) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
          Filters
        </span>

        <div className="flex items-center gap-1 rounded-full border border-border bg-background/30 p-1">
          {(["all", "long", "short"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setFilterDirection(d)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                filterDirection === d
                  ? "bg-foreground text-background"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {d === "all" ? "All directions" : d.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 rounded-full border border-border bg-background/30 p-1">
          {(["all", "win", "lose", "void"] as const).map((o) => (
            <button
              key={o}
              onClick={() => setFilterOutcome(o)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                filterOutcome === o
                  ? "bg-foreground text-background"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {o === "all" ? "All outcomes" : o.toUpperCase()}
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs text-muted">
          {loading ? "Loading…" : `${filtered.length} of ${trades.length}`}
        </span>
      </div>

      {error && (
        <div className="rounded-2xl border border-[#f6465d]/30 bg-[#f6465d]/10 px-4 py-3 text-sm text-[#f6465d]">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-border">
        <div className="max-h-[70vh] overflow-x-auto overflow-y-auto">
          <table className="min-w-175 w-full divide-y divide-border text-left">
            <thead className="sticky top-0 z-10 bg-surface">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                  Settled
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                  User
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                  Pair
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                  Direction
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                  Stake
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                  Entry
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                  Strike
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                  Outcome
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background/20">
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted">
                    No settled trades
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted">
                    Loading history…
                  </td>
                </tr>
              )}
              {filtered.map((trade) => (
                <tr key={trade.id} className="transition-colors hover:bg-surface/60">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted">
                    {formatTime(trade.endTime)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground">
                        {trade.username}
                      </span>
                      <span className="text-xs text-muted">{trade.userEmail}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-foreground">
                    {trade.tokenSymbol}/{trade.periodLabel}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${
                        trade.direction === "long"
                          ? "bg-[#0ecb81]/15 text-[#0ecb81]"
                          : "bg-[#f6465d]/15 text-[#f6465d]"
                      }`}
                    >
                      {trade.direction.toUpperCase()}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-foreground">
                    {formatUsdFromCents(trade.stakeCents)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted">
                    ${(trade.entryPriceCents / 100).toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted">
                    {trade.strikePriceCents != null
                      ? `$${(trade.strikePriceCents / 100).toLocaleString()}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {trade.outcome ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${OUTCOME_STYLES[trade.outcome]}`}
                      >
                        {trade.outcome.toUpperCase()}
                      </span>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
