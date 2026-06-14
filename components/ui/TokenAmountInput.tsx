"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { formatTokenAmount, formatUsdFromCents } from "@/lib/utils/format";
import { Input } from "./Input";

type Mode = "token" | "usd";

export interface TokenAmountInputProps {
  id?: string;
  /** Token amount as a string — the source of truth, owned by the parent. */
  value: string;
  /** Always called with a TOKEN amount string, regardless of entry mode. */
  onChange: (tokenAmount: string) => void;
  symbol: string;
  decimals?: number;
  /**
   * USD cents per 1 whole token. When null/0 the USD toggle is hidden and the
   * field behaves as a plain token input.
   */
  priceCents?: number | null;
  invalid?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * Token amount field with an optional USD ⇄ token entry toggle. In USD mode the
 * admin/user types a dollar value and we convert to the token amount via
 * `priceCents`; the parent always receives a token amount so submit logic is
 * unchanged. A live "≈" preview shows the converted other-side value.
 */
export function TokenAmountInput({
  id,
  value,
  onChange,
  symbol,
  decimals = 8,
  priceCents,
  invalid,
  disabled,
  placeholder,
  className,
}: TokenAmountInputProps) {
  const hasPrice = priceCents != null && priceCents > 0;
  const [mode, setMode] = useState<Mode>("token");
  const [usdStr, setUsdStr] = useState("");

  const round = (n: number) => {
    if (!Number.isFinite(n)) return "";
    return String(Number(n.toFixed(decimals)));
  };

  const tokenNum = Number.parseFloat(value);
  const usdNum = Number.parseFloat(usdStr);

  const switchTo = (next: Mode) => {
    if (next === mode) return;
    if (next === "usd" && hasPrice) {
      // Seed the USD field from the current token amount.
      setUsdStr(
        Number.isFinite(tokenNum) && tokenNum > 0
          ? String(Number(((tokenNum * priceCents!) / 100).toFixed(2)))
          : "",
      );
    }
    setMode(next);
  };

  const onUsdChange = (raw: string) => {
    setUsdStr(raw);
    const usd = Number.parseFloat(raw);
    onChange(Number.isFinite(usd) ? round((usd * 100) / priceCents!) : "");
  };

  const effectiveMode: Mode = hasPrice ? mode : "token";

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {hasPrice && (
        <div className="inline-flex items-center self-start rounded-full border border-border bg-background/40 p-0.5 text-[11px] font-semibold uppercase tracking-wide">
          {(
            [
              { id: "token" as Mode, label: symbol || "Token" },
              { id: "usd" as Mode, label: "USD" },
            ]
          ).map((opt) => {
            const active = effectiveMode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => switchTo(opt.id)}
                aria-pressed={active}
                className={cn(
                  "rounded-full px-2.5 py-0.5 transition",
                  active
                    ? "bg-brand text-background"
                    : "text-muted hover:text-foreground",
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="relative">
        <Input
          id={id}
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          value={effectiveMode === "usd" ? usdStr : value}
          onChange={(e) =>
            effectiveMode === "usd"
              ? onUsdChange(e.target.value)
              : onChange(e.target.value)
          }
          invalid={invalid}
          disabled={disabled}
          placeholder={placeholder ?? (effectiveMode === "usd" ? "0.00" : `0`)}
          className="pr-16"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-brand/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-brand">
          {effectiveMode === "usd" ? "USD" : symbol}
        </span>
      </div>

      {hasPrice && effectiveMode === "usd" && Number.isFinite(usdNum) && usdNum > 0 && (
        <p className="px-1 text-[11px] text-muted">
          ≈ {formatTokenAmount(Number(value) || 0, symbol, decimals)}
        </p>
      )}
      {hasPrice && effectiveMode === "token" && Number.isFinite(tokenNum) && tokenNum > 0 && (
        <p className="px-1 text-[11px] text-muted">
          ≈ {formatUsdFromCents(Math.round(tokenNum * priceCents!))}
        </p>
      )}
    </div>
  );
}
