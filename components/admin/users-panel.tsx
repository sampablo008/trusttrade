"use client";

import { useCallback, useState } from "react";
import { formatUsdFromCents } from "@/lib/utils/format";
import type { AdminUser } from "@/types/admin";

interface UsersPanelProps {
  initialData: { items: AdminUser[]; total: number };
}

export default function UsersPanel({ initialData }: UsersPanelProps) {
  const [users, setUsers] = useState<AdminUser[]>(initialData.items);
  const [total, setTotal] = useState(initialData.total);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [adjustDelta, setAdjustDelta] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [loading, setLoading] = useState(false);
  const limit = 50;

  const fetchUsers = useCallback(async (q: string, off: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(off) });
      if (q) params.set("search", q);
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json() as { items: AdminUser[]; total: number };
      setUsers(data.items ?? []);
      setTotal(data.total ?? 0);
      setOffset(off);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(search, 0);
  };

  const handleFreeze = async (userId: string, isFrozen: boolean) => {
    await fetch(`/api/admin/users/${userId}/freeze`, {
      body: JSON.stringify({ isFrozen }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    setUsers((prev) =>
      prev.map((u) => (u.userId === userId ? { ...u, isFrozen } : u)),
    );
    if (selectedUser?.userId === userId) {
      setSelectedUser((u) => (u ? { ...u, isFrozen } : null));
    }
  };

  const handleAdjust = async () => {
    if (!selectedUser) return;
    const deltaCents = Math.round(parseFloat(adjustDelta) * 100);
    if (!deltaCents || !adjustNote.trim()) return;

    const res = await fetch(`/api/admin/users/${selectedUser.userId}/adjust-balance`, {
      body: JSON.stringify({ deltaCents, note: adjustNote }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const data = await res.json() as { user: AdminUser };
    if (data.user) {
      setUsers((prev) => prev.map((u) => (u.userId === data.user.userId ? data.user : u)));
      setSelectedUser(data.user);
    }
    setAdjustDelta("");
    setAdjustNote("");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Left: user list */}
      <div className="flex flex-col gap-4">
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search username or email…"
            className="flex-1 rounded-full border border-border bg-background/30 px-5 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-brand"
          />
          <button
            type="submit"
            className="rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition hover:bg-brand"
          >
            Search
          </button>
        </form>

        <div className="overflow-hidden rounded-[24px] border border-border">
          <table className="min-w-full divide-y divide-border text-left">
            <thead className="bg-surface">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                  User
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                  Balance
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                  Trades
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-background/20">
              {loading && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted">
                    No users found
                  </td>
                </tr>
              )}
              {!loading &&
                users.map((u) => (
                  <tr
                    key={u.userId}
                    onClick={() => setSelectedUser(u)}
                    className={`cursor-pointer transition-colors ${
                      selectedUser?.userId === u.userId
                        ? "bg-brand/10"
                        : "hover:bg-surface/60"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-foreground">
                          {u.username}
                        </span>
                        <span className="text-xs text-muted">{u.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {formatUsdFromCents(u.balanceCents)}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">
                      {u.totalSettledTrades}
                    </td>
                    <td className="px-4 py-3">
                      {u.isFrozen ? (
                        <span className="rounded-full bg-[#f6465d]/15 px-2 py-0.5 text-xs font-semibold text-[#f6465d]">
                          Frozen
                        </span>
                      ) : (
                        <span className="rounded-full bg-[#0ecb81]/15 px-2 py-0.5 text-xs font-semibold text-[#0ecb81]">
                          Active
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between text-xs text-muted">
          <span>
            Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}
          </span>
          <div className="flex gap-2">
            <button
              disabled={offset === 0}
              onClick={() => fetchUsers(search, Math.max(offset - limit, 0))}
              className="rounded-full border border-border bg-background/30 px-4 py-1.5 font-semibold transition hover:border-brand disabled:opacity-40"
            >
              Prev
            </button>
            <button
              disabled={offset + limit >= total}
              onClick={() => fetchUsers(search, offset + limit)}
              className="rounded-full border border-border bg-background/30 px-4 py-1.5 font-semibold transition hover:border-brand disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Right: user detail panel */}
      <div className="rounded-[24px] border border-border bg-background/20 p-6">
        {!selectedUser ? (
          <p className="text-sm text-muted">Select a user to view details</p>
        ) : (
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                User detail
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">
                {selectedUser.username}
              </h2>
              <p className="mt-0.5 text-sm text-muted">{selectedUser.email}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-[16px] border border-border bg-background/30 p-3">
                <p className="text-xs text-muted">Balance</p>
                <p className="mt-1 font-semibold text-foreground">
                  {formatUsdFromCents(selectedUser.balanceCents)}
                </p>
              </div>
              <div className="rounded-[16px] border border-border bg-background/30 p-3">
                <p className="text-xs text-muted">Locked (trades)</p>
                <p className="mt-1 font-semibold text-foreground">
                  {formatUsdFromCents(selectedUser.lockedInTradesCents)}
                </p>
              </div>
              <div className="rounded-[16px] border border-border bg-background/30 p-3">
                <p className="text-xs text-muted">Locked (bonus)</p>
                <p className="mt-1 font-semibold text-foreground">
                  {formatUsdFromCents(selectedUser.lockedBonusCents)}
                </p>
              </div>
              <div className="rounded-[16px] border border-border bg-background/30 p-3">
                <p className="text-xs text-muted">Settled trades</p>
                <p className="mt-1 font-semibold text-foreground">
                  {selectedUser.totalSettledTrades}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                Account
              </p>
              <button
                onClick={() =>
                  handleFreeze(selectedUser.userId, !selectedUser.isFrozen)
                }
                className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                  selectedUser.isFrozen
                    ? "bg-[#0ecb81]/15 text-[#0ecb81] hover:bg-[#0ecb81]/25"
                    : "bg-[#f6465d]/15 text-[#f6465d] hover:bg-[#f6465d]/25"
                }`}
              >
                {selectedUser.isFrozen ? "Unfreeze account" : "Freeze account"}
              </button>
            </div>

            <div className="flex flex-col gap-3 border-t border-border pt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                Adjust balance
              </p>
              <input
                type="number"
                step="0.01"
                value={adjustDelta}
                onChange={(e) => setAdjustDelta(e.target.value)}
                placeholder="Amount (e.g. +50 or -25)"
                className="rounded-full border border-border bg-background/30 px-4 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-brand"
              />
              <input
                type="text"
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                placeholder="Required note (reason)"
                className="rounded-full border border-border bg-background/30 px-4 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-brand"
              />
              <button
                onClick={handleAdjust}
                disabled={!adjustDelta || !adjustNote}
                className="rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition hover:bg-brand disabled:opacity-40"
              >
                Apply adjustment
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
