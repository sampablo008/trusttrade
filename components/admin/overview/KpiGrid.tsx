"use client";

import { Activity, DollarSign, TrendingDown, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { BusinessDashboard } from "@/types/admin";
import { formatCompactUsd, formatUsdFromCents } from "@/lib/utils/format";

type Kpi = {
  label: string;
  value: string;
  icon: LucideIcon;
  accent: string;
  delta?: string;
};

export default function KpiGrid({ data }: { data: BusinessDashboard | undefined }) {
  if (!data) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-surface" />
        ))}
      </div>
    );
  }

  const isPositivePnl = data.dailyNetPnlCents >= 0;

  const kpis: Kpi[] = [
    {
      label: "Active trades",
      value: data.activeTrades.toLocaleString(),
      icon: Activity,
      accent: "text-brand",
    },
    {
      label: "Open exposure",
      value: formatCompactUsd(data.totalExposureCents),
      icon: DollarSign,
      accent: "text-warning",
    },
    {
      label: "House P&L (24h)",
      value: `${isPositivePnl ? "+" : ""}${formatUsdFromCents(data.dailyNetPnlCents)}`,
      icon: isPositivePnl ? TrendingUp : TrendingDown,
      accent: isPositivePnl ? "text-up" : "text-down",
    },
    {
      label: "Volume (24h)",
      value: formatCompactUsd(data.totalStakedTodayCents),
      icon: DollarSign,
      accent: "text-foreground",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {kpis.map((k) => {
        const Icon = k.icon;
        return (
          <div
            key={k.label}
            className="group relative overflow-hidden rounded-xl border border-border bg-surface p-4 transition hover:border-border/80"
          >
            <div className="flex items-center justify-between text-xs text-muted">
              <span className="font-medium uppercase tracking-wider">{k.label}</span>
              <Icon size={14} className="text-muted/70" />
            </div>
            <p className={`mt-3 font-display text-2xl font-semibold tabular-nums ${k.accent}`}>
              {k.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}
