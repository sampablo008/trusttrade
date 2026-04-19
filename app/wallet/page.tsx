import Link from "next/link";
import { ArrowUpRight, ArrowDownToLine, Gift, Receipt, History } from "lucide-react";
import { assertUserApi } from "@/lib/auth/assert-user-api";
import { getBalance } from "@/lib/trades/service";
import { listUserDeposits } from "@/lib/deposits/service";
import { listUserWithdrawals } from "@/lib/withdrawals/service";
import { listBonusTickets } from "@/lib/bonus/service";
import { listTransactions } from "@/lib/transactions/service";
import { formatUsdFromCents } from "@/lib/utils/format";
import BonusTicketsView from "@/components/wallet/BonusTicketsView";

const STATUS_COLORS: Record<string, string> = {
  pending: "text-yellow-400",
  approved: "text-up",
  rejected: "text-down",
  paid: "text-up",
  cancelled: "text-muted",
};

export default async function WalletPage() {
  const { userId } = await assertUserApi();

  const [balance, depositsResult, withdrawalsResult, bonusResult, txResult] = await Promise.all([
    getBalance(userId),
    listUserDeposits(userId),
    listUserWithdrawals(userId),
    listBonusTickets(userId),
    listTransactions(userId, 20, 0),
  ]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Balance overview */}
      <section className="rounded-[28px] border border-border bg-surface-soft p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
          Wallet overview
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1 rounded-[20px] border border-border bg-background/30 p-5">
            <span className="text-xs text-muted">Total balance</span>
            <span className="font-display text-3xl text-foreground">
              {formatUsdFromCents(balance.balanceCents)}
            </span>
          </div>
          <div className="flex flex-col gap-1 rounded-[20px] border border-border bg-background/30 p-5">
            <span className="text-xs text-muted">Locked (trades + bonus)</span>
            <span className="font-display text-3xl text-yellow-400">
              {formatUsdFromCents(balance.lockedInTradesCents + balance.lockedBonusCents)}
            </span>
          </div>
          <div className="flex flex-col gap-1 rounded-[20px] border border-border bg-background/30 p-5">
            <span className="text-xs text-muted">Withdrawable</span>
            <span className="font-display text-3xl text-up">
              {formatUsdFromCents(balance.withdrawableCents)}
            </span>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Link
            href="/wallet/deposit"
            className="flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-background transition hover:opacity-90"
          >
            <ArrowUpRight size={16} />
            Deposit
          </Link>
          <Link
            href="/wallet/withdraw"
            className="flex items-center gap-2 rounded-full border border-border bg-background/30 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-brand"
          >
            <ArrowDownToLine size={16} />
            Withdraw
          </Link>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Deposits history */}
        <section className="flex flex-col gap-4 rounded-[28px] border border-border bg-surface-soft p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt size={18} className="text-brand" />
              <h2 className="font-display text-xl text-foreground">Deposits</h2>
            </div>
            <Link
              href="/wallet/deposit"
              className="text-xs font-semibold text-brand transition hover:underline"
            >
              + New
            </Link>
          </div>

          {depositsResult.items.length === 0 ? (
            <p className="text-sm text-muted">No deposits yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {depositsResult.items.slice(0, 8).map((d) => (
                <div key={d.id} className="flex items-center justify-between py-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-foreground">
                      {d.tokenSymbol} · {d.network}
                    </span>
                    <span className="text-xs text-muted">
                      {new Date(d.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-sm font-semibold text-foreground">
                      {formatUsdFromCents(d.amountCents)}
                    </span>
                    <span className={`text-xs font-semibold capitalize ${STATUS_COLORS[d.status] ?? "text-muted"}`}>
                      {d.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Withdrawals history */}
        <section className="flex flex-col gap-4 rounded-[28px] border border-border bg-surface-soft p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowDownToLine size={18} className="text-brand" />
              <h2 className="font-display text-xl text-foreground">Withdrawals</h2>
            </div>
            <Link
              href="/wallet/withdraw"
              className="text-xs font-semibold text-brand transition hover:underline"
            >
              + New
            </Link>
          </div>

          {withdrawalsResult.items.length === 0 ? (
            <p className="text-sm text-muted">No withdrawals yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {withdrawalsResult.items.slice(0, 8).map((w) => (
                <div key={w.id} className="flex items-center justify-between py-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-foreground">
                      {w.tokenSymbol} · {w.network}
                    </span>
                    <span className="text-xs text-muted">
                      {new Date(w.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-sm font-semibold text-foreground">
                      {formatUsdFromCents(w.amountCents)}
                    </span>
                    <span className={`text-xs font-semibold capitalize ${STATUS_COLORS[w.status] ?? "text-muted"}`}>
                      {w.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Bonus tickets */}
      <section className="flex flex-col gap-4 rounded-[28px] border border-border bg-surface-soft p-6">
        <div className="flex items-center gap-2">
          <Gift size={18} className="text-brand" />
          <h2 className="font-display text-xl text-foreground">Bonus Tickets</h2>
        </div>
        <p className="text-xs text-muted">
          Locked bonuses must be wagered {3}× before they can be withdrawn.
        </p>
        <BonusTicketsView tickets={bonusResult.items} />
      </section>

      {/* Transaction ledger */}
      <section className="flex flex-col gap-4 rounded-[28px] border border-border bg-surface-soft p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={18} className="text-brand" />
            <h2 className="font-display text-xl text-foreground">Transaction Ledger</h2>
          </div>
          <span className="text-xs text-muted">{txResult.total} total</span>
        </div>

        {txResult.items.length === 0 ? (
          <p className="text-sm text-muted">No transactions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Kind</th>
                  <th className="py-2 pr-4">Memo</th>
                  <th className="py-2 text-right">Amount</th>
                  <th className="py-2 pl-4 text-right">Balance after</th>
                </tr>
              </thead>
              <tbody>
                {txResult.items.map((tx) => (
                  <tr key={tx.id} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 pr-4 text-muted">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 pr-4 font-semibold capitalize text-foreground">
                      {tx.kind.replace(/_/g, " ")}
                    </td>
                    <td className="py-2.5 pr-4 text-muted">{tx.memo ?? "—"}</td>
                    <td
                      className={`py-2.5 text-right font-semibold tabular-nums ${
                        tx.amountCents >= 0 ? "text-up" : "text-down"
                      }`}
                    >
                      {tx.amountCents >= 0 ? "+" : ""}
                      {formatUsdFromCents(tx.amountCents)}
                    </td>
                    <td className="py-2.5 pl-4 text-right text-foreground tabular-nums">
                      {formatUsdFromCents(tx.balanceAfterCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
