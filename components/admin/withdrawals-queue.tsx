"use client";

import { useState } from "react";
import {
  CheckCircle,
  XCircle,
  CreditCard,
  AlertCircle,
  RefreshCw,
  Flag,
} from "lucide-react";
import { formatUsdFromCents } from "@/lib/utils/format";
import type { Withdrawal, WithdrawalStatus } from "@/types/withdrawal";

const STATUS_BADGE: Record<WithdrawalStatus, string> = {
  pending: "bg-yellow-400/15 text-yellow-400",
  approved: "bg-brand/15 text-brand",
  paid: "bg-up/15 text-up",
  rejected: "bg-down/15 text-down",
  cancelled: "bg-border text-muted",
};

interface Props {
  initialWithdrawals: Withdrawal[];
}

export default function WithdrawalsQueue({ initialWithdrawals }: Props) {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>(initialWithdrawals);
  const [activeTab, setActiveTab] = useState<"queue" | "payout">("queue");
  const [approveId, setApproveId] = useState<string | null>(null);
  const [approveNote, setApproveNote] = useState("");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [payId, setPayId] = useState<string | null>(null);
  const [payTxHash, setPayTxHash] = useState("");
  const [payAddressConfirm, setPayAddressConfirm] = useState("");
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const pendingItems = withdrawals.filter((w) => w.status === "pending");
  const payoutItems = withdrawals.filter((w) => w.status === "approved");

  const displayItems = activeTab === "queue" ? pendingItems : payoutItems;

  const updateWithdrawal = (id: string, updated: Withdrawal) =>
    setWithdrawals((prev) => prev.map((w) => (w.id === id ? updated : w)));

  const toggleBusy = (id: string, on: boolean) =>
    setBusy((prev) => {
      const next = new Set(prev);
      if (on) { next.add(id); } else { next.delete(id); }
      return next;
    });

  const handleApprove = async () => {
    if (!approveId) return;
    toggleBusy(approveId, true);
    setError(null);
    const res = await fetch(`/api/admin/withdrawals/${approveId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: approveNote }),
    });
    toggleBusy(approveId, false);
    if (res.ok) {
      const data = await res.json() as { withdrawal: Withdrawal };
      updateWithdrawal(approveId, data.withdrawal);
      setApproveId(null);
      setApproveNote("");
    } else {
      const json = await res.json() as { error?: { message?: string } };
      setError(json.error?.message ?? "Approve failed.");
    }
  };

  const handleReject = async () => {
    if (!rejectId || !rejectNote.trim()) return;
    toggleBusy(rejectId, true);
    setError(null);
    const res = await fetch(`/api/admin/withdrawals/${rejectId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: rejectNote }),
    });
    toggleBusy(rejectId, false);
    if (res.ok) {
      const data = await res.json() as { withdrawal: Withdrawal };
      updateWithdrawal(rejectId, data.withdrawal);
      setRejectId(null);
      setRejectNote("");
    } else {
      const json = await res.json() as { error?: { message?: string } };
      setError(json.error?.message ?? "Reject failed.");
    }
  };

  const handleMarkPaid = async () => {
    if (!payId || !payTxHash.trim() || !payAddressConfirm.trim()) return;
    toggleBusy(payId, true);
    setError(null);
    const res = await fetch(`/api/admin/withdrawals/${payId}/mark-paid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ txHash: payTxHash, addressConfirm: payAddressConfirm }),
    });
    toggleBusy(payId, false);
    if (res.ok) {
      const data = await res.json() as { withdrawal: Withdrawal };
      updateWithdrawal(payId, data.withdrawal);
      setPayId(null);
      setPayTxHash("");
      setPayAddressConfirm("");
    } else {
      const json = await res.json() as { error?: { message?: string } };
      setError(json.error?.message ?? "Mark paid failed.");
    }
  };

  const refresh = async () => {
    const res = await fetch("/api/admin/withdrawals");
    if (res.ok) {
      const data = await res.json() as { items: Withdrawal[] };
      setWithdrawals(data.items);
    }
  };

  const payingWithdrawal = withdrawals.find((w) => w.id === payId);

  return (
    <div className="flex flex-col gap-6">
      {/* Tab + refresh row */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setActiveTab("queue")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            activeTab === "queue"
              ? "bg-brand text-background"
              : "border border-border bg-background/30 text-foreground hover:border-brand"
          }`}
        >
          Review Queue ({pendingItems.length})
        </button>
        <button
          onClick={() => setActiveTab("payout")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            activeTab === "payout"
              ? "bg-brand text-background"
              : "border border-border bg-background/30 text-foreground hover:border-brand"
          }`}
        >
          Payout ({payoutItems.length})
        </button>
        <button
          onClick={refresh}
          className="ml-auto flex items-center gap-2 rounded-full border border-border bg-background/30 px-4 py-2 text-sm font-semibold text-foreground transition hover:border-brand"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-[12px] border border-down/40 bg-down/10 px-4 py-3">
          <AlertCircle size={16} className="text-down" />
          <p className="text-sm text-down">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-[20px] border border-border">
        <table className="min-w-full divide-y divide-border text-left">
          <thead className="bg-background/55">
            <tr>
              {["User", "Amount", "Token / Network", "Destination", "Status", "Flags", "Date", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {displayItems.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted">
                  {activeTab === "queue" ? "No pending withdrawals." : "No withdrawals awaiting payout."}
                </td>
              </tr>
            )}
            {displayItems.map((w) => (
              <tr key={w.id} className="hover:bg-background/20">
                <td className="px-4 py-4 font-mono text-xs text-muted">
                  {w.userId.slice(0, 8)}…
                </td>
                <td className="px-4 py-4 text-sm font-semibold text-foreground">
                  {formatUsdFromCents(w.amountCents)}
                </td>
                <td className="px-4 py-4 text-sm text-foreground">
                  {w.tokenSymbol} · {w.network}
                </td>
                <td className="max-w-40 truncate px-4 py-4 font-mono text-xs text-muted">
                  {w.destinationAddress}
                </td>
                <td className="px-4 py-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_BADGE[w.status]}`}>
                    {w.status}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-1">
                    {w.flags.length === 0 && <span className="text-xs text-muted">—</span>}
                    {w.flags.map((f) => (
                      <span
                        key={f}
                        className="flex items-center gap-1 rounded-full bg-yellow-400/10 px-2 py-0.5 text-[10px] font-semibold text-yellow-400"
                      >
                        <Flag size={10} />
                        {f}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-4 text-xs text-muted">
                  {new Date(w.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    {activeTab === "queue" && (
                      <>
                        <button
                          onClick={() => setApproveId(w.id)}
                          disabled={busy.has(w.id)}
                          title="Approve"
                          className="rounded-full border border-up/40 bg-up/10 p-1.5 text-up transition hover:bg-up/20 disabled:opacity-40"
                        >
                          <CheckCircle size={14} />
                        </button>
                        <button
                          onClick={() => setRejectId(w.id)}
                          disabled={busy.has(w.id)}
                          title="Reject"
                          className="rounded-full border border-down/40 bg-down/10 p-1.5 text-down transition hover:bg-down/20 disabled:opacity-40"
                        >
                          <XCircle size={14} />
                        </button>
                      </>
                    )}
                    {activeTab === "payout" && (
                      <button
                        onClick={() => setPayId(w.id)}
                        disabled={busy.has(w.id)}
                        title="Mark as paid"
                        className="flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand transition hover:bg-brand/20 disabled:opacity-40"
                      >
                        <CreditCard size={12} />
                        Mark Paid
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Approve modal */}
      {approveId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur">
          <div className="w-full max-w-md rounded-[24px] border border-border bg-surface-soft p-8">
            <h3 className="font-display text-2xl text-foreground">Approve withdrawal</h3>
            <p className="mt-2 text-sm text-muted">Optional note for the audit log.</p>
            <textarea
              value={approveNote}
              onChange={(e) => setApproveNote(e.target.value)}
              rows={2}
              placeholder="Optional note…"
              className="mt-4 w-full rounded-[12px] border border-border bg-background/30 px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-brand focus:outline-none"
            />
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleApprove}
                className="flex-1 rounded-full bg-up px-5 py-3 text-sm font-semibold text-background transition hover:opacity-90"
              >
                Confirm Approve
              </button>
              <button
                onClick={() => { setApproveId(null); setApproveNote(""); }}
                className="flex-1 rounded-full border border-border bg-background/30 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-brand"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur">
          <div className="w-full max-w-md rounded-[24px] border border-border bg-surface-soft p-8">
            <h3 className="font-display text-2xl text-foreground">Reject withdrawal</h3>
            <p className="mt-2 text-sm text-muted">Provide a reason — balance is refunded immediately.</p>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={3}
              placeholder="e.g. Suspicious activity, RAPID flag…"
              className="mt-4 w-full rounded-[12px] border border-border bg-background/30 px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-brand focus:outline-none"
            />
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleReject}
                disabled={!rejectNote.trim()}
                className="flex-1 rounded-full bg-down px-5 py-3 text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-40"
              >
                Confirm Reject
              </button>
              <button
                onClick={() => { setRejectId(null); setRejectNote(""); }}
                className="flex-1 rounded-full border border-border bg-background/30 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-brand"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark-paid modal — requires address confirm */}
      {payId && payingWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur">
          <div className="w-full max-w-md rounded-[24px] border border-border bg-surface-soft p-8">
            <h3 className="font-display text-2xl text-foreground">Mark as paid</h3>
            <div className="mt-3 rounded-[12px] border border-border bg-background/30 p-4">
              <p className="text-xs text-muted">Destination</p>
              <code className="mt-1 break-all font-mono text-sm text-foreground">
                {payingWithdrawal.destinationAddress}
              </code>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                Re-type last 8 chars of address
              </label>
              <input
                type="text"
                value={payAddressConfirm}
                onChange={(e) => setPayAddressConfirm(e.target.value)}
                placeholder={payingWithdrawal.destinationAddress.slice(-8)}
                maxLength={8}
                className="w-full rounded-[12px] border border-border bg-background/30 px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted focus:border-brand focus:outline-none"
              />
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                Transaction hash
              </label>
              <input
                type="text"
                value={payTxHash}
                onChange={(e) => setPayTxHash(e.target.value)}
                placeholder="Paste tx hash from wallet"
                className="w-full rounded-[12px] border border-border bg-background/30 px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted focus:border-brand focus:outline-none"
              />
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleMarkPaid}
                disabled={
                  !payTxHash.trim() ||
                  payAddressConfirm !== payingWithdrawal.destinationAddress.slice(-8)
                }
                className="flex-1 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-40"
              >
                Confirm Paid
              </button>
              <button
                onClick={() => { setPayId(null); setPayTxHash(""); setPayAddressConfirm(""); }}
                className="flex-1 rounded-full border border-border bg-background/30 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-brand"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
