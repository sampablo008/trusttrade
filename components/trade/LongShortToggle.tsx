"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import type { TradeDirection } from "@/types/trade";

interface LongShortToggleProps {
  value: TradeDirection;
  onChange: (direction: TradeDirection) => void;
  disabled?: boolean;
}

export default function LongShortToggle({ value, onChange, disabled }: LongShortToggleProps) {
  return (
    <div className="grid grid-cols-2 gap-2" role="group" aria-label="Trade direction">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("long")}
        className={[
          "flex flex-col items-center gap-1.5 rounded-2xl border py-3.5 text-sm font-bold transition-all",
          value === "long"
            ? "border-brand/50 bg-brand/5 text-brand shadow-lg shadow-brand/10"
            : "border-white/10 bg-background/30 text-muted hover:border-white/20 hover:text-foreground",
          disabled ? "cursor-not-allowed opacity-50" : "",
        ].join(" ")}
      >
        <TrendingUp size={18} />
        Long
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("short")}
        className={[
          "flex flex-col items-center gap-1.5 rounded-2xl border py-3.5 text-sm font-bold transition-all",
          value === "short"
            ? "border-brand/50 bg-brand/5 text-brand shadow-lg shadow-brand/10"
            : "border-white/10 bg-background/30 text-muted hover:border-white/20 hover:text-foreground",
          disabled ? "cursor-not-allowed opacity-50" : "",
        ].join(" ")}
      >
        <TrendingDown size={18} />
        Short
      </button>
    </div>
  );
}
