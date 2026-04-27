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
import type { PromoSlot } from "@/types/promo";
import type { MarketSnapshot } from "@/types/platform";

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
];

const defaultTrustSignals = [
  {
    body: "Execution surfaces stay clean and legible so users can move fast without losing risk context.",
    icon: ShieldCheck,
    title: "Institutional-grade control surface",
  },
  {
    body: "Live pairs, instant desk feedback, and clear payout framing keep decisions grounded in market flow.",
    icon: Zap,
    title: "Fast market response",
  },
  {
    body: "Referral momentum, wallet rails, and mobile-first access are built into the acquisition loop.",
    icon: Sparkles,
    title: "Growth engine built in",
  },
];

const defaultFeatureCards = [
  {
    body: "Monitor high-liquidity crypto pairs with bold directional cues, payout framing, and fast visual scanning.",
    icon: ChartCandlestick,
    title: "Live market board",
  },
  {
    body: "Confidence-first execution cards keep stake size, direction, and timing visible before the user commits.",
    icon: Gauge,
    title: "Disciplined order flow",
  },
  {
    body: "Funding rails and portfolio paths stay within reach, so the desk feels like a platform instead of a promo page.",
    icon: Wallet,
    title: "Wallet and portfolio continuity",
  },
];

const executionSteps = [
  {
    detail: "Track the strongest pair first. Market color, velocity, and payout signals pull attention where it matters.",
    title: "Read the tape",
  },
  {
    detail: "Set direction with clean conviction. The interface keeps the long-short decision central and visually obvious.",
    title: "Frame the trade",
  },
  {
    detail: "Move into settlement with a controlled risk posture, not a cluttered sequence of extra clicks and hidden states.",
    title: "Lock the position",
  },
];

const platformMetrics = [
  {
    detail: "High-clarity desks built for fast direction calls.",
    label: "Payout ceiling",
    value: "85%",
  },
  {
    detail: "Always-on access to active crypto pairs.",
    label: "Market access",
    value: "24/7",
  },
  {
    detail: "Clean capital entry and withdrawal pathways.",
    label: "Wallet response",
    value: "<2m",
  },
  {
    detail: "Acquisition loop connected to the trading core.",
    label: "Referral depth",
    value: "5 levels",
  },
];

const dashboardSignals = [
  {
    label: "Live risk monitor",
    value: "Nominal",
  },
  {
    label: "Desk liquidity",
    value: "Deep",
  },
  {
    label: "Settlement queue",
    value: "Flowing",
  },
];

