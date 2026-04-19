"use client";

import { useDeferredValue, useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, CheckCircle2, KeyRound, UserPlus } from "lucide-react";
import { fetchJson } from "@/lib/api/client";
import {
  invitedSignupSchema,
  inviteSignupResultSchema,
  inviteValidationResultSchema,
} from "@/schemas/invites";
import type { InviteSignupResult, InviteValidationResult } from "@/types/invites";

interface SignupFormValues {
  code: string;
  email: string;
  password: string;
  username: string;
}

interface SignupFormProps {
  initialCode?: string;
}

export default function SignupForm({ initialCode = "" }: SignupFormProps) {
  "use no memo";

  const [inviteResult, setInviteResult] = useState<InviteValidationResult | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    formState: { errors },
    handleSubmit,
    register,
    watch,
  } = useForm<SignupFormValues>({
    resolver: zodResolver(invitedSignupSchema),
    defaultValues: {
      code: initialCode,
      email: "",
      password: "",
      username: "",
    },
  });
  // React Hook Form manages imperative form watchers internally, so this island opts out.
  // eslint-disable-next-line react-hooks/incompatible-library
  const watchedCode = watch("code");
  const deferredCode = useDeferredValue(watchedCode.trim());

  useEffect(() => {
    const code = deferredCode.toUpperCase();

    if (!code) {
      setInviteError(null);
      setInviteResult(null);
      return;
    }

    if (code.length < 4) {
      setInviteError("Invite code is too short.");
      setInviteResult(null);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        const result = await fetchJson(
          `/api/invites/validate?code=${encodeURIComponent(code)}`,
          inviteValidationResultSchema,
          { signal: controller.signal },
        );

        setInviteResult(result);
        setInviteError(result.isValid ? null : result.message);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setInviteResult(null);
        setInviteError(error instanceof Error ? error.message : "Invite validation failed.");
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [deferredCode]);

  const onSubmit = handleSubmit((values) => {
    if (!inviteResult?.isValid) {
      setSubmitSuccess(null);
      setSubmitError("Use a valid invite code first.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await fetchJson<InviteSignupResult>(
          "/api/auth/signup",
          inviteSignupResultSchema,
          {
            body: JSON.stringify(values),
            method: "POST",
          },
        );

        setSubmitError(null);
        setSubmitSuccess("Account created. Redirecting to login...");
        window.location.href = result.nextPath;
      } catch (error) {
        setSubmitSuccess(null);
        setSubmitError(error instanceof Error ? error.message : "Signup failed.");
      }
    });
  });

  const revealForm = inviteResult?.isValid;

  const pw = watch("password") ?? "";

  return (
    <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
      <section className="rounded-[32px] border border-border bg-surface-soft p-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-soft px-4 py-2 text-xs uppercase tracking-[0.26em] text-brand">
          <KeyRound size={14} />
          Trader invite
        </div>
        <div className="mt-5 space-y-4">
          <h2 className="font-display text-4xl tracking-tight text-foreground">
            Access opens when the invite checks out.
          </h2>
          <p className="text-sm leading-7 text-muted">
            Use a valid referral or admin invite to unlock the desk. Referral codes place traders
            into the network, while admin codes open internal access with no upline.
          </p>
        </div>

        <div className="mt-8 rounded-[24px] border border-border bg-background/30 p-5">
          <label
            className="text-xs font-semibold uppercase tracking-[0.24em] text-muted"
            htmlFor="signup-code"
          >
            Invitation code
          </label>
          <input
            id="signup-code"
            placeholder="REF_ATLAS or K7X9M2PQ4R"
            className="mt-3 w-full rounded-[20px] border border-border bg-background/35 px-4 py-4 text-sm text-foreground outline-none transition focus:border-brand"
            {...register("code")}
          />

          <div className="mt-4 min-h-7">
            {inviteResult?.isValid ? (
              <div className="inline-flex items-center gap-2 text-sm text-up">
                <CheckCircle2 size={16} />
                {inviteResult.message} {inviteResult.mode === "preview" ? "(preview mode)" : ""}
              </div>
            ) : null}

            {!inviteResult?.isValid && inviteError ? (
              <div className="inline-flex items-center gap-2 text-sm text-down">
                <AlertTriangle size={16} />
                {inviteError}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-6 rounded-[24px] border border-border bg-background/20 p-5 text-sm leading-7 text-muted">
          Use `REF_ATLAS` or `K7X9M2PQ4R` to preview trader onboarding without live Supabase env
          vars. Once live env is connected, this page validates against `validate_invite`.
        </div>
      </section>

      <section className="rounded-[32px] border border-border bg-surface-soft p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              Account form
            </p>
            <h2 className="mt-2 font-display text-4xl tracking-tight text-foreground">
              {revealForm ? "Build your trading account" : "Waiting on trader invite"}
            </h2>
          </div>
          <div
            className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] ${
              revealForm
                ? "bg-up/10 text-up"
                : "border border-border bg-background/30 text-muted"
            }`}
          >
            <UserPlus size={14} />
            {revealForm ? "Ready" : "Locked"}
          </div>
        </div>

        {revealForm ? (
          <form className="mt-8 space-y-5" onSubmit={onSubmit}>
            <div className="space-y-2">
              <label
                className="text-xs font-semibold uppercase tracking-[0.24em] text-muted"
                htmlFor="signup-username"
              >
                Username
              </label>
              <input
                id="signup-username"
                className="w-full rounded-[20px] border border-border bg-background/35 px-4 py-4 text-sm text-foreground outline-none transition focus:border-brand"
                {...register("username", { required: true })}
              />
              <UsernameChecklist username={watch("username") ?? ""} />
            </div>

            <div className="space-y-2">
              <label
                className="text-xs font-semibold uppercase tracking-[0.24em] text-muted"
                htmlFor="signup-email"
              >
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                className="w-full rounded-[20px] border border-border bg-background/35 px-4 py-4 text-sm text-foreground outline-none transition focus:border-brand"
                {...register("email", { required: true })}
              />
              {errors.email ? (
                <p className="text-sm text-down">{errors.email.message ?? "Email is required."}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label
                className="text-xs font-semibold uppercase tracking-[0.24em] text-muted"
                htmlFor="signup-password"
              >
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                className="w-full rounded-[20px] border border-border bg-background/35 px-4 py-4 text-sm text-foreground outline-none transition focus:border-brand"
                {...register("password")}
              />
              <PasswordChecklist password={pw} />
            </div>

            {submitError ? <p className="text-sm text-down">{submitError}</p> : null}
            {submitSuccess ? <p className="text-sm text-up">{submitSuccess}</p> : null}

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex w-full items-center justify-center rounded-full bg-brand px-5 py-4 text-sm font-semibold text-background transition hover:bg-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Creating account..." : "Create account"}
            </button>
          </form>
        ) : (
          <div className="mt-8 rounded-[24px] border border-dashed border-border bg-background/20 p-6 text-sm leading-7 text-muted">
            Enter a valid invite code to unlock your trading account setup. Once verified, the
            username, email, and password fields appear here.
          </div>
        )}
      </section>
    </div>
  );
}

const passwordRules = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
];

const usernameRules = [
  { label: "At least 3 characters", test: (u: string) => u.length >= 3 },
  { label: "Lowercase letters, numbers, . _ - only", test: (u: string) => /^[a-z0-9._-]+$/.test(u) },
  { label: "Must start with a letter, number, or _", test: (u: string) => /^[a-z0-9_]/.test(u) },
];

function RuleChecklist({ value, rules }: { value: string; rules: { label: string; test: (v: string) => boolean }[] }) {
  if (!value) return null;
  return (
    <ul className="mt-2 space-y-1">
      {rules.map((rule) => {
        const ok = rule.test(value);
        return (
          <li key={rule.label} className={`flex items-center gap-2 text-xs ${ok ? "text-up" : "text-muted"}`}>
            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${ok ? "border-up bg-up/10 text-up" : "border-border"}`}>
              {ok ? "✓" : ""}
            </span>
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}

function PasswordChecklist({ password }: { password: string }) {
  return <RuleChecklist value={password} rules={passwordRules} />;
}

function UsernameChecklist({ username }: { username: string }) {
  return <RuleChecklist value={username} rules={usernameRules} />;
}
