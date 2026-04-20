"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";

interface FieldState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const emptyState: FieldState = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export default function ChangePasswordForm() {
  const [form, setForm] = useState<FieldState>(emptyState);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const update = (key: keyof FieldState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = (await res.json()) as {
        data?: { changedAt: string };
        error?: { message: string };
      };
      if (!res.ok || !json.data) {
        throw new Error(json.error?.message ?? "Could not change password.");
      }
      setForm(emptyState);
      setFeedback({ ok: true, msg: "Password updated. We emailed a confirmation." });
    } catch (err) {
      setFeedback({ ok: false, msg: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <KeyRound size={16} className="text-brand" />
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
          Change password
        </h3>
      </div>

      <div className="flex flex-col gap-3">
        <PasswordInput
          label="Current password"
          value={form.currentPassword}
          onChange={(v) => update("currentPassword", v)}
          autoComplete="current-password"
        />
        <PasswordInput
          label="New password"
          value={form.newPassword}
          onChange={(v) => update("newPassword", v)}
          autoComplete="new-password"
          hint="At least 8 characters, one uppercase, one number."
        />
        <PasswordInput
          label="Confirm new password"
          value={form.confirmPassword}
          onChange={(v) => update("confirmPassword", v)}
          autoComplete="new-password"
        />
      </div>

      {feedback ? (
        <p
          className={`text-xs font-semibold ${feedback.ok ? "text-up" : "text-down"}`}
        >
          {feedback.msg}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}

interface PasswordInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  hint?: string;
}

const PasswordInput = ({ label, value, onChange, autoComplete, hint }: PasswordInputProps) => (
  <label className="flex flex-col gap-1">
    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
      {label}
    </span>
    <input
      type="password"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      autoComplete={autoComplete}
      required
      className="rounded-xl border border-border bg-background/30 px-4 py-2.5 text-sm text-foreground placeholder-muted outline-none focus:border-brand"
    />
    {hint ? <span className="text-[11px] text-muted">{hint}</span> : null}
  </label>
);
