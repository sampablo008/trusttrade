"use client";

import type { PublicTradePeriod } from "@/types/market";

interface PeriodSelectorProps {
  periods: PublicTradePeriod[];
  selectedId: string | null;
  onSelect: (period: PublicTradePeriod) => void;
  disabled?: boolean;
}

export default function PeriodSelector({
  periods,
  selectedId,
  onSelect,
  disabled,
}: PeriodSelectorProps) {
  const enabled = periods.filter((p) => p.isEnabled);

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Duration</p>
      <div className="grid grid-cols-3 gap-1.5">
        {enabled.map((period) => (
          <button
            key={period.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(period)}
            className={[
              "rounded-xl py-2 text-sm font-semibold transition-all",
              selectedId === period.id
                ? "bg-brand text-white shadow-sm shadow-brand/30"
                : "border border-white/10 bg-background/30 text-muted hover:border-white/20 hover:text-foreground",
              disabled ? "cursor-not-allowed opacity-50" : "",
            ].join(" ")}
          >
            {period.label}
          </button>
        ))}
      </div>
    </div>
  );
}
