import { formatUsdFromCents } from "@/lib/utils/format";
import { calcProfit, calcTotalPayout } from "@/lib/utils/money";

interface PayoutPreviewProps {
  stakeCents: number;
  payoutBps: number;
  payoutMinBps?: number;
  payoutMaxBps?: number;
}

const profitPercent = (bps: number) => ((bps / 10_000) * 100 - 100).toFixed(0);

export default function PayoutPreview({
  stakeCents,
  payoutBps,
  payoutMinBps,
  payoutMaxBps,
}: PayoutPreviewProps) {
  const minBps = payoutMinBps ?? payoutBps;
  const maxBps = payoutMaxBps ?? payoutBps;
  const isRange = maxBps > minBps;

  const minProfitCents = calcProfit(stakeCents, minBps);
  const maxProfitCents = calcProfit(stakeCents, maxBps);
  const minTotalCents = calcTotalPayout(stakeCents, minBps);
  const maxTotalCents = calcTotalPayout(stakeCents, maxBps);

  return (
    <div className="flex flex-col gap-3.5 rounded-2xl border border-brand/20 bg-brand/5 px-5 py-5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">Total payout</span>
        <span className="text-base font-bold text-foreground tabular-nums">
          {isRange
            ? `${formatUsdFromCents(minTotalCents)} – ${formatUsdFromCents(maxTotalCents)}`
            : formatUsdFromCents(minTotalCents)}
        </span>
      </div>
      <div className="h-px bg-brand/10" />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">Profit</span>
        <span className="text-base font-bold text-brand tabular-nums">
          {isRange
            ? `+${formatUsdFromCents(minProfitCents)} – ${formatUsdFromCents(maxProfitCents)}`
            : `+${formatUsdFromCents(minProfitCents)}`}{" "}
          <span className="text-xs font-semibold opacity-60">
            ({isRange ? `${profitPercent(minBps)}–${profitPercent(maxBps)}%` : `${profitPercent(minBps)}%`})
          </span>
        </span>
      </div>
      {isRange ? (
        <p className="text-[10px] leading-relaxed text-muted/80">
          Actual rate is sampled randomly per trade within this range.
        </p>
      ) : null}
    </div>
  );
}
