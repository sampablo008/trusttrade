"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createChart,
  createSeriesMarkers,
  CrosshairMode,
  CandlestickSeries,
  HistogramSeries,
  ColorType,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type CandlestickData,
  type HistogramData,
  type SeriesType,
} from "lightweight-charts";
import { useCandleStream } from "@/hooks/useCandleStream";
import { useTickInterpolator } from "@/hooks/useTickInterpolator";
import { formatUsdFromCents } from "@/lib/utils/format";
import type { ChartTimeframeValue, PublicCandle, PublicCandlesResult } from "@/types/market";
import type { UserTrade } from "@/types/trade";

interface TradingChartProps {
  initialCandles: PublicCandlesResult;
  symbol: string;
  activeTrades?: UserTrade[];
}

const TIMEFRAMES: { label: string; value: ChartTimeframeValue }[] = [
  { label: "1s", value: "1s" },
  { label: "15s", value: "15s" },
  { label: "1m", value: "1m" },
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "1h", value: "1h" },
  { label: "4h", value: "4h" },
  { label: "1d", value: "1d" },
];

const COLORS = {
  background: "#0c0e14",
  border: "#1c1f2e",
  down: "#f6465d",
  grid: "#1c1f2e",
  text: "#848e9c",
  up: "#0ecb81",
  volumeDown: "rgba(246,70,93,0.28)",
  volumeUp: "rgba(14,203,129,0.28)",
};

function toCandleData(candle: PublicCandle): CandlestickData {
  return {
    close: candle.closeCents / 100,
    high: candle.highCents / 100,
    low: candle.lowCents / 100,
    open: candle.openCents / 100,
    time: (new Date(candle.time).getTime() / 1000) as CandlestickData["time"],
  };
}

function toVolumeData(candle: PublicCandle): HistogramData {
  return {
    color: candle.closeCents >= candle.openCents ? COLORS.volumeUp : COLORS.volumeDown,
    time: (new Date(candle.time).getTime() / 1000) as HistogramData["time"],
    value: candle.volume,
  };
}

export default function TradingChart({
  initialCandles,
  symbol,
  activeTrades = [],
}: TradingChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  // tradeId → priceline ref
  const priceLinesRef = useRef<Map<string, IPriceLine>>(new Map());

  const [activeTimeframe, setActiveTimeframe] = useState<ChartTimeframeValue>(
    initialCandles.timeframe,
  );
  const [crosshairPrice, setCrosshairPrice] = useState<number | null>(null);

  const lastCandleCents = initialCandles.items.at(-1)?.closeCents ?? 0;
  const { displayCents, isRising, push } = useTickInterpolator(lastCandleCents);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      crosshair: { mode: CrosshairMode.Normal },
      grid: {
        horzLines: { color: COLORS.grid },
        vertLines: { color: COLORS.grid },
      },
      layout: {
        background: { color: COLORS.background, type: ColorType.Solid },
        textColor: COLORS.text,
      },
      rightPriceScale: { borderColor: COLORS.border },
      timeScale: {
        borderColor: COLORS.border,
        secondsVisible: activeTimeframe === "1s" || activeTimeframe === "15s",
        timeVisible: true,
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      borderDownColor: COLORS.down,
      borderUpColor: COLORS.up,
      downColor: COLORS.down,
      upColor: COLORS.up,
      wickDownColor: COLORS.down,
      wickUpColor: COLORS.up,
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: COLORS.grid,
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    } as Parameters<typeof chart.addSeries<"Histogram">>[1]);

    chart.priceScale("volume").applyOptions({
      scaleMargins: { bottom: 0, top: 0.75 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    chart.subscribeCrosshairMove((param) => {
      if (!param.point || !param.seriesData) {
        setCrosshairPrice(null);
        return;
      }
      const data = param.seriesData.get(candleSeries as ISeriesApi<SeriesType>) as
        | CandlestickData
        | undefined;
      if (data?.close !== undefined) {
        setCrosshairPrice(Math.round(data.close * 100));
      }
    });

    const priceLinesMap = priceLinesRef.current;
    return () => {
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      priceLinesMap.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const cs = candleSeriesRef.current;
    const vs = volumeSeriesRef.current;
    if (!cs || !vs) return;

    cs.setData(initialCandles.items.map(toCandleData));
    vs.setData(initialCandles.items.map(toVolumeData));
    chartRef.current?.timeScale().fitContent();
  }, [initialCandles]);

  // Sync entry-price lines with active trades
  useEffect(() => {
    const cs = candleSeriesRef.current;
    if (!cs) return;

    const existing = priceLinesRef.current;
    const incomingIds = new Set(activeTrades.map((t) => t.id));

    // Remove lines for settled/removed trades
    for (const [id, line] of existing) {
      if (!incomingIds.has(id)) {
        cs.removePriceLine(line);
        existing.delete(id);
      }
    }

    // Add lines for new active trades
    for (const trade of activeTrades) {
      if (existing.has(trade.id)) continue;
      const isLong = trade.direction === "long";
      const line = cs.createPriceLine({
        price: trade.entryPriceCents / 100,
        color: isLong ? COLORS.up : COLORS.down,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: isLong ? "L" : "S",
      });
      existing.set(trade.id, line);
    }

    // Add entry-point markers for all active trades
    const markers = activeTrades.map((trade) => ({
      time: (new Date(trade.startedAt).getTime() / 1000) as CandlestickData["time"],
      position: trade.direction === "long" ? ("belowBar" as const) : ("aboveBar" as const),
      color: trade.direction === "long" ? COLORS.up : COLORS.down,
      shape: "arrowUp" as const,
      text: trade.direction === "long" ? "▲" : "▼",
    }));

    if (markers.length > 0) {
      createSeriesMarkers(cs, markers);
    }
  }, [activeTrades]);

  const handleNewCandle = useCallback(
    (candle: PublicCandle) => {
      candleSeriesRef.current?.update(toCandleData(candle));
      volumeSeriesRef.current?.update(toVolumeData(candle));
      push(candle.closeCents);
    },
    [push],
  );

  useCandleStream({ onCandle: handleNewCandle, symbol, tf: activeTimeframe });

  const displayPrice = crosshairPrice ?? displayCents;

  return (
    <div className="flex flex-col overflow-hidden rounded-[28px] border border-border bg-[#0c0e14]">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="font-display text-lg text-foreground">{symbol}/USDT</span>
          <span
            className={`font-mono text-xl font-semibold tabular-nums ${isRising ? "text-up" : "text-down"}`}
          >
            {formatUsdFromCents(displayPrice)}
          </span>
        </div>

        <div className="flex items-center gap-0.5 rounded-2xl border border-border bg-background/50 p-1">
          {TIMEFRAMES.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              onClick={() => setActiveTimeframe(value)}
              className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold transition ${
                activeTimeframe === value
                  ? "bg-foreground text-background"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div ref={containerRef} className="h-105 w-full" />
    </div>
  );
}
