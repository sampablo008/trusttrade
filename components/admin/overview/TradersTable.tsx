"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import type { BusinessDashboard } from "@/types/admin";
import { formatUsdFromCents } from "@/lib/utils/format";

type Props = {
  title: string;
  variant: "winners" | "losers";
  rows: BusinessDashboard["topWinners"] | undefined;
};

export default function TradersTable({ title, variant, rows }: Props) {
  const Icon = variant === "winners" ? TrendingUp : TrendingDown;
  const accent = variant === "winners" ? "text-up" : "text-down";
  const list = rows ?? [];

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Icon size={14} className={accent} />
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <span className="ml-auto text-[10px] font-medium uppercase tracking-widest text-muted">
          24h
        </span>
      </header>
      {list.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted">No activity yet.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-[10px] font-semibold uppercase tracking-widest text-muted">
              <th className="px-4 py-2 font-medium">User</th>
              <th className="px-4 py-2 font-medium">Trades</th>
              <th className="px-4 py-2 text-right font-medium">Net P&amp;L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((r) => (
              <tr key={r.userId} className="transition hover:bg-surface-strong">
                <td className="px-4 py-2.5 font-medium text-foreground">{r.username}</td>
                <td className="px-4 py-2.5 text-muted tabular-nums">{r.totalTrades}</td>
                <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${accent}`}>
                  {r.netPnlCents >= 0 ? "+" : ""}
                  {formatUsdFromCents(r.netPnlCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
