"use client";

import { useState, useCallback } from "react";
import { Search, ArrowUp, ArrowDown } from "lucide-react";
import type { AdminUser } from "@/types/admin";

interface UplineEntry {
  level: number;
  ancestorId: string;
  ancestorUsername: string;
}

interface DownlineEntry {
  level: number;
  refereeUserId: string;
  refereeUsername: string;
  refereeEmail: string;
  createdAt: string;
}

interface ReferralTreeInspectorProps {
  users: AdminUser[];
}

export default function ReferralTreeInspector({ users }: ReferralTreeInspectorProps) {
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [upline, setUpline] = useState<UplineEntry[]>([]);
  const [downline, setDownline] = useState<DownlineEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const filtered = users.filter(
    (u) =>
      search &&
      (u.username.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())),
  );

  const loadTree = useCallback(async (user: AdminUser) => {
    setSelectedUser(user);
    setSearch("");
    setLoading(true);
    try {
      const [upRes, downRes] = await Promise.all([
        fetch(`/api/admin/referrals/upline/${user.userId}`),
        fetch(`/api/admin/referrals/tree/${user.userId}`),
      ]);
      const [upData, downData] = await Promise.all([upRes.json(), downRes.json()]);
      setUpline(upData.items ?? []);
      setDownline(downData.items ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="text"
          placeholder="Search user to inspect…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-border bg-background/30 py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted"
        />
        {search && filtered.length > 0 && (
          <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-border bg-surface-soft shadow-lg">
            {filtered.slice(0, 6).map((u) => (
              <button
                key={u.userId}
                onClick={() => loadTree(u)}
                className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left text-sm transition last:border-0 hover:bg-background/30"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">
                  {u.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{u.username}</p>
                  <p className="text-xs text-muted">{u.email}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <p className="text-sm text-muted">Loading referral tree…</p>
      )}

      {selectedUser && !loading && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-base font-bold text-brand">
              {selectedUser.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-foreground">{selectedUser.username}</p>
              <p className="text-xs text-muted">{selectedUser.email}</p>
            </div>
          </div>

          {/* Upline */}
          <div className="rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border bg-surface-soft px-5 py-3">
              <ArrowUp size={14} className="text-brand" />
              <span className="text-sm font-semibold text-foreground">
                Upline ({upline.length})
              </span>
            </div>
            {upline.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted">Root user — no upline.</p>
            ) : (
              <div className="divide-y divide-border">
                {upline.map((entry) => (
                  <div key={entry.level} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-bold text-brand">
                        L{entry.level}
                      </span>
                      <span className="font-medium text-foreground">{entry.ancestorUsername}</span>
                    </div>
                    <span className="font-mono text-xs text-muted">{entry.ancestorId.slice(0, 8)}…</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Downline */}
          <div className="rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border bg-surface-soft px-5 py-3">
              <ArrowDown size={14} className="text-up" />
              <span className="text-sm font-semibold text-foreground">
                Downline ({downline.length})
              </span>
            </div>
            {downline.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted">No referrals yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {downline.map((entry) => (
                  <div key={entry.refereeUserId} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-up/10 px-2 py-0.5 text-xs font-bold text-up">
                        L{entry.level}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{entry.refereeUsername}</p>
                        <p className="text-xs text-muted">{entry.refereeEmail}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
