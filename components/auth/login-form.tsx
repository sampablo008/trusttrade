"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signInPreview } from "@/app/actions/auth";
import type { LoginActionState } from "@/schemas/auth";

const initialState: LoginActionState = {};

export default function LoginForm() {
  const searchParams = useSearchParams();
  const [state, action, pending] = useActionState(signInPreview, initialState);
  const nextPath = searchParams.get("next") ?? "/trade";

  return (
    <form action={action} className="space-y-5">
      <input name="nextPath" type="hidden" value={nextPath} />

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
          name="email"
          type="email"
          placeholder="you@trustpro.dev"
          className="w-full rounded-[20px] border border-border bg-background/40 px-4 py-4 text-sm text-foreground outline-none transition focus:border-brand"
        />
        {state.errors?.email?.length ? (
          <p className="text-sm text-down">{state.errors.email[0]}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            className="text-xs font-semibold uppercase tracking-[0.24em] text-muted"
            htmlFor="password"
          >
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand transition hover:text-foreground"
          >
            Forgot?
          </Link>
        </div>
        <input
          required
          id="password"
          name="password"
          type="password"
          placeholder="At least 8 characters"
          className="w-full rounded-[20px] border border-border bg-background/40 px-4 py-4 text-sm text-foreground outline-none transition focus:border-brand"
        />
        {state.errors?.password?.length ? (
          <p className="text-sm text-down">{state.errors.password[0]}</p>
        ) : null}
      </div>

      {state.message ? <p className="text-sm text-warning">{state.message}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-full bg-brand px-5 py-4 text-sm font-semibold text-background transition hover:bg-foreground disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
