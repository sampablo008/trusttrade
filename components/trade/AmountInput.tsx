"use client";

import { formatUsdFromCents } from "@/lib/utils/format";

const QUICK_AMOUNTS_CENTS = [1_000, 5_000, 10_000, 25_000, 50_000, 100_000];

interface AmountInputProps {
  valueCents: number;
  onChange: (cents: number) => void;
  minCents: number;
  maxCents: number;
  availableCents: number;
  disabled?: boolean;
}

export default function AmountInput({
  valueCents,
  onChange,
  minCents,
  maxCents,
  availableCents,
  disabled,
}: AmountInputProps) {
  const displayValue = (valueCents / 100).toFixed(2);

  const handleInput = (raw: string) => {
    const numeric = parseFloat(raw);
    if (isNaN(numeric)) return;
    onChange(Math.round(numeric * 100));
  };

  const clampedMax = Math.min(maxCents, availableCents);
  const isInvalid = valueCents < minCents || valueCents > clampedMax;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Amount</p>
        <p className="text-xs text-muted">
          Available: <span className="font-semibold text-foreground">{formatUsdFromCents(availableCents)}</span>
        </p>
      </div>

      <div
        className={[
          "flex items-center rounded-2xl border bg-background/40 px-4 py-3 transition-colors",
          isInvalid && valueCents > 0 ? "border-[hsl(var(--color-down))]" : "border-border focus-within:border-brand",
        ].join(" ")}
      >
        <span className="mr-2 text-sm font-semibold text-muted">$</span>
        <input
          type="number"
          step="0.01"
          min={(minCents / 100).toFixed(2)}
          max={(clampedMax / 100).toFixed(2)}
          value={displayValue}
          onChange={(e) => handleInput(e.target.value)}
          disabled={disabled}
          className="flex-1 bg-transparent text-sm font-semibold text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {QUICK_AMOUNTS_CENTS.filter((a) => a <= clampedMax).map((amount) => (
          <button
            key={amount}
            type="button"
            disabled={disabled}
            onClick={() => onChange(amount)}
            className={[
              "rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all",
              valueCents === amount
                ? "border-brand bg-brand/10 text-brand"
                : "border-border text-muted hover:text-foreground",
              disabled ? "cursor-not-allowed opacity-40" : "",
            ].join(" ")}
          >
            {formatUsdFromCents(amount)}
          </button>
        ))}
        <button
          type="button"
          disabled={disabled || availableCents < minCents}
          onClick={() => onChange(clampedMax)}
          className={[
            "rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all",
            valueCents === clampedMax
              ? "border-brand bg-brand/10 text-brand"
              : "border-border text-muted hover:text-foreground",
            disabled || availableCents < minCents ? "cursor-not-allowed opacity-40" : "",
          ].join(" ")}
        >
          Max
        </button>
      </div>
    </div>
  );
}
