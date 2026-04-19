"use client";

import { useEffect, useState } from "react";

export interface BinanceTicker {
  changePercent: number;
  high: number;
  low: number;
  price: number;
  volume: number;
}

export function useBinanceTicker(binanceSymbol: string): BinanceTicker | null {
  const [ticker, setTicker] = useState<BinanceTicker | null>(null);

  useEffect(() => {
    setTicker(null);

    const es = new EventSource(
      `/api/market/ticker-stream?symbol=${binanceSymbol.toLowerCase()}`,
    );

    es.addEventListener("ticker", (ev) => {
      try {
        const msg = JSON.parse((ev as MessageEvent).data) as {
          P: string; h: string; l: string; c: string; q: string;
        };
        setTicker({
          changePercent: parseFloat(msg.P),
          high: parseFloat(msg.h),
          low: parseFloat(msg.l),
          price: parseFloat(msg.c),
          volume: parseFloat(msg.q),
        });
      } catch {}
    });

    return () => {
      es.close();
    };
  }, [binanceSymbol]);

  return ticker;
}
