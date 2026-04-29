"use client";

import { useEffect, useState } from "react";
import { formatTokenAmount, formatUsdFromCents } from "@/lib/utils/format";

function buildChips(minCents: number, maxCents: number): number[] {
  const clampedMax = Math.max(minCents, maxCents);
  const step = (clampedMax - minCents) / 5;
  const raw = [
    minCents,
    Math.round((minCents + step) / 100) * 100,
    Math.round((minCents + step * 2) / 100) * 100,
    Math.round((minCents + step * 3) / 100) * 100,
    Math.round((minCents + step * 4) / 100) * 100,
    clampedMax,
  ];
  return [...new Set(raw)];
}

interface AmountInputProps {
  valueCents: number;
  onChange: (cents: number) => void;
  minCents: number;
  maxCents: number;
  availableCents: number;
  tokenSymbol: string;
  tokenDecimals: number;
  tokenFreeBalance: number;
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
  tokenSymbol,
  tokenDecimals,
  tokenFreeBalance,
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

  const exceedsBalance = valueCents > availableCents;
  const belowMin = valueCents > 0 && valueCents < minCents;
  const aboveMax = valueCents > 0 && valueCents > maxCents;
  const isInvalid = belowMin || aboveMax || exceedsBalance;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Amount</p>
        <p className="text-xs text-muted text-right">
          Available:{" "}
          <span className="font-semibold text-foreground">
            {formatTokenAmount(tokenFreeBalance, tokenSymbol, tokenDecimals)}
          </span>{" "}
          <span className="text-muted">(≈ {formatUsdFromCents(availableCents)})</span>
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
        {buildChips(minCents, maxCents).map((amount, i, arr) => {
          const isLast = i === arr.length - 1;
          const unreachable = amount > availableCents;
          const label = isLast ? "Max" : formatUsdFromCents(amount);
          return (
            <button
              key={amount}
              type="button"
              disabled={disabled || unreachable}
              onClick={() => onChange(amount)}
              className={[
                "rounded-xl py-1.5 text-xs font-semibold transition-all",
                valueCents === amount
                  ? "border border-brand/50 bg-brand/10 text-brand"
                  : "border border-white/10 bg-background/30 text-muted hover:border-white/20 hover:text-foreground",
                disabled || unreachable ? "cursor-not-allowed opacity-40" : "",
              ].join(" ")}
            >
              {label}
            </button>
          );
        })}
      </div>

      {exceedsBalance && (
        <p className="text-xs font-semibold text-down">
          Insufficient {tokenSymbol} balance — max {formatUsdFromCents(availableCents)} (
          {formatTokenAmount(tokenFreeBalance, tokenSymbol, tokenDecimals)}).
        </p>
      )}
      {!exceedsBalance && belowMin && (
        <p className="text-xs text-down">
          Below minimum stake ({formatUsdFromCents(minCents)}).
        </p>
      )}
      {!exceedsBalance && !belowMin && aboveMax && (
        <p className="text-xs text-down">
          Above maximum stake ({formatUsdFromCents(maxCents)}).
        </p>
      )}
    </div>
  );
}
