"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signInPreview } from "@/app/actions/auth";
import type { LoginActionState } from "@/schemas/auth";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";

const initialState: LoginActionState = {};

export default function LoginForm() {
  const searchParams = useSearchParams();
  const [state, action, pending] = useActionState(signInPreview, initialState);
  const nextPath = searchParams.get("next") ?? "/trade";

  const emailError = state.errors?.email?.[0];
  const passwordError = state.errors?.password?.[0];

  return (
    <form action={action} className="space-y-5">
      <input name="nextPath" type="hidden" value={nextPath} />

      <FormField htmlFor="email" label="Email" required error={emailError}>
        <Input
          required
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@trusttrade.pro"
          invalid={Boolean(emailError)}
          aria-describedby={emailError ? "email-error" : undefined}
        />
      </FormField>

      <FormField
        htmlFor="password"
        label="Password"
        required
        error={passwordError}
        action={
          <Link
            href="/forgot-password"
            className="rounded text-[11px] font-semibold uppercase tracking-[0.24em] text-brand transition focus-ring hover:text-foreground"
          >
            Forgot?
          </Link>
        }
      >
        <PasswordInput
          required
          id="password"
          name="password"
          autoComplete="current-password"
          placeholder="At least 8 characters"
          invalid={Boolean(passwordError)}
          aria-describedby={passwordError ? "password-error" : undefined}
        />
      </FormField>

      {state.message ? (
        <p
          role="alert"
          aria-live="polite"
          className="rounded-[20px] border border-down/30 bg-down/10 px-4 py-3 text-sm leading-6 text-down"
        >
          {state.message}
        </p>
      ) : null}

      <Button type="submit" fullWidth size="lg" loading={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
