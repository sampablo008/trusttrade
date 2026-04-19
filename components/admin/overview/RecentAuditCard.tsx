"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import type { AuditLogResult } from "@/types/admin";

async function fetchAudit(): Promise<AuditLogResult> {
  const res = await fetch("/api/admin/audit?limit=6");
  if (!res.ok) throw new Error("Failed to fetch audit log");
  return res.json();
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function RecentAuditCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "audit", "recent"],
    queryFn: fetchAudit,
    refetchInterval: 30_000,
  });

  const items = data?.items ?? [];

  return (
    <section className="flex h-full flex-col rounded-xl border border-border bg-surface">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <ScrollText size={14} className="text-muted" />
          <h2 className="text-sm font-semibold text-foreground">Recent activity</h2>
        </div>
        <Link
          href="/admin/audit"
          className="text-xs font-medium text-muted transition hover:text-brand"
        >
          View all →
        </Link>
      </header>

      {isLoading ? (
        <div className="flex-1 animate-pulse bg-surface-strong/30" />
      ) : items.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted">No admin actions yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((entry) => (
            <li key={entry.id} className="px-4 py-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    <span className="text-brand">{entry.adminEmail.split("@")[0]}</span>{" "}
                    <span className="text-muted">·</span>{" "}
                    <span className="font-mono text-xs">{entry.action}</span>
                  </p>
                  {entry.targetType ? (
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {entry.targetType}
                      {entry.targetId ? ` · ${entry.targetId.slice(0, 8)}` : ""}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted">
                  {formatRelative(entry.createdAt)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
