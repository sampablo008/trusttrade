"use client";

import { useEffect, useRef, useState } from "react";
import { formatUsdFromCents } from "@/lib/utils/format";
import type { PublicToken } from "@/types/market";

interface TickerStripProps {
  initialTokens: PublicToken[];
}

interface TokenTick {
  dayChangePercent: number;
  id: string;
  isRising: boolean;
  priceCents: number;
  symbol: string;
}

export default function TickerStrip({ initialTokens }: TickerStripProps) {
  const [ticks, setTicks] = useState<TokenTick[]>(
    initialTokens.map((t) => ({
      dayChangePercent: t.dayChangePercent,
      id: t.id,
      isRising: t.dayChangePercent >= 0,
      priceCents: t.priceCents,
      symbol: t.symbol,
    })),
  );

  const esRef = useRef<EventSource | null>(null);
  const connectRef = useRef<() => void>(() => {});

  useEffect(() => {
    connectRef.current = () => {
      esRef.current?.close();

      const es = new EventSource("/api/stream/ticker");
      esRef.current = es;

      es.addEventListener("tick", (event) => {
        try {
          const updates = JSON.parse((event as MessageEvent).data) as Array<{
            dayChangePercent: number;
            id: string;
            priceCents: number;
            symbol: string;
          }>;

          setTicks((prev) =>
            prev.map((existing) => {
              const update = updates.find((u) => u.id === existing.id);
              if (!update) return existing;
              return {
                ...existing,
                dayChangePercent: update.dayChangePercent,
                isRising: update.priceCents >= existing.priceCents,
                priceCents: update.priceCents,
              };
            }),
          );
        } catch {
          // ignore
        }
      });

      es.onerror = () => {
        es.close();
        setTimeout(() => connectRef.current(), 5000);
      };
    };

    connectRef.current();

    return () => esRef.current?.close();
  }, []);

  const doubled = [...ticks, ...ticks];

  return (
    <div className="overflow-hidden border-b border-border bg-surface-soft">
      <div className="ticker-track flex items-center gap-0 whitespace-nowrap py-2">
        {doubled.map((tick, index) => (
          <span
            key={`${tick.id}-${index}`}
            className="inline-flex shrink-0 items-center gap-2 border-r border-border px-5 py-0.5 text-sm"
          >
            <span className="font-semibold text-foreground">{tick.symbol}</span>
            <span className={`tabular-nums ${tick.isRising ? "text-up" : "text-down"}`}>
              {formatUsdFromCents(tick.priceCents)}
            </span>
            <span className={`text-xs ${tick.dayChangePercent >= 0 ? "text-up" : "text-down"}`}>
              {tick.dayChangePercent >= 0 ? "+" : ""}
              {tick.dayChangePercent.toFixed(2)}%
            </span>
          </span>
        ))}
      </div>

      <style>{`
        @keyframes ticker-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .ticker-track {
          animation: ticker-scroll 40s linear infinite;
          width: max-content;
        }
        .ticker-track:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
