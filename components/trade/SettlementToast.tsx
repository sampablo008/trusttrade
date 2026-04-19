"use client";

import { useEffect, useState } from "react";
import { formatUsdFromCents } from "@/lib/utils/format";
import type { UserTrade } from "@/types/trade";

interface SettlementToastProps {
  trade: UserTrade;
  onDismiss: () => void;
}

const payoutCents = (t: UserTrade) => Math.round((t.stakeCents * t.payoutBps) / 10_000);
const profitCents = (t: UserTrade) => payoutCents(t) - t.stakeCents;

export default function SettlementToast({ trade, onDismiss }: SettlementToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 4_500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const isWin = trade.outcome === "win";
  const isVoid = trade.outcome === "void";

  return (
    <div
      className={[
        "pointer-events-auto flex min-w-[260px] items-start gap-3 rounded-2xl border px-4 py-3 shadow-xl transition-all duration-300",
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
        isWin
          ? "border-[hsl(var(--color-up))]/40 bg-[hsl(var(--color-up))]/10"
          : isVoid
          ? "border-border bg-surface-soft"
          : "border-[hsl(var(--color-down))]/40 bg-[hsl(var(--color-down))]/10",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
          isWin
            ? "bg-[hsl(var(--color-up))] text-black"
            : isVoid
            ? "bg-border text-foreground"
            : "bg-[hsl(var(--color-down))] text-white",
        ].join(" ")}
      >
        {isWin ? "✓" : isVoid ? "~" : "✗"}
      </div>
      <div className="flex flex-col">
        <p className="text-sm font-bold text-foreground">
          {isWin ? "Trade Won!" : isVoid ? "Trade Voided" : "Trade Lost"}
        </p>
        <p className="text-xs text-muted">
          {trade.tokenSymbol} {trade.direction === "long" ? "Long" : "Short"} ·{" "}
          {formatUsdFromCents(trade.stakeCents)}
        </p>
        {isWin && (
          <p className="mt-0.5 text-xs font-semibold text-[hsl(var(--color-up))]">
            +{formatUsdFromCents(profitCents(trade))}
          </p>
        )}
        {isVoid && (
          <p className="mt-0.5 text-xs text-muted">
            Stake refunded: {formatUsdFromCents(trade.stakeCents)}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => { setVisible(false); setTimeout(onDismiss, 300); }}
        className="ml-auto text-xs text-muted hover:text-foreground"
      >
        ✕
      </button>
    </div>
  );
}
