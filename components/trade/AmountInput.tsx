"use client";

import { useEffect, useState } from "react";
import { formatUsdFromCents } from "@/lib/utils/format";

const QUICK_AMOUNTS_CENTS = [1_000, 5_000, 10_000, 25_000, 50_000];

interface AmountInputProps {
  valueCents: number;
  onChange: (cents: number) => void;
  minCents: number;
  maxCents: number;
  availableCents: number;
  disabled?: boolean;
}

const centsToInput = (cents: number): string =>
  cents === 0 ? "" : (cents / 100).toString();

export default function AmountInput({
  valueCents,
  onChange,
  minCents,
  maxCents,
  availableCents,
  disabled,
}: AmountInputProps) {
  const [raw, setRaw] = useState<string>(() => centsToInput(valueCents));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (focused) return;
    const parsed = parseFloat(raw);
    const parsedCents = Math.round((isNaN(parsed) ? 0 : parsed) * 100);
    if (parsedCents !== valueCents) {
      setRaw(centsToInput(valueCents));
    }
  }, [valueCents, raw, focused]);

  const handleInput = (v: string) => {
    if (!/^\d*\.?\d{0,2}$/.test(v)) return;
    setRaw(v);
    if (v === "" || v === ".") {
      onChange(0);
      return;
    }
    const n = parseFloat(v);
    onChange(isNaN(n) ? 0 : Math.round(n * 100));
  };

  const handleBlur = () => {
    setFocused(false);
    if (raw === "" || raw === ".") {
      setRaw("");
      return;
    }
    const n = parseFloat(raw);
    if (!isNaN(n)) setRaw(n.toFixed(2));
  };

  const clampedMax = Math.min(maxCents, availableCents);
  const isInvalid = valueCents > 0 && (valueCents < minCents || valueCents > clampedMax);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Amount</p>
        <p className="text-xs text-muted">
          Available:{" "}
          <span className="font-semibold text-foreground">{formatUsdFromCents(availableCents)}</span>
        </p>
      </div>

      <div
        className={[
          "flex items-center gap-2 rounded-2xl border bg-background/40 px-4 py-3.5 transition-colors",
          isInvalid
            ? "border-down/60"
            : "border-white/10 focus-within:border-brand/60",
        ].join(" ")}
      >
        <span className="text-base font-bold text-muted">$</span>
        <input
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={raw}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          disabled={disabled}
          className="flex-1 bg-transparent text-base font-bold text-foreground placeholder:text-muted outline-none"
        />
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {QUICK_AMOUNTS_CENTS.filter((a) => a <= maxCents).map((amount) => (
          <button
            key={amount}
            type="button"
            disabled={disabled}
            onClick={() => onChange(amount)}
            className={[
              "rounded-xl py-1.5 text-xs font-semibold transition-all",
              valueCents === amount
                ? "border border-brand/50 bg-brand/10 text-brand"
                : "border border-white/10 bg-background/30 text-muted hover:border-white/20 hover:text-foreground",
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
            "rounded-xl py-1.5 text-xs font-semibold transition-all",
            valueCents === clampedMax && clampedMax > 0
              ? "border border-brand/50 bg-brand/10 text-brand"
              : "border border-white/10 bg-background/30 text-muted hover:border-white/20 hover:text-foreground",
            disabled || availableCents < minCents ? "cursor-not-allowed opacity-40" : "",
          ].join(" ")}
        >
          Max
        </button>
      </div>
    </div>
  );
}
