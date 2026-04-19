import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { assertUserApi } from "@/lib/auth/assert-user-api";
import { listPublicWallets } from "@/lib/wallets/service";
import { listMarketTokens } from "@/lib/markets/service";
import DepositForm from "@/components/wallet/DepositForm";

export default async function DepositPage() {
  await assertUserApi();

  const [walletsResult, tokensResult] = await Promise.all([
    listPublicWallets(),
    listMarketTokens(),
  ]);

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
        <h1 className="font-display text-3xl text-foreground">Deposit</h1>
      </div>

      <section className="rounded-[28px] border border-border bg-surface-soft p-6 sm:p-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
            Fund your account
          </p>
          <p className="mt-2 text-sm leading-7 text-muted">
            Send crypto to the address below, upload your screenshot, and submit. Admin reviews
            within a few hours.
          </p>
        </div>

        <DepositForm
          wallets={walletsResult.items}
          tokens={tokensResult.items}
        />
      </section>
    </main>
  );
}
