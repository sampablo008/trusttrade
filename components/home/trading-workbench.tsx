"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, CandlestickChart, CircleDollarSign, ShieldCheck } from "lucide-react";
import { experienceMetrics, payoutMultiplier, stakeOptions, timeframeOptions } from "@/lib/constants/platform";
import { formatSignedPercent, formatUsdFromCents } from "@/lib/utils/format";
import { useTradingShellStore } from "@/stores/trading-shell-store";
import type { MarketSnapshot } from "@/types/platform";

interface TradingWorkbenchProps {
  marketSnapshots: MarketSnapshot[];
}

export default function TradingWorkbench({ marketSnapshots }: TradingWorkbenchProps) {
  const {
    activeDirection,
    activeStakeCents,
    activeTimeframe,
    selectedToken,
    setActiveDirection,
    setActiveStakeCents,
    setActiveTimeframe,
    setSelectedToken,
  } = useTradingShellStore();

  const selectedMarket =
    marketSnapshots.find((market) => market.symbol === selectedToken) ?? marketSnapshots[0];
  const projectedReturn = Math.round(activeStakeCents * payoutMultiplier);

  if (!selectedMarket) {
    return (
      <div className="rounded-[36px] border border-border bg-surface-soft p-8 text-sm leading-7 text-muted">
        Market feed is empty. Token reads will appear here once the preview or live market service
        returns enabled symbols.
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_minmax(320px,0.95fr)]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="space-y-6"
      >
        <div className="grid gap-4 md:grid-cols-3">
          {marketSnapshots.map((market, index) => {
            const isActive = market.symbol === selectedMarket.symbol;

            return (
              <motion.button
                key={market.symbol}
                type="button"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.08 }}
                onClick={() => setSelectedToken(market.symbol)}
                className={`rounded-[28px] border px-5 py-4 text-left transition ${
                  isActive
                    ? "border-brand bg-brand-soft shadow-[0_18px_50px_rgba(61,156,255,0.18)]"
                    : "border-border bg-surface-soft hover:border-brand/50 hover:bg-surface"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-display text-xl text-foreground">{market.symbol}</p>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      market.dayChangePercent >= 0
                        ? "bg-up/12 text-up"
                        : "bg-down/12 text-down"
                    }`}
                  >
                    {formatSignedPercent(market.dayChangePercent)}
                  </span>
                </div>
                <p className="mt-4 text-2xl font-semibold text-foreground">
                  {formatUsdFromCents(market.priceCents)}
                </p>
                <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-muted">
                  <span>{market.name}</span>
                  <span>{market.volumeLabel}</span>
                </div>
              </motion.button>
            );
          })}
        </div>

        <div className="live-panel overflow-hidden rounded-[36px] border border-border bg-surface-soft p-6 md:p-8">
          <div className="flex flex-col gap-6 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-soft px-3 py-1 text-xs uppercase tracking-[0.28em] text-brand">
                <CandlestickChart size={14} />
                Shadow market engine live
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-muted">
                  {selectedMarket.name} control view
                </p>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <h3 className="font-display text-5xl tracking-tight text-foreground sm:text-6xl">
                    {formatUsdFromCents(selectedMarket.priceCents)}
                  </h3>
                  <div className="mb-2 rounded-full bg-brand-soft px-3 py-1 text-sm font-semibold text-brand">
                    Shadow {formatSignedPercent(selectedMarket.shadowOffsetPercent)}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {timeframeOptions.map((timeframe) => {
                const isActive = timeframe.value === activeTimeframe;

                return (
                  <button
                    key={timeframe.value}
                    type="button"
                    onClick={() => setActiveTimeframe(timeframe.value)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      isActive
                        ? "border-brand bg-brand text-background"
                        : "border-border bg-surface hover:border-brand/50"
                    }`}
                  >
                    {timeframe.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {experienceMetrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-[24px] border border-border bg-background/35 p-4"
              >
                <p className="text-xs uppercase tracking-[0.26em] text-muted">{metric.label}</p>
                <p className="mt-3 text-2xl font-semibold text-foreground">{metric.value}</p>
                <p className="mt-2 text-sm leading-6 text-muted">{metric.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <motion.aside
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="rounded-[36px] border border-border bg-surface-soft p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-muted">Order ticket</p>
            <h3 className="mt-2 font-display text-3xl text-foreground">Place outcome</h3>
          </div>
          <div className="rounded-full border border-up/30 bg-up/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-up">
            85% payout
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setActiveDirection("long")}
            className={`rounded-[24px] px-4 py-4 text-left transition ${
              activeDirection === "long"
                ? "bg-up text-background"
                : "border border-border bg-background/30 text-foreground"
            }`}
          >
            <p className="text-xs uppercase tracking-[0.2em]">Long</p>
            <p className="mt-2 text-lg font-semibold">Price rises</p>
          </button>
          <button
            type="button"
            onClick={() => setActiveDirection("short")}
            className={`rounded-[24px] px-4 py-4 text-left transition ${
              activeDirection === "short"
                ? "bg-down text-background"
                : "border border-border bg-background/30 text-foreground"
            }`}
          >
            <p className="text-xs uppercase tracking-[0.2em]">Short</p>
            <p className="mt-2 text-lg font-semibold">Price falls</p>
          </button>
        </div>

        <div className="mt-6 space-y-3">
          <p className="text-xs uppercase tracking-[0.26em] text-muted">Stake presets</p>
          <div className="grid grid-cols-2 gap-3">
            {stakeOptions.map((stake) => {
              const isActive = stake === activeStakeCents;

              return (
                <button
                  key={stake}
                  type="button"
                  onClick={() => setActiveStakeCents(stake)}
                  className={`rounded-[20px] border px-4 py-3 text-sm font-semibold transition ${
                    isActive
                      ? "border-brand bg-brand-soft text-brand"
                      : "border-border bg-background/30 text-foreground"
                  }`}
                >
                  {formatUsdFromCents(stake)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 rounded-[28px] border border-border bg-background/35 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">Potential return</span>
            <CircleDollarSign className="text-brand" size={18} />
          </div>
          <p className="mt-3 font-display text-4xl text-foreground">
            {formatUsdFromCents(projectedReturn)}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Ticket locks {formatUsdFromCents(activeStakeCents)} for {selectedMarket.symbol} on the{" "}
            {activeTimeframe} book. Settlement path follows admin decision first, expiry fallback second.
          </p>
        </div>

        <div className="mt-6 space-y-3 rounded-[28px] border border-brand/20 bg-brand-soft p-5">
          <div className="flex items-center gap-2 text-brand">
            <ShieldCheck size={18} />
            <span className="text-xs font-semibold uppercase tracking-[0.24em]">
              Ops checklist
            </span>
          </div>
          <div className="space-y-3 text-sm leading-6 text-foreground">
            <p>1. Route all writes through server functions and audited handlers.</p>
            <p>2. Keep balance math in cents before wallet, bonus, and trade flows land.</p>
            <p>3. Leave client bundle free of direct Supabase access.</p>
          </div>
        </div>

        <a
          href="/login"
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 py-4 text-sm font-semibold text-background transition hover:bg-brand"
        >
          Start Sprint Build
          <ArrowUpRight size={16} />
        </a>
      </motion.aside>
    </div>
  );
}
