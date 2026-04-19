"use client";

import { useEffect, useRef, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatUsdFromCents } from "@/lib/utils/format";
import type { UserTrade } from "@/types/trade";

interface PositionRowProps {
  trade: UserTrade;
  onExpire?: (tradeId: string) => void;
}

const calcPayout = (trade: UserTrade) =>
  Math.round((trade.stakeCents * trade.payoutBps) / 10_000);

const formatMs = (ms: number): string => {
  if (ms <= 0) return "0:00";
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const formatPrice = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PositionRow({ trade, onExpire }: PositionRowProps) {
  const isLong = trade.direction === "long";
  const startMs = new Date(trade.startedAt).getTime();
  const endMs = new Date(trade.endTime).getTime();
  const totalDuration = Math.max(endMs - startMs, 1);

  const [remainingMs, setRemainingMs] = useState(() => endMs - Date.now());
  const expiredRef = useRef(false);

  useEffect(() => {
    expiredRef.current = false;
    const tick = () => {
      const remaining = endMs - Date.now();
      setRemainingMs(remaining);
      if (remaining <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire?.(trade.id);
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endMs, onExpire, trade.id]);

  const isExpired = remainingMs <= 0;
  const isUrgent = remainingMs <= 10_000 && !isExpired;
  const elapsed = Math.max(0, Date.now() - startMs);
  const progress = Math.min(100, (elapsed / totalDuration) * 100);

  const payout = calcPayout(trade);
  const profit = payout - trade.stakeCents;
  const profitPct = ((trade.payoutBps / 10_000) * 100 - 100).toFixed(0);

  return (
    <article
      className={[
        "relative overflow-hidden rounded-2xl border p-4 transition-all duration-500",
        isUrgent
          ? "border-down/50 bg-down/5 shadow-sm shadow-down/10"
          : isLong
          ? "border-up/20 bg-up/[0.03]"
          : "border-down/20 bg-down/[0.03]",
      ].join(" ")}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        {/* Left: direction icon + info */}
        <div className="flex items-center gap-3">
          <div
            className={[
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
              isUrgent
                ? "bg-down/15 text-down"
                : isLong
                ? "bg-up/10 text-up"
                : "bg-down/10 text-down",
            ].join(" ")}
          >
            {isLong ? <TrendingUp size={16} strokeWidth={2.5} /> : <TrendingDown size={16} strokeWidth={2.5} />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">{trade.tokenSymbol}</span>
              <span
                className={[
                  "rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                  isLong ? "bg-up/10 text-up" : "bg-down/10 text-down",
                ].join(" ")}
              >
                {isLong ? "Long" : "Short"}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted">
              Entry{" "}
              <span className="font-semibold text-foreground">
                {formatPrice(trade.entryPriceCents)}
              </span>
              <span className="mx-1.5 opacity-25">·</span>
              Stake{" "}
              <span className="font-semibold text-foreground">
                {formatUsdFromCents(trade.stakeCents)}
              </span>
            </p>
          </div>
        </div>

        {/* Right: payout */}
        <div className="flex shrink-0 flex-col items-end">
          <span className="text-sm font-bold text-up">
            {formatUsdFromCents(payout)}
          </span>
          <span className="text-[10px] font-semibold text-up/60">
            +{formatUsdFromCents(profit)}&nbsp;({profitPct}%)
          </span>
        </div>
      </div>

      {/* Time progress + countdown */}
      <div className="mt-3.5 flex items-center gap-3">
        <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/8">
          <div
            className={[
              "absolute inset-y-0 left-0 rounded-full transition-[width] duration-1000",
              isUrgent ? "bg-down" : isLong ? "bg-up/70" : "bg-down/70",
            ].join(" ")}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span
          className={[
            "min-w-[52px] text-right font-mono text-xs font-bold tabular-nums",
            isExpired ? "text-muted" : isUrgent ? "animate-pulse text-down" : "text-foreground/80",
          ].join(" ")}
        >
          {isExpired ? "Settling…" : formatMs(remainingMs)}
        </span>
      </div>
    </article>
  );
}
