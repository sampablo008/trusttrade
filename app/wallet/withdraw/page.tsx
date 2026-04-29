import Link from "next/link";
import { ArrowLeft, ShieldCheck, Zap } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import WithdrawForm from "@/components/wallet/WithdrawForm";
import { hasWithdrawalPin } from "@/lib/account/pin-service";
import { assertUserApi } from "@/lib/auth/assert-user-api";
import { listMarketTokens } from "@/lib/markets/service";
import { getWalletBalances } from "@/lib/wallet-balances/service";

export default async function WithdrawPage() {
  const { userId } = await assertUserApi();
  const [balances, pinSet, tokensResult] = await Promise.all([
    getWalletBalances(userId),
    hasWithdrawalPin(userId),
    listMarketTokens(),
  ]);

  return (
    <AppShell>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            href="/wallet"
            className="flex items-center gap-1.5 rounded-full border border-border bg-background/40 px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-brand hover:text-foreground"
          >
            <ArrowLeft size={12} />
            Back to wallet
          </Link>
          <span className="h-5 w-px bg-border" />
          <nav className="flex items-center gap-1.5 text-xs text-muted">
            <Link href="/wallet" className="transition hover:text-foreground">Wallet</Link>
            <span>/</span>
            <span className="font-semibold text-foreground">Withdraw</span>
          </nav>
        </div>

        <header className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand">
            Cash out
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Withdraw funds
          </h1>
          <p className="max-w-2xl text-sm text-muted">
            Pick a token, enter the native amount, and submit. Funds are held on submission and
            admin reviews + pays externally. Min withdrawal and fee are configured per token.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <section className="rounded-[28px] border border-border bg-surface-soft p-6 sm:p-8">
            <WithdrawForm
              balances={balances}
              tokens={tokensResult.items}
              hasWithdrawalPin={pinSet}
            />
          </section>

          <aside className="flex flex-col gap-4 rounded-[28px] border border-border bg-surface-soft p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                Withdrawal guide
              </p>
              <h3 className="mt-2 font-display text-lg text-foreground">
                What to expect
              </h3>
            </div>

            <ul className="flex flex-col gap-3">
              <GuideItem
                icon={ShieldCheck}
                label="Manual review"
                body="Each withdrawal is reviewed by an admin to prevent fraud."
              />
              <GuideItem
                icon={Zap}
                label="Fast payout"
                body="Most payouts settle within 1-3 hours after approval."
              />
            </ul>

            <div className="mt-auto rounded-2xl border border-[hsl(var(--color-down))]/30 bg-[hsl(var(--color-down))]/5 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--color-down))]">
                Heads up
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">
                Wrong-network withdrawals cannot be recovered. Confirm the token and network match
                the destination wallet.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </AppShell>
  );
}

function GuideItem({
  icon: Icon,
  label,
  body,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  body: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
        <Icon size={14} />
      </span>
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className="text-xs text-muted">{body}</span>
      </div>
    </li>
  );
}
