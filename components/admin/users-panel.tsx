"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { ChevronDown, Plus, Minus, Snowflake, CheckCircle2, Trash2, AlertTriangle } from "lucide-react";
import BalanceHistoryDrawer from "@/components/admin/balance-history-drawer";
import CoinIcon from "@/components/ui/CoinIcon";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TokenAmountInput } from "@/components/ui/TokenAmountInput";
import { Badge } from "@/components/ui/Badge";
import { formatTokenAmount, formatUsdFromCents } from "@/lib/utils/format";
import type { AdminTokenBalance, AdminUser } from "@/types/admin";
import type { TradeOutcome } from "@/types/trade";

interface UsersPanelProps {
  initialData: { items: AdminUser[]; total: number };
}

type RoleTab = "user" | "admin";
type ForcedChoice = "auto" | "win" | "lose";
type AdjustSign = "credit" | "debit";

const outcomeToChoice = (o: TradeOutcome | null): ForcedChoice =>
  o === "win" ? "win" : o === "lose" ? "lose" : "auto";

const choiceToOutcome = (c: ForcedChoice): TradeOutcome | null =>
  c === "auto" ? null : c;

export default function UsersPanel({ initialData }: UsersPanelProps) {
  const [tab, setTab] = useState<RoleTab>("user");
  const [users, setUsers] = useState<AdminUser[]>(initialData.items);
  const [total, setTotal] = useState(initialData.total);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<string>("");
  const [adjustSign, setAdjustSign] = useState<AdjustSign>("credit");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyUserId, setHistoryUserId] = useState<string | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const limit = 50;

  const expandedUser = users.find((u) => u.userId === expandedUserId) ?? null;

  // When a user is expanded, fetch full detail (token balances) lazily.
  useEffect(() => {
    if (!expandedUserId) return;
    const u = users.find((x) => x.userId === expandedUserId);
    if (!u || u.tokenBalances) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/admin/users/${expandedUserId}`);
      const data = (await res.json()) as { user?: AdminUser };
      if (!cancelled && data.user) {
        const fetched = data.user;
        setUsers((prev) =>
          prev.map((x) => (x.userId === fetched.userId ? fetched : x)),
        );
        // Default-select the first token (highest USD value).
        if (fetched.tokenBalances && fetched.tokenBalances.length > 0) {
          setAdjustTarget(fetched.tokenBalances[0].tokenId);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [expandedUserId, users]);

  const fetchUsers = useCallback(
    async (q: string, off: number, role: RoleTab) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          limit: String(limit),
          offset: String(off),
          role,
        });
        if (q) params.set("search", q);
        const res = await fetch(`/api/admin/users?${params}`);
        const data = (await res.json()) as { items: AdminUser[]; total: number };
        setUsers(data.items ?? []);
        setTotal(data.total ?? 0);
        setOffset(off);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(search, 0, tab);
  };

  const handleTab = (next: RoleTab) => {
    if (next === tab) return;
    setTab(next);
    setExpandedUserId(null);
    fetchUsers(search, 0, next);
  };

  const toggleExpand = (userId: string) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      return;
    }
    setExpandedUserId(userId);
    setAdjustTarget("");
    setAdjustSign("credit");
    setAdjustAmount("");
    setAdjustNote("");
    setAdjustError(null);
    setDeleteConfirm("");
    setDeleteReason("");
    setDeleteError(null);
  };

  const handleDelete = async (user: AdminUser) => {
    setDeleteError(null);
    setDeleteSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${user.userId}`, {
        body: JSON.stringify({ reason: deleteReason || undefined }),
        headers: { "Content-Type": "application/json" },
        method: "DELETE",
      });
      const data = (await res.json().catch(() => ({}))) as
        | { ok: true }
        | { error: { code: string; message: string } };

      if (!res.ok || "error" in data) {
        setDeleteError(
          "error" in data ? data.error.message : "Deletion failed.",
        );
        return;
      }

      setExpandedUserId(null);
      setDeleteConfirm("");
      setDeleteReason("");
      setUsers((prev) => prev.filter((u) => u.userId !== user.userId));
      setTotal((t) => Math.max(t - 1, 0));
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const replaceUser = (next: AdminUser) =>
    setUsers((prev) => prev.map((u) => (u.userId === next.userId ? next : u)));

  const handleFreeze = async (userId: string, isFrozen: boolean) => {
    await fetch(`/api/admin/users/${userId}/freeze`, {
      body: JSON.stringify({ isFrozen }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    setUsers((prev) =>
      prev.map((u) => (u.userId === userId ? { ...u, isFrozen } : u)),
    );
  };

  const handleSetForced = async (
    userId: string,
    forcedOutcome: TradeOutcome | null,
  ) => {
    const res = await fetch(`/api/admin/users/${userId}/set-forced-outcome`, {
      body: JSON.stringify({ forcedOutcome }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const data = (await res.json()) as { user?: AdminUser };
    if (data.user) replaceUser(data.user);
  };

  const handleAdjust = async () => {
    if (!expandedUser || !adjustTarget) return;
    const amount = parseFloat(adjustAmount);
    if (!isFinite(amount) || amount <= 0 || !adjustNote.trim()) return;
    const signed = adjustSign === "debit" ? -amount : amount;

    setAdjustError(null);
    setAdjustSubmitting(true);
    try {
      const res = await fetch(
        `/api/admin/users/${expandedUser.userId}/adjust-token-balance`,
        {
          body: JSON.stringify({
            tokenId: adjustTarget,
            deltaAmount: signed,
            note: adjustNote,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      const data = (await res.json()) as
        | { user: AdminUser }
        | { error: { code: string; message: string } };

      if (!res.ok || "error" in data) {
        const message = "error" in data ? data.error.message : "Adjustment failed.";
        setAdjustError(message);
        return;
      }

      replaceUser(data.user);
      setHistoryRefreshKey((k) => k + 1);
      setAdjustAmount("");
      setAdjustNote("");
    } finally {
      setAdjustSubmitting(false);
    }
  };

  const adjustTokenSelected: AdminTokenBalance | null =
    expandedUser?.tokenBalances?.find((t) => t.tokenId === adjustTarget) ?? null;

  const openHistory = (userId: string) => {
    setHistoryUserId(userId);
    setHistoryOpen(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-background/30 p-1">
          {(
            [
              { id: "user", label: "Users" },
              { id: "admin", label: "Admins" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleTab(t.id)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                tab === t.id
                  ? "bg-foreground text-background"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} className="flex min-w-65 flex-1 gap-3">
          <label htmlFor="user-search" className="sr-only">
            Search username or email
          </label>
          <Input
            id="user-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search username or email…"
            className="flex-1 rounded-full px-5 py-2.5"
          />
          <Button type="submit">Search</Button>
        </form>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border">
        <table className="min-w-full divide-y divide-border text-left">
          <thead className="bg-surface">
            <tr>
              <th className="w-10 px-4 py-3" />
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                User
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                Trades
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                Status
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                Outcome
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
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted">
                  No users found
                </td>
              </tr>
            )}
            {!loading &&
              users.map((u) => {
                const isOpen = expandedUserId === u.userId;
                return (
                  <Fragment key={u.userId}>
                    <tr
                      onClick={() => toggleExpand(u.userId)}
                      className={`cursor-pointer transition-colors ${
                        isOpen ? "bg-brand/10" : "hover:bg-surface/60"
                      }`}
                    >
                      <td className="px-4 py-3 text-muted">
                        <ChevronDown
                          size={16}
                          className={`transition-transform ${
                            isOpen ? "rotate-180 text-foreground" : ""
                          }`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-foreground">
                            {u.username}
                          </span>
                          <span className="text-xs text-muted">{u.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted">
                        {u.totalSettledTrades}
                      </td>
                      <td className="px-4 py-3">
                        {u.isFrozen ? (
                          <Badge tone="down" icon={<Snowflake size={11} aria-hidden="true" />}>
                            Frozen
                          </Badge>
                        ) : (
                          <Badge tone="up" icon={<CheckCircle2 size={11} aria-hidden="true" />}>
                            Active
                          </Badge>
                        )}
                      </td>
                      <td
                        className="px-4 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center rounded-full border border-border bg-background/40 p-0.5">
                          {(["auto", "win", "lose"] as const).map((c) => {
                            const current = outcomeToChoice(u.forcedOutcome);
                            const active = current === c;
                            return (
                              <button
                                key={c}
                                type="button"
                                onClick={() =>
                                  handleSetForced(u.userId, choiceToOutcome(c))
                                }
                                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide transition ${
                                  active
                                    ? c === "win"
                                      ? "bg-up/20 text-up"
                                      : c === "lose"
                                      ? "bg-down/20 text-down"
                                      : "bg-foreground/10 text-foreground"
                                    : "text-muted hover:text-foreground"
                                }`}
                              >
                                {c}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-background/40">
                        <td colSpan={5} className="px-6 py-6">
                          <UserDetail
                            user={u}
                            adjustTarget={adjustTarget}
                            setAdjustTarget={(v) => {
                              setAdjustTarget(v);
                              setAdjustError(null);
                            }}
                            adjustSign={adjustSign}
                            setAdjustSign={setAdjustSign}
                            adjustAmount={adjustAmount}
                            setAdjustAmount={setAdjustAmount}
                            adjustNote={adjustNote}
                            setAdjustNote={setAdjustNote}
                            adjustError={adjustError}
                            adjustSubmitting={adjustSubmitting}
                            adjustTokenSelected={adjustTokenSelected}
                            onAdjust={handleAdjust}
                            onFreeze={() =>
                              handleFreeze(u.userId, !u.isFrozen)
                            }
                            onSetForced={(c) =>
                              handleSetForced(u.userId, choiceToOutcome(c))
                            }
                            deleteConfirm={deleteConfirm}
                            setDeleteConfirm={(v) => {
                              setDeleteConfirm(v);
                              setDeleteError(null);
                            }}
                            deleteReason={deleteReason}
                            setDeleteReason={setDeleteReason}
                            deleteError={deleteError}
                            deleteSubmitting={deleteSubmitting}
                            onDelete={() => handleDelete(u)}
                            onOpenHistory={() => openHistory(u.userId)}
                            onPickToken={(tokenId) => {
                              setAdjustTarget(tokenId);
                              setAdjustError(null);
                            }}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}
        </span>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={offset === 0}
            onClick={() => fetchUsers(search, Math.max(offset - limit, 0), tab)}
          >
            Prev
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={offset + limit >= total}
            onClick={() => fetchUsers(search, offset + limit, tab)}
          >
            Next
          </Button>
        </div>
      </div>

      <BalanceHistoryDrawer
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        refreshKey={historyRefreshKey}
        user={
          historyUserId
            ? (() => {
                const u = users.find((x) => x.userId === historyUserId);
                return u
                  ? { email: u.email, userId: u.userId, username: u.username }
                  : null;
              })()
            : null
        }
      />
    </div>
  );
}

interface UserDetailProps {
  user: AdminUser;
  adjustTarget: string;
  setAdjustTarget: (v: string) => void;
  adjustSign: AdjustSign;
  setAdjustSign: (s: AdjustSign) => void;
  adjustAmount: string;
  setAdjustAmount: (v: string) => void;
  adjustNote: string;
  setAdjustNote: (v: string) => void;
  adjustError: string | null;
  adjustSubmitting: boolean;
  adjustTokenSelected: AdminTokenBalance | null;
  onAdjust: () => void;
  onFreeze: () => void;
  onSetForced: (c: ForcedChoice) => void;
  deleteConfirm: string;
  setDeleteConfirm: (v: string) => void;
  deleteReason: string;
  setDeleteReason: (v: string) => void;
  deleteError: string | null;
  deleteSubmitting: boolean;
  onDelete: () => void;
  onOpenHistory: () => void;
  onPickToken: (tokenId: string) => void;
}

function UserDetail({
  user,
  adjustTarget,
  setAdjustTarget,
  adjustSign,
  setAdjustSign,
  adjustAmount,
  setAdjustAmount,
  adjustNote,
  setAdjustNote,
  adjustError,
  adjustSubmitting,
  adjustTokenSelected,
  onAdjust,
  onFreeze,
  onSetForced,
  deleteConfirm,
  setDeleteConfirm,
  deleteReason,
  setDeleteReason,
  deleteError,
  deleteSubmitting,
  onDelete,
  onOpenHistory,
  onPickToken,
}: UserDetailProps) {
  const isLoadingTokens = !user.tokenBalances;

  const totals = (user.tokenBalances ?? []).reduce(
    (acc, tb) => {
      acc.totalUsdCents += tb.usdValueCents;
      acc.lockedUsdCents += Math.round(tb.lockedBalance * tb.usdPriceCents);
      return acc;
    },
    { totalUsdCents: 0, lockedUsdCents: 0 },
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
      {/* Column 1: balances + status */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
              User
            </p>
            <h3 className="mt-1 truncate text-lg font-semibold text-foreground">
              {user.username}
            </h3>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={onOpenHistory}
            className="shrink-0 rounded-full bg-brand/15 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand transition hover:bg-brand/25"
          >
            History →
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <Stat
            label="Total balance"
            value={formatUsdFromCents(totals.totalUsdCents)}
            hint="USD value of all token holdings"
          />
          <Stat
            label="Locked in trades"
            value={formatUsdFromCents(totals.lockedUsdCents)}
            hint="USD value of tokens locked in active trades"
          />
          <Stat label="Settled" value={String(user.totalSettledTrades)} />
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
            Forced outcome
          </p>
          <p className="text-[11px] text-muted">
            Overrides global expiry policy for this user.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(["auto", "win", "lose"] as const).map((c) => {
              const current = outcomeToChoice(user.forcedOutcome);
              const active = current === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => onSetForced(c)}
                  className={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                    active
                      ? c === "win"
                        ? "bg-up/20 text-up"
                        : c === "lose"
                        ? "bg-down/20 text-down"
                        : "bg-foreground text-background"
                      : "bg-background/30 text-muted hover:text-foreground"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={onFreeze}
          className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
            user.isFrozen
              ? "bg-up/15 text-up hover:bg-up/25"
              : "bg-down/15 text-down hover:bg-down/25"
          }`}
        >
          {user.isFrozen ? "Unfreeze account" : "Freeze account"}
        </button>

        {/* Danger zone: permanent account deletion */}
        <div className="mt-2 flex flex-col gap-2 rounded-2xl border border-down/30 bg-down/5 p-3">
          <div className="flex items-center gap-1.5 text-down">
            <AlertTriangle size={13} aria-hidden="true" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em]">
              Danger zone
            </p>
          </div>
          <p className="text-[11px] text-muted">
            Permanently deletes this account and{" "}
            <span className="font-semibold text-foreground">all</span> of its
            data (balances, trades, deposits, withdrawals, swaps, referrals,
            transactions). This cannot be undone.
          </p>
          <label className="px-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
            Type{" "}
            <span className="font-mono text-foreground">{user.username}</span>{" "}
            to confirm
          </label>
          <input
            type="text"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder={user.username}
            className="rounded-full border border-border bg-background/40 px-4 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-down"
          />
          <input
            type="text"
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            placeholder="Reason (optional)"
            className="rounded-full border border-border bg-background/40 px-4 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-down"
          />
          {deleteError && (
            <p className="rounded-2xl bg-down/10 px-3 py-2 text-[11px] font-semibold text-down">
              {deleteError}
            </p>
          )}
          <button
            onClick={onDelete}
            disabled={deleteConfirm !== user.username || deleteSubmitting}
            className="flex items-center justify-center gap-2 rounded-full bg-down px-5 py-2.5 text-sm font-semibold text-background transition hover:brightness-110 disabled:opacity-40"
          >
            <Trash2 size={14} aria-hidden="true" />
            {deleteSubmitting ? "Deleting…" : "Delete account"}
          </button>
        </div>
      </div>

      {/* Column 2: token balances list */}
      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
          Token balances
        </p>
        {isLoadingTokens && (
          <p className="text-xs text-muted">Loading token balances…</p>
        )}
        {!isLoadingTokens && user.tokenBalances && user.tokenBalances.length === 0 && (
          <p className="text-xs text-muted">No token balances.</p>
        )}
        {user.tokenBalances && user.tokenBalances.length > 0 && (
          <div className="flex flex-col gap-1.5 max-h-[360px] overflow-y-auto pr-1">
            {user.tokenBalances.map((tb) => {
              const active = adjustTarget === tb.tokenId;
              return (
                <button
                  key={tb.tokenId}
                  type="button"
                  onClick={() => onPickToken(tb.tokenId)}
                  className={`flex items-center justify-between gap-2 rounded-2xl border px-3 py-2 text-left transition ${
                    active
                      ? "border-brand bg-brand/10"
                      : "border-border bg-background/30 hover:border-brand/50"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <CoinIcon symbol={tb.symbol} iconPath={tb.iconPath} size={20} />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold text-foreground">
                        {tb.symbol}
                      </span>
                      <span className="truncate text-[10px] text-muted">
                        {tb.name}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end leading-tight">
                    <span className="font-mono text-xs text-foreground">
                      {formatTokenAmount(tb.balance, tb.symbol, tb.decimals)}
                    </span>
                    <span className="text-[10px] text-muted">
                      {formatUsdFromCents(tb.usdValueCents)}
                      {tb.lockedBalance > 0 && (
                        <>
                          {" · locked "}
                          {formatTokenAmount(
                            tb.lockedBalance,
                            tb.symbol,
                            tb.decimals,
                          )}
                        </>
                      )}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Column 3: adjust form */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background/30 p-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
            Adjust balance
          </p>
          <div className="inline-flex items-center rounded-full border border-border bg-background/40 p-0.5">
            {(
              [
                { id: "credit", label: "Credit", icon: Plus, color: "text-up" },
                { id: "debit", label: "Debit", icon: Minus, color: "text-down" },
              ] as const
            ).map((opt) => {
              const Icon = opt.icon;
              const active = adjustSign === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAdjustSign(opt.id)}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide transition ${
                    active
                      ? opt.id === "credit"
                        ? "bg-up/20 text-up"
                        : "bg-down/20 text-down"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <Icon size={12} className={active ? opt.color : ""} />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <select
          value={adjustTarget}
          onChange={(e) => setAdjustTarget(e.target.value)}
          className="rounded-full border border-border bg-background/40 px-4 py-2 text-sm text-foreground focus:outline-none focus:border-brand"
        >
          <option value="" disabled>
            Select a token…
          </option>
          {user.tokenBalances?.map((tb) => (
            <option key={tb.tokenId} value={tb.tokenId}>
              {tb.symbol} — {tb.name}
            </option>
          ))}
        </select>

        <div className="flex flex-col gap-1.5">
          <label className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
            Amount in{" "}
            <span className="text-foreground">
              {adjustTokenSelected?.symbol ?? "—"}
            </span>
          </label>
          <TokenAmountInput
            value={adjustAmount}
            onChange={setAdjustAmount}
            symbol={adjustTokenSelected?.symbol ?? ""}
            decimals={adjustTokenSelected?.decimals}
            priceCents={adjustTokenSelected?.usdPriceCents ?? null}
            disabled={!adjustTarget}
            placeholder="0.00"
          />
        </div>

        <input
          type="text"
          value={adjustNote}
          onChange={(e) => setAdjustNote(e.target.value)}
          placeholder="Required note (reason)"
          className="rounded-full border border-border bg-background/40 px-4 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-brand"
        />

        {adjustError && (
          <p className="rounded-2xl bg-down/10 px-3 py-2 text-[11px] font-semibold text-down">
            {adjustError}
          </p>
        )}

        <button
          onClick={onAdjust}
          disabled={
            !adjustTarget || !adjustAmount || !adjustNote || adjustSubmitting
          }
          className={`rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:opacity-40 ${
            adjustSign === "credit"
              ? "bg-up text-background hover:brightness-110"
              : "bg-down text-background hover:brightness-110"
          }`}
        >
          {adjustSubmitting
            ? "Applying…"
            : `${adjustSign === "credit" ? "Credit" : "Debit"} ${
                adjustTokenSelected?.symbol ?? "token"
              }`}
        </button>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div
      className="rounded-2xl border border-border bg-background/30 p-3"
      title={hint}
    >
      <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-semibold text-foreground">{value}</p>
    </div>
  );
}
