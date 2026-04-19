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
      <div className="flex flex-wrap gap-2">
        {enabled.map((period) => (
          <button
            key={period.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(period)}
            className={[
              "rounded-xl border px-3 py-1.5 text-sm font-semibold transition-all",
              selectedId === period.id
                ? "border-brand bg-brand/10 text-brand"
                : "border-border text-muted hover:border-border/80 hover:text-foreground",
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
