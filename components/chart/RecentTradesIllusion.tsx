"use client";

import { useEffect, useRef, useState } from "react";

interface RecentTradesIllusionProps {
  lastPriceCents: number;
  symbol: string;
}

interface Trade {
  amount: string;
  id: number;
  price: string;
  side: "buy" | "sell";
  time: string;
}

const ROWS = 16;
const PRICE_DECIMALS = 4;
const TICK_MS = 1400;

function clockNow(): string {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

function makeTrade(lastPriceCents: number, id: number): Trade {
  const side: Trade["side"] = Math.random() < 0.5 ? "buy" : "sell";
  // ±0.05% jitter around last price — kept in float for distinct 4-decimal prices
  const price = (lastPriceCents / 100) * (1 + (Math.random() - 0.5) * 0.001);
  const amount = 0.05 + Math.random() * 3;
  return {
    amount: amount.toFixed(4),
    id,
    price: price.toFixed(PRICE_DECIMALS),
    side,
    time: clockNow(),
  };
}

export default function RecentTradesIllusion({ lastPriceCents, symbol }: RecentTradesIllusionProps) {
  // Empty on first paint → seeded in effect, so SSR/CSR markup matches (no hydration mismatch)
  const [trades, setTrades] = useState<Trade[]>([]);
  const idRef = useRef(0);
  const priceRef = useRef(lastPriceCents);

  // Keep the latest price available to the interval without re-arming it
  useEffect(() => {
    priceRef.current = lastPriceCents;
  }, [lastPriceCents]);

  useEffect(() => {
    setTrades(
      Array.from({ length: ROWS }, () => makeTrade(priceRef.current, idRef.current++)),
    );

    const timer = setInterval(() => {
      setTrades((prev) => [
        makeTrade(priceRef.current, idRef.current++),
        ...prev.slice(0, ROWS - 1),
      ]);
    }, TICK_MS);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface-soft">
      <div className="border-b border-border px-4 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          Recent trades — {symbol}/USDT
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-2 py-2">
        <div className="grid grid-cols-3 px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
          <span>Price (USD)</span>
          <span className="text-right">Amount</span>
          <span className="text-right">Time</span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {trades.map((t, i) => (
            <div
              key={t.id}
              className={[
                "grid grid-cols-3 items-center px-2 py-[3px]",
                i === 0 ? "tape-in" : "",
              ].join(" ")}
            >
              <span
                className={[
                  "text-xs tabular-nums",
                  t.side === "buy" ? "text-up" : "text-down",
                ].join(" ")}
              >
                {t.price}
              </span>
              <span className="text-right text-xs tabular-nums text-foreground">{t.amount}</span>
              <span className="text-right text-xs tabular-nums text-muted">{t.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
