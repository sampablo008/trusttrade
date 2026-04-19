"use client";

import { useEffect, useRef } from "react";
import type { ChartTimeframeValue, PublicCandle } from "@/types/market";

interface UseCandleStreamOptions {
  onCandle: (candle: PublicCandle) => void;
  onError?: (code: string) => void;
  symbol: string;
  tf: ChartTimeframeValue;
}

export function useCandleStream({
  onCandle,
  onError,
  symbol,
  tf,
}: UseCandleStreamOptions): void {
  const esRef = useRef<EventSource | null>(null);
  const reconnectDelayRef = useRef(1000);

  // connectRef lets the onerror handler schedule a reconnect without a
  // forward-reference; it is only written inside an effect, never during render
  const connectRef = useRef<() => void>(() => {});

  useEffect(() => {
    connectRef.current = () => {
      esRef.current?.close();

      const url = `/api/stream/candles?symbol=${encodeURIComponent(symbol)}&tf=${tf}`;
      const es = new EventSource(url);
      esRef.current = es;

      es.addEventListener("candle", (event) => {
        try {
          const candle = JSON.parse((event as MessageEvent).data) as PublicCandle;
          onCandle(candle);
          reconnectDelayRef.current = 1000;
        } catch {
          // ignore malformed event
        }
      });

      es.addEventListener("error", (event) => {
        try {
          const data = JSON.parse((event as MessageEvent).data) as { code?: string };
          onError?.(data.code ?? "STREAM_ERROR");
        } catch {
          // ignore
        }
      });

      es.onerror = () => {
        es.close();
        esRef.current = null;

        const delay = reconnectDelayRef.current;
        reconnectDelayRef.current = Math.min(delay * 2, 30_000);
        setTimeout(() => connectRef.current(), delay);
      };
    };

    connectRef.current();

    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, [symbol, tf, onCandle, onError]);
}
