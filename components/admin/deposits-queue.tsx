"use client";

import { useState } from "react";
import {
  CheckCircle,
  XCircle,
  Eye,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { formatTokenAmount, formatUsdFromCents } from "@/lib/utils/format";
import type { Deposit, DepositStatus } from "@/types/deposit";

const formatDepositAmount = (deposit: Deposit) => {
  if (deposit.amount != null && deposit.amount > 0) {
    const tokenStr = formatTokenAmount(deposit.amount, deposit.tokenSymbol);
    return deposit.usdValueCents != null && deposit.usdValueCents > 0
      ? `${tokenStr} (≈ ${formatUsdFromCents(deposit.usdValueCents)})`
      : tokenStr;
  }
  return formatUsdFromCents(deposit.amountCents);
};

const STATUS_COLORS: Record<DepositStatus, string> = {
  pending: "bg-yellow-400/15 text-yellow-400",
  approved: "bg-up/15 text-up",
  rejected: "bg-down/15 text-down",
};

interface Props {
  initialDeposits: Deposit[];
}

export default function DepositsQueue({ initialDeposits }: Props) {
  const [deposits, setDeposits] = useState<Deposit[]>(initialDeposits);
  const [statusFilter, setStatusFilter] = useState<DepositStatus | "all">("pending");
  const [lightboxPath, setLightboxPath] = useState<string | null>(null);
  const [approveTarget, setApproveTarget] = useState<Deposit | null>(null);
  const [approveAmount, setApproveAmount] = useState("");
  const [approveNote, setApproveNote] = useState("");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const filtered = statusFilter === "all"
    ? deposits
    : deposits.filter((d) => d.status === statusFilter);

  const setDepositStatus = (id: string, updated: Deposit) =>
    setDeposits((prev) => prev.map((d) => (d.id === id ? updated : d)));

  const toggleBusy = (id: string, on: boolean) =>
    setBusy((prev) => {
      const next = new Set(prev);
      if (on) { next.add(id); } else { next.delete(id); }
      return next;
    });

  const openApprove = (deposit: Deposit) => {
    setApproveTarget(deposit);
    setApproveAmount(
      deposit.amount != null && deposit.amount > 0
        ? String(deposit.amount)
        : (deposit.amountCents / 100).toFixed(2),
    );
    setApproveNote("");
    setError(null);
  };

  const closeApprove = () => {
    setApproveTarget(null);
    setApproveAmount("");
    setApproveNote("");
  };

  const handleApprove = async () => {
    if (!approveTarget) return;
    const parsed = Number.parseFloat(approveAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    const id = approveTarget.id;
    toggleBusy(id, true);
    setError(null);
    const res = await fetch(`/api/admin/deposits/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: parsed,
        note: approveNote.trim() || undefined,
      }),
    });
    toggleBusy(id, false);
    if (res.ok) {
      const data = (await res.json()) as { deposit: Deposit };
      setDepositStatus(id, data.deposit);
      closeApprove();
    } else {
      const json = (await res.json()) as { error?: { message?: string } };
      setError(json.error?.message ?? "Approve failed.");
    }
  };

  const handleReject = async () => {
    if (!rejectId || !rejectNote.trim()) return;
    toggleBusy(rejectId, true);
    setError(null);
    const res = await fetch(`/api/admin/deposits/${rejectId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: rejectNote }),
    });
    toggleBusy(rejectId, false);
    if (res.ok) {
      const data = await res.json() as { deposit: Deposit };
      setDepositStatus(rejectId, data.deposit);
      setRejectId(null);
      setRejectNote("");
    } else {
      const json = await res.json() as { error?: { message?: string } };
      setError(json.error?.message ?? "Reject failed.");
    }
  };

  const refresh = async () => {
    const res = await fetch(`/api/admin/deposits?status=${statusFilter === "all" ? "" : statusFilter}`);
    if (res.ok) {
      const data = await res.json() as { items: Deposit[] };
      setDeposits(data.items);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {(["pending", "approved", "rejected", "all"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-4 py-2 text-sm font-semibold capitalize transition ${
              statusFilter === s
                ? "bg-brand text-background"
                : "border border-border bg-background/30 text-foreground hover:border-brand"
            }`}
          >
            {s}
          </button>
        ))}
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
              {["User", "Token / Network", "Amount", "Tx Hash", "Submitted", "Status", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted">
                  No deposits found.
                </td>
              </tr>
            )}
            {filtered.map((deposit) => (
              <tr key={deposit.id} className="hover:bg-background/20">
                <td className="px-4 py-4 font-mono text-xs text-muted">
                  {deposit.userId.slice(0, 8)}…
                </td>
                <td className="px-4 py-4 text-sm text-foreground">
                  {deposit.tokenSymbol} · {deposit.network}
                </td>
                <td className="px-4 py-4 text-sm font-semibold text-foreground">
                  {formatDepositAmount(deposit)}
                </td>
                <td className="px-4 py-4 font-mono text-xs text-muted">
                  {deposit.txHash ? `${deposit.txHash.slice(0, 12)}…` : "—"}
                </td>
                <td className="px-4 py-4 text-xs text-muted">
                  {new Date(deposit.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_COLORS[deposit.status]}`}>
                    {deposit.status}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setLightboxPath(deposit.proofPath)}
                      title="View screenshot"
                      className="rounded-full border border-border p-1.5 text-muted transition hover:border-brand hover:text-foreground"
                    >
                      <Eye size={14} />
                    </button>
                    {deposit.status === "pending" && (
                      <>
                        <button
                          onClick={() => openApprove(deposit)}
                          disabled={busy.has(deposit.id)}
                          title="Approve"
                          className="rounded-full border border-up/40 bg-up/10 p-1.5 text-up transition hover:bg-up/20 disabled:opacity-40"
                        >
                          <CheckCircle size={14} />
                        </button>
                        <button
                          onClick={() => setRejectId(deposit.id)}
                          disabled={busy.has(deposit.id)}
                          title="Reject"
                          className="rounded-full border border-down/40 bg-down/10 p-1.5 text-down transition hover:bg-down/20 disabled:opacity-40"
                        >
                          <XCircle size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Lightbox */}
      {lightboxPath && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur"
          onClick={() => setLightboxPath(null)}
        >
          <div className="max-h-[90vh] max-w-[90vw] overflow-hidden rounded-[20px] border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/media/deposit-proofs/${lightboxPath}`}
              alt="Deposit proof"
              className="max-h-[85vh] w-auto object-contain"
            />
          </div>
        </div>
      )}

      {/* Approve modal */}
      {approveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur">
          <div className="w-full max-w-md rounded-[24px] border border-border bg-surface-soft p-8">
            <h3 className="font-display text-2xl text-foreground">Approve deposit</h3>
            <p className="mt-2 text-sm text-muted">
              Confirm the {approveTarget.tokenSymbol} amount to credit. Submitted:{" "}
              <span className="font-semibold text-foreground">
                {formatDepositAmount(approveTarget)}
              </span>
              .
            </p>

            <label className="mt-5 block text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Amount ({approveTarget.tokenSymbol})
            </label>
            <div className="mt-2 flex items-center gap-2 rounded-[12px] border border-border bg-background/30 px-4 py-3">
              <input
                type="number"
                min="0"
                step="any"
                value={approveAmount}
                onChange={(e) => setApproveAmount(e.target.value)}
                className="flex-1 bg-transparent text-sm text-foreground outline-none"
              />
              <span className="text-sm text-muted">{approveTarget.tokenSymbol}</span>
            </div>

            <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Internal note (optional)
            </label>
            <textarea
              value={approveNote}
              onChange={(e) => setApproveNote(e.target.value)}
              rows={2}
              placeholder="Visible in the user's deposit history."
              className="mt-2 w-full rounded-[12px] border border-border bg-background/30 px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-brand focus:outline-none"
            />

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleApprove}
                disabled={busy.has(approveTarget.id)}
                className="flex-1 rounded-full bg-up px-5 py-3 text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-40"
              >
                {busy.has(approveTarget.id) ? "Approving…" : "Approve & credit"}
              </button>
              <button
                onClick={closeApprove}
                disabled={busy.has(approveTarget.id)}
                className="flex-1 rounded-full border border-border bg-background/30 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-brand disabled:opacity-40"
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
            <h3 className="font-display text-2xl text-foreground">Reject deposit</h3>
            <p className="mt-2 text-sm text-muted">
              Provide a reason visible to the user.
            </p>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={3}
              placeholder="e.g. Screenshot unclear, wrong network…"
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
    </div>
  );
}
