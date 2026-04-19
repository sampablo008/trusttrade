"use client";

import Countdown from "@/components/trade/Countdown";
import { formatUsdFromCents } from "@/lib/utils/format";
import type { UserTrade } from "@/types/trade";

interface PositionRowProps {
  trade: UserTrade;
  onExpire?: (tradeId: string) => void;
}

const payoutCents = (trade: UserTrade) =>
  Math.round((trade.stakeCents * trade.payoutBps) / 10_000);

export default function PositionRow({ trade, onExpire }: PositionRowProps) {
  const isLong = trade.direction === "long";

  return (
    <article className="flex items-center justify-between rounded-2xl border border-border bg-background/30 px-4 py-3">
      <div className="flex items-center gap-3">
        <div
          className={[
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
            isLong
              ? "bg-[hsl(var(--color-up))]/15 text-[hsl(var(--color-up))]"
              : "bg-[hsl(var(--color-down))]/15 text-[hsl(var(--color-down))]",
          ].join(" ")}
        >
          {isLong ? "▲" : "▼"}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            {trade.tokenSymbol}
            <span className="ml-1.5 text-xs font-normal text-muted">
              {isLong ? "Long" : "Short"}
            </span>
          </p>
          <p className="text-xs text-muted">
            Stake: <span className="text-foreground">{formatUsdFromCents(trade.stakeCents)}</span>
            <span className="mx-1.5 text-border">·</span>
            Win: <span className="text-[hsl(var(--color-up))]">{formatUsdFromCents(payoutCents(trade))}</span>
          </p>
        </div>
      </div>

      <Countdown
        endTime={trade.endTime}
        onExpire={() => onExpire?.(trade.id)}
      />
    </article>
  );
}
