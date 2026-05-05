import Link from "next/link";
import { ArrowDownToLine, ArrowUpRight } from "lucide-react";
import TransactionStatusPill from "@/components/wallet/TransactionStatusPill";
import { formatTokenAmount, formatUsdFromCents } from "@/lib/utils/format";

interface HistoryItem {
  id: string;
  tokenSymbol: string;
  network: string;
  amount?: number | null;
  amountCents: number;
  usdValueCents?: number | null;
  status: string;
  createdAt: string;
}

interface WalletHistoryListProps {
  title: "Deposits" | "Withdrawals";
  items: HistoryItem[];
  ctaHref: string;
  ctaLabel: string;
}

export default function WalletHistoryList({
  title,
  items,
  ctaHref,
  ctaLabel,
}: WalletHistoryListProps) {
  const isDeposit = title === "Deposits";
  const Icon = isDeposit ? ArrowUpRight : ArrowDownToLine;
  const iconBg = isDeposit
    ? "bg-[hsl(var(--color-up))]/10 text-[hsl(var(--color-up))]"
    : "bg-brand/15 text-brand";

  return (
    <section className="flex flex-col gap-4 rounded-[28px] border border-border bg-surface-soft p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBg}`}>
            <Icon size={16} />
          </div>
          <div>
            <h2 className="font-display text-lg text-foreground">{title}</h2>
            <p className="text-xs text-muted">Last 8 records</p>
          </div>
        </div>
        <Link
          href={ctaHref}
          className="rounded-full border border-border bg-background/40 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-brand hover:text-brand"
        >
          {ctaLabel}
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 bg-background/10 py-10 text-center">
          <p className="text-sm font-semibold text-muted">No {title.toLowerCase()} yet</p>
          <p className="text-xs text-muted/70">Records appear here once created.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.slice(0, 8).map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/30 px-4 py-3 transition hover:border-border"
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
              >
                <span className="font-mono text-[10px] font-bold">
                  {item.tokenSymbol.slice(0, 3)}
                </span>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold text-foreground">
                  {item.tokenSymbol}{" "}
                  <span className="text-muted">· {item.network}</span>
                </span>
                <span className="text-xs text-muted">
                  {new Date(item.createdAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>
              <div className="ml-auto flex flex-col items-end gap-1">
                <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                  {item.amount != null && item.amount > 0
                    ? formatTokenAmount(item.amount, item.tokenSymbol)
                    : formatUsdFromCents(item.amountCents)}
                </span>
                {item.usdValueCents != null && item.usdValueCents > 0 && (
                  <span className="font-mono text-[11px] tabular-nums text-muted">
                    ≈ {formatUsdFromCents(item.usdValueCents)}
                  </span>
                )}
                <TransactionStatusPill status={item.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
