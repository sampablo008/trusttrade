"use client";

import { Fragment, useCallback, useState } from "react";
import type { AuditLogEntry } from "@/types/admin";

const ACTION_COLORS: Record<string, string> = {
  adjust_balance: "bg-blue-500/15 text-blue-400",
  freeze_user: "bg-[#f6465d]/15 text-[#f6465d]",
  mint_codes: "bg-purple-500/15 text-purple-400",
  reject_deposit: "bg-yellow-500/15 text-yellow-400",
  settle_trade: "bg-[#0ecb81]/15 text-[#0ecb81]",
};

const actionColor = (action: string): string =>
  ACTION_COLORS[action] ?? "bg-surface text-muted";

interface AuditLogPanelProps {
  initialData: { items: AuditLogEntry[]; total: number };
}

export default function AuditLogPanel({ initialData }: AuditLogPanelProps) {
  const [entries, setEntries] = useState<AuditLogEntry[]>(initialData.items);
  const [total, setTotal] = useState(initialData.total);
  const [filterAction, setFilterAction] = useState("");
  const [offset, setOffset] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const limit = 50;

  const fetchEntries = useCallback(async (action: string, off: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(off) });
      if (action) params.set("action", action);
      const res = await fetch(`/api/admin/audit?${params}`);
      const data = await res.json() as { items: AuditLogEntry[]; total: number };
      setEntries(data.items ?? []);
      setTotal(data.total ?? 0);
      setOffset(off);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={filterAction}
          onChange={(e) => {
            setFilterAction(e.target.value);
            fetchEntries(e.target.value, 0);
          }}
          placeholder="Filter by action (e.g. settle_trade)…"
          className="w-72 rounded-full border border-border bg-background/30 px-5 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-brand"
        />
        <span className="ml-auto text-xs text-muted">{total} total entries</span>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-border">
        <div className="max-h-[70vh] overflow-y-auto">
          <table className="min-w-full divide-y divide-border text-left">
            <thead className="sticky top-0 z-10 bg-surface">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                  Time
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                  Action
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                  Admin
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                  Target
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background/20">
              {loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && entries.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted">
                    No audit entries
                  </td>
                </tr>
              )}
              {!loading &&
                entries.map((entry) => (
                  <Fragment key={entry.id}>
                    <tr
                      onClick={() => setExpanded((prev) => (prev === entry.id ? null : entry.id))}
                      className="cursor-pointer transition-colors hover:bg-surface/60"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-muted whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${actionColor(entry.action)}`}
                        >
                          {entry.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted">{entry.adminEmail}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted">
                        {entry.targetType && (
                          <span>
                            {entry.targetType}
                            {entry.targetId && (
                              <span className="text-foreground/40">
                                {" "}
                                /{entry.targetId.slice(-8)}
                              </span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted">{entry.notes}</td>
                    </tr>
                    {expanded === entry.id && (
                      <tr className="bg-surface/40">
                        <td colSpan={5} className="px-6 py-4">
                          <div className="grid gap-3 lg:grid-cols-2">
                            {entry.beforeJson && (
                              <div>
                                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                                  Before
                                </p>
                                <pre className="overflow-x-auto rounded-[12px] border border-border bg-background/30 p-3 text-xs text-muted">
                                  {JSON.stringify(entry.beforeJson, null, 2)}
                                </pre>
                              </div>
                            )}
                            {entry.afterJson && (
                              <div>
                                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                                  After
                                </p>
                                <pre className="overflow-x-auto rounded-[12px] border border-border bg-background/30 p-3 text-xs text-foreground">
                                  {JSON.stringify(entry.afterJson, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                          <div className="mt-3 flex gap-4 text-xs text-muted">
                            <span>
                              <span className="font-semibold">Admin ID:</span> {entry.adminId ?? "—"}
                            </span>
                            {entry.ipAddress && (
                              <span>
                                <span className="font-semibold">IP:</span> {entry.ipAddress}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}
        </span>
        <div className="flex gap-2">
          <button
            disabled={offset === 0}
            onClick={() => fetchEntries(filterAction, Math.max(offset - limit, 0))}
            className="rounded-full border border-border bg-background/30 px-4 py-1.5 font-semibold transition hover:border-brand disabled:opacity-40"
          >
            Prev
          </button>
          <button
            disabled={offset + limit >= total}
            onClick={() => fetchEntries(filterAction, offset + limit)}
            className="rounded-full border border-border bg-background/30 px-4 py-1.5 font-semibold transition hover:border-brand disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
