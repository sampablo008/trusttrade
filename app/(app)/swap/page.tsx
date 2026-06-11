import SwapForm from "@/components/wallet/SwapForm";
import { assertUserApi } from "@/lib/auth/assert-user-api";
import { listMarketTokens } from "@/lib/markets/service";
import { getWalletBalances } from "@/lib/wallet-balances/service";

export default async function SwapPage() {
  const { userId } = await assertUserApi();

  const [tokensResult, balances] = await Promise.all([
    listMarketTokens(),
    getWalletBalances(userId),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-16">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand">
          Convert assets
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Swap tokens
        </h1>
        <p className="max-w-2xl text-sm text-muted">
          Swap between any of your held tokens. Trades are funded from your USDT
          balance — convert into USDT first if you want to place trades. Live rates
          from CoinGecko; per-token fee charged on the side you swap from.
        </p>
      </header>

      <section className="rounded-[28px] border border-border bg-surface-soft p-6 sm:p-8">
        <SwapForm tokens={tokensResult.items} balances={balances} />
      </section>
    </main>
  );
}
