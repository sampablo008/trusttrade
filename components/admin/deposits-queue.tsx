"use client";

import { useMemo, useState } from "react";
import { CheckCircle, XCircle, Eye, RefreshCw, Inbox } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { formatTokenAmount, formatUsdFromCents } from "@/lib/utils/format";
import type { Deposit, DepositStatus } from "@/types/deposit";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { StatusPill } from "@/components/ui/StatusPill";
import { Modal } from "@/components/ui/Modal";
import { FormField } from "@/components/ui/FormField";
import { Textarea } from "@/components/ui/Input";
import { TokenAmountInput } from "@/components/ui/TokenAmountInput";
import { CopyButton } from "@/components/ui/CopyButton";
import EmptyState from "@/components/ui/EmptyState";
import { notify } from "@/components/ui/toast";

const formatDepositAmount = (deposit: Deposit) => {
  if (deposit.amount != null && deposit.amount > 0) {
    const tokenStr = formatTokenAmount(deposit.amount, deposit.tokenSymbol);
    return deposit.usdValueCents != null && deposit.usdValueCents > 0
      ? `${tokenStr} (≈ ${formatUsdFromCents(deposit.usdValueCents)})`
      : tokenStr;
  }
  return formatUsdFromCents(deposit.amountCents);
};

interface Props {
  initialDeposits: Deposit[];
}

