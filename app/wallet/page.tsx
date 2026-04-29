import { Gift, History } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import BonusTicketsView from "@/components/wallet/BonusTicketsView";
import TokenBalancesPanel from "@/components/wallet/TokenBalancesPanel";
import WalletHero from "@/components/wallet/WalletHero";
import WalletHistoryList from "@/components/wallet/WalletHistoryList";
import { assertUserApi } from "@/lib/auth/assert-user-api";
import { listBonusTickets } from "@/lib/bonus/service";
import { listUserDeposits } from "@/lib/deposits/service";
import { listTransactions } from "@/lib/transactions/service";
import { formatUsdFromCents } from "@/lib/utils/format";
import { getWalletBalances } from "@/lib/wallet-balances/service";
import { listUserWithdrawals } from "@/lib/withdrawals/service";

export default async function WalletPage() {
  const { userId } = await assertUserApi();

  const [balances, depositsResult, withdrawalsResult, bonusResult, txResult] = await Promise.all([
    getWalletBalances(userId),
    listUserDeposits(userId),
    listUserWithdrawals(userId),
    listBonusTickets(userId),
    listTransactions(userId, 20, 0),
  ]);

  return (
    <AppShell>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <WalletHero
          balanceCents={balances.totalUsdValueCents}
          lockedInTradesCents={balances.totalUsdValueCents - balances.totalFreeUsdValueCents}
          lockedBonusCents={0}
          withdrawableCents={balances.totalFreeUsdValueCents}
        />

        <TokenBalancesPanel balances={balances} />

        <div className="grid gap-6 lg:grid-cols-2">
          <WalletHistoryList
            title="Deposits"
            items={depositsResult.items}
            ctaHref="/wallet/deposit"
            ctaLabel="+ New deposit"
          />
          <WalletHistoryList
            title="Withdrawals"
            items={withdrawalsResult.items}
            ctaHref="/wallet/withdraw"
            ctaLabel="+ New withdrawal"
          />
        </div>

        {/* Bonus tickets */}
        <section className="flex flex-col gap-4 rounded-[28px] border border-border bg-surface-soft p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400/10 text-yellow-400">
                <Gift size={16} />
              </div>
              <div>
                <h2 className="font-display text-lg text-foreground">Bonus tickets</h2>
                <p className="text-xs text-muted">
                  Locked bonuses must be wagered 3× before they can be withdrawn.
                </p>
              </div>
            </div>
          </div>
          <BonusTicketsView tickets={bonusResult.items} />
        </section>

        {/* Transaction ledger */}
        <section className="flex flex-col gap-4 rounded-[28px] border border-border bg-surface-soft p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <History size={16} />
              </div>
              <div>
                <h2 className="font-display text-lg text-foreground">Transaction ledger</h2>
                <p className="text-xs text-muted">
                  Full, immutable record of every credit and debit on your account.
                </p>
              </div>
            </div>
            <span className="rounded-full border border-border bg-background/40 px-3 py-1 text-xs font-semibold text-muted">
              {txResult.total} total
            </span>
          </div>

          {txResult.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 bg-background/10 py-10 text-center">
              <p className="text-sm font-semibold text-muted">No transactions yet</p>
              <p className="text-xs text-muted/70">
                Your ledger will populate as you trade or move funds.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border/70 bg-background/25">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Kind</th>
                    <th className="px-4 py-3">Memo</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-right">Balance after</th>
                  </tr>
                </thead>
                <tbody>
                  {txResult.items.map((tx) => (
                    <tr
                      key={tx.id}
                      className="border-b border-border/50 last:border-0 transition hover:bg-background/40"
                    >
                      <td className="px-4 py-3 text-xs text-muted">
                        {new Date(tx.createdAt).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full border border-border bg-background/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground">
                          {tx.kind.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">{tx.memo ?? "—"}</td>
                      <td
                        className={`px-4 py-3 text-right font-mono font-semibold tabular-nums ${
                          tx.amountCents >= 0
                            ? "text-[hsl(var(--color-up))]"
                            : "text-[hsl(var(--color-down))]"
                        }`}
                      >
                        {tx.amountCents >= 0 ? "+" : ""}
                        {formatUsdFromCents(tx.amountCents)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-foreground tabular-nums">
                        {tx.balanceAfterCents === null ? "—" : formatUsdFromCents(tx.balanceAfterCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </AppShell>
  );
}