const traderTestimonials = [
  {
    handle: "@atlasflow",
    highlight: "Caught the breakout early",
    quote:
      "The desk keeps the market readable. I can scan momentum, pick direction, and commit before the move gets crowded.",
    result: "+18.4% week",
    tone: "from-brand via-[#69c0ff] to-up",
  },
  {
    handle: "@solgrid",
    highlight: "Execution feels immediate",
    quote:
      "I stopped bouncing between tabs. The payout framing, market pressure, and wallet flow sit in one clean surface that actually pushes me to trade.",
    result: "24/7 active",
    tone: "from-[#0f9a6f] via-up to-[#8affcb]",
  },
  {
    handle: "@hedgeline",
    highlight: "Clean enough for repeat trades",
    quote:
      "It feels more like a control room than a promo funnel. That matters when you want confidence before locking a position.",
    result: "5-level referrals",
    tone: "from-warning via-[#ffb74a] to-brand",
  },
  {
    handle: "@voltpulse",
    highlight: "Friction dropped hard",
    quote:
      "Signup, funding, and execution feel connected. New users get to the desk fast, and that speed translates into more actual trading activity.",
    result: "<2m wallet flow",
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

export default function LandingShell({ slots, marketSnapshots }: LandingShellProps) {
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
          <Link href="/" aria-label="TrustPro home" className="shrink-0">
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
            className="rounded-full border border-border/80 bg-surface px-4 py-3"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex min-w-max items-center overflow-hidden">
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
                Trade with live market conviction
              </motion.div>

              <motion.h1
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 font-display text-5xl leading-[0.94] tracking-[-0.04em] text-foreground sm:text-6xl lg:text-[5.9rem]"
                initial={{ opacity: 0, y: 24 }}
                transition={{ delay: 0.18, duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
              >
                {hero?.title ?? "Trade crypto with a desk built to convert intent into action."}
              </motion.h1>

              <motion.p
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 max-w-2xl text-base leading-8 text-muted sm:text-lg"
                initial={{ opacity: 0, y: 24 }}
                transition={{ delay: 0.28, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              >
                {hero?.subtitle ??
                  "TrustPro frames the market like a professional control room: live pairs, disciplined execution paths, wallet continuity, and bold momentum cues that push users to trade while the signal is still hot."}
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
                  {hero?.ctaLabel ?? "Open trading desk"}
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
                        Market command
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        Crypto momentum board
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
                        Execution card
                      </p>
                      <TrendingUp size={16} className="text-brand" />
                    </div>
                    <div className="mt-5 rounded-[22px] border border-brand/20 bg-brand-soft/40 p-4">
                      <div className="flex items-center justify-between text-sm text-muted">
                        <span>BTCUSDT</span>
                        <span>02:30</span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <motion.div
                          className="rounded-[18px] border border-up/20 bg-up/10 px-4 py-3"
                          whileHover={reduceMotion ? undefined : { scale: 1.03 }}
                        >
                          <p className="text-[11px] uppercase tracking-[0.24em] text-up">Long</p>
                          <p className="mt-2 text-lg font-semibold text-foreground">Bull bias</p>
                        </motion.div>
                        <motion.div
                          className="rounded-[18px] border border-down/20 bg-down/10 px-4 py-3"
                          whileHover={reduceMotion ? undefined : { scale: 1.03 }}
                        >
                          <p className="text-[11px] uppercase tracking-[0.24em] text-down">
                            Short
                          </p>
                          <p className="mt-2 text-lg font-semibold text-foreground">Hedge bias</p>
                        </motion.div>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-sm text-muted">
                        <span>Projected payout</span>
                        <span className="font-semibold text-foreground">+85%</span>
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
                        Conversion layer
                      </p>
                      <Users size={16} className="text-warning" />
                    </div>
                    <p className="mt-3 text-3xl font-semibold text-foreground">5-level growth loop</p>
                    <p className="mt-3 text-sm leading-6 text-muted">
                      Users arrive for momentum, stay for clean execution, and pull new traders into
                      the same desk experience.
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
          eyebrow="Trust layer"
          title="Built to feel like a real trading platform, not a disposable campaign page."
          description="Trust signals, execution context, and strong operating language reduce hesitation. Users should feel invited to act because the interface looks disciplined, current, and market-aware."
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
          className="overflow-hidden"
          eyebrow="Platform edge"
          title="Every section reinforces the next trade."
          description="The landing page is structured like a funnel through a professional terminal: momentum first, clarity second, and frictionless capital movement underneath."
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
                  <p className="text-[11px] uppercase tracking-[0.32em] text-muted">Momentum panel</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    Live desk pressure stays visible
                  </p>
                </div>
                <Gauge size={18} className="text-brand" />
              </div>

              <div className="mt-8 grid gap-4">
                {topMarkets.map((market, index) => (
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
                        <p className="text-sm font-semibold text-foreground">{market.symbol}</p>
                        <p className="mt-1 text-xs text-muted">{market.volumeLabel} routed volume</p>
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
          eyebrow="Execution flow"
          title="A clear trading journey increases action."
          description="The page should not bury intent under abstract brand copy. It should move the user through observation, commitment, and account creation with a strong visual cadence."
        >
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[30px] border border-border/80 bg-surface p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                  <TimerReset size={20} />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-muted">Trade rhythm</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">
                    Compression. Clarity. Conversion.
                  </p>
                </div>
              </div>
              <p className="mt-5 text-sm leading-7 text-muted">
                Every animated surface narrows the user toward a decision. The market feels active.
                The interface feels precise. The call to trade feels earned.
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
          eyebrow="Trader proof"
          title="Real momentum needs visible social proof."
          description="Testimonials should feel like they are moving through the same market current as the rest of the page: alive, directional, and confident enough to make the next user step in."
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
                  Sentiment pulse
                </p>
                <h3 className="mt-3 max-w-md text-3xl font-semibold tracking-tight text-foreground">
                  The landing page now carries trader energy past the hero.
                </h3>
                <p className="mt-4 max-w-md text-sm leading-7 text-muted">
                  These quotes are staged like active desk chatter, not static endorsements. The
                  motion keeps social proof present without turning it into a loud carousel.
                </p>

                <div className="mt-8 grid gap-3">
                  {[
                    { label: "Confidence lift", value: "92%" },
                    { label: "Repeat intent", value: "High" },
                    { label: "Referral pull", value: "Compounding" },
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
                Final call
              </p>
              <h2 className="mt-4 font-display text-4xl tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Move while the market is live. Bring users into a platform that looks ready now.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-muted">
                The landing page now sells trading behavior through motion, control, and visible
                market energy. It should feel credible to serious users and persuasive to curious
                ones.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/signup"
                className="group inline-flex items-center gap-3 rounded-full bg-brand px-7 py-4 text-sm font-semibold text-background transition hover:bg-[#66b2ff]"
              >
                Create account
                <ArrowRight
                  size={16}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-3 rounded-full border border-border/80 bg-surface px-7 py-4 text-sm font-semibold text-foreground transition hover:border-brand/60 hover:bg-surface-strong"
              >
                Access existing desk
                <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
        </MotionSection>

        <motion.footer
          className="pb-8 pt-2 text-center text-xs uppercase tracking-[0.26em] text-muted"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ amount: 0.8, once: true }}
          transition={{ duration: 0.6 }}
        >
          TrustPro (c) {new Date().getFullYear()} | Trading involves risk | Crypto markets remain
          volatile
        </motion.footer>
      </div>
    </main>
  );
}