export default function DepositsQueue({ initialDeposits }: Props) {
  const [deposits, setDeposits] = useState<Deposit[]>(initialDeposits);
  const [statusFilter, setStatusFilter] = useState<DepositStatus | "all">("pending");
  const [refreshing, setRefreshing] = useState(false);
  const [lightboxPath, setLightboxPath] = useState<string | null>(null);
  const [approveTarget, setApproveTarget] = useState<Deposit | null>(null);
  const [approveAmount, setApproveAmount] = useState("");
  const [approveNote, setApproveNote] = useState("");
  const [approveError, setApproveError] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Deposit | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [busy, setBusy] = useState<Set<string>>(new Set());

  const filtered = useMemo(
    () =>
      statusFilter === "all"
        ? deposits
        : deposits.filter((d) => d.status === statusFilter),
    [deposits, statusFilter],
  );

  const setDepositStatus = (id: string, updated: Deposit) =>
    setDeposits((prev) => prev.map((d) => (d.id === id ? updated : d)));

  const toggleBusy = (id: string, on: boolean) =>
    setBusy((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
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
    setApproveError(null);
  };

  const closeApprove = () => {
    setApproveTarget(null);
    setApproveAmount("");
    setApproveNote("");
    setApproveError(null);
  };

  const handleApprove = async () => {
    if (!approveTarget) return;
    const parsed = Number.parseFloat(approveAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setApproveError("Enter an amount greater than zero.");
      return;
    }
    const id = approveTarget.id;
    toggleBusy(id, true);
    setApproveError(null);
    const res = await fetch(`/api/admin/deposits/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: parsed, note: approveNote.trim() || undefined }),
    });
    toggleBusy(id, false);
    if (res.ok) {
      const data = (await res.json()) as { deposit: Deposit };
      setDepositStatus(id, data.deposit);
      // Surface the just-approved row: jump the filter to its new status so it
      // doesn't silently vanish from the default "pending" view.
      if (statusFilter === "pending") setStatusFilter("approved");
      notify.success("Deposit approved", "User balance credited.");
      closeApprove();
    } else {
      const json = (await res.json()) as { error?: { message?: string } };
      setApproveError(json.error?.message ?? "Approve failed.");
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectNote.trim()) return;
    const id = rejectTarget.id;
    toggleBusy(id, true);
    const res = await fetch(`/api/admin/deposits/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: rejectNote }),
    });
    toggleBusy(id, false);
    if (res.ok) {
      const data = (await res.json()) as { deposit: Deposit };
      setDepositStatus(id, data.deposit);
      notify.success("Deposit rejected");
      setRejectTarget(null);
      setRejectNote("");
    } else {
      const json = (await res.json()) as { error?: { message?: string } };
      notify.error("Reject failed", json.error?.message);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    const res = await fetch(
      `/api/admin/deposits?status=${statusFilter === "all" ? "" : statusFilter}`,
    );
    if (res.ok) {
      const data = (await res.json()) as { items: Deposit[] };
      setDeposits(data.items);
    } else {
      notify.error("Could not refresh deposits");
    }
    setRefreshing(false);
  };

  const UserCell = ({ deposit }: { deposit: Deposit }) =>
    deposit.userUsername || deposit.userEmail ? (
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-semibold text-foreground">
          {deposit.userUsername ?? "—"}
        </span>
        <span className="text-xs text-muted">{deposit.userEmail ?? ""}</span>
      </div>
    ) : (
      <span className="font-mono text-xs text-muted">{deposit.userId.slice(0, 8)}…</span>
    );

  const Actions = ({ deposit }: { deposit: Deposit }) => (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setLightboxPath(deposit.proofPath)}
        aria-label="View deposit screenshot"
        title="View screenshot"
        className="rounded-full border border-border p-1.5 text-muted transition focus-ring hover:border-brand hover:text-foreground"
      >
        <Eye size={14} aria-hidden="true" />
      </button>
      {deposit.status === "pending" && (
        <>
          <button
            onClick={() => openApprove(deposit)}
            disabled={busy.has(deposit.id)}
            aria-label="Approve deposit"
            title="Approve"
            className="rounded-full border border-up/40 bg-up/10 p-1.5 text-up transition focus-ring hover:bg-up/20 disabled:opacity-40"
          >
            <CheckCircle size={14} aria-hidden="true" />
          </button>
          <button
            onClick={() => {
              setRejectTarget(deposit);
              setRejectNote("");
            }}
            disabled={busy.has(deposit.id)}
            aria-label="Reject deposit"
            title="Reject"
            className="rounded-full border border-down/40 bg-down/10 p-1.5 text-down transition focus-ring hover:bg-down/20 disabled:opacity-40"
          >
            <XCircle size={14} aria-hidden="true" />
          </button>
        </>
      )}
    </div>
  );

  const columns = useMemo<ColumnDef<Deposit, unknown>[]>(
    () => [
      {
        id: "user",
        header: "User",
        enableSorting: false,
        cell: ({ row }) => <UserCell deposit={row.original} />,
      },
      {
        id: "token",
        header: "Token / Network",
        accessorFn: (d) => `${d.tokenSymbol} · ${d.network}`,
        enableSorting: false,
        cell: ({ getValue }) => (
          <span className="text-sm text-foreground">{getValue() as string}</span>
        ),
      },
      {
        id: "amount",
        header: "Amount",
        accessorFn: (d) => d.usdValueCents ?? d.amountCents,
        cell: ({ row }) => (
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {formatDepositAmount(row.original)}
          </span>
        ),
      },
      {
        id: "txHash",
        header: "Tx Hash",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.txHash ? (
            <span className="flex items-center gap-1 font-mono text-xs text-muted">
              {row.original.txHash.slice(0, 12)}…
              <CopyButton value={row.original.txHash} label="Copy transaction hash" />
            </span>
          ) : (
            <span className="text-muted">—</span>
          ),
      },
      {
        id: "createdAt",
        header: "Submitted",
        accessorFn: (d) => new Date(d.createdAt).getTime(),
        cell: ({ row }) => (
          <span className="text-xs text-muted">
            {new Date(row.original.createdAt).toLocaleDateString()}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => <StatusPill status={row.original.status} />,
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => <Actions deposit={row.original} />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busy],
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {(["pending", "approved", "rejected", "all"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            aria-pressed={statusFilter === s}
            className={`rounded-full px-4 py-2 text-sm font-semibold capitalize transition focus-ring ${
              statusFilter === s
                ? "bg-brand text-background"
                : "border border-border bg-background/30 text-foreground hover:border-brand"
            }`}
          >
            {s}
          </button>
        ))}
        <Button
          variant="secondary"
          size="sm"
          onClick={refresh}
          loading={refreshing}
          iconLeft={<RefreshCw size={14} aria-hidden="true" />}
          className="ml-auto"
        >
          Refresh
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(d) => d.id}
        emptyState={
          <EmptyState
            icon={Inbox}
            title="No deposits found"
            description="Nothing matches this filter right now."
          />
        }
        mobileCard={(deposit) => (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <UserCell deposit={deposit} />
              <StatusPill status={deposit.status} />
            </div>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-muted">Amount</dt>
                <dd className="font-semibold tabular-nums text-foreground">
                  {formatDepositAmount(deposit)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-muted">Token</dt>
                <dd className="text-foreground">
                  {deposit.tokenSymbol} · {deposit.network}
                </dd>
              </div>
            </dl>
            <Actions deposit={deposit} />
          </div>
        )}
      />

      {/* Lightbox */}
      <Modal
        open={Boolean(lightboxPath)}
        onClose={() => setLightboxPath(null)}
        title="Deposit proof"
        size="lg"
      >
        {lightboxPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/media/deposit-proofs/${lightboxPath}`}
            alt="Deposit proof screenshot"
            className="max-h-[70vh] w-full rounded-xl object-contain"
          />
        ) : null}
      </Modal>

      {/* Approve modal */}
      <Modal
        open={Boolean(approveTarget)}
        onClose={closeApprove}
        title="Approve deposit"
        description={
          approveTarget
            ? `Confirm the ${approveTarget.tokenSymbol} amount to credit. Submitted: ${formatDepositAmount(
                approveTarget,
              )}.`
            : undefined
        }
        dismissible={!approveTarget || !busy.has(approveTarget.id)}
        footer={
          approveTarget ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={closeApprove}
                disabled={busy.has(approveTarget.id)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleApprove}
                loading={busy.has(approveTarget.id)}
              >
                Approve &amp; credit
              </Button>
            </>
          ) : undefined
        }
      >
        {approveTarget ? (
          <div className="space-y-4">
            <FormField
              htmlFor="approve-amount"
              label={`Amount (${approveTarget.tokenSymbol})`}
              required
              error={approveError ?? undefined}
            >
              <TokenAmountInput
                id="approve-amount"
                value={approveAmount}
                onChange={setApproveAmount}
                symbol={approveTarget.tokenSymbol}
                priceCents={
                  approveTarget.amount != null &&
                  approveTarget.amount > 0 &&
                  approveTarget.usdValueCents != null &&
                  approveTarget.usdValueCents > 0
                    ? Math.round(approveTarget.usdValueCents / approveTarget.amount)
                    : null
                }
                invalid={Boolean(approveError)}
              />
            </FormField>
            <FormField htmlFor="approve-note" label="Internal note (optional)">
              <Textarea
                id="approve-note"
                rows={2}
                value={approveNote}
                onChange={(e) => setApproveNote(e.target.value)}
                placeholder="Visible in the user's deposit history."
              />
            </FormField>
          </div>
        ) : null}
      </Modal>

      {/* Reject modal */}
      <Modal
        open={Boolean(rejectTarget)}
        onClose={() => {
          setRejectTarget(null);
          setRejectNote("");
        }}
        title="Reject deposit"
        description="Provide a reason visible to the user."
        footer={
          rejectTarget ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setRejectTarget(null);
                  setRejectNote("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleReject}
                loading={busy.has(rejectTarget.id)}
                disabled={!rejectNote.trim()}
              >
                Confirm reject
              </Button>
            </>
          ) : undefined
        }
      >
        <FormField htmlFor="reject-note" label="Reason" required>
          <Textarea
            id="reject-note"
            rows={3}
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="e.g. Screenshot unclear, wrong network…"
          />
        </FormField>
      </Modal>
    </div>
  );
}
