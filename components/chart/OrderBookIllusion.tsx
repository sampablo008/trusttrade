"use client";

import { useEffect, useMemo, useState } from "react";

interface OrderBookIllusionProps {
  lastPriceCents: number;
  symbol: string;
}

interface OrderRow {
  amount: string;
  depth: number;
  price: string;
  total: string;
}

const ROWS = 10;
const SPREAD_BPS = 3;

function seededJitter(seed: number, index: number): number {
  const x = Math.sin(seed * 9301 + index * 49297 + 233) * 0.5 + 0.5;
  return x;
}

function buildSide(midCents: number, direction: "ask" | "bid", seed: number): OrderRow[] {
  const rows: OrderRow[] = [];
  let cumulativeAmount = 0;

  for (let i = 0; i < ROWS; i++) {
    const step = direction === "ask" ? i + 1 : -(i + 1);
    const offset = Math.round(midCents * 0.0001 * step * (1 + seededJitter(seed, i) * 0.4));
    const priceCents = midCents + offset;
    const baseAmt = 0.05 + seededJitter(seed + 1, i) * 2.5;
    const amount = baseAmt + seededJitter(seed + 2, i) * 0.8;
    cumulativeAmount += amount;

    rows.push({
      amount: amount.toFixed(4),
      depth: Math.min(cumulativeAmount / 15, 1),
      price: (priceCents / 100).toFixed(2),
      total: cumulativeAmount.toFixed(4),
    });
  }

  return rows;
}

export default function OrderBookIllusion({ lastPriceCents, symbol }: OrderBookIllusionProps) {
  // Lazy initializer avoids Math.random during render
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 100000));

  useEffect(() => {
    const timer = setInterval(() => {
      setSeed((s) => (s + 37) % 100000);
    }, 2000);

    return () => clearInterval(timer);
  }, []);

  const midCents = Math.round(lastPriceCents * (1 + SPREAD_BPS / 20000));

  const asks = useMemo(() => buildSide(midCents, "ask", seed), [midCents, seed]);
  const bids = useMemo(() => buildSide(midCents, "bid", seed + 500), [midCents, seed]);

  const spread = (asks[0] ? parseFloat(asks[0].price) : 0) - (bids[0] ? parseFloat(bids[0].price) : 0);

  return (
    <div className="overflow-hidden rounded-[24px] border border-border bg-surface-soft">
      <div className="border-b border-border px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
          Order book — {symbol}/USDT
        </p>
      </div>

      <div className="px-2 py-2">
        <div className="grid grid-cols-3 px-2 pb-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          <span>Price (USD)</span>
          <span className="text-right">Amount</span>
          <span className="text-right">Total</span>
        </div>

        <div className="flex flex-col-reverse">
          {asks.map((row, i) => (
            <div key={`ask-${i}`} className="relative grid grid-cols-3 items-center px-2 py-[3px]">
              <div
                className="absolute inset-y-0 right-0 bg-down/8 transition-all duration-700"
                style={{ width: `${row.depth * 100}%` }}
              />
              <span className="relative text-xs tabular-nums text-down">{row.price}</span>
              <span className="relative text-right text-xs tabular-nums text-foreground">{row.amount}</span>
              <span className="relative text-right text-xs tabular-nums text-muted">{row.total}</span>
            </div>
          ))}
        </div>

        <div className="my-1 flex items-center gap-2 border-y border-border px-2 py-2">
          <span className="font-mono text-sm font-semibold text-foreground">
            {(lastPriceCents / 100).toFixed(2)}
          </span>
          <span className="text-xs text-muted">Spread {spread.toFixed(2)}</span>
        </div>

        {bids.map((row, i) => (
          <div key={`bid-${i}`} className="relative grid grid-cols-3 items-center px-2 py-[3px]">
            <div
              className="absolute inset-y-0 right-0 bg-up/8 transition-all duration-700"
              style={{ width: `${row.depth * 100}%` }}
            />
            <span className="relative text-xs tabular-nums text-up">{row.price}</span>
            <span className="relative text-right text-xs tabular-nums text-foreground">{row.amount}</span>
            <span className="relative text-right text-xs tabular-nums text-muted">{row.total}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
