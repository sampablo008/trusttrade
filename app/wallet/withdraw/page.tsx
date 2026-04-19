import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { assertUserApi } from "@/lib/auth/assert-user-api";
import { getBalance } from "@/lib/trades/service";
import WithdrawForm from "@/components/wallet/WithdrawForm";

export default async function WithdrawPage() {
  const { userId } = await assertUserApi();
  const balance = await getBalance(userId);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3">
        <Link
          href="/wallet"
          className="flex items-center gap-2 rounded-full border border-border bg-background/30 px-4 py-2 text-sm font-semibold text-muted transition hover:border-brand hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Wallet
        </Link>
        <h1 className="font-display text-3xl text-foreground">Withdraw</h1>
      </div>

      <section className="rounded-[28px] border border-border bg-surface-soft p-6 sm:p-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
            Request a payout
          </p>
          <p className="mt-2 text-sm leading-7 text-muted">
            Funds are held immediately on submission. Admin reviews and pays externally. Minimum
            withdrawal is $50. Locked bonus balances cannot be withdrawn until the wager
            requirement is met.
          </p>
        </div>

        <WithdrawForm balance={balance} />
      </section>
    </main>
  );
}
