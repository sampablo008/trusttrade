"use client";

import PositionRow from "@/components/trade/PositionRow";
import { useTradingShellStore } from "@/stores/trading-shell-store";
import { Activity } from "lucide-react";

interface ActivePositionsListProps {
  onTradeExpire?: (tradeId: string) => void;
}

export default function ActivePositionsList({ onTradeExpire }: ActivePositionsListProps) {
  const { activeTrades } = useTradingShellStore();

  const sorted = [...activeTrades].sort(
    (a, b) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime(),
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={13} className="text-brand" />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            Active positions
          </p>
        </div>
        {sorted.length > 0 && (
          <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-bold text-brand">
            {sorted.length}
          </span>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/8 bg-background/10 py-10 text-center">
          <Activity size={22} className="text-muted/30" />
          <p className="text-sm font-semibold text-muted">No active positions</p>
          <p className="text-xs text-muted/60">Place a trade to see it here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((trade) => (
            <PositionRow key={trade.id} trade={trade} onExpire={onTradeExpire} />
          ))}
        </div>
      )}
    </div>
  );
}
