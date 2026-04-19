"use client";

import type { TradeDirection } from "@/types/trade";

interface LongShortToggleProps {
  value: TradeDirection;
  onChange: (direction: TradeDirection) => void;
  disabled?: boolean;
}

export default function LongShortToggle({ value, onChange, disabled }: LongShortToggleProps) {
  return (
    <div
      className="grid grid-cols-2 rounded-2xl border border-border bg-background/40 p-1"
      role="group"
      aria-label="Trade direction"
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("long")}
        className={[
          "rounded-xl py-2.5 text-sm font-semibold transition-all",
          value === "long"
            ? "bg-[hsl(var(--color-up))] text-black shadow-sm"
            : "text-muted hover:text-foreground",
          disabled ? "cursor-not-allowed opacity-50" : "",
        ].join(" ")}
      >
        ▲ Long
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("short")}
        className={[
          "rounded-xl py-2.5 text-sm font-semibold transition-all",
          value === "short"
            ? "bg-[hsl(var(--color-down))] text-white shadow-sm"
            : "text-muted hover:text-foreground",
          disabled ? "cursor-not-allowed opacity-50" : "",
        ].join(" ")}
      >
        ▼ Short
      </button>
    </div>
  );
}
