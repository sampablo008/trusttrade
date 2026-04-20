"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";

interface WithdrawalPinFormProps {
  hasPin: boolean;
  onStateChange?: (hasPin: boolean) => void;
}

interface FieldState {
  currentPin: string;
  newPin: string;
  confirmPin: string;
}

const emptyState: FieldState = {
  currentPin: "",
  newPin: "",
  confirmPin: "",
};

export default function WithdrawalPinForm({ hasPin, onStateChange }: WithdrawalPinFormProps) {
  const [form, setForm] = useState<FieldState>(emptyState);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const update = (key: keyof FieldState, raw: string) => {
    const value = raw.replace(/\D/g, "").slice(0, 6);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const payload: Record<string, string> = {
        newPin: form.newPin,
        confirmPin: form.confirmPin,
      };
      if (hasPin) payload.currentPin = form.currentPin;

      const res = await fetch("/api/me/withdrawal-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        data?: { action: "set" | "changed" };
        error?: { message: string };
      };
      if (!res.ok || !json.data) {
        throw new Error(json.error?.message ?? "Could not update PIN.");
      }

      setForm(emptyState);
      setFeedback({
        ok: true,
        msg:
          json.data.action === "set"
            ? "Withdrawal PIN set. We emailed a confirmation."
            : "Withdrawal PIN updated. We emailed a confirmation.",
      });
      onStateChange?.(true);
    } catch (err) {
      setFeedback({ ok: false, msg: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <ShieldCheck size={16} className="text-brand" />
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
          {hasPin ? "Change withdrawal PIN" : "Set withdrawal PIN"}
        </h3>
      </div>

      <p className="text-xs leading-5 text-muted">
        Your 6-digit PIN is required for every withdrawal. Keep it private — never share it
        with anyone, including {" "}
        <span className="font-semibold text-foreground">TrustPro</span> staff.
      </p>

      <div className="flex flex-col gap-3">
        {hasPin ? (
          <PinInput
            label="Current PIN"
            value={form.currentPin}
            onChange={(value) => update("currentPin", value)}
            autoFocus
          />
        ) : null}
        <PinInput
          label="New PIN"
          value={form.newPin}
          onChange={(value) => update("newPin", value)}
          hint="Exactly 6 digits."
        />
        <PinInput
          label="Confirm new PIN"
          value={form.confirmPin}
          onChange={(value) => update("confirmPin", value)}
        />
      </div>

      {feedback ? (
        <p className={`text-xs font-semibold ${feedback.ok ? "text-up" : "text-down"}`}>
          {feedback.msg}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Saving…" : hasPin ? "Update PIN" : "Set PIN"}
      </button>
    </form>
  );
}

interface PinInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  autoFocus?: boolean;
}

const PinInput = ({ label, value, onChange, hint, autoFocus }: PinInputProps) => (
  <label className="flex flex-col gap-1">
    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
      {label}
    </span>
    <input
      type="password"
      inputMode="numeric"
      autoComplete="off"
      pattern="\d{6}"
      maxLength={6}
      autoFocus={autoFocus}
      required
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-xl border border-border bg-background/30 px-4 py-2.5 text-center font-mono text-lg tracking-[0.4em] text-foreground outline-none focus:border-brand"
    />
    {hint ? <span className="text-[11px] text-muted">{hint}</span> : null}
  </label>
);
