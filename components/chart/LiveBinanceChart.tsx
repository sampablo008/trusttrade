"use client";

import {
  AreaSeries,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type Interval = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";
type ChartType = "candles" | "line";

const INTERVALS: { value: Interval; label: string }[] = [
  { value: "1m", label: "1m" },
  { value: "5m", label: "5m" },
  { value: "15m", label: "15m" },
  { value: "1h", label: "1h" },
  { value: "4h", label: "4h" },
  { value: "1d", label: "1D" },
];

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: "candles", label: "Candles" },
  { value: "line", label: "Line" },
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

function toLineData(candles: Candle[]) {
  return candles.map((c) => ({ time: c.time, value: c.close }));
}

export default function LiveBinanceChart({ binanceSymbol }: LiveBinanceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const candlesRef = useRef<Candle[]>([]);
  const chartTypeRef = useRef<ChartType>("line");

  const [interval, setInterval] = useState<Interval>("1m");
  const [chartType, setChartType] = useState<ChartType>("line");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const upstreamSymbol = useMemo(() => binanceSymbol.toUpperCase(), [binanceSymbol]);
  const lowerSymbol = useMemo(() => binanceSymbol.toLowerCase(), [binanceSymbol]);

  useEffect(() => {
    chartTypeRef.current = chartType;
  }, [chartType]);

  // Chart + series lifecycle. Rebuilds when chartType toggles; reuses cached candles
  // so the toggle is instant with no refetch.
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

    if (chartType === "line") {
      const series = chart.addSeries(AreaSeries, {
        lineColor: "#3d9cff",
        topColor: "rgba(61, 156, 255, 0.40)",
        bottomColor: "rgba(61, 156, 255, 0.02)",
        lineWidth: 2,
        priceLineVisible: false,
        crosshairMarkerBorderColor: "#0f172a",
        crosshairMarkerBackgroundColor: "#3d9cff",
      });
      lineSeriesRef.current = series;
    } else {
      const series = chart.addSeries(CandlestickSeries, {
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderUpColor: "#22c55e",
        borderDownColor: "#ef4444",
        wickUpColor: "#22c55e",
        wickDownColor: "#ef4444",
      });
      candleSeriesRef.current = series;
    }

    chartRef.current = chart;

    // Seed from cache if we already have candles for the current interval/symbol.
    const cached = candlesRef.current;
    if (cached.length > 0) {
      if (chartType === "line") {
        lineSeriesRef.current?.setData(toLineData(cached));
      } else {
        candleSeriesRef.current?.setData(cached);
      }
      const visibleCount = Math.min(120, cached.length);
      chart.timeScale().setVisibleLogicalRange({
        from: cached.length - visibleCount,
        to: cached.length,
      });
    }

    return () => {
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      lineSeriesRef.current = null;
    };
  }, [chartType]);

  // Data fetch + live stream. Re-runs only when symbol or interval changes.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const controller = new AbortController();
    let es: EventSource | null = null;
    let cancelled = false;

    // Invalidate cached candles when the dataset key changes.
    candlesRef.current = [];

    const applySeriesData = (candles: Candle[]) => {
      if (chartTypeRef.current === "line") {
        lineSeriesRef.current?.setData(toLineData(candles));
      } else {
        candleSeriesRef.current?.setData(candles);
      }
    };

    const updateLatest = (candle: Candle) => {
      const list = candlesRef.current;
      const last = list[list.length - 1];
      if (last && last.time === candle.time) {
        list[list.length - 1] = candle;
      } else if (!last || candle.time > last.time) {
        list.push(candle);
      }
      if (chartTypeRef.current === "line") {
        lineSeriesRef.current?.update({ time: candle.time, value: candle.close });
      } else {
        candleSeriesRef.current?.update(candle);
      }
    };

    const load = async () => {
      setStatus("loading");
      try {
        const res = await fetch(
          `/api/market/klines?symbol=${upstreamSymbol}&interval=${interval}&limit=10000`,
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

        candlesRef.current = candles;
        applySeriesData(candles);

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
            updateLatest({
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
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center gap-1">
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

        <div className="flex items-center gap-1">
          {CHART_TYPES.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setChartType(opt.value)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] transition ${
                chartType === opt.value
                  ? "bg-brand text-background"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div ref={containerRef} className="relative min-h-0 flex-1">
        {status !== "ready" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              {status === "loading" ? (
                <>
                  <Loader2 className="h-7 w-7 animate-spin text-brand" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
                    Loading market data
                  </span>
                </>
              ) : (
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
                  Chart unavailable
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
