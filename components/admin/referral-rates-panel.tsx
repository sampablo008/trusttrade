"use client";

import { useState, useCallback } from "react";
import { Save } from "lucide-react";
import type { AdminUser } from "@/types/admin";

interface ReferralRatesPanelProps {
  users: AdminUser[];
}

const DEFAULT_RATES = { l1Bps: 500, l2Bps: 300, l3Bps: 200, l4Bps: 100, l5Bps: 50 };
const LEVELS: (keyof typeof DEFAULT_RATES)[] = ["l1Bps", "l2Bps", "l3Bps", "l4Bps", "l5Bps"];

function BpsInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-muted">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={0}
          max={5000}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-20 rounded-lg border border-border bg-background/30 px-3 py-1.5 text-sm font-mono text-foreground"
        />
        <span className="text-xs text-muted">bps ({(value / 100).toFixed(1)}%)</span>
      </div>
    </div>
  );
}

export default function ReferralRatesPanel({ users }: ReferralRatesPanelProps) {
  const [selectedUserId, setSelectedUserId] = useState("");
  const [rates, setRates] = useState(DEFAULT_RATES);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = users.filter(
    (u) =>
      !search ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSave = useCallback(async () => {
    if (!selectedUserId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUserId}/set-rates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rates),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }, [selectedUserId, rates]);

  const setRate = (key: keyof typeof rates) => (v: number) =>
    setRates((prev) => ({ ...prev, [key]: v }));

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        Override per-user commission rates. Defaults: L1=5%, L2=3%, L3=2%, L4=1%, L5=0.5%.
      </p>

      {/* User search */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted">Select user</label>
        <input
          type="text"
          placeholder="Search username or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-xl border border-border bg-background/30 px-4 py-2 text-sm text-foreground placeholder:text-muted"
        />

        {search && filtered.length > 0 && (
          <div className="w-full max-w-sm overflow-hidden rounded-xl border border-border bg-surface-soft">
            {filtered.slice(0, 8).map((u) => (
              <button
                key={u.userId}
                onClick={() => {
                  setSelectedUserId(u.userId);
                  setSearch("");
                }}
                className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left text-sm transition last:border-0 hover:bg-background/30"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">
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

        {selectedUserId && (
          <p className="text-sm font-semibold text-brand">
            Editing rates for:{" "}
            {users.find((u) => u.userId === selectedUserId)?.username ?? selectedUserId}
          </p>
        )}
      </div>

      {/* Rate inputs */}
      {selectedUserId && (
        <div className="rounded-2xl border border-border bg-surface-soft p-5 space-y-4">
          <div className="flex flex-wrap gap-6">
            {LEVELS.map((key, i) => (
              <BpsInput
                key={key}
                label={`Level ${i + 1}`}
                value={rates[key]}
                onChange={setRate(key)}
              />
            ))}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-40"
          >
            <Save size={14} />
            {saved ? "Saved!" : saving ? "Saving…" : "Save rates"}
          </button>
        </div>
      )}
    </div>
  );
}
