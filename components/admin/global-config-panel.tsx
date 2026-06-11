"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, Snowflake, RefreshCw } from "lucide-react";
import type { AppConfig, ExpiryPolicy, UpdateAppConfigInput } from "@/types/admin";
import { formatUsdFromCents } from "@/lib/utils/format";
import { Skeleton } from "@/components/ui/Skeleton";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { notify } from "@/components/ui/toast";

async function fetchConfig(): Promise<AppConfig> {
  const res = await fetch("/api/admin/config");
  if (!res.ok) throw new Error("Failed to fetch config");
  return res.json();
}

async function patchConfig(input: UpdateAppConfigInput): Promise<AppConfig> {
  const res = await fetch("/api/admin/config", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Failed to update config");
  return res.json();
}

const EXPIRY_LABELS: Record<ExpiryPolicy, string> = {
  auto_lose: "Auto-Lose (default)",
  auto_win: "Auto-Win",
  leave_pending: "Leave Pending",
  void: "Void",
};

export default function GlobalConfigPanel() {
  const qc = useQueryClient();
  const { confirm, dialog } = useConfirm();
  const { data, isLoading } = useQuery({ queryKey: ["admin", "config"], queryFn: fetchConfig });

  const mutation = useMutation({
    mutationFn: patchConfig,
    onSuccess: (updated) => {
      qc.setQueryData(["admin", "config"], updated);
      notify.success("Config updated");
    },
    onError: () => notify.error("Failed to update config"),
  });

  async function onToggleFreeze() {
    if (!data) return;
    const enabling = !data.globalTradeFreezeEnabled;
    // Confirm only the destructive direction — freezing halts the whole platform.
    if (enabling) {
      const ok = await confirm({
        title: "Freeze all trading?",
        description:
          "This instantly blocks every placeTrade call across the platform. Open positions are unaffected.",
        confirmLabel: "Freeze trading",
        danger: true,
      });
      if (!ok) return;
    }
    mutation.mutate({ globalTradeFreezeEnabled: enabling });
  }

  if (isLoading || !data) {
    return <Skeleton className="h-64 rounded-2xl" />;
  }

  return (
    <div className="space-y-4">
      {dialog}
      {/* Trade freeze */}
      <ConfigCard
        icon={Snowflake}
        title="Global Trade Freeze"
        description="Instantly block all placeTrade calls across the platform."
        accent={data.globalTradeFreezeEnabled ? "border-down/40 bg-down/10" : ""}
      >
        <button
          onClick={onToggleFreeze}
          disabled={mutation.isPending}
          className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition focus-ring disabled:cursor-not-allowed disabled:opacity-60 ${
            data.globalTradeFreezeEnabled
              ? "bg-down text-background hover:opacity-80"
              : "bg-surface-strong text-foreground hover:bg-border"
          }`}
        >
          <Snowflake size={15} aria-hidden="true" />
          {data.globalTradeFreezeEnabled ? "Frozen — click to unfreeze" : "Freeze Trading"}
        </button>
      </ConfigCard>

      {/* Expiry policy */}
      <ConfigCard
        icon={RefreshCw}
        title="Expiry Policy"
        description="What happens when a trade timer expires and no admin decision was made."
      >
        <div className="flex flex-wrap gap-2">
          {(Object.keys(EXPIRY_LABELS) as ExpiryPolicy[]).map((policy) => (
            <button
              key={policy}
              disabled={mutation.isPending}
              onClick={() => mutation.mutate({ expiryPolicy: policy })}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                data.expiryPolicy === policy
                  ? "bg-brand text-background"
                  : "bg-surface-strong text-muted hover:text-foreground"
              }`}
            >
              {EXPIRY_LABELS[policy]}
            </button>
          ))}
        </div>
      </ConfigCard>

      {/* Numeric settings */}
      <div className="grid gap-4 md:grid-cols-2">
        <NumericField
          label="Signup Bonus"
          hint={formatUsdFromCents(data.signupBonusCents)}
          value={data.signupBonusCents}
          onSave={(v) => mutation.mutate({ signupBonusCents: v })}
          disabled={mutation.isPending}
        />
        <NumericField
          label="Min Withdrawal"
          hint={formatUsdFromCents(data.withdrawMinCents)}
          value={data.withdrawMinCents}
          onSave={(v) => mutation.mutate({ withdrawMinCents: v })}
          disabled={mutation.isPending}
        />
        <NumericField
          label="Withdrawal Fee (bps)"
          hint={`${(data.withdrawFeeBps / 100).toFixed(2)}% (${data.withdrawFeeBps} bps)`}
          value={data.withdrawFeeBps}
          onSave={(v) => mutation.mutate({ withdrawFeeBps: v })}
          disabled={mutation.isPending}
        />
        <NumericField
          label="Bonus Wager Multiplier"
          hint={`${data.bonusWagerMultiplier}×`}
          value={data.bonusWagerMultiplier}
          onSave={(v) => mutation.mutate({ bonusWagerMultiplier: v })}
          isFloat
          disabled={mutation.isPending}
        />
        <NumericField
          label="Bonus Ticket TTL (days)"
          hint={`${data.bonusTicketTtlDays} days`}
          value={data.bonusTicketTtlDays}
          onSave={(v) => mutation.mutate({ bonusTicketTtlDays: v })}
          disabled={mutation.isPending}
        />
        <NumericField
          label="Min Deposit for Commission"
          hint={formatUsdFromCents(data.refMinDepositCents)}
          value={data.refMinDepositCents}
          onSave={(v) => mutation.mutate({ refMinDepositCents: v })}
          disabled={mutation.isPending}
        />
      </div>

      {/* Default referral rates */}
      <ConfigCard
        icon={ShieldAlert}
        title="Default Referral Rates (bps)"
        description="Base commission rates for each referral level. 100 bps = 1%."
      >
        <div className="grid grid-cols-5 gap-3">
          {([1, 2, 3, 4, 5] as const).map((level) => {
            const key = `refDefaultL${level}Bps` as keyof AppConfig;
            return (
              <InlineBpsField
                key={level}
                level={level}
                value={data[key] as number}
                onSave={(v) => mutation.mutate({ [key]: v } as UpdateAppConfigInput)}
                disabled={mutation.isPending}
              />
            );
          })}
        </div>
      </ConfigCard>
    </div>
  );
}

