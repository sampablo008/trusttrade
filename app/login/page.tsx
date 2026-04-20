import { Suspense } from "react";
import { LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
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
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[36px] border border-border bg-surface-soft p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-soft px-4 py-2 text-xs uppercase tracking-[0.28em] text-brand">
            <LockKeyhole size={14} />
            Trade route preview
          </div>
          <div className="mt-6 space-y-4">
            <h1 className="font-display text-5xl leading-none tracking-tight text-foreground sm:text-6xl">
              Trade the move while the market is still giving it.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-muted">
              Sign in to reach the trading desk, scan the strongest crypto pairs, and act on
              momentum without friction. The preview flow gets you from login to the market fast,
              with <span className="text-foreground">admin</span> in the email opening the admin
              route preview.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[28px] border border-border bg-background/35 p-5">
              <div className="inline-flex rounded-full bg-up/10 p-3 text-up">
                <ShieldCheck size={18} />
              </div>
              <h2 className="mt-4 text-xl font-semibold text-foreground">Track live momentum</h2>
              <p className="mt-3 text-sm leading-7 text-muted">
                Watch major pairs like BTC, ETH, and SOL and be ready when price starts to break.
              </p>
            </div>
            <div className="rounded-[28px] border border-border bg-background/35 p-5">
              <div className="inline-flex rounded-full bg-warning/10 p-3 text-warning">
                <Sparkles size={18} />
              </div>
              <h2 className="mt-4 text-xl font-semibold text-foreground">Get in with speed</h2>
              <p className="mt-3 text-sm leading-7 text-muted">
                Move from sign-in to execution in seconds so your focus stays on timing,
                direction, and conviction.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[36px] border border-border bg-surface-soft p-8">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted">
              Enter desk
            </p>
            <h2 className="font-display text-4xl tracking-tight text-foreground">
              Preview sign in
            </h2>
          </div>

          {showSignupNotice ? (
            <div className="mt-6 rounded-[24px] border border-up/30 bg-up/10 px-5 py-4 text-sm leading-7 text-up">
              Account created. Use the preview sign-in flow to enter the trade route.
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
                  Loading login controls...
                </div>
              }
            >
              <LoginForm />
            </Suspense>
          </div>

          <div className="mt-6 rounded-[28px] border border-border bg-background/25 p-5 text-sm leading-7 text-muted">
            Sample emails: `trader@trustpro.dev` for user route preview, `ops.admin@trustpro.dev`
            for admin route preview.
          </div>
        </section>
      </div>
    </main>
  );
}
