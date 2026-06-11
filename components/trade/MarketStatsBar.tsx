"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import CoinIcon from "@/components/ui/CoinIcon";
import { useBinanceTicker } from "@/hooks/useBinanceTicker";
import { formatSignedPercent } from "@/lib/utils/format";
import type { TopCoin } from "@/lib/markets/top-coins";

function formatPrice(usd: number): string {
  if (usd >= 1000) return `$${usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (usd >= 1) return `$${usd.toFixed(2)}`;
  return `$${usd.toFixed(4)}`;
}

function formatVolume(usdt: number): string {
  if (usdt >= 1e9) return `$${(usdt / 1e9).toFixed(2)}B`;
  if (usdt >= 1e6) return `$${(usdt / 1e6).toFixed(2)}M`;
  if (usdt >= 1e3) return `$${(usdt / 1e3).toFixed(2)}K`;
  return `$${usdt.toFixed(2)}`;
}

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block animate-pulse rounded-md bg-white/10 ${className}`}
    />
  );
}

function StatBlock({
  label,
  value,
  loading,
  skeletonWidth,
}: {
  label: string;
  value: string;
  loading: boolean;
  skeletonWidth: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
        {label}
      </span>
      {loading ? (
        <Skeleton className={`h-4 ${skeletonWidth}`} />
      ) : (
        <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
          {value}
        </span>
      )}
    </div>
  );
}

interface MarketStatsBarProps {
  coin: TopCoin;
  iconPath?: string | null;
}

export default function MarketStatsBar({ coin, iconPath }: MarketStatsBarProps) {
  const ticker = useBinanceTicker(coin.binanceSymbol);
  const loading = ticker === null;
  const isUp = (ticker?.changePercent ?? 0) >= 0;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-soft p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-linear-to-br from-brand/20 to-up/10">
          <CoinIcon symbol={coin.symbol} iconPath={iconPath} size={36} />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {coin.symbol}/USDT
            </h1>
            <span className="rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand">
              Live
            </span>
          </div>
          <p className="text-xs text-muted">{coin.name}</p>
        </div>
      </div>

      <div className="hidden h-12 w-px bg-border sm:block" />

      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
          Last price
        </span>
        <div className="flex items-center gap-2">
          {loading ? (
            <Skeleton className="h-8 w-40 sm:h-9" />
          ) : (
            <span className="font-display text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
              {formatPrice(ticker.price)}
            </span>
          )}
          {loading ? (
            <Skeleton className="h-5 w-16 rounded-full" />
          ) : (
            <span
              className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                isUp ? "bg-up/10 text-up" : "bg-down/10 text-down"
              }`}
            >
              {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {formatSignedPercent(ticker.changePercent)}
            </span>
          )}
        </div>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-x-6 gap-y-3 sm:gap-x-8">
        <StatBlock
          label="24h High"
          value={ticker ? formatPrice(ticker.high) : "—"}
          loading={loading}
          skeletonWidth="w-20"
        />
        <StatBlock
          label="24h Low"
          value={ticker ? formatPrice(ticker.low) : "—"}
          loading={loading}
          skeletonWidth="w-20"
        />
        <StatBlock
          label="24h Volume"
          value={ticker ? formatVolume(ticker.volume) : "—"}
          loading={loading}
          skeletonWidth="w-16"
        />
      </div>
    </section>
  );
}
