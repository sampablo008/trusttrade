"use client";

import Countdown from "@/components/trade/Countdown";
import { formatUsdFromCents } from "@/lib/utils/format";
import { useTradingShellStore } from "@/stores/trading-shell-store";

export default function StickyCountdownBanner() {
  const activeTrades = useTradingShellStore((s) => s.activeTrades);

  // Show the trade expiring soonest
  const urgentTrade = [...activeTrades].sort(
    (a, b) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime(),
  )[0] ?? null;

  if (!urgentTrade) return null;

  const isLong = urgentTrade.direction === "long";

  return (
    <div className="sticky top-0 z-30 -mx-4 flex items-center justify-between gap-3 border-b border-border bg-surface-soft/95 px-4 py-2.5 backdrop-blur-md sm:-mx-6 lg:hidden">
      {/* Direction badge */}
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={[
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
            isLong
              ? "bg-[hsl(var(--color-up))]/15 text-[hsl(var(--color-up))]"
              : "bg-[hsl(var(--color-down))]/15 text-[hsl(var(--color-down))]",
          ].join(" ")}
        >
          {isLong ? "▲" : "▼"}
        </span>
        <p className="truncate text-xs font-semibold text-foreground">
          {urgentTrade.tokenSymbol} {isLong ? "Long" : "Short"}
          <span className="ml-1.5 font-normal text-muted">
            {formatUsdFromCents(urgentTrade.stakeCents)}
          </span>
        </p>
      </div>

      {/* Countdown + trade count pill */}
      <div className="flex shrink-0 items-center gap-2">
        {activeTrades.length > 1 && (
          <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand">
            +{activeTrades.length - 1} more
          </span>
        )}
        <Countdown endTime={urgentTrade.endTime} />
      </div>
    </div>
  );
}
