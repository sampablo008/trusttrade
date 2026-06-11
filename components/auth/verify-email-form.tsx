"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";

interface VerifyEmailFormProps {
  prefillEmail: string;
}

export default function VerifyEmailForm({ prefillEmail }: VerifyEmailFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState(prefillEmail);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const json = (await res.json()) as { error?: { message: string } };
      if (!res.ok) {
        throw new Error(json.error?.message ?? "Could not verify email.");
      }
      setFeedback({ ok: true, msg: "Email verified. Redirecting to sign in…" });
      setTimeout(() => router.push("/login?verified=1"), 1000);
    } catch (err) {
      setFeedback({ ok: false, msg: (err as Error).message });
      setSubmitting(false);
    }
  };

  const resend = async () => {
    if (!email) return;
    setResending(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/auth/resend-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "email_verification" }),
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
          value={email}
          onChange={(event) => setEmail(event.target.value)}
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
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
          className="text-center font-mono text-lg tracking-[0.4em]"
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
        {submitting ? "Verifying…" : "Verify email"}
      </Button>

      <Button
        type="button"
        variant="ghost"
        fullWidth
        onClick={resend}
        disabled={resending || !email}
        className="text-xs uppercase tracking-[0.24em] text-muted"
      >
        {resending ? "Sending…" : "Resend code"}
      </Button>
    </form>
  );
}
