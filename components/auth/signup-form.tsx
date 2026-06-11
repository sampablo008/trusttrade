"use client";

import { useDeferredValue, useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Check, CheckCircle2, KeyRound, UserPlus } from "lucide-react";
import { fetchJson } from "@/lib/api/client";
import {
  invitedSignupSchema,
  inviteSignupResultSchema,
  inviteValidationResultSchema,
} from "@/schemas/invites";
import type { InviteSignupResult, InviteValidationResult } from "@/types/invites";
import { Button } from "@/components/ui/Button";
import { FormField, Label } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";

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
      <section className="flex flex-col rounded-[32px] border border-border bg-surface-soft p-6">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-brand/20 bg-brand-soft px-4 py-2 text-xs uppercase tracking-[0.26em] text-brand">
          <KeyRound size={14} aria-hidden="true" />
          Step 1 of 2
        </div>
        <div className="mt-5 space-y-4">
          <h2 className="font-display text-4xl tracking-tight text-foreground">
            Start with your invite code.
          </h2>
          <p className="text-sm leading-7 text-muted">
            TrustTrade is invite-only. Paste the code your referrer sent you — we&apos;ll check it
            live and unlock the next step as soon as it&apos;s valid.
          </p>
        </div>

        <div className="mt-8 rounded-[24px] border border-border bg-background/30 p-5">
          <Label htmlFor="signup-code" required>
            Invite code
          </Label>
          <Input
            id="signup-code"
            placeholder="Paste your invite code"
            className="mt-3"
            invalid={Boolean(inviteError) && !inviteResult?.isValid}
            aria-describedby="signup-code-status"
            {...register("code")}
          />

          <div className="mt-4 min-h-7" id="signup-code-status" aria-live="polite">
            {inviteResult?.isValid ? (
              <div className="inline-flex items-center gap-2 text-sm text-up">
                <CheckCircle2 size={16} aria-hidden="true" />
                {inviteResult.message} {inviteResult.mode === "preview" ? "(preview mode)" : ""}
              </div>
            ) : null}

            {!inviteResult?.isValid && inviteError ? (
              <div className="inline-flex items-center gap-2 text-sm text-down">
                <AlertTriangle size={16} aria-hidden="true" />
                {inviteError}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-auto rounded-[24px] border border-border bg-background/20 p-5 text-sm leading-7 text-muted">
          <p className="font-semibold text-foreground">Don&apos;t have an invite yet?</p>
          <p className="mt-1">
            TrustTrade is invite-only. Ask the trader who referred you for a fresh code, or reach
            out to our team and we&apos;ll help you find one.
          </p>
        </div>
      </section>

      <section className="flex flex-col rounded-[32px] border border-border bg-surface-soft p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              Step 2 of 2
            </p>
            <h2 className="mt-2 font-display text-4xl tracking-tight text-foreground">
              {revealForm ? "Set up your account" : "Your details, after the code"}
            </h2>
          </div>
          <div
            className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] ${
              revealForm
                ? "bg-up/10 text-up"
                : "border border-border bg-background/30 text-muted"
            }`}
          >
            <UserPlus size={14} aria-hidden="true" />
            {revealForm ? "Ready" : "Locked"}
          </div>
        </div>

        {revealForm ? (
          <form className="mt-8 space-y-5" onSubmit={onSubmit}>
            <FormField htmlFor="signup-username" label="Username" required>
              <Input
                id="signup-username"
                autoComplete="username"
                {...register("username", { required: true })}
              />
              <UsernameChecklist username={watch("username") ?? ""} />
            </FormField>

            <FormField
              htmlFor="signup-email"
              label="Email"
              required
              error={errors.email ? errors.email.message ?? "Email is required." : undefined}
            >
              <Input
                id="signup-email"
                type="email"
                autoComplete="email"
                invalid={Boolean(errors.email)}
                {...register("email", { required: true })}
              />
            </FormField>

            <FormField htmlFor="signup-password" label="Password" required>
              <PasswordInput
                id="signup-password"
                autoComplete="new-password"
                {...register("password")}
              />
              <PasswordChecklist password={pw} />
            </FormField>

            {submitError ? (
              <p role="alert" className="text-sm text-down">
                {submitError}
              </p>
            ) : null}
            {submitSuccess ? (
              <p role="status" className="text-sm text-up">
                {submitSuccess}
              </p>
            ) : null}

            <Button type="submit" fullWidth size="lg" loading={isPending}>
              {isPending ? "Creating account…" : "Create account"}
            </Button>
          </form>
        ) : (
          <div className="mt-8 flex flex-1 items-center rounded-[24px] border border-dashed border-border bg-background/20 p-6 text-sm leading-7 text-muted">
            Enter a valid invite code on the left. Once it checks out, you&apos;ll pick a
            username, email, and password here — and you&apos;re in.
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
            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${ok ? "border-up bg-up/10 text-up" : "border-border"}`}>
              {ok ? <Check className="h-2.5 w-2.5" aria-hidden="true" /> : null}
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
