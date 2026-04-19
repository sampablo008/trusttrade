"use client";

import Link from "next/link";
import { ArrowRight, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import type { BusinessDashboard } from "@/types/admin";

export default function PendingQueuesCard({ data }: { data: BusinessDashboard | undefined }) {
  const items = [
    {
      href: "/admin/deposits",
      label: "Deposits pending",
      count: data?.pendingDeposits ?? 0,
      icon: ArrowDownToLine,
    },
    {
      href: "/admin/withdrawals",
      label: "Withdrawals pending",
      count: data?.pendingWithdrawals ?? 0,
      icon: ArrowUpFromLine,
    },
  ];

  return (
    <section className="rounded-xl border border-border bg-surface">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Pending queues</h2>
        <Link
          href="/admin/trades"
          className="text-xs font-medium text-muted transition hover:text-brand"
        >
          Trade queue →
        </Link>
      </header>
      <ul className="divide-y divide-border">
        {items.map((it) => {
          const Icon = it.icon;
          const hot = it.count > 0;
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                className="flex items-center justify-between px-4 py-3 transition hover:bg-surface-strong"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-md ${
                      hot ? "bg-warning/15 text-warning" : "bg-surface-strong text-muted"
                    }`}
                  >
                    <Icon size={14} />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{it.label}</p>
                    <p className="text-xs text-muted">
                      {hot ? "Needs review" : "All clear"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-display text-xl font-semibold tabular-nums ${
                      hot ? "text-warning" : "text-muted/80"
                    }`}
                  >
                    {it.count}
                  </span>
                  <ArrowRight size={14} className="text-muted" />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
