import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import DepositForm from "@/components/wallet/DepositForm";
import DepositInfoPanel from "@/components/wallet/DepositInfoPanel";
import { assertUserApi } from "@/lib/auth/assert-user-api";
import { listMarketTokens } from "@/lib/markets/service";
import { listPublicWallets } from "@/lib/wallets/service";

export default async function DepositPage() {
  await assertUserApi();

  const [walletsResult, tokensResult] = await Promise.all([
    listPublicWallets(),
    listMarketTokens(),
  ]);

  const supportedSymbols = [...new Set(walletsResult.items.map((w) => w.tokenSymbol))];
  const supportedLabel =
    supportedSymbols.length === 0
      ? "supported crypto"
      : supportedSymbols.length === 1
      ? supportedSymbols[0]
      : supportedSymbols.length === 2
      ? `${supportedSymbols[0]} or ${supportedSymbols[1]}`
      : `${supportedSymbols.slice(0, -1).join(", ")}, or ${supportedSymbols.at(-1)}`;

  return (
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
          <span className="font-semibold text-foreground">Deposit</span>
        </nav>
      </div>

      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand">
          Fund account
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Deposit crypto
        </h1>
        <p className="max-w-2xl text-sm text-muted">
          Send {supportedLabel} to the address below, upload a screenshot of your transaction,
          and submit. Admin reviews within a few hours.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="rounded-[28px] border border-border bg-surface-soft p-6 sm:p-8">
          <DepositForm
            wallets={walletsResult.items}
            tokens={tokensResult.items}
          />
        </section>

        <DepositInfoPanel />
      </div>
    </main>
  );
}
