"use client";

import { useEffect, useRef, useState } from "react";
import { formatUsdFromCents } from "@/lib/utils/format";
import { useTradingShellStore } from "@/stores/trading-shell-store";

export default function BalanceHeader() {
  const balance = useTradingShellStore((s) => s.balance);
  const prevBalance = useRef<number | null>(null);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  const balanceCents = balance?.balanceCents ?? 0;

  useEffect(() => {
    if (prevBalance.current === null) {
      prevBalance.current = balanceCents;
      return;
    }
    if (balanceCents > prevBalance.current) {
      setFlash("up");
    } else if (balanceCents < prevBalance.current) {
      setFlash("down");
    }
    prevBalance.current = balanceCents;
    const t = setTimeout(() => setFlash(null), 800);
    return () => clearTimeout(t);
  }, [balanceCents]);

  if (!balance) return null;

  const available = Math.max(
    balance.balanceCents - balance.lockedInTradesCents - balance.lockedBonusCents,
    0,
  );

  return (
    <div className="flex flex-wrap items-center gap-4 text-sm">
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted">Balance</span>
        <span
          className={[
            "font-mono font-semibold transition-colors duration-300",
            flash === "up"
              ? "text-[hsl(var(--color-up))]"
              : flash === "down"
              ? "text-[hsl(var(--color-down))]"
              : "text-foreground",
          ].join(" ")}
        >
          {formatUsdFromCents(balanceCents)}
        </span>
      </div>

      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted">Available</span>
        <span className="font-mono font-semibold text-foreground">
          {formatUsdFromCents(available)}
        </span>
      </div>

      {balance.lockedInTradesCents > 0 && (
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted">In trades</span>
          <span className="font-mono font-semibold text-muted">
            {formatUsdFromCents(balance.lockedInTradesCents)}
          </span>
        </div>
      )}
    </div>
  );
}
