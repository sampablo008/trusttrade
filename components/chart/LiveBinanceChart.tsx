"use client";

import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useMemo, useRef, useState } from "react";

type Interval = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

const INTERVALS: { value: Interval; label: string }[] = [
  { value: "1m", label: "1m" },
  { value: "5m", label: "5m" },
  { value: "15m", label: "15m" },
  { value: "1h", label: "1h" },
  { value: "4h", label: "4h" },
  { value: "1d", label: "1D" },
];

interface Candle {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface LiveBinanceChartProps {
  binanceSymbol: string;
}

export default function LiveBinanceChart({ binanceSymbol }: LiveBinanceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [interval, setInterval] = useState<Interval>("1m");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const upstreamSymbol = useMemo(() => binanceSymbol.toUpperCase(), [binanceSymbol]);
  const lowerSymbol = useMemo(() => binanceSymbol.toLowerCase(), [binanceSymbol]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      autoSize: true,
      layout: {
        attributionLogo: false,
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(226, 232, 240, 0.7)",
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Monaco, 'Liberation Mono', 'Courier New', monospace",
      },
      grid: {
        vertLines: { color: "rgba(148, 163, 184, 0.08)" },
        horzLines: { color: "rgba(148, 163, 184, 0.08)" },
      },
      rightPriceScale: {
        borderColor: "rgba(148, 163, 184, 0.15)",
      },
      timeScale: {
        borderColor: "rgba(148, 163, 184, 0.15)",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(148, 163, 184, 0.4)", labelBackgroundColor: "#0f172a" },
        horzLine: { color: "rgba(148, 163, 184, 0.4)", labelBackgroundColor: "#0f172a" },
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;

    const controller = new AbortController();
    let es: EventSource | null = null;
    let cancelled = false;

    const load = async () => {
      setStatus("loading");
      try {
        const res = await fetch(
          `/api/market/klines?symbol=${upstreamSymbol}&interval=${interval}&limit=1000`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error(`klines ${res.status}`);
        const raw = (await res.json()) as unknown[][];
        if (cancelled) return;

        const candles: Candle[] = raw.map((k) => ({
          time: Math.floor((k[0] as number) / 1000) as UTCTimestamp,
          open: parseFloat(k[1] as string),
          high: parseFloat(k[2] as string),
          low: parseFloat(k[3] as string),
          close: parseFloat(k[4] as string),
        }));

        series.setData(candles);
        const visibleCount = Math.min(120, candles.length);
        chart.timeScale().setVisibleLogicalRange({
          from: candles.length - visibleCount,
          to: candles.length,
        });
        setStatus("ready");

        es = new EventSource(
          `/api/market/kline-stream?symbol=${lowerSymbol}&interval=${interval}`,
        );
        es.addEventListener("kline", (ev) => {
          try {
            const k = JSON.parse((ev as MessageEvent).data) as {
              t: number; o: string; h: string; l: string; c: string;
            };
            series.update({
              time: Math.floor(k.t / 1000) as UTCTimestamp,
              open: parseFloat(k.o),
              high: parseFloat(k.h),
              low: parseFloat(k.l),
              close: parseFloat(k.c),
            });
          } catch {}
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setStatus("error");
      }
    };

    load();

    return () => {
      cancelled = true;
      controller.abort();
      es?.close();
    };
  }, [upstreamSymbol, lowerSymbol, interval]);

  return (
    <div className="relative flex h-full w-full flex-col">
      <div className="flex items-center gap-1 border-b border-border px-3 py-2">
        {INTERVALS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setInterval(opt.value)}
            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] transition ${
              interval === opt.value
                ? "bg-brand text-background"
                : "text-muted hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div ref={containerRef} className="relative min-h-0 flex-1">
        {status !== "ready" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              {status === "loading" ? "Loading chart…" : "Chart unavailable"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
