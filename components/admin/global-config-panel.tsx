"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, Snowflake, RefreshCw, MessageCircle } from "lucide-react";
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
          kind="usd"
          value={data.signupBonusCents}
          onSave={(v) => mutation.mutate({ signupBonusCents: v })}
          disabled={mutation.isPending}
        />
        <NumericField
          label="Deposit Bonus %"
          kind="percent"
          value={data.depositBonusPctBps}
          onSave={(v) => mutation.mutate({ depositBonusPctBps: v })}
          disabled={mutation.isPending}
        />
        <NumericField
          label="Deposit Bonus Cap"
          kind="usd"
          value={data.depositBonusMaxCents}
          onSave={(v) => mutation.mutate({ depositBonusMaxCents: v })}
          disabled={mutation.isPending}
        />
        <NumericField
          label="Min Withdrawal"
          kind="usd"
          value={data.withdrawMinCents}
          onSave={(v) => mutation.mutate({ withdrawMinCents: v })}
          disabled={mutation.isPending}
        />
        <NumericField
          label="Withdrawal Fee"
          kind="percent"
          value={data.withdrawFeeBps}
          onSave={(v) => mutation.mutate({ withdrawFeeBps: v })}
          disabled={mutation.isPending}
        />
        <NumericField
          label="Swap Fee"
          kind="percent"
          value={data.swapFeeBps}
          onSave={(v) => mutation.mutate({ swapFeeBps: v })}
          disabled={mutation.isPending}
        />
        <NumericField
          label="Bonus Wager Multiplier"
          kind="multiplier"
          value={data.bonusWagerMultiplier}
          onSave={(v) => mutation.mutate({ bonusWagerMultiplier: v })}
          disabled={mutation.isPending}
        />
        <NumericField
          label="Bonus Ticket TTL"
          kind="days"
          value={data.bonusTicketTtlDays}
          onSave={(v) => mutation.mutate({ bonusTicketTtlDays: v })}
          disabled={mutation.isPending}
        />
        <NumericField
          label="Min Deposit for Commission"
          kind="usd"
          value={data.refMinDepositCents}
          onSave={(v) => mutation.mutate({ refMinDepositCents: v })}
          disabled={mutation.isPending}
        />
      </div>

      {/* Default referral rates */}
      <ConfigCard
        icon={ShieldAlert}
        title="Default Referral Rates"
        description="Base commission rate (%) earned at each referral level."
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

      {/* Support channels */}
      <ConfigCard
        icon={MessageCircle}
        title="Customer Support Channels"
        description="Telegram and WhatsApp shown on the landing page and in user settings. Leave a field blank to hide that channel."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Telegram"
            placeholder="@handle, phone, or t.me link"
            value={data.supportTelegram}
            onSave={(v) => mutation.mutate({ supportTelegram: v })}
            disabled={mutation.isPending}
          />
          <TextField
            label="WhatsApp"
            placeholder="Phone, e.g. +15551234567"
            value={data.supportWhatsapp}
            onSave={(v) => mutation.mutate({ supportWhatsapp: v })}
            disabled={mutation.isPending}
          />
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

/**
 * Field "kinds" decouple the stored unit (cents, bps) from what the admin types.
 * The input always shows a human value (dollars, percent), so editing "$7.00"
 * means typing 7 — never the raw 700 cents / 200 bps that lives in the DB.
 */
type FieldKind = "usd" | "percent" | "days" | "multiplier";

type FieldConfig = {
  /** stored value -> editable human string */
  toDraft: (stored: number) => string;
  /** human string -> stored value (null = invalid) */
  parse: (draft: string) => number | null;
  /** stored value -> read-only display */
  display: (stored: number) => string;
  prefix?: string;
  suffix?: string;
  step: string;
};

const FIELD_CONFIG: Record<FieldKind, FieldConfig> = {
  // cents in the DB, dollars in the UI
  usd: {
    toDraft: (cents) => (cents / 100).toString(),
    parse: (draft) => {
      const dollars = parseFloat(draft);
      if (isNaN(dollars) || dollars < 0) return null;
      return Math.round(dollars * 100);
    },
    display: (cents) => formatUsdFromCents(cents),
    prefix: "$",
    step: "0.01",
  },
  // basis points in the DB, percent in the UI (100 bps = 1%)
  percent: {
    toDraft: (bps) => (bps / 100).toString(),
    parse: (draft) => {
      const pct = parseFloat(draft);
      if (isNaN(pct) || pct < 0 || pct > 100) return null;
      return Math.round(pct * 100);
    },
    display: (bps) => `${(bps / 100).toFixed(2)}%`,
    suffix: "%",
    step: "0.01",
  },
  days: {
    toDraft: (d) => d.toString(),
    parse: (draft) => {
      const d = parseInt(draft, 10);
      if (isNaN(d) || d < 0) return null;
      return d;
    },
    display: (d) => `${d} ${d === 1 ? "day" : "days"}`,
    suffix: "days",
    step: "1",
  },
  multiplier: {
    toDraft: (m) => m.toString(),
    parse: (draft) => {
      const m = parseFloat(draft);
      if (isNaN(m) || m < 0) return null;
      return m;
    },
    display: (m) => `${m}×`,
    suffix: "×",
    step: "0.1",
  },
};

