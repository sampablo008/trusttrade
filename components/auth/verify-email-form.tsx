"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
      <div className="space-y-2">
        <label
          className="text-xs font-semibold uppercase tracking-[0.24em] text-muted"
          htmlFor="email"
        >
          Email
        </label>
        <input
          required
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-[20px] border border-border bg-background/40 px-4 py-4 text-sm text-foreground outline-none transition focus:border-brand"
        />
      </div>

      <div className="space-y-2">
        <label
          className="text-xs font-semibold uppercase tracking-[0.24em] text-muted"
          htmlFor="code"
        >
          6-digit code
        </label>
        <input
          required
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
          className="w-full rounded-[20px] border border-border bg-background/40 px-4 py-4 text-center font-mono text-lg tracking-[0.4em] text-foreground outline-none transition focus:border-brand"
        />
      </div>

      {feedback ? (
        <p className={`text-sm ${feedback.ok ? "text-up" : "text-down"}`}>
          {feedback.msg}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex w-full items-center justify-center rounded-full bg-brand px-5 py-4 text-sm font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Verifying…" : "Verify email"}
      </button>

      <button
        type="button"
        onClick={resend}
        disabled={resending || !email}
        className="w-full text-xs font-semibold uppercase tracking-[0.24em] text-muted transition hover:text-foreground disabled:opacity-50"
      >
        {resending ? "Sending…" : "Resend code"}
      </button>
    </form>
  );
}
