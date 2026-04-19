"use client";

import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Clock,
  AlertCircle,
} from "lucide-react";
import type { BusinessDashboard } from "@/types/admin";
import { formatUsdFromCents, formatCompactUsd } from "@/lib/utils/format";

async function fetchDashboard(): Promise<BusinessDashboard> {
  const res = await fetch("/api/admin/dashboard");
  if (!res.ok) throw new Error("Failed to fetch dashboard");
  return res.json();
}

export default function BusinessDashboardPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: fetchDashboard,
    refetchInterval: 15_000,
  });

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface" />
        ))}
      </div>
    );
  }

  const stats = [
    {
      icon: Activity,
      label: "Active Trades",
      value: data.activeTrades.toString(),
      accent: "text-brand",
    },
    {
      icon: DollarSign,
      label: "Exposure",
      value: formatCompactUsd(data.totalExposureCents),
      accent: "text-warning",
    },
    {
      icon: TrendingUp,
      label: "House P&L Today",
      value: formatUsdFromCents(data.dailyNetPnlCents),
      accent: data.dailyNetPnlCents >= 0 ? "text-up" : "text-down",
    },
    {
      icon: DollarSign,
      label: "Staked Today",
      value: formatCompactUsd(data.totalStakedTodayCents),
      accent: "text-foreground",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Pending actions banner */}
      {(data.pendingDeposits > 0 || data.pendingWithdrawals > 0) && (
        <div className="flex flex-wrap gap-3">
          {data.pendingDeposits > 0 && (
            <PendingBadge
              count={data.pendingDeposits}
              label="deposits need review"
              href="/admin/deposits"
            />
          )}
          {data.pendingWithdrawals > 0 && (
            <PendingBadge
              count={data.pendingWithdrawals}
              label="withdrawals need review"
              href="/admin/withdrawals"
            />
          )}
        </div>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5"
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              <s.icon size={14} />
              {s.label}
            </div>
            <p className={`font-display text-2xl font-bold ${s.accent}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Top traders */}
      <div className="grid gap-4 md:grid-cols-2">
        <TraderTable
          title="Top Winners Today"
          rows={data.topWinners}
          accent="text-up"
          Icon={TrendingUp}
        />
        <TraderTable
          title="Top Losers Today"
          rows={data.topLosers}
          accent="text-down"
          Icon={TrendingDown}
        />
      </div>
    </div>
  );
}

function PendingBadge({
  count,
  label,
  href,
}: {
  count: number;
  label: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-4 py-2 text-xs font-semibold text-warning transition hover:bg-warning/20"
    >
      <AlertCircle size={13} />
      {count} {label}
    </a>
  );
}

function TraderTable({
  title,
  rows,
  accent,
  Icon,
}: {
  title: string;
  rows: BusinessDashboard["topWinners"];
  accent: string;
  Icon: React.ElementType;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <Icon size={14} className={accent} />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">No data yet.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs font-semibold uppercase tracking-widest text-muted">
              <th className="px-5 py-3">User</th>
              <th className="px-5 py-3">Trades</th>
              <th className="px-5 py-3 text-right">Net P&amp;L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.userId} className="hover:bg-surface-strong">
                <td className="px-5 py-3 font-medium text-foreground">{r.username}</td>
                <td className="px-5 py-3 text-muted">{r.totalTrades}</td>
                <td className={`px-5 py-3 text-right font-semibold ${accent}`}>
                  {r.netPnlCents >= 0 ? "+" : ""}
                  {formatUsdFromCents(r.netPnlCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// Suppress unused import warning from lucide
void Clock;
