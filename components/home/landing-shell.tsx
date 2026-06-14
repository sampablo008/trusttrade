"use client";

import type { ComponentType, ReactNode } from "react";
import { useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  ChartCandlestick,
  ChevronRight,
  CircleDollarSign,
  Gauge,
  Globe,
  Layers3,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TimerReset,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import BrandLogo from "@/components/brand/BrandLogo";
import SupportContact from "@/components/support/SupportContact";
import { hasAnySupportChannel } from "@/lib/config/support";
import type { PromoSlot } from "@/types/promo";
import type { MarketSnapshot } from "@/types/platform";
import type { SupportContacts } from "@/types/admin";

const FEATURE_ICONS: Record<
  string,
  ComponentType<{ size?: number; className?: string }>
> = {
  feature_charts: ChartCandlestick,
  feature_referrals: Users,
  feature_profits: TrendingUp,
  feature_tokens: Globe,
  feature_wallet: Wallet,
  feature_mobile: Smartphone,
};

const TRUST_ICONS: Record<string, ComponentType<{ size?: number; className?: string }>> = {
  badge_security: ShieldCheck,
  badge_payouts: Zap,
  badge_support: Sparkles,
};

const fallbackMarkets: MarketSnapshot[] = [
  {
    dayChangePercent: 4.82,
    name: "Bitcoin",
    priceCents: 104_225_00,
    shadowOffsetPercent: 0.16,
    symbol: "BTCUSDT",
    volumeLabel: "$12.8B",
  },
  {
    dayChangePercent: 3.14,
    name: "Ethereum",
    priceCents: 5_210_22,
    shadowOffsetPercent: 0.11,
    symbol: "ETHUSDT",
    volumeLabel: "$8.6B",
  },
  {
    dayChangePercent: 1.92,
    name: "BNB",
    priceCents: 712_38,
    shadowOffsetPercent: 0.05,
    symbol: "BNBUSDT",
    volumeLabel: "$2.4B",
  },
  {
    dayChangePercent: -1.28,
    name: "Solana",
    priceCents: 182_44,
    shadowOffsetPercent: -0.04,
    symbol: "SOLUSDT",
    volumeLabel: "$2.1B",
  },
  {
    dayChangePercent: 2.06,
    name: "XRP",
    priceCents: 244,
    shadowOffsetPercent: 0.08,
    symbol: "XRPUSDT",
    volumeLabel: "$1.4B",
  },
  {
    dayChangePercent: 5.41,
    name: "Dogecoin",
    priceCents: 38,
    shadowOffsetPercent: 0.12,
    symbol: "DOGEUSDT",
    volumeLabel: "$1.2B",
  },
  {
    dayChangePercent: 0.84,
    name: "Cardano",
    priceCents: 78,
    shadowOffsetPercent: 0.02,
    symbol: "ADAUSDT",
    volumeLabel: "$0.9B",
  },
  {
    dayChangePercent: 3.66,
    name: "Avalanche",
    priceCents: 41_22,
    shadowOffsetPercent: 0.07,
    symbol: "AVAXUSDT",
    volumeLabel: "$0.7B",
  },
  {
    dayChangePercent: -0.92,
    name: "Chainlink",
    priceCents: 19_84,
    shadowOffsetPercent: -0.03,
    symbol: "LINKUSDT",
    volumeLabel: "$0.6B",
  },
  {
    dayChangePercent: 2.74,
    name: "Toncoin",
    priceCents: 6_41,
    shadowOffsetPercent: 0.04,
    symbol: "TONUSDT",
    volumeLabel: "$0.4B",
  },
];


const defaultTrustSignals = [
  {
    body: "Win up to 85% on every correct call across BTC, ETH, SOL, BNB, XRP and 5+ more top pairs. Payouts hit your USDT balance the moment your trade settles.",
    icon: ShieldCheck,
    title: "Up to 85% payout per trade",
  },
  {
    body: "Crypto never sleeps and neither do we. Trade your favourite pairs around the clock — weekends, holidays, 3am pumps — the desk is always live.",
    icon: Zap,
    title: "24/7 markets, every day",
  },
  {
    body: "Deposit any supported coin, swap into USDT in one tap, fund a trade, then withdraw whenever you want. No paperwork. No middlemen.",
    icon: Sparkles,
    title: "From wallet to trade in seconds",
  },
];

const defaultFeatureCards = [
  {
    body: "Real Binance-grade candles for BTC, ETH, SOL, BNB, XRP, DOGE, ADA and more — refreshing tick by tick. Spot the move, then act on it.",
    icon: ChartCandlestick,
    title: "Live charts on every major pair",
  },
  {
    body: "Pick a coin. Pick a direction. Lock a 30s, 1m, 5m, 15m, 1h or 1d window. If price closes your way, you win up to 85%.",
    icon: Gauge,
    title: "Long or short in two taps",
  },
  {
    body: "USDT is your trading rail. Deposit any supported token, swap on-platform, fund trades, and withdraw — all from one mobile-first wallet.",
    icon: Wallet,
    title: "Wallet, swap & withdraw built in",
  },
];

const executionSteps = [
  {
    detail: "Bitcoin, Ethereum, Solana, BNB, XRP, Dogecoin and more — right there with live prices, 24h change and Binance-grade candles.",
    title: "Pick your coin",
  },
  {
    detail: "Long if you think it's going up. Short if you think it's coming down. Choose 30s, 1m, 5m, 15m, 1h or 1d.",
    title: "Pick your direction",
  },
  {
    detail: "If price closes your way, your USDT balance is credited up to 85% the second the timer hits zero. Withdraw any time.",
    title: "Collect in USDT",
  },
];

const platformMetrics = [
  {
    detail: "Up to 85% payout on every winning trade.",
    label: "Max payout",
    value: "85%",
  },
  {
    detail: "Crypto markets are open. Always.",
    label: "Trading hours",
    value: "24/7",
  },
  {
    detail: "30s, 1m, 5m, 15m, 1h and 1d windows.",
    label: "Trade timeframes",
    value: "6",
  },
  {
    detail: "Earn from up to 5 levels of referrals.",
    label: "Referral depth",
    value: "5 levels",
  },
];

const dashboardSignals = [
  {
    label: "Live BTC feed",
    value: "Streaming",
  },
  {
    label: "USDT settlement",
    value: "Instant",
  },
  {
    label: "Open markets",
    value: "10+ pairs",
  },
];

const traderTestimonials = [
  {
    handle: "@btc_native",
    highlight: "Caught a 60-second BTC pump",
    quote:
      "Saw a clean breakout on the 1-minute, locked a 60s long on BTCUSDT, and the payout was in my USDT before I refreshed. This is how crypto trading should feel.",
    result: "+85% in 60s",
    tone: "from-brand via-[#69c0ff] to-up",
  },
  {
    handle: "@solflow",
    highlight: "Shorted SOL on the rejection",
    quote:
      "I shorted SOL on a 5-minute rejection candle and walked away. Came back to a green ticket and an instant credit to my balance. No spread games.",
    result: "85% payout",
    tone: "from-[#0f9a6f] via-up to-[#8affcb]",
  },
  {
    handle: "@ethdaily",
    highlight: "ETH 15m grind, every day",
    quote:
      "The chart is real-time, the order ticket is one tap, and there's no slippage. I scalp ETH on 15-minute windows almost every day now.",
    result: "Daily routine",
    tone: "from-warning via-[#ffb74a] to-brand",
  },
  {
    handle: "@dogerunner",
    highlight: "DOGE volatility plays",
    quote:
      "DOGE moves fast. TrustTrade lets me ride those 30-second spikes without ever touching a spot exchange. Pure direction calls, paid in USDT.",
    result: "Volatility = profit",
    tone: "from-[#d9658b] via-warning to-brand",
  },
];

const marqueeTransition = {
  duration: 26,
  ease: "linear",
  repeat: Number.POSITIVE_INFINITY,
} as const;

const riseIn = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

interface LandingShellProps {
  slots: PromoSlot[];
  marketSnapshots: MarketSnapshot[];
  support: SupportContacts | null;
}

interface MotionSectionProps {
  children: ReactNode;
  className?: string;
}

interface SectionFrameProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}

const moneyFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "currency",
});

function formatPrice(priceCents: number) {
  return moneyFormatter.format(priceCents / 100);
}

function formatChange(change: number) {
  return `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;
}

function MotionSection({ children, className }: MotionSectionProps) {
  return (
    <motion.section
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.2, once: true }}
      variants={riseIn}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.section>
  );
}

function SectionFrame({
  eyebrow,
  title,
  description,
  children,
  className,
}: SectionFrameProps) {
  return (
      <MotionSection
      className={[
        "rounded-[34px] border border-border/80 bg-surface-strong p-6 shadow-[0_30px_120px_rgba(3,8,20,0.35)] sm:p-8 lg:p-10",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex flex-col gap-8">
        <div className="max-w-3xl space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-brand">
            {eyebrow}
          </p>
          <div className="space-y-3">
            <h2 className="max-w-3xl font-display text-3xl tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              {title}
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-muted sm:text-base">
              {description}
            </p>
          </div>
        </div>
        {children}
      </div>
    </MotionSection>
  );
}

export default function LandingShell({ slots, marketSnapshots, support }: LandingShellProps) {
  const heroRef = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    offset: ["start start", "end start"],
    target: heroRef,
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : 120]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.72], [1, reduceMotion ? 1 : 0.38]);

  const bySlug = Object.fromEntries(slots.map((slot) => [slot.slug, slot]));
  const hero = bySlug["hero"];
  const badges = slots.filter((slot) => slot.slug.startsWith("badge_"));
  const features = slots.filter((slot) => slot.slug.startsWith("feature_"));

  const markets = marketSnapshots.length > 0 ? marketSnapshots : fallbackMarkets;
  const topMarkets = markets.slice(0, 4);
  const trustSignals =
    badges.length > 0
      ? badges.map((badge) => ({
          body:
            badge.body ??
            "Clear operating rules, visible platform trust, and fast response across the trading surface.",
          icon: TRUST_ICONS[badge.slug] ?? ShieldCheck,
          title: badge.title ?? "Platform signal",
        }))
      : defaultTrustSignals;

  const featureCards =
    features.length > 0
      ? features.map((feature) => ({
          body:
            feature.body ??
            "Responsive trading workflows with visible market context and wallet continuity.",
          icon: FEATURE_ICONS[feature.slug] ?? Layers3,
          title: feature.title ?? "Trading capability",
        }))
      : defaultFeatureCards;

  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="landing-grid absolute inset-0 opacity-70" />
        <motion.div
          animate={
            reduceMotion
              ? undefined
              : {
                  scale: [1, 1.18, 1],
                  x: ["-4%", "6%", "-4%"],
                  y: ["0%", "8%", "0%"],
                }
          }
          className="landing-orb absolute -left-32 top-16 h-80 w-80 bg-[radial-gradient(circle,#0f5fd1_0%,rgba(15,95,209,0.14)_34%,transparent_72%)]"
          transition={{ duration: 18, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
        />
        <motion.div
          animate={
            reduceMotion
              ? undefined
              : {
                  rotate: [0, 18, 0],
                  scale: [1, 1.12, 1],
                  x: ["0%", "-8%", "0%"],
                }
          }
          className="landing-orb absolute right-[-6rem] top-[24rem] h-[30rem] w-[30rem] bg-[radial-gradient(circle,#0f9a6f_0%,rgba(15,154,111,0.12)_28%,transparent_70%)]"
          transition={{ duration: 24, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
        />
        <motion.div
          animate={
            reduceMotion
              ? undefined
              : {
                  rotate: [0, -12, 0],
                  scale: [1, 1.1, 1],
                  y: ["0%", "-10%", "0%"],
                }
          }
          className="landing-orb absolute bottom-[-8rem] left-[18%] h-[24rem] w-[24rem] bg-[radial-gradient(circle,#c2516c_0%,rgba(194,81,108,0.11)_30%,transparent_74%)]"
          transition={{ duration: 22, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
        />
      </div>

      <section
        ref={heroRef}
        className="relative mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pb-24"
      >
        <motion.nav
          className="relative z-20 mb-6 flex items-center justify-between gap-4"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link href="/" aria-label="TrustTrade home" className="shrink-0">
            <BrandLogo
              size={40}
              wordmarkClassName="text-lg sm:text-xl tracking-[-0.01em]"
            />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-sm font-semibold text-muted transition hover:text-foreground sm:px-5"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-background transition hover:bg-[#66b2ff] sm:px-5"
            >
              Get access
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </motion.nav>

        <motion.div
          className="relative z-10 flex flex-1 flex-col"
          style={{ opacity: heroOpacity, y: heroY }}
        >
          <motion.div
            className="relative overflow-hidden rounded-full border border-border/80 bg-surface px-4 py-3"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-surface via-surface/70 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-surface via-surface/70 to-transparent" />
            <div className="flex w-full items-center overflow-hidden">
              <motion.div
                animate={reduceMotion ? undefined : { x: ["0%", "-50%"] }}
                className="flex min-w-max items-center gap-4"
                transition={marqueeTransition}
              >
                {Array.from({ length: 2 }).flatMap((_, index) =>
                  markets.map((market) => (
                    <div
                      key={`${index}-${market.symbol}`}
                      className="flex items-center gap-3 rounded-full border border-border/70 bg-surface-strong px-4 py-2"
                    >
                      <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted">
                        {market.symbol}
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {formatPrice(market.priceCents)}
                      </span>
                      <span
                        className={`text-sm font-semibold ${
                          market.dayChangePercent >= 0 ? "text-up" : "text-down"
                        }`}
                      >
                        {formatChange(market.dayChangePercent)}
                      </span>
                    </div>
                  )),
                )}
              </motion.div>
            </div>
          </motion.div>

          <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.06fr_0.94fr] lg:py-14">
            <div className="relative z-10 max-w-3xl">
              <motion.div
                className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-soft px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-brand"
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.55 }}
              >
                <CircleDollarSign size={13} />
                BTC · ETH · SOL · BNB · XRP · DOGE & more
              </motion.div>

              <motion.h1
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 font-display text-5xl leading-[0.94] tracking-[-0.04em] text-foreground sm:text-6xl lg:text-[5.9rem]"
                initial={{ opacity: 0, y: 24 }}
                transition={{ delay: 0.18, duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
              >
                {hero?.title ?? "Trade Bitcoin, Ethereum & top crypto in seconds."}
              </motion.h1>

              <motion.p
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 max-w-2xl text-base leading-8 text-muted sm:text-lg"
                initial={{ opacity: 0, y: 24 }}
                transition={{ delay: 0.28, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              >
                {hero?.subtitle ??
                  "TrustTrade is the simplest way to bet on crypto direction. Pick a pair like BTC, ETH or SOL, choose long or short, and win up to 85% on every correct call — paid instantly in USDT. No leverage liquidations. No order books. No spread games."}
              </motion.p>

              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 flex flex-wrap items-center gap-4"
                initial={{ opacity: 0, y: 24 }}
                transition={{ delay: 0.38, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link
                  href={hero?.ctaHref ?? "/signup"}
                  className="group inline-flex items-center gap-3 rounded-full bg-brand px-7 py-4 text-sm font-semibold text-background transition hover:bg-[#66b2ff]"
                >
                  {hero?.ctaLabel ?? "Start trading free"}
                  <ArrowRight
                    size={16}
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-surface px-7 py-4 text-sm font-semibold text-foreground transition hover:border-brand/60 hover:bg-surface-strong"
                >
                  Sign in
                  <ArrowUpRight size={16} />
                </Link>
              </motion.div>

              <motion.div
                className="mt-10 grid gap-4 sm:grid-cols-3"
                initial="hidden"
                animate="visible"
                transition={{ staggerChildren: 0.08, delayChildren: 0.46 }}
                variants={{ hidden: {}, visible: {} }}
              >
                {platformMetrics.slice(0, 3).map((metric) => (
                  <motion.article
                    key={metric.label}
                    className="rounded-[28px] border border-border/80 bg-surface p-5"
                    variants={riseIn}
                    whileHover={reduceMotion ? undefined : { y: -6 }}
                  >
                    <p className="text-[11px] uppercase tracking-[0.28em] text-muted">
                      {metric.label}
                    </p>
                    <p className="mt-3 text-3xl font-semibold text-foreground">{metric.value}</p>
                    <p className="mt-2 text-sm leading-6 text-muted">{metric.detail}</p>
                  </motion.article>
                ))}
              </motion.div>
            </div>

            <motion.div
              animate={{ opacity: 1, x: 0 }}
              className="relative"
              initial={{ opacity: 0, x: 28 }}
              transition={{ delay: 0.18, duration: 0.82, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="grid gap-4 lg:grid-cols-[1.18fr_0.82fr]">
                <motion.article
                  animate={
                    reduceMotion
                      ? undefined
                      : {
                          y: [0, -10, 0],
                        }
                  }
                  className="chart-scan rounded-[34px] border border-border/80 bg-[linear-gradient(180deg,#0d1627,#08101b)] p-5 shadow-[0_40px_140px_rgba(4,9,22,0.48)]"
                  transition={{ duration: 9, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.32em] text-muted">
                        Top markets right now
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        Pick a coin, place your trade
                      </p>
                    </div>
                    <div className="rounded-full border border-up/20 bg-up/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-up">
                      Live
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3">
                    {topMarkets.map((market, index) => (
                      <motion.div
                        key={market.symbol}
                        className="rounded-[24px] border border-border/80 bg-surface p-4"
                        initial={{ opacity: 0, x: 22 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + index * 0.08, duration: 0.55 }}
                        whileHover={reduceMotion ? undefined : { x: 6 }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{market.name}</p>
                            <p className="mt-1 text-[11px] uppercase tracking-[0.26em] text-muted">
                              {market.symbol}
                            </p>
                          </div>
                          <div
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              market.dayChangePercent >= 0
                                ? "bg-up/10 text-up"
                                : "bg-down/10 text-down"
                            }`}
                          >
                            {formatChange(market.dayChangePercent)}
                          </div>
                        </div>

                        <div className="mt-5 flex items-end justify-between gap-4">
                          <div>
                            <p className="text-2xl font-semibold text-foreground">
                              {formatPrice(market.priceCents)}
                            </p>
                            <p className="mt-1 text-xs text-muted">Volume {market.volumeLabel}</p>
                          </div>
                          <div className="relative flex h-16 w-32 items-end gap-1.5 overflow-hidden rounded-[18px] border border-border/70 bg-surface-strong px-3 py-2">
                            {Array.from({ length: 12 }).map((_, barIndex) => {
                              const baseHeight =
                                16 +
                                Math.abs(Math.sin((barIndex + 1) * 0.8 + index * 0.45)) * 34;

                              return (
                                <motion.span
                                  key={`${market.symbol}-${barIndex}`}
                                  animate={
                                    reduceMotion
                                      ? undefined
                                      : {
                                          height: [
                                            baseHeight,
                                            baseHeight + 10 + ((barIndex + index) % 4) * 4,
                                            baseHeight,
                                          ],
                                        }
                                  }
                                  className={`w-full rounded-full ${
                                    market.dayChangePercent >= 0
                                      ? "bg-gradient-to-t from-brand via-brand to-up"
                                      : "bg-gradient-to-t from-brand via-brand to-down"
                                  }`}
                                  transition={{
                                    delay: barIndex * 0.05,
                                    duration: 2.8 + barIndex * 0.08,
                                    ease: "easeInOut",
                                    repeat: Number.POSITIVE_INFINITY,
                                  }}
                                  style={{ height: baseHeight }}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.article>

                <div className="grid gap-4">
                  <motion.article
                    animate={
                      reduceMotion
                        ? undefined
                        : {
                            y: [0, 10, 0],
                          }
                    }
                    className="rounded-[30px] border border-border/80 bg-surface-strong p-5"
                    transition={{ duration: 8.5, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
                        One-tap order ticket
                      </p>
                      <TrendingUp size={16} className="text-brand" />
                    </div>
                    <div className="mt-5 rounded-[22px] border border-brand/20 bg-brand-soft/40 p-4">
                      <div className="flex items-center justify-between text-sm text-muted">
                        <span>BTCUSDT · 60s</span>
                        <span>00:60</span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <motion.div
                          className="rounded-[18px] border border-up/20 bg-up/10 px-4 py-3"
                          whileHover={reduceMotion ? undefined : { scale: 1.03 }}
                        >
                          <p className="text-[11px] uppercase tracking-[0.24em] text-up">Long</p>
                          <p className="mt-2 text-lg font-semibold text-foreground">Price ↑</p>
                        </motion.div>
                        <motion.div
                          className="rounded-[18px] border border-down/20 bg-down/10 px-4 py-3"
                          whileHover={reduceMotion ? undefined : { scale: 1.03 }}
                        >
                          <p className="text-[11px] uppercase tracking-[0.24em] text-down">
                            Short
                          </p>
                          <p className="mt-2 text-lg font-semibold text-foreground">Price ↓</p>
                        </motion.div>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-sm text-muted">
                        <span>Win payout</span>
                        <span className="font-semibold text-foreground">+85% USDT</span>
                      </div>
                    </div>
                    <div className="mt-5 space-y-3">
                      {dashboardSignals.map((signal, index) => (
                        <motion.div
                          key={signal.label}
                          className="flex items-center justify-between rounded-[18px] border border-border/70 bg-surface px-4 py-3"
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.58 + index * 0.08, duration: 0.45 }}
                        >
                          <span className="text-sm text-muted">{signal.label}</span>
                          <span className="text-sm font-semibold text-foreground">
                            {signal.value}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.article>

                  <motion.article
                    animate={
                      reduceMotion
                        ? undefined
                        : {
                            y: [0, -8, 0],
                          }
                    }
                    className="rounded-[30px] border border-border/80 bg-[linear-gradient(160deg,rgba(7,15,31,0.94),rgba(12,24,48,0.82))] p-5 shadow-[0_24px_90px_rgba(2,5,14,0.4)]"
                    transition={{ duration: 7.2, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] uppercase tracking-[0.32em] text-muted">
                        Earn while you trade
                      </p>
                      <Users size={16} className="text-warning" />
                    </div>
                    <p className="mt-3 text-3xl font-semibold text-foreground">5-level referrals</p>
                    <p className="mt-3 text-sm leading-6 text-muted">
                      Invite friends. Earn USDT commission every time they trade — across five
                      levels of network depth. Your link, your stack, forever.
                    </p>
                    <div className="mt-5 space-y-3">
                      {[28, 42, 63, 76, 92].map((width, index) => (
                        <div key={width} className="flex items-center gap-3">
                          <span className="w-12 text-xs uppercase tracking-[0.22em] text-muted">
                            L0{index + 1}
                          </span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-background/60">
                            <motion.div
                              animate={reduceMotion ? undefined : { width: [`${width - 16}%`, `${width}%`, `${width - 10}%`] }}
                              className="h-full rounded-full bg-gradient-to-r from-brand via-warning to-up"
                              transition={{
                                delay: index * 0.12,
                                duration: 3.8,
                                ease: "easeInOut",
                                repeat: Number.POSITIVE_INFINITY,
                              }}
                              style={{ width: `${width}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.article>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      <div className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 pb-24 sm:px-6 lg:px-8">
        <SectionFrame
          eyebrow="Why traders pick TrustTrade"
          title="The fastest way to bet on crypto direction."
          description="No leverage liquidations. No spreads. No order books to chase. Pick a side, set a timer, and get paid in USDT the moment you're right."
        >
          <div className="grid gap-4 lg:grid-cols-3">
            {trustSignals.map((signal, index) => {
              const Icon = signal.icon;

              return (
                <motion.article
                  key={signal.title}
                  className="rounded-[28px] border border-border/80 bg-surface p-6"
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ amount: 0.3, once: true }}
                  transition={{ delay: index * 0.08, duration: 0.55 }}
                  whileHover={reduceMotion ? undefined : { y: -8 }}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-brand/20 bg-brand-soft text-brand">
                    <Icon size={22} />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-foreground">{signal.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted">{signal.body}</p>
                </motion.article>
              );
            })}
          </div>
        </SectionFrame>

        <SectionFrame
          eyebrow="Supported markets"
          title="Trade the world's biggest crypto pairs."
          description="Bitcoin, Ethereum, Solana, BNB, XRP, Dogecoin and the rest of the top liquidity. Live Binance-grade candles, real prices, every pair with the same one-tap execution — all settled in USDT."
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {markets.map((market, index) => (
              <motion.article
                key={`token-${market.symbol}`}
                className="rounded-3xl border border-border/80 bg-surface p-5"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.2, once: true }}
                transition={{ delay: (index % 5) * 0.06, duration: 0.45 }}
                whileHover={reduceMotion ? undefined : { y: -6 }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold text-foreground">{market.name}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.24em] text-muted">
                      {market.symbol}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      market.dayChangePercent >= 0 ? "bg-up/10 text-up" : "bg-down/10 text-down"
                    }`}
                  >
                    {formatChange(market.dayChangePercent)}
                  </span>
                </div>
                <p className="mt-4 text-xl font-semibold text-foreground">
                  {formatPrice(market.priceCents)}
                </p>
                <p className="mt-1 text-xs text-muted">{market.volumeLabel} 24h volume</p>
              </motion.article>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border/70 bg-surface px-5 py-4">
            <p className="text-sm text-muted">
              New pairs added regularly. Live prices stream from Binance with sub-second latency.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-background transition hover:bg-[#66b2ff]"
            >
              Trade now
              <ArrowRight size={14} />
            </Link>
          </div>
        </SectionFrame>

        <SectionFrame
          className="overflow-hidden"
          eyebrow="Built for crypto traders"
          title="Everything you need on one screen."
          description="Live charts, instant order tickets, a USDT-funded wallet, and the world's most-traded crypto pairs — all wired into a single, mobile-first desk."
        >
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="grid gap-4 sm:grid-cols-2">
              {featureCards.map((feature, index) => {
                const Icon = feature.icon;

                return (
                  <motion.article
                    key={feature.title}
                    className="rounded-[28px] border border-border/80 bg-surface p-6"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ amount: 0.3, once: true }}
                    transition={{ delay: index * 0.08, duration: 0.55 }}
                    whileHover={reduceMotion ? undefined : { y: -8 }}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                      <Icon size={22} />
                    </div>
                    <h3 className="mt-5 text-xl font-semibold text-foreground">{feature.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-muted">{feature.body}</p>
                  </motion.article>
                );
              })}
            </div>

            <motion.div
              className="relative overflow-hidden rounded-[30px] border border-border/80 bg-[linear-gradient(160deg,rgba(8,15,29,0.92),rgba(16,32,60,0.76))] p-6"
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ amount: 0.25, once: true }}
              transition={{ duration: 0.65 }}
            >
              <div className="absolute inset-x-6 top-6 h-px bg-gradient-to-r from-transparent via-brand/60 to-transparent" />
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.32em] text-muted">All supported markets</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    Trade the top crypto pairs by volume
                  </p>
                </div>
                <Gauge size={18} className="text-brand" />
              </div>

              <div className="mt-8 grid gap-4">
                {markets.slice(0, 8).map((market, index) => (
                  <motion.div
                    key={`insight-${market.symbol}`}
                    className="rounded-[24px] border border-border/75 bg-surface px-4 py-4"
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ amount: 0.5, once: true }}
                    transition={{ delay: 0.12 + index * 0.08, duration: 0.45 }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{market.name}</p>
                        <p className="mt-1 text-xs text-muted">{market.symbol} · {market.volumeLabel} 24h vol</p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          market.dayChangePercent >= 0 ? "bg-up/10 text-up" : "bg-down/10 text-down"
                        }`}
                      >
                        {formatChange(market.dayChangePercent)}
                      </span>
                    </div>
                    <div className="mt-4 overflow-hidden rounded-full bg-background/55">
                      <motion.div
                        animate={
                          reduceMotion
                            ? undefined
                            : {
                                width: [
                                  `${Math.max(18, 46 + market.shadowOffsetPercent * 100)}%`,
                                  `${Math.max(24, 60 + market.dayChangePercent * 6)}%`,
                                  `${Math.max(18, 46 + market.shadowOffsetPercent * 100)}%`,
                                ],
                              }
                        }
                        className="h-2 rounded-full bg-gradient-to-r from-brand via-[#7cd3ff] to-up"
                        transition={{
                          delay: index * 0.08,
                          duration: 4.2,
                          ease: "easeInOut",
                          repeat: Number.POSITIVE_INFINITY,
                        }}
                        style={{
                          width: `${Math.max(18, 54 + market.shadowOffsetPercent * 100)}%`,
                        }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </SectionFrame>

        <SectionFrame
          eyebrow="How it works"
          title="Three steps from idea to USDT payout."
          description="TrustTrade strips away the noise of traditional exchanges. You're three taps away from a position on Bitcoin, Ethereum, Solana or any of our supported pairs."
        >
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[30px] border border-border/80 bg-surface p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                  <TimerReset size={20} />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-muted">The numbers</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">
                    Fast. Fair. Always open.
                  </p>
                </div>
              </div>
              <p className="mt-5 text-sm leading-7 text-muted">
                Six trade windows from 30 seconds to a full day. Up to 85% payouts on every win.
                Five levels of referral commission. The whole crypto market — your call, your timing.
              </p>
              <div className="mt-6 grid gap-3">
                {platformMetrics.map((metric, index) => (
                  <motion.div
                    key={metric.label}
                    className="flex items-center justify-between rounded-[20px] border border-border/75 bg-surface-strong px-4 py-4"
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ amount: 0.5, once: true }}
                    transition={{ delay: 0.08 + index * 0.08, duration: 0.45 }}
                    whileHover={reduceMotion ? undefined : { x: 4 }}
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">{metric.label}</p>
                      <p className="mt-1 text-xs text-muted">{metric.detail}</p>
                    </div>
                    <p className="text-lg font-semibold text-brand">{metric.value}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              {executionSteps.map((step, index) => (
                <motion.article
                  key={step.title}
                  className="rounded-[28px] border border-border/80 bg-surface p-6"
                  initial={{ opacity: 0, x: 26 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ amount: 0.35, once: true }}
                  transition={{ delay: 0.08 + index * 0.1, duration: 0.55 }}
                  whileHover={reduceMotion ? undefined : { y: -6 }}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-lg font-semibold text-brand">
                      0{index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-2xl font-semibold text-foreground">{step.title}</h3>
                        <ChevronRight size={18} className="text-brand" />
                      </div>
                      <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
                        {step.detail}
                      </p>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </SectionFrame>

        <SectionFrame
          className="overflow-hidden"
          eyebrow="From the desk"
          title="Real traders. Real wins. Paid in USDT."
          description="Our community trades the same pairs you watch every day — BTC, ETH, SOL, BNB, XRP, DOGE — with cleaner mechanics and faster payouts than any spot exchange."
        >
          <div className="grid gap-5 xl:grid-cols-[0.78fr_1.22fr]">
            <motion.div
              className="relative overflow-hidden rounded-[30px] border border-border/80 bg-[linear-gradient(165deg,rgba(8,15,29,0.94),rgba(16,34,63,0.78))] p-6"
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ amount: 0.3, once: true }}
              transition={{ duration: 0.6 }}
            >
              <motion.div
                animate={
                  reduceMotion
                    ? undefined
                    : {
                        scale: [1, 1.08, 1],
                        x: ["-4%", "6%", "-4%"],
                        y: ["0%", "5%", "0%"],
                      }
                }
                className="absolute right-[-5rem] top-[-4rem] h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(61,156,255,0.36)_0%,rgba(61,156,255,0.08)_42%,transparent_72%)] blur-xl"
                transition={{ duration: 10, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
              />

              <div className="relative z-10">
                <p className="text-[11px] uppercase tracking-[0.32em] text-muted">
                  Why traders stay
                </p>
                <h3 className="mt-3 max-w-md text-3xl font-semibold tracking-tight text-foreground">
                  Win or lose, the result is on-chain fast.
                </h3>
                <p className="mt-4 max-w-md text-sm leading-7 text-muted">
                  No T+2 settlements. No support tickets to chase profit. The candle closes,
                  the trade resolves, and your USDT balance updates — within the same second.
                </p>

                <div className="mt-8 grid gap-3">
                  {[
                    { label: "Settlement", value: "Instant" },
                    { label: "Max payout", value: "85%" },
                    { label: "Markets", value: "10+ pairs" },
                  ].map((signal, index) => (
                    <motion.div
                      key={signal.label}
                      className="flex items-center justify-between rounded-[20px] border border-border/70 bg-surface px-4 py-4"
                      initial={{ opacity: 0, x: -16 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ amount: 0.5, once: true }}
                      transition={{ delay: 0.08 + index * 0.08, duration: 0.45 }}
                      whileHover={reduceMotion ? undefined : { x: 4 }}
                    >
                      <span className="text-sm text-muted">{signal.label}</span>
                      <span className="text-sm font-semibold text-foreground">{signal.value}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            <div className="relative overflow-hidden rounded-[30px] border border-border/80 bg-[linear-gradient(180deg,rgba(7,14,27,0.92),rgba(11,21,39,0.86))] p-4 sm:p-5">
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-[#08111d] via-[#08111d]/80 to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-[#08111d] via-[#08111d]/80 to-transparent" />

              <div className="space-y-4">
                {[0, 1].map((row) => (
                  <div key={row} className="overflow-hidden">
                    <motion.div
                      animate={
                        reduceMotion
                          ? undefined
                          : { x: row === 0 ? ["0%", "-50%"] : ["-50%", "0%"] }
                      }
                      className="flex min-w-max gap-4"
                      transition={{
                        duration: row === 0 ? 28 : 32,
                        ease: "linear",
                        repeat: Number.POSITIVE_INFINITY,
                      }}
                    >
                      {Array.from({ length: 2 }).flatMap((_, cloneIndex) =>
                        traderTestimonials.map((testimonial, index) => (
                          <motion.article
                            key={`${row}-${cloneIndex}-${testimonial.handle}`}
                            className="w-[320px] shrink-0 rounded-[26px] border border-border/75 bg-surface/95 p-5 shadow-[0_16px_60px_rgba(3,8,20,0.24)] backdrop-blur"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ amount: 0.2, once: true }}
                            transition={{ delay: index * 0.06, duration: 0.45 }}
                            whileHover={reduceMotion ? undefined : { y: -8, rotate: row === 0 ? -1 : 1 }}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand">
                                  {testimonial.handle}
                                </p>
                                <h3 className="mt-3 text-xl font-semibold text-foreground">
                                  {testimonial.highlight}
                                </h3>
                              </div>
                              <div
                                className={`rounded-full bg-gradient-to-r ${testimonial.tone} px-3 py-1 text-xs font-semibold text-background`}
                              >
                                {testimonial.result}
                              </div>
                            </div>

                            <p className="mt-5 text-sm leading-7 text-muted">
                              “{testimonial.quote}”
                            </p>

                            <div className="mt-6 flex items-center gap-2">
                              {Array.from({ length: 5 }).map((_, starIndex) => (
                                <motion.span
                                  key={`${testimonial.handle}-${starIndex}`}
                                  animate={
                                    reduceMotion
                                      ? undefined
                                      : { opacity: [0.55, 1, 0.55], y: [0, -1, 0] }
                                  }
                                  className="h-2.5 w-2.5 rounded-full bg-brand"
                                  transition={{
                                    delay: starIndex * 0.08,
                                    duration: 1.8,
                                    ease: "easeInOut",
                                    repeat: Number.POSITIVE_INFINITY,
                                  }}
                                />
                              ))}
                            </div>
                          </motion.article>
                        )),
                      )}
                    </motion.div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SectionFrame>

        <MotionSection className="relative overflow-hidden rounded-[36px] border border-border/80 bg-[linear-gradient(135deg,rgba(9,17,31,0.96),rgba(17,35,66,0.84))] p-8 shadow-[0_30px_120px_rgba(3,8,20,0.4)] sm:p-10 lg:p-12">
          <motion.div
            animate={
              reduceMotion
                ? undefined
                : {
                    x: ["-8%", "4%", "-8%"],
                    y: ["0%", "-8%", "0%"],
                  }
            }
            className="landing-orb absolute right-[-8rem] top-[-8rem] h-72 w-72 bg-[radial-gradient(circle,#3d9cff_0%,rgba(61,156,255,0.12)_28%,transparent_72%)]"
            transition={{ duration: 14, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
          />

          <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-brand">
                Start trading
              </p>
              <h2 className="mt-4 font-display text-4xl tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                The market is moving. So should you.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-muted">
                Open a TrustTrade account in under a minute. Fund with crypto, swap to USDT,
                and place your first trade on Bitcoin, Ethereum, Solana — or any of our top pairs — today.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/signup"
                className="group inline-flex items-center gap-3 rounded-full bg-brand px-7 py-4 text-sm font-semibold text-background transition hover:bg-[#66b2ff]"
              >
                Create free account
                <ArrowRight
                  size={16}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-3 rounded-full border border-border/80 bg-surface px-7 py-4 text-sm font-semibold text-foreground transition hover:border-brand/60 hover:bg-surface-strong"
              >
                Sign in
                <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
        </MotionSection>

        {hasAnySupportChannel(support) ? (
          <MotionSection className="rounded-[28px] border border-border/80 bg-surface/60 p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-md">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand">
                  Need a hand?
                </p>
                <h3 className="mt-1 font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  Talk to our support team
                </h3>
                <p className="mt-1.5 text-sm leading-6 text-muted">
                  Reach us on Telegram or WhatsApp — real humans, fast replies, 24/7.
                </p>
              </div>
              <SupportContact contacts={support} className="sm:max-w-sm sm:flex-1" />
            </div>
          </MotionSection>
        ) : null}

        <motion.footer
          className="pb-8 pt-2 text-center text-xs uppercase tracking-[0.26em] text-muted"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ amount: 0.8, once: true }}
          transition={{ duration: 0.6 }}
        >
          TrustTrade (c) {new Date().getFullYear()} | Trading involves risk | Crypto markets remain
          volatile
        </motion.footer>
      </div>
    </main>
  );
}
