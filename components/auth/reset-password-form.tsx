"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface FormState {
  email: string;
  code: string;
  newPassword: string;
  confirmPassword: string;
}

interface ResetPasswordFormProps {
  prefillEmail: string;
}

export default function ResetPasswordForm({ prefillEmail }: ResetPasswordFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    email: prefillEmail,
    code: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const update = (key: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = (await res.json()) as { error?: { message: string } };
      if (!res.ok) {
        throw new Error(json.error?.message ?? "Could not reset password.");
      }
      setFeedback({ ok: true, msg: "Password updated. Redirecting to sign in…" });
      setTimeout(() => router.push("/login?reset=1"), 1200);
    } catch (err) {
      setFeedback({ ok: false, msg: (err as Error).message });
      setSubmitting(false);
    }
  };

  const resend = async () => {
    if (!form.email) return;
    setResending(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: { message: string } };
        throw new Error(json.error?.message ?? "Could not resend code.");
      }
      setFeedback({ ok: true, msg: "New code sent." });
    } catch (err) {
      setFeedback({ ok: false, msg: (err as Error).message });
    } finally {
      setResending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field label="Email" id="email">
        <input
          required
          id="email"
          type="email"
          value={form.email}
          onChange={(event) => update("email", event.target.value)}
          className="w-full rounded-[20px] border border-border bg-background/40 px-4 py-4 text-sm text-foreground outline-none transition focus:border-brand"
        />
      </Field>

      <Field label="6-digit code" id="code">
        <input
          required
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          value={form.code}
          onChange={(event) => update("code", event.target.value.replace(/\D/g, ""))}
          className="w-full rounded-[20px] border border-border bg-background/40 px-4 py-4 text-center font-mono text-lg tracking-[0.4em] text-foreground outline-none transition focus:border-brand"
        />
      </Field>

      <Field label="New password" id="newPassword" hint="8+ chars, one uppercase, one number.">
        <input
          required
          id="newPassword"
          type="password"
          autoComplete="new-password"
          value={form.newPassword}
          onChange={(event) => update("newPassword", event.target.value)}
          className="w-full rounded-[20px] border border-border bg-background/40 px-4 py-4 text-sm text-foreground outline-none transition focus:border-brand"
        />
      </Field>

      <Field label="Confirm new password" id="confirmPassword">
        <input
          required
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={(event) => update("confirmPassword", event.target.value)}
          className="w-full rounded-[20px] border border-border bg-background/40 px-4 py-4 text-sm text-foreground outline-none transition focus:border-brand"
        />
      </Field>

      {feedback ? (
        <p
          className={`text-sm ${feedback.ok ? "text-up" : "text-down"}`}
        >
          {feedback.msg}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex w-full items-center justify-center rounded-full bg-brand px-5 py-4 text-sm font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Updating…" : "Reset password"}
      </button>

      <button
        type="button"
        onClick={resend}
        disabled={resending || !form.email}
        className="w-full text-xs font-semibold uppercase tracking-[0.24em] text-muted transition hover:text-foreground disabled:opacity-50"
      >
        {resending ? "Sending…" : "Resend code"}
      </button>
    </form>
  );
}

interface FieldProps {
  label: string;
  id: string;
  hint?: string;
  children: React.ReactNode;
}

const Field = ({ label, id, hint, children }: FieldProps) => (
  <div className="space-y-2">
    <label
      htmlFor={id}
      className="text-xs font-semibold uppercase tracking-[0.24em] text-muted"
    >
      {label}
    </label>
    {children}
    {hint ? <p className="text-[11px] text-muted">{hint}</p> : null}
  </div>
);
