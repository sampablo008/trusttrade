"use client";

import PositionRow from "@/components/trade/PositionRow";
import { useTradingShellStore } from "@/stores/trading-shell-store";

interface ActivePositionsListProps {
  onTradeExpire?: (tradeId: string) => void;
}

export default function ActivePositionsList({ onTradeExpire }: ActivePositionsListProps) {
  const { activeTrades } = useTradingShellStore();

  const sorted = [...activeTrades].sort(
    (a, b) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime(),
  );

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-[28px] border border-dashed border-border/60 bg-background/10 py-10 text-center">
        <p className="text-sm font-semibold text-muted">No active positions</p>
        <p className="text-xs text-muted/70">Place a trade to see it here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
          Active positions
        </p>
        <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
          {sorted.length}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {sorted.map((trade) => (
          <PositionRow key={trade.id} trade={trade} onExpire={onTradeExpire} />
        ))}
      </div>
    </div>
  );
}