function NumericField({
  label,
  kind,
  value,
  onSave,
  disabled,
}: {
  label: string;
  kind: FieldKind;
  value: number;
  onSave: (v: number) => void;
  disabled: boolean;
}) {
  const cfg = FIELD_CONFIG[kind];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => cfg.toDraft(value));
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setDraft(cfg.toDraft(value));
    setError(null);
    setEditing(true);
  }

  function save() {
    const parsed = cfg.parse(draft);
    if (parsed === null) {
      setError("Enter a valid amount");
      return;
    }
    onSave(parsed);
    setEditing(false);
    setError(null);
  }

  return (
    <div className="rounded-xl border border-border bg-surface-strong p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</p>
      {editing ? (
        <>
          <div className="mt-2 flex gap-2">
            <div
              className={`flex w-full items-center gap-1 rounded-lg border bg-transparent px-2 focus-within:ring-2 focus-within:ring-brand/40 ${
                error ? "border-down" : "border-brand"
              }`}
            >
              {cfg.prefix && <span className="text-sm text-muted">{cfg.prefix}</span>}
              <input
                autoFocus
                type="number"
                inputMode="decimal"
                min={0}
                step={cfg.step}
                value={draft}
                aria-label={label}
                aria-invalid={!!error}
                onChange={(e) => {
                  setDraft(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") save();
                  if (e.key === "Escape") setEditing(false);
                }}
                className="w-full bg-transparent py-1 text-sm text-foreground tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              {cfg.suffix && <span className="text-sm text-muted">{cfg.suffix}</span>}
            </div>
            <button
              onClick={save}
              disabled={disabled}
              className="rounded-lg bg-brand px-3 py-1 text-xs font-semibold text-background transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save
            </button>
          </div>
          {error && (
            <p className="mt-1 text-xs text-down" role="alert">
              {error}
            </p>
          )}
        </>
      ) : (
        <button
          onClick={startEdit}
          className="mt-2 w-full text-left font-display text-xl font-bold tabular-nums text-foreground transition hover:text-brand"
        >
          {cfg.display(value)}
        </button>
      )}
    </div>
  );
}

function TextField({
  label,
  placeholder,
  value,
  onSave,
  disabled,
}: {
  label: string;
  placeholder: string;
  value: string | null;
  onSave: (v: string | null) => void;
  disabled: boolean;
}) {
  const [draft, setDraft] = useState(value ?? "");
  const dirty = draft.trim() !== (value ?? "");

  function save() {
    if (!dirty) return;
    const trimmed = draft.trim();
    onSave(trimmed === "" ? null : trimmed);
  }

  return (
    <div className="rounded-xl border border-border bg-surface-strong p-4">
      <label className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</label>
      <div className="mt-2 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setDraft(value ?? "");
          }}
          placeholder={placeholder}
          inputMode="text"
          autoComplete="off"
          className="w-full rounded-lg border border-border bg-transparent px-2 py-1 text-sm text-foreground placeholder-muted outline-none focus:border-brand"
        />
        <button
          onClick={save}
          disabled={disabled || !dirty}
          className="rounded-lg bg-brand px-3 py-1 text-xs font-semibold text-background transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save
        </button>
      </div>
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
  // value is stored in basis points; the admin edits a plain percent.
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => (value / 100).toString());

  function startEdit() {
    setDraft((value / 100).toString());
    setEditing(true);
  }

  function save() {
    const pct = parseFloat(draft);
    if (!isNaN(pct) && pct >= 0 && pct <= 100) onSave(Math.round(pct * 100));
    setEditing(false);
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-3 text-center">
      <p className="text-xs font-semibold text-muted">L{level}</p>
      {editing ? (
        <div className="mt-1 flex items-center justify-center gap-0.5">
          <input
            autoFocus
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step="0.1"
            value={draft}
            aria-label={`Level ${level} referral rate (percent)`}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
            disabled={disabled}
            className="w-full bg-transparent text-center text-sm font-bold text-foreground tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="text-xs text-muted">%</span>
        </div>
      ) : (
        <button
          onClick={startEdit}
          className="mt-1 block w-full text-sm font-bold text-foreground tabular-nums hover:text-brand"
        >
          {(value / 100).toFixed(1)}%
        </button>
      )}
      <p className="text-[10px] text-muted">{value} bps</p>
    </div>
  );
}
