import { Suspense } from "react";
import Link from "next/link";
import { LineChart, ShieldCheck, Sparkles, Waves } from "lucide-react";
import BrandLogo from "@/components/brand/BrandLogo";
import LoginForm from "@/components/auth/login-form";

interface LoginPageProps {
  searchParams: Promise<{
    signup?: string;
    reset?: string;
    verified?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const showSignupNotice = params.signup === "1";
  const showResetNotice = params.reset === "1";
  const showVerifiedNotice = params.verified === "1";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-4 py-5 sm:gap-8 sm:px-6 sm:py-8 lg:px-8">
      <header className="flex items-center justify-between">
        <Link href="/" aria-label="TrustPro home">
          <BrandLogo size={36} wordmarkClassName="text-lg tracking-[-0.01em]" />
        </Link>
        <Link
          href="/signup"
          className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-muted transition hover:border-brand/60 hover:text-foreground"
        >
          Create account
        </Link>
      </header>

      <div className="grid flex-1 items-stretch gap-4 sm:gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="order-2 flex flex-col rounded-[28px] border border-border bg-surface-soft p-6 sm:rounded-[36px] sm:p-8 lg:order-1">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-brand/20 bg-brand-soft px-4 py-2 text-xs uppercase tracking-[0.28em] text-brand">
            <Waves size={14} />
            Welcome back
          </div>
          <div className="mt-6 space-y-4">
            <h1 className="font-display text-3xl leading-[1.1] tracking-tight text-foreground sm:text-5xl sm:leading-[1.05] lg:text-6xl">
              Your trading desk is one sign in away.
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-muted sm:text-base sm:leading-8">
              Sign in to open live charts, track the pairs you care about, and place trades with a
              clear view of your risk. Traders land on the desk, admins land in the control room —
              TrustPro takes care of the routing.
            </p>
          </div>

          <div className="mt-auto grid gap-4 pt-8 sm:grid-cols-2 sm:pt-10">
            <div className="rounded-[28px] border border-border bg-background/35 p-5">
              <div className="inline-flex rounded-full bg-up/10 p-3 text-up">
                <LineChart size={18} />
              </div>
              <h2 className="mt-4 text-xl font-semibold text-foreground">Live market view</h2>
              <p className="mt-3 text-sm leading-7 text-muted">
                Follow BTC, ETH, SOL and every pair on your watchlist with prices that stream in
                real time, straight from the exchange.
              </p>
            </div>
            <div className="rounded-[28px] border border-border bg-background/35 p-5">
              <div className="inline-flex rounded-full bg-warning/10 p-3 text-warning">
                <Sparkles size={18} />
              </div>
              <h2 className="mt-4 text-xl font-semibold text-foreground">Enter trades fast</h2>
              <p className="mt-3 text-sm leading-7 text-muted">
                Go from sign in to an open position in seconds, with size, direction, and duration
                clear before you commit.
              </p>
            </div>
          </div>
        </section>

        <section className="order-1 flex flex-col rounded-[28px] border border-border bg-surface-soft p-6 sm:rounded-[36px] sm:p-8 lg:order-2">
          <div className="space-y-2">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-muted">
              <ShieldCheck size={14} className="text-brand" />
              Sign in
            </p>
            <h2 className="font-display text-3xl tracking-tight text-foreground sm:text-4xl">
              Welcome back, trader.
            </h2>
            <p className="text-sm leading-7 text-muted">
              Enter your email and password to reach the desk. New here?{" "}
              <Link href="/signup" className="font-semibold text-brand hover:text-foreground">
                Create an account
              </Link>
              .
            </p>
          </div>

          {showSignupNotice ? (
            <div className="mt-6 rounded-[24px] border border-up/30 bg-up/10 px-5 py-4 text-sm leading-7 text-up">
              Account created. Sign in below to open your trading desk.
            </div>
          ) : null}

          {showResetNotice ? (
            <div className="mt-6 rounded-[24px] border border-up/30 bg-up/10 px-5 py-4 text-sm leading-7 text-up">
              Password updated. Sign in with your new password.
            </div>
          ) : null}

          {showVerifiedNotice ? (
            <div className="mt-6 rounded-[24px] border border-up/30 bg-up/10 px-5 py-4 text-sm leading-7 text-up">
              Email verified. Sign in to start trading.
            </div>
          ) : null}

          <div className="mt-8 rounded-[28px] border border-border bg-background/35 p-5">
            <Suspense
              fallback={
                <div className="rounded-[20px] border border-border bg-background/40 px-4 py-8 text-sm text-muted">
                  Loading sign in...
                </div>
              }
            >
              <LoginForm />
            </Suspense>
          </div>

          <div className="mt-auto rounded-[28px] border border-border bg-background/25 p-5 text-sm leading-7 text-muted">
            <p className="font-semibold text-foreground">Need a hand signing in?</p>
            <p className="mt-1">
              Use the email and password tied to your trader account. Forgot your password? Tap{" "}
              <span className="text-foreground">Forgot?</span> above to reset it in a minute.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