function ConfigCard({
  icon: Icon,
  title,
  description,
  children,
  accent = "",
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className={`rounded-2xl border border-border bg-surface p-5 ${accent}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-surface-strong">
          <Icon size={15} className="text-brand" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">{title}</p>
          <p className="mt-0.5 text-xs text-muted">{description}</p>
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

function NumericField({
  label,
  hint,
  value,
  onSave,
  isFloat = false,
  disabled,
}: {
  label: string;
  hint: string;
  value: number;
  onSave: (v: number) => void;
  isFloat?: boolean;
  disabled: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ""));

  function save() {
    const parsed = isFloat ? parseFloat(draft) : parseInt(draft, 10);
    if (!isNaN(parsed) && parsed >= 0) onSave(parsed);
    setEditing(false);
  }

  return (
    <div className="rounded-xl border border-border bg-surface-strong p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</p>
      {editing ? (
        <div className="mt-2 flex gap-2">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
            className="w-full rounded-lg border border-brand bg-transparent px-2 py-1 text-sm text-foreground outline-none"
          />
          <button
            onClick={save}
            disabled={disabled}
            className="rounded-lg bg-brand px-3 py-1 text-xs font-semibold text-background"
          >
            Save
          </button>
        </div>
      ) : (
        <button
          onClick={() => {
            setDraft(String(value ?? ""));
            setEditing(true);
          }}
          className="mt-2 w-full text-left font-display text-xl font-bold text-foreground hover:text-brand"
        >
          {hint}
        </button>
      )}
    </div>
  );
}

function InlineBpsField({
  level,
  value,
  onSave,
  disabled,
}: {
  level: number;
  value: number;
  onSave: (v: number) => void;
  disabled: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ""));

  function save() {
    const parsed = parseInt(draft, 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 10000) onSave(parsed);
    setEditing(false);
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-3 text-center">
      <p className="text-xs font-semibold text-muted">L{level}</p>
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          disabled={disabled}
          className="mt-1 w-full bg-transparent text-center text-sm font-bold text-foreground outline-none"
        />
      ) : (
        <button
          onClick={() => {
            setDraft(String(value ?? ""));
            setEditing(true);
          }}
          className="mt-1 block w-full text-sm font-bold text-foreground hover:text-brand"
        >
          {value}
        </button>
      )}
      <p className="text-[10px] text-muted">{(value / 100).toFixed(1)}%</p>
    </div>
  );
}
