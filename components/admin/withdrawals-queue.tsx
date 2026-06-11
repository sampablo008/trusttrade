"use client";

import { useMemo, useState } from "react";
import { CheckCircle, XCircle, CreditCard, RefreshCw, Flag, Inbox } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { formatTokenAmount, formatUsdFromCents } from "@/lib/utils/format";
import type { Withdrawal } from "@/types/withdrawal";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { StatusPill } from "@/components/ui/StatusPill";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { FormField } from "@/components/ui/FormField";
import { Input, Textarea } from "@/components/ui/Input";
import { CopyButton } from "@/components/ui/CopyButton";
import EmptyState from "@/components/ui/EmptyState";
import { notify } from "@/components/ui/toast";

const formatWithdrawalAmount = (w: Withdrawal) => {
  if (w.amount != null && w.amount > 0) {
    const tokenStr = formatTokenAmount(w.amount, w.tokenSymbol);
    return w.usdValueCents != null && w.usdValueCents > 0
      ? `${tokenStr} (≈ ${formatUsdFromCents(w.usdValueCents)})`
      : tokenStr;
  }
  return formatUsdFromCents(w.amountCents);
};

interface Props {
  initialWithdrawals: Withdrawal[];
}

export default function WithdrawalsQueue({ initialWithdrawals }: Props) {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>(initialWithdrawals);
  const [activeTab, setActiveTab] = useState<"queue" | "payout">("queue");
  const [refreshing, setRefreshing] = useState(false);
  const [approveId, setApproveId] = useState<string | null>(null);
  const [approveNote, setApproveNote] = useState("");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [payId, setPayId] = useState<string | null>(null);
  const [payTxHash, setPayTxHash] = useState("");
  const [payAddressConfirm, setPayAddressConfirm] = useState("");
  const [busy, setBusy] = useState<Set<string>>(new Set());

  const pendingItems = useMemo(
    () => withdrawals.filter((w) => w.status === "pending"),
    [withdrawals],
  );
  const payoutItems = useMemo(
    () => withdrawals.filter((w) => w.status === "approved"),
    [withdrawals],
  );
  const displayItems = activeTab === "queue" ? pendingItems : payoutItems;

  const updateWithdrawal = (id: string, updated: Withdrawal) =>
    setWithdrawals((prev) => prev.map((w) => (w.id === id ? updated : w)));

  const toggleBusy = (id: string, on: boolean) =>
    setBusy((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const handleApprove = async () => {
    if (!approveId) return;
    toggleBusy(approveId, true);
    const res = await fetch(`/api/admin/withdrawals/${approveId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: approveNote }),
    });
    toggleBusy(approveId, false);
    if (res.ok) {
      const data = (await res.json()) as { withdrawal: Withdrawal };
      updateWithdrawal(approveId, data.withdrawal);
      notify.success("Withdrawal approved", "Moved to the payout queue.");
      setApproveId(null);
      setApproveNote("");
    } else {
      const json = (await res.json()) as { error?: { message?: string } };
      notify.error("Approve failed", json.error?.message);
    }
  };

  const handleReject = async () => {
    if (!rejectId || !rejectNote.trim()) return;
    toggleBusy(rejectId, true);
    const res = await fetch(`/api/admin/withdrawals/${rejectId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: rejectNote }),
    });
    toggleBusy(rejectId, false);
    if (res.ok) {
      const data = (await res.json()) as { withdrawal: Withdrawal };
      updateWithdrawal(rejectId, data.withdrawal);
      notify.success("Withdrawal rejected", "Balance refunded to the user.");
      setRejectId(null);
      setRejectNote("");
    } else {
      const json = (await res.json()) as { error?: { message?: string } };
      notify.error("Reject failed", json.error?.message);
    }
  };

  const handleMarkPaid = async () => {
    if (!payId || !payTxHash.trim() || !payAddressConfirm.trim()) return;
    toggleBusy(payId, true);
    const res = await fetch(`/api/admin/withdrawals/${payId}/mark-paid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ txHash: payTxHash, addressConfirm: payAddressConfirm }),
    });
    toggleBusy(payId, false);
    if (res.ok) {
      const data = (await res.json()) as { withdrawal: Withdrawal };
      updateWithdrawal(payId, data.withdrawal);
      notify.success("Marked as paid");
      setPayId(null);
      setPayTxHash("");
      setPayAddressConfirm("");
    } else {
      const json = (await res.json()) as { error?: { message?: string } };
      notify.error("Mark paid failed", json.error?.message);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    const res = await fetch("/api/admin/withdrawals");
    if (res.ok) {
      const data = (await res.json()) as { items: Withdrawal[] };
      setWithdrawals(data.items);
    } else {
      notify.error("Could not refresh withdrawals");
    }
    setRefreshing(false);
  };

  const payingWithdrawal = withdrawals.find((w) => w.id === payId);

  const UserCell = ({ w }: { w: Withdrawal }) =>
    w.userUsername || w.userEmail ? (
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-semibold text-foreground">{w.userUsername ?? "—"}</span>
        <span className="text-xs text-muted">{w.userEmail ?? ""}</span>
      </div>
    ) : (
      <span className="font-mono text-xs text-muted">{w.userId.slice(0, 8)}…</span>
    );

  const Flags = ({ w }: { w: Withdrawal }) =>
    w.flags.length === 0 ? (
      <span className="text-xs text-muted">—</span>
    ) : (
      <div className="flex flex-wrap gap-1">
        {w.flags.map((f) => (
          <Badge key={f} tone="warning" icon={<Flag size={10} aria-hidden="true" />}>
            {f}
          </Badge>
        ))}
      </div>
    );

  const Actions = ({ w }: { w: Withdrawal }) => (
    <div className="flex items-center gap-2">
      {activeTab === "queue" && (
        <>
          <button
            onClick={() => setApproveId(w.id)}
            disabled={busy.has(w.id)}
            aria-label="Approve withdrawal"
            title="Approve"
            className="rounded-full border border-up/40 bg-up/10 p-1.5 text-up transition focus-ring hover:bg-up/20 disabled:opacity-40"
          >
            <CheckCircle size={14} aria-hidden="true" />
          </button>
          <button
            onClick={() => setRejectId(w.id)}
            disabled={busy.has(w.id)}
            aria-label="Reject withdrawal"
            title="Reject"
            className="rounded-full border border-down/40 bg-down/10 p-1.5 text-down transition focus-ring hover:bg-down/20 disabled:opacity-40"
          >
            <XCircle size={14} aria-hidden="true" />
          </button>
        </>
      )}
      {activeTab === "payout" && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setPayId(w.id)}
          disabled={busy.has(w.id)}
          iconLeft={<CreditCard size={12} aria-hidden="true" />}
        >
          Mark Paid
        </Button>
      )}
    </div>
  );

  const columns = useMemo<ColumnDef<Withdrawal, unknown>[]>(
    () => [
      {
        id: "user",
        header: "User",
        enableSorting: false,
        cell: ({ row }) => <UserCell w={row.original} />,
      },
      {
        id: "amount",
        header: "Amount",
        accessorFn: (w) => w.usdValueCents ?? w.amountCents,
        cell: ({ row }) => (
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {formatWithdrawalAmount(row.original)}
          </span>
        ),
      },
      {
        id: "token",
        header: "Token / Network",
        accessorFn: (w) => `${w.tokenSymbol} · ${w.network}`,
        enableSorting: false,
        cell: ({ getValue }) => (
          <span className="text-sm text-foreground">{getValue() as string}</span>
        ),
      },
      {
        id: "destination",
        header: "Destination",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="flex items-center gap-1 font-mono text-xs text-muted">
            <span className="max-w-32 truncate">{row.original.destinationAddress}</span>
            <CopyButton value={row.original.destinationAddress} label="Copy destination address" />
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
        id: "flags",
        header: "Flags",
        enableSorting: false,
        cell: ({ row }) => <Flags w={row.original} />,
      },
      {
        id: "createdAt",
        header: "Date",
        accessorFn: (w) => new Date(w.createdAt).getTime(),
        cell: ({ row }) => (
          <span className="text-xs text-muted">
            {new Date(row.original.createdAt).toLocaleDateString()}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => <Actions w={row.original} />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeTab, busy],
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Tab + refresh row */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setActiveTab("queue")}
          aria-pressed={activeTab === "queue"}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition focus-ring ${
            activeTab === "queue"
              ? "bg-brand text-background"
              : "border border-border bg-background/30 text-foreground hover:border-brand"
          }`}
        >
          Review Queue ({pendingItems.length})
        </button>
        <button
          onClick={() => setActiveTab("payout")}
          aria-pressed={activeTab === "payout"}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition focus-ring ${
            activeTab === "payout"
              ? "bg-brand text-background"
              : "border border-border bg-background/30 text-foreground hover:border-brand"
          }`}
        >
          Payout ({payoutItems.length})
        </button>
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
        data={displayItems}
        getRowId={(w) => w.id}
        emptyState={
          <EmptyState
            icon={Inbox}
            title={activeTab === "queue" ? "No pending withdrawals" : "No withdrawals awaiting payout"}
            description="Nothing to action right now."
          />
        }
        mobileCard={(w) => (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <UserCell w={w} />
              <StatusPill status={w.status} />
            </div>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-muted">Amount</dt>
                <dd className="font-semibold tabular-nums text-foreground">
                  {formatWithdrawalAmount(w)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-muted">Token</dt>
                <dd className="text-foreground">
                  {w.tokenSymbol} · {w.network}
                </dd>
              </div>
            </dl>
            <Flags w={w} />
            <Actions w={w} />
          </div>
        )}
      />

      {/* Approve modal */}
      <Modal
        open={Boolean(approveId)}
        onClose={() => {
          setApproveId(null);
          setApproveNote("");
        }}
        title="Approve withdrawal"
        description="Optional note for the audit log."
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setApproveId(null);
                setApproveNote("");
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleApprove}
              loading={approveId ? busy.has(approveId) : false}
            >
              Confirm approve
            </Button>
          </>
        }
      >
        <FormField htmlFor="wd-approve-note" label="Note (optional)">
          <Textarea
            id="wd-approve-note"
            rows={2}
            value={approveNote}
            onChange={(e) => setApproveNote(e.target.value)}
            placeholder="Optional note…"
          />
        </FormField>
      </Modal>

      {/* Reject modal */}
      <Modal
        open={Boolean(rejectId)}
        onClose={() => {
          setRejectId(null);
          setRejectNote("");
        }}
        title="Reject withdrawal"
        description="Provide a reason — balance is refunded immediately."
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setRejectId(null);
                setRejectNote("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleReject}
              loading={rejectId ? busy.has(rejectId) : false}
              disabled={!rejectNote.trim()}
            >
              Confirm reject
            </Button>
          </>
        }
      >
        <FormField htmlFor="wd-reject-note" label="Reason" required>
          <Textarea
            id="wd-reject-note"
            rows={3}
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="e.g. Suspicious activity, RAPID flag…"
          />
        </FormField>
      </Modal>

      {/* Mark-paid modal — requires address confirm */}
      <Modal
        open={Boolean(payId && payingWithdrawal)}
        onClose={() => {
          setPayId(null);
          setPayTxHash("");
          setPayAddressConfirm("");
        }}
        title="Mark as paid"
        footer={
          payingWithdrawal ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setPayId(null);
                  setPayTxHash("");
                  setPayAddressConfirm("");
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleMarkPaid}
                loading={payId ? busy.has(payId) : false}
                disabled={
                  !payTxHash.trim() ||
                  payAddressConfirm !== payingWithdrawal.destinationAddress.slice(-8)
                }
              >
                Confirm paid
              </Button>
            </>
          ) : undefined
        }
      >
        {payingWithdrawal ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-background/30 p-4">
              <p className="text-xs text-muted">Destination</p>
              <code className="mt-1 block break-all font-mono text-sm text-foreground">
                {payingWithdrawal.destinationAddress}
              </code>
            </div>
            <FormField
              htmlFor="pay-addr-confirm"
              label="Re-type last 8 chars of address"
              required
            >
              <Input
                id="pay-addr-confirm"
                value={payAddressConfirm}
                onChange={(e) => setPayAddressConfirm(e.target.value)}
                placeholder={payingWithdrawal.destinationAddress.slice(-8)}
                maxLength={8}
                className="font-mono"
              />
            </FormField>
            <FormField htmlFor="pay-tx-hash" label="Transaction hash" required>
              <Input
                id="pay-tx-hash"
                value={payTxHash}
                onChange={(e) => setPayTxHash(e.target.value)}
                placeholder="Paste tx hash from wallet"
                className="font-mono"
              />
            </FormField>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
