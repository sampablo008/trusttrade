"use client";

import { useState, useCallback } from "react";
import { ShieldAlert, Check } from "lucide-react";
import type { ReferralFlag } from "@/types/referrals";

interface ReferralFlagsPanelProps {
  initialFlags: ReferralFlag[];
}

const KIND_COLOR: Record<string, string> = {
  RAPID_CHAIN: "bg-down/10 text-down",
  SAME_IP: "bg-orange-500/10 text-orange-400",
  SELF_REFERRAL_ATTEMPT: "bg-down/10 text-down",
  SUSPICIOUS_DEPOSIT: "bg-orange-500/10 text-orange-400",
  VELOCITY: "bg-yellow-500/10 text-yellow-400",
};

export default function ReferralFlagsPanel({ initialFlags }: ReferralFlagsPanelProps) {
  const [flags, setFlags] = useState<ReferralFlag[]>(initialFlags);
  const [showResolved, setShowResolved] = useState(false);
  const [loading, setLoading] = useState<Set<string>>(new Set());

  const visible = flags.filter((f) => showResolved || !f.isResolved);

  const handleResolve = useCallback(async (id: string) => {
    setLoading((prev) => new Set([...prev, id]));
    try {
      const res = await fetch(`/api/admin/flags/${id}/resolve`, { method: "POST" });
      if (res.ok) {
        setFlags((prev) =>
          prev.map((f) =>
            f.id === id
              ? { ...f, isResolved: true, resolvedAt: new Date().toISOString() }
              : f,
          ),
        );
      }
    } finally {
      setLoading((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {visible.length} {showResolved ? "total" : "open"} flag{visible.length !== 1 ? "s" : ""}
        </p>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
            className="accent-brand"
          />
          Show resolved
        </label>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface-soft p-8 text-center">
          <ShieldAlert size={32} className="mx-auto mb-3 text-muted" />
          <p className="text-sm text-muted">No open flags. Clean slate.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((flag) => (
            <div
              key={flag.id}
              className={`rounded-2xl border p-4 ${flag.isResolved ? "border-border opacity-60" : "border-orange-500/30 bg-orange-500/5"}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${KIND_COLOR[flag.kind] ?? "bg-muted/10 text-muted"}`}
                    >
                      {flag.kind}
                    </span>
                    <span className="font-semibold text-foreground">{flag.username}</span>
                    {flag.isResolved && (
                      <span className="rounded-full bg-up/10 px-2 py-0.5 text-xs font-semibold text-up">
                        Resolved
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted">
                    {new Date(flag.createdAt).toLocaleString()}
                  </p>
                  <pre className="rounded-lg bg-background/40 px-3 py-2 text-xs text-muted">
                    {JSON.stringify(flag.detail, null, 2)}
                  </pre>
                </div>

                {!flag.isResolved && (
                  <button
                    onClick={() => handleResolve(flag.id)}
                    disabled={loading.has(flag.id)}
                    className="flex shrink-0 items-center gap-1.5 rounded-full bg-up/10 px-3 py-1.5 text-xs font-semibold text-up transition hover:bg-up hover:text-black disabled:opacity-40"
                  >
                    <Check size={12} />
                    Resolve
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
