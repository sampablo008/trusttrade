import { formatUsdFromCents } from "@/lib/utils/format";
import { calcProfit, calcTotalPayout } from "@/lib/utils/money";

interface PayoutPreviewProps {
  stakeCents: number;
  payoutBps: number;
}

export default function PayoutPreview({ stakeCents, payoutBps }: PayoutPreviewProps) {
  const profitCents = calcProfit(stakeCents, payoutBps);
  const totalCents = calcTotalPayout(stakeCents, payoutBps);
  const payoutPercent = ((payoutBps / 10_000) * 100 - 100).toFixed(0);

  return (
    <div className="rounded-2xl border border-brand/20 bg-brand/5 px-4 py-3.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">Total payout</span>
        <span className="text-sm font-bold text-foreground">{formatUsdFromCents(totalCents)}</span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-muted">Profit</span>
        <span className="text-sm font-bold text-brand">
          +{formatUsdFromCents(profitCents)}{" "}
          <span className="text-xs font-semibold opacity-60">({payoutPercent}%)</span>
        </span>
      </div>
    </div>
  );
}
