"use client";

import { useEffect, useMemo, useState } from "react";
import { History } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { formatUsdFromCents } from "@/lib/utils/format";
import type { AdminTrade } from "@/types/admin";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { StatusPill } from "@/components/ui/StatusPill";
import EmptyState from "@/components/ui/EmptyState";

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
        const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        setError(body?.error?.message ?? `Failed to load history (${res.status}).`);
        setLoading(false);
        return;
      }
      const body = (await res.json()) as { items: AdminTrade[] };
      setTrades(body.items);
      setLoading(false);
    };

    load();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(
    () =>
      trades.filter((t) => {
        if (filterDirection !== "all" && t.direction !== filterDirection) return false;
        if (filterOutcome !== "all" && t.outcome !== filterOutcome) return false;
        return true;
      }),
    [trades, filterDirection, filterOutcome],
  );

  const columns = useMemo<ColumnDef<AdminTrade, unknown>[]>(
    () => [
      {
        id: "settled",
        header: "Settled",
        accessorFn: (t) => new Date(t.endTime).getTime(),
        cell: ({ row }) => (
          <span className="whitespace-nowrap font-mono text-xs text-muted">
            {formatTime(row.original.endTime)}
          </span>
        ),
      },
      {
        id: "user",
        header: "User",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">{row.original.username}</span>
            <span className="text-xs text-muted">{row.original.userEmail}</span>
          </div>
        ),
      },
      {
        id: "pair",
        header: "Pair",
        accessorFn: (t) => `${t.tokenSymbol}/${t.periodLabel}`,
        enableSorting: false,
        cell: ({ getValue }) => (
          <span className="whitespace-nowrap text-sm font-semibold text-foreground">
            {getValue() as string}
          </span>
        ),
      },
      {
        id: "direction",
        header: "Direction",
        accessorKey: "direction",
        cell: ({ row }) => (
          <Badge tone={row.original.direction === "long" ? "up" : "down"}>
            {row.original.direction.toUpperCase()}
          </Badge>
        ),
      },
      {
        id: "stake",
        header: "Stake",
        accessorKey: "stakeCents",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-foreground">
            {formatUsdFromCents(row.original.stakeCents)}
          </span>
        ),
      },
      {
        id: "entry",
        header: "Entry",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="whitespace-nowrap font-mono text-xs text-muted">
            ${(row.original.entryPriceCents / 100).toLocaleString()}
          </span>
        ),
      },
      {
        id: "strike",
        header: "Strike",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="whitespace-nowrap font-mono text-xs text-muted">
            {row.original.strikePriceCents != null
              ? `$${(row.original.strikePriceCents / 100).toLocaleString()}`
              : "—"}
          </span>
        ),
      },
      {
        id: "outcome",
        header: "Outcome",
        accessorKey: "outcome",
        cell: ({ row }) =>
          row.original.outcome ? (
            <StatusPill status={row.original.outcome} />
          ) : (
            <span className="text-xs text-muted">—</span>
          ),
      },
    ],
    [],
  );

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
              aria-pressed={filterDirection === d}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition focus-ring ${
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
              aria-pressed={filterOutcome === o}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition focus-ring ${
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
        <div className="rounded-2xl border border-down/30 bg-down/10 px-4 py-3 text-sm text-down">
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        getRowId={(t) => t.id}
        emptyState={
          <EmptyState
            icon={History}
            title="No settled trades"
            description="Settled trades will appear here once they expire."
          />
        }
        mobileCard={(trade) => (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">{trade.username}</span>
                <span className="text-xs text-muted">{trade.userEmail}</span>
              </div>
              {trade.outcome ? <StatusPill status={trade.outcome} /> : null}
            </div>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-muted">Pair</dt>
                <dd className="text-foreground">
                  {trade.tokenSymbol}/{trade.periodLabel}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-muted">Stake</dt>
                <dd className="font-semibold tabular-nums text-foreground">
                  {formatUsdFromCents(trade.stakeCents)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-muted">Direction</dt>
                <dd>
                  <Badge tone={trade.direction === "long" ? "up" : "down"}>
                    {trade.direction.toUpperCase()}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-muted">Settled</dt>
                <dd className="font-mono text-xs text-muted">{formatTime(trade.endTime)}</dd>
              </div>
            </dl>
          </div>
        )}
      />
    </div>
  );
}
