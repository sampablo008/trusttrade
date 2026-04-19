"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatUsdFromCents } from "@/lib/utils/format";
import type { AdminTrade, AdminTradeFlag } from "@/types/admin";

const FLAG_STYLES: Record<AdminTradeFlag, string> = {
  EXPIRING_SOON: "bg-[#f6465d]/15 text-[#f6465d] border border-[#f6465d]/30",
  HIGH_STAKE: "bg-brand/15 text-brand border border-brand/30",
  LOW_TRADE_VOLUME: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
  NEW_USER: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
};

const FLAG_LABELS: Record<AdminTradeFlag, string> = {
  EXPIRING_SOON: "EXPIRING",
  HIGH_STAKE: "HIGH STAKE",
  LOW_TRADE_VOLUME: "LOW VOL",
  NEW_USER: "NEW USER",
};

interface TradeQueueProps {
  initialTrades: AdminTrade[];
}

const formatMs = (ms: number): string => {
  if (ms <= 0) return "00:00";
  const secs = Math.floor(ms / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

export default function TradeQueue({ initialTrades }: TradeQueueProps) {
  const [trades, setTrades] = useState<AdminTrade[]>(initialTrades);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [focused, setFocused] = useState<string | null>(null);
  const [filterDirection, setFilterDirection] = useState<"all" | "long" | "short">("all");
  const [filterToken, setFilterToken] = useState("all");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const lastClickIdx = useRef<number>(-1);

  // Tick countdown every second
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // SSE admin stream
  useEffect(() => {
    let es: EventSource | null = null;
    let retryMs = 1000;
    let alive = true;

    const connect = () => {
      es = new EventSource("/api/admin/stream");

      es.addEventListener("snapshot", (e) => {
        const data = JSON.parse((e as MessageEvent).data) as { trades: { items: AdminTrade[] } };
        if (data.trades?.items) setTrades(data.trades.items);
        retryMs = 1000;
      });

      es.addEventListener("trade", (e) => {
        const updated = JSON.parse((e as MessageEvent).data) as Partial<AdminTrade> & { id: string };
        setTrades((prev) => {
          const idx = prev.findIndex((t) => t.id === updated.id);
          if (updated.status === "settled" || updated.status === "cancelled") {
            return prev.filter((t) => t.id !== updated.id);
          }
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = { ...next[idx], ...updated };
          return next.sort((a, b) => a.timeRemainingMs - b.timeRemainingMs);
        });
      });

      es.onerror = () => {
        es?.close();
        if (alive) {
          setTimeout(connect, Math.min(retryMs, 30_000));
          retryMs *= 2;
        }
      };
    };

    connect();
    return () => {
      alive = false;
      es?.close();
    };
  }, []);

  const settle = useCallback(
    async (ids: string[], outcome: "win" | "lose" | "void") => {
      if (ids.length === 1) {
        const [id] = ids;
        await fetch(`/api/admin/trades/${id}/settle`, {
          body: JSON.stringify({ outcome }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        setTrades((prev) => prev.filter((t) => t.id !== id));
      } else {
        await fetch("/api/admin/trades/bulk-settle", {
          body: JSON.stringify({ outcome, tradeIds: ids }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        setTrades((prev) => prev.filter((t) => !ids.includes(t.id)));
      }
      setSelected(new Set());
    },
    [],
  );

  // Keyboard shortcuts: W / L / V
  useEffect(() => {
    const ids = selected.size > 0
      ? Array.from(selected)
      : focused
      ? [focused]
      : [];

    if (ids.length === 0) return;

    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "w" || e.key === "W") { e.preventDefault(); settle(ids, "win"); }
      if (e.key === "l" || e.key === "L") { e.preventDefault(); settle(ids, "lose"); }
      if (e.key === "v" || e.key === "V") { e.preventDefault(); settle(ids, "void"); }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [focused, selected, settle]);

  const filteredTrades = trades.filter((t) => {
    if (filterDirection !== "all" && t.direction !== filterDirection) return false;
    if (filterToken !== "all" && t.tokenSymbol !== filterToken) return false;
    return true;
  });

  const tokens = Array.from(new Set(trades.map((t) => t.tokenSymbol)));

  const handleRowClick = (id: string, idx: number, e: React.MouseEvent) => {
    setFocused(id);

    if (e.shiftKey && lastClickIdx.current !== -1) {
      const min = Math.min(lastClickIdx.current, idx);
      const max = Math.max(lastClickIdx.current, idx);
      const rangeIds = filteredTrades.slice(min, max + 1).map((t) => t.id);
      setSelected((prev) => new Set([...prev, ...rangeIds]));
    } else if (e.metaKey || e.ctrlKey) {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    } else {
      setSelected(new Set([id]));
    }
    lastClickIdx.current = idx;
  };

  const selectAll = () => setSelected(new Set(filteredTrades.map((t) => t.id)));
  const clearAll = () => setSelected(new Set());

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
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
          <button
            onClick={() => setFilterToken("all")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              filterToken === "all"
                ? "bg-foreground text-background"
                : "text-muted hover:text-foreground"
            }`}
          >
            All tokens
          </button>
          {tokens.map((sym) => (
            <button
              key={sym}
              onClick={() => setFilterToken(sym)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                filterToken === sym
                  ? "bg-foreground text-background"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {sym}
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs text-muted">
          {filteredTrades.length} active · {selected.size} selected
        </span>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-[20px] border border-border bg-surface-soft px-5 py-3 text-sm animate-in slide-in-from-top-2 duration-150">
          <span className="font-semibold text-foreground">{selected.size} selected</span>
          <div className="h-4 w-px bg-border" />
          <button
            onClick={() => settle(Array.from(selected), "win")}
            className="rounded-full bg-[#0ecb81]/15 px-4 py-1.5 text-xs font-semibold text-[#0ecb81] transition hover:bg-[#0ecb81]/25"
          >
            Win (W)
          </button>
          <button
            onClick={() => settle(Array.from(selected), "lose")}
            className="rounded-full bg-[#f6465d]/15 px-4 py-1.5 text-xs font-semibold text-[#f6465d] transition hover:bg-[#f6465d]/25"
          >
            Lose (L)
          </button>
          <button
            onClick={() => settle(Array.from(selected), "void")}
            className="rounded-full border border-border bg-background/30 px-4 py-1.5 text-xs font-semibold text-muted transition hover:text-foreground"
          >
            Void (V)
          </button>
          <button
            onClick={selectAll}
            className="ml-auto text-xs text-muted transition hover:text-foreground"
          >
            Select all
          </button>
          <button
            onClick={clearAll}
            className="text-xs text-muted transition hover:text-foreground"
          >
            Clear
          </button>
        </div>
      )}

      {/* Keyboard hint */}
      {selected.size === 0 && focused && (
        <p className="text-xs text-muted">
          Press <kbd className="rounded border border-border bg-background/30 px-1.5 py-0.5 font-mono">W</kbd>{" "}
          <kbd className="rounded border border-border bg-background/30 px-1.5 py-0.5 font-mono">L</kbd>{" "}
          <kbd className="rounded border border-border bg-background/30 px-1.5 py-0.5 font-mono">V</kbd> to settle focused row
        </p>
      )}

      {/* Queue table */}
      <div className="overflow-hidden rounded-3xl border border-border">
        <div className="max-h-[70vh] overflow-y-auto">
          <table className="min-w-full divide-y divide-border text-left">
            <thead className="sticky top-0 z-10 bg-surface">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                  Countdown
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
                  Flags
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background/20">
              {filteredTrades.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted">
                    No active trades
                  </td>
                </tr>
              )}
              {filteredTrades.map((trade, idx) => {
                const isSelected = selected.has(trade.id);
                const isFocused = focused === trade.id;
                const remainingMs = new Date(trade.endTime).getTime() - nowMs;
                const isUrgent = remainingMs < 15_000;

                return (
                  <tr
                    key={trade.id}
                    onClick={(e) => handleRowClick(trade.id, idx, e)}
                    className={`cursor-pointer transition-colors select-none ${
                      isSelected
                        ? "bg-brand/10 hover:bg-brand/15"
                        : isFocused
                        ? "bg-surface hover:bg-surface"
                        : "hover:bg-surface/60"
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-sm">
                      <span
                        className={`font-semibold tabular-nums ${
                          isUrgent ? "text-[#f6465d] animate-pulse" : "text-foreground"
                        }`}
                      >
                        {formatMs(remainingMs)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-foreground">
                          {trade.username}
                        </span>
                        <span className="text-xs text-muted">{trade.userEmail}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-foreground">
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
                    <td className="px-4 py-3 text-sm font-semibold text-foreground">
                      {formatUsdFromCents(trade.stakeCents)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">
                      ${(trade.entryPriceCents / 100).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {trade.flags.map((flag) => (
                          <span
                            key={flag}
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${FLAG_STYLES[flag]}`}
                          >
                            {FLAG_LABELS[flag]}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); settle([trade.id], "win"); }}
                          className="rounded-full bg-[#0ecb81]/15 px-3 py-1 text-xs font-semibold text-[#0ecb81] transition hover:bg-[#0ecb81]/30"
                        >
                          W
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); settle([trade.id], "lose"); }}
                          className="rounded-full bg-[#f6465d]/15 px-3 py-1 text-xs font-semibold text-[#f6465d] transition hover:bg-[#f6465d]/30"
                        >
                          L
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); settle([trade.id], "void"); }}
                          className="rounded-full border border-border bg-background/30 px-3 py-1 text-xs font-semibold text-muted transition hover:text-foreground"
                        >
                          V
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted">
        Click to select · Shift+click range · Cmd/Ctrl+click multi · <kbd className="rounded border border-border bg-background/30 px-1.5 py-0.5 font-mono">W</kbd>/{" "}
        <kbd className="rounded border border-border bg-background/30 px-1.5 py-0.5 font-mono">L</kbd>/{" "}
        <kbd className="rounded border border-border bg-background/30 px-1.5 py-0.5 font-mono">V</kbd> to settle
      </p>
    </div>
  );
}
