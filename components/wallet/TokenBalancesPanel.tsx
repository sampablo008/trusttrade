import Link from "next/link";
import { ArrowLeftRight, Wallet } from "lucide-react";
import CoinIcon from "@/components/ui/CoinIcon";
import { formatTokenAmount, formatUsdFromCents } from "@/lib/utils/format";
import type { WalletBalancesResult } from "@/types/wallet-balance";

interface Props {
  balances: WalletBalancesResult;
}

export default function TokenBalancesPanel({ balances }: Props) {
  const hasTokens = balances.tokens.length > 0;

  return (
    <section className="flex flex-col gap-4 rounded-[28px] border border-border bg-surface-soft p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Wallet size={16} />
          </div>
          <div>
            <h2 className="font-display text-lg text-foreground">Token balances</h2>
            <p className="text-xs text-muted">
              Per-token wallet balances. Swap into USDT to fund trades.
            </p>
          </div>
        </div>
        {/* <Link
          href="/wallet/swap"
          className="flex items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-brand hover:text-brand"
        >
          <ArrowLeftRight size={12} />
          Swap
        </Link> */}
      </div>

      {!hasTokens ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 bg-background/10 py-10 text-center">
          <p className="text-sm font-semibold text-muted">No token balances yet</p>
          <p className="text-xs text-muted/70">
            Approved deposits credit native tokens here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/25">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                <th className="px-4 py-3">Token</th>
                <th className="px-4 py-3 text-right">Free</th>
                <th className="px-4 py-3 text-right">Locked</th>
                <th className="px-4 py-3 text-right">USD value</th>
              </tr>
            </thead>
            <tbody>
              {balances.tokens.map((t) => (
                <tr
                  key={t.tokenId}
                  className="border-b border-border/50 last:border-0 transition hover:bg-background/40"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <CoinIcon symbol={t.symbol} iconPath={t.iconPath} size={18} />
                      <div className="flex flex-col leading-tight">
                        <span className="text-sm font-semibold text-foreground">
                          {t.symbol}
                        </span>
                        <span className="text-[11px] text-muted">{t.name}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-foreground tabular-nums">
                    {formatTokenAmount(t.balance, t.symbol, t.decimals)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-yellow-400 tabular-nums">
                    {t.lockedBalance > 0
                      ? formatTokenAmount(t.lockedBalance, t.symbol, t.decimals)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-muted tabular-nums">
                    {formatUsdFromCents(t.usdValueCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
