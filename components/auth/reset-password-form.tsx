"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";

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
      const json = (await res.json()) as {
        data?: { redirectTo?: string };
        error?: { message: string };
      };
      if (!res.ok) {
        throw new Error(json.error?.message ?? "Could not reset password.");
      }
      setFeedback({ ok: true, msg: "Password updated. Signing you in…" });
      // Session cookies are already set by the response; do a full navigation
      // so middleware picks up the new session.
      const dest = json.data?.redirectTo ?? "/trade";
      setTimeout(() => window.location.assign(dest), 800);
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
      <FormField htmlFor="email" label="Email" required>
        <Input
          required
          id="email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(event) => update("email", event.target.value)}
        />
      </FormField>

      <FormField htmlFor="code" label="6-digit code" required>
        <Input
          required
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          value={form.code}
          onChange={(event) => update("code", event.target.value.replace(/\D/g, ""))}
          className="text-center font-mono text-lg tracking-[0.4em]"
        />
      </FormField>

      <FormField
        htmlFor="newPassword"
        label="New password"
        required
        hint="8+ chars, one uppercase, one number."
      >
        <PasswordInput
          required
          id="newPassword"
          autoComplete="new-password"
          value={form.newPassword}
          onChange={(event) => update("newPassword", event.target.value)}
        />
      </FormField>

      <FormField htmlFor="confirmPassword" label="Confirm new password" required>
        <PasswordInput
          required
          id="confirmPassword"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={(event) => update("confirmPassword", event.target.value)}
        />
      </FormField>

      {feedback ? (
        <p
          role={feedback.ok ? "status" : "alert"}
          aria-live="polite"
          className={`text-sm ${feedback.ok ? "text-up" : "text-down"}`}
        >
          {feedback.msg}
        </p>
      ) : null}

      <Button type="submit" fullWidth size="lg" loading={submitting}>
        {submitting ? "Updating…" : "Reset password"}
      </Button>

      <Button
        type="button"
        variant="ghost"
        fullWidth
        onClick={resend}
        disabled={resending || !form.email}
        className="text-xs uppercase tracking-[0.24em] text-muted"
      >
        {resending ? "Sending…" : "Resend code"}
      </Button>
    </form>
  );
}
