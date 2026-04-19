import { formatUsdFromCents } from "@/lib/utils/format";

interface PayoutPreviewProps {
  stakeCents: number;
  payoutBps: number;
  direction: "long" | "short";
}

export default function PayoutPreview({ stakeCents, payoutBps, direction }: PayoutPreviewProps) {
  const profitCents = Math.round((stakeCents * payoutBps) / 10_000) - stakeCents;
  const totalCents = stakeCents + profitCents;
  const payoutPercent = ((payoutBps / 10_000) * 100 - 100).toFixed(0);

  return (
    <div className="rounded-2xl border border-border bg-background/20 px-4 py-3">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>Payout</span>
        <span className="font-semibold text-foreground">
          {formatUsdFromCents(totalCents)}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between text-xs text-muted">
        <span>Profit</span>
        <span
          className={
            direction === "long"
              ? "font-semibold text-[hsl(var(--color-up))]"
              : "font-semibold text-[hsl(var(--color-down))]"
          }
        >
          +{formatUsdFromCents(profitCents)} ({payoutPercent}%)
        </span>
      </div>
    </div>
  );
}
