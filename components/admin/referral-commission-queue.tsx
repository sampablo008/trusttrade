"use client";

import { useState, useCallback } from "react";
import { Check, X, ChevronDown, Inbox } from "lucide-react";
import type { ReferralCommission } from "@/types/referrals";
import { formatUsdFromCents, formatUsdtFromCents } from "@/lib/utils/format";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { Badge } from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { notify } from "@/components/ui/toast";

interface ReferralCommissionQueueProps {
  initialCommissions: ReferralCommission[];
}

export default function ReferralCommissionQueue({
  initialCommissions,
}: ReferralCommissionQueueProps) {
  const [commissions, setCommissions] = useState<ReferralCommission[]>(initialCommissions);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [loading, setLoading] = useState<Set<string>>(new Set());

  const visible = commissions.filter((c) => !statusFilter || c.status === statusFilter);
  const pending = visible.filter((c) => c.status === "pending");

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectAll = () => setSelected(new Set(pending.map((c) => c.id)));
  const clearSelection = () => setSelected(new Set());

  const markLoading = (ids: string[]) => setLoading((prev) => new Set([...prev, ...ids]));
  const clearLoading = (ids: string[]) =>
    setLoading((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });

  const handleApprove = useCallback(async (ids: string[]) => {
    markLoading(ids);
    try {
      if (ids.length === 1) {
        const [id] = ids;
        const res = await fetch(`/api/admin/commissions/${id}/approve`, { method: "POST" });
        if (res.ok) {
          setCommissions((prev) =>
            prev.map((c) => (c.id === id ? { ...c, status: "approved" as const } : c)),
          );
          notify.success("Commission approved");
        } else {
          notify.error("Approve failed");
        }
      } else {
        const res = await fetch("/api/admin/commissions/bulk-approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ commissionIds: ids }),
        });
        if (res.ok) {
          const result = (await res.json()) as { approved: string[]; failed: string[] };
          setCommissions((prev) =>
            prev.map((c) =>
              result.approved.includes(c.id) ? { ...c, status: "approved" as const } : c,
            ),
          );
          notify.success(
            `Approved ${result.approved.length}`,
            result.failed.length ? `${result.failed.length} failed` : undefined,
          );
        } else {
          notify.error("Bulk approve failed");
        }
      }
    } finally {
      clearLoading(ids);
      setSelected(new Set());
    }
  }, []);

  const handleReject = useCallback(async (id: string) => {
    markLoading([id]);
    try {
      const res = await fetch(`/api/admin/commissions/${id}/reject`, { method: "POST" });
      if (res.ok) {
        setCommissions((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: "rejected" as const } : c)),
        );
        notify.success("Commission rejected");
      } else {
        notify.error("Reject failed");
      }
    } finally {
      clearLoading([id]);
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* Filter + bulk bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="commission-status" className="text-xs font-semibold text-muted">
            Status:
          </label>
          <div className="relative">
            <select
              id="commission-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none rounded-full border border-border bg-background/30 py-1.5 pl-3 pr-8 text-sm font-semibold text-foreground focus-ring"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
          </div>
        </div>

        {statusFilter === "pending" && (
          <div className="flex items-center gap-2 text-sm">
            <Button variant="secondary" size="sm" onClick={selectAll}>
              Select all ({pending.length})
            </Button>
            {selected.size > 0 && (
              <>
                <Button variant="secondary" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
                <Button size="sm" onClick={() => handleApprove([...selected])}>
                  Approve {selected.size} selected
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      {visible.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No commissions to show"
          description="Nothing matches this filter."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-soft">
                {statusFilter === "pending" && <th scope="col" className="w-10 px-4 py-3" />}
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  Date
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  Beneficiary
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  Referee
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  Level
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                  Base
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                  Commission
                </th>
                <th scope="col" className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted">
                  Status
                </th>
                {statusFilter === "pending" && (
                  <th scope="col" className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map((c) => {
                const isLoading = loading.has(c.id);
                return (
                  <tr key={c.id} className="transition hover:bg-surface-soft/50">
                    {statusFilter === "pending" && (
                      <td className="px-4 py-3">
                        {c.status === "pending" && (
                          <input
                            type="checkbox"
                            checked={selected.has(c.id)}
                            onChange={() => toggleSelect(c.id)}
                            aria-label={`Select commission for ${c.refereeUsername}`}
                            className="h-4 w-4 rounded border-border accent-brand focus-ring"
                          />
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 text-muted">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-mono font-medium text-foreground">
                      {c.beneficiaryUserId.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3 text-foreground">{c.refereeUsername}</td>
                    <td className="px-4 py-3">
                      <Badge tone="brand">L{c.level}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">
                      {formatUsdFromCents(c.baseAmountCents)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                      {formatUsdtFromCents(c.commissionCents)}
                      <span className="ml-1 text-xs text-muted">({c.bpsApplied / 100}%)</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusPill status={c.status} />
                    </td>
                    {statusFilter === "pending" && (
                      <td className="px-4 py-3">
                        {c.status === "pending" && (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleApprove([c.id])}
                              disabled={isLoading}
                              aria-label="Approve commission"
                              title="Approve"
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-up/10 text-up transition focus-ring hover:bg-up hover:text-black disabled:opacity-40"
                            >
                              <Check size={14} aria-hidden="true" />
                            </button>
                            <button
                              onClick={() => handleReject(c.id)}
                              disabled={isLoading}
                              aria-label="Reject commission"
                              title="Reject"
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-down/10 text-down transition focus-ring hover:bg-down hover:text-white disabled:opacity-40"
                            >
                              <X size={14} aria-hidden="true" />
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
