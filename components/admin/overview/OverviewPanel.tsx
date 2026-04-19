"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowUpRight } from "lucide-react";
import type { BusinessDashboard } from "@/types/admin";
import KpiGrid from "./KpiGrid";
import PendingQueuesCard from "./PendingQueuesCard";
import RecentAuditCard from "./RecentAuditCard";
import TradersTable from "./TradersTable";

async function fetchDashboard(): Promise<BusinessDashboard> {
  const res = await fetch("/api/admin/dashboard");
  if (!res.ok) throw new Error("Failed to fetch dashboard");
  return res.json();
}

export default function OverviewPanel() {
  const { data } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: fetchDashboard,
    refetchInterval: 15_000,
  });

  const alerts: { count: number; label: string; href: string }[] = [];
  if (data?.pendingDeposits) {
    alerts.push({
      count: data.pendingDeposits,
      label: "deposit claims need review",
      href: "/admin/deposits",
    });
  }
  if (data?.pendingWithdrawals) {
    alerts.push({
      count: data.pendingWithdrawals,
      label: "withdrawal requests awaiting action",
      href: "/admin/withdrawals",
    });
  }

  return (
    <div className="space-y-6">
      {alerts.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {alerts.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-3.5 py-1.5 text-xs font-medium text-warning transition hover:bg-warning/20"
            >
              <AlertCircle size={13} />
              <span className="font-semibold tabular-nums">{a.count}</span> {a.label}
              <ArrowUpRight size={12} className="opacity-70" />
            </Link>
          ))}
        </div>
      ) : null}

      <KpiGrid data={data} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PendingQueuesCard data={data} />
        </div>
        <div className="lg:col-span-1">
          <RecentAuditCard />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TradersTable title="Top winners" variant="winners" rows={data?.topWinners} />
        <TradersTable title="Top losers" variant="losers" rows={data?.topLosers} />
      </div>
    </div>
  );
}
