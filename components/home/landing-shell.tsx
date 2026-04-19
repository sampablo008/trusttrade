import Link from "next/link";
import {
  ChartCandlestick,
  Gift,
  Globe,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import type { PromoSlot } from "@/types/promo";
import type { MarketSnapshot } from "@/types/platform";

const FEATURE_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  feature_charts: ChartCandlestick,
  feature_referrals: Users,
  feature_profits: TrendingUp,
  feature_tokens: Globe,
  feature_wallet: Wallet,
  feature_mobile: Smartphone,
};

const TRUST_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  badge_security: ShieldCheck,
  badge_payouts: Zap,
  badge_support: Gift,
};

interface LandingShellProps {
  slots: PromoSlot[];
  marketSnapshots: MarketSnapshot[];
}

export default function LandingShell({ slots, marketSnapshots }: LandingShellProps) {
  const bySlug = Object.fromEntries(slots.map((s) => [s.slug, s]));
  const hero = bySlug["hero"];
  const badges = slots.filter((s) => s.slug.startsWith("badge_"));
  const features = slots.filter((s) => s.slug.startsWith("feature_"));

  return (
    <main className="flex min-h-screen flex-col">
      {/* Ticker */}
      <div className="border-b border-border bg-surface-soft py-3 overflow-hidden">
        <div className="ticker-track flex min-w-max items-center gap-10 px-6 text-xs uppercase tracking-[0.28em] text-muted">
          {Array.from({ length: 2 }).flatMap((_, i) =>
            marketSnapshots.map((m) => (
              <span key={`${i}-${m.symbol}`} className="inline-flex items-center gap-2">
                <ChartCandlestick size={12} />
                <strong className="text-foreground">{m.symbol}</strong>
                <span className={m.dayChangePercent >= 0 ? "text-up" : "text-down"}>
                  {m.dayChangePercent >= 0 ? "+" : ""}
                  {m.dayChangePercent.toFixed(2)}%
                </span>
              </span>
            )),
          )}
        </div>
      </div>

      {/* Hero */}
      <section className="mx-auto flex w-full max-w-6xl flex-col items-center gap-8 px-4 py-20 text-center sm:px-6 lg:py-28">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-soft px-4 py-2 text-xs uppercase tracking-[0.28em] text-brand">
          <TrendingUp size={12} />
          Binary crypto trading
        </div>
        <h1 className="max-w-4xl font-display text-5xl leading-none tracking-tight text-foreground sm:text-6xl lg:text-7xl">
          {hero?.title ?? "Trade crypto. Win big."}
        </h1>
        <p className="max-w-xl text-lg leading-8 text-muted">
          {hero?.subtitle ?? "Binary signals, live charts, instant payouts."}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href={hero?.ctaHref ?? "/signup"}
            className="rounded-full bg-brand px-8 py-4 text-sm font-semibold text-background transition hover:opacity-90"
          >
            {hero?.ctaLabel ?? "Start trading"}
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-border px-8 py-4 text-sm font-semibold text-foreground transition hover:border-brand"
          >
            Sign in
          </Link>
        </div>

        {/* Live profit marquee */}
        <div className="mt-4 w-full max-w-2xl overflow-hidden rounded-[20px] border border-border bg-surface-soft py-3">
          <div className="ticker-track flex min-w-max items-center gap-8 px-4 text-xs text-muted">
            {Array.from({ length: 3 }).flatMap((_, i) => [
              <span key={`${i}-a`} className="inline-flex items-center gap-2"><TrendingUp size={11} className="text-up" /><span className="text-up font-semibold">+$248</span> user_7x3 just won</span>,
              <span key={`${i}-b`} className="inline-flex items-center gap-2"><TrendingUp size={11} className="text-up" /><span className="text-up font-semibold">+$1,850</span> cryptoAlpha hit big</span>,
              <span key={`${i}-c`} className="inline-flex items-center gap-2"><TrendingUp size={11} className="text-up" /><span className="text-up font-semibold">+$92</span> moonshot22 won long</span>,
            ])}
          </div>
        </div>
      </section>

      {/* Trust badges */}
      {badges.length > 0 && (
        <section className="border-y border-border bg-surface-soft py-12">
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-4 sm:grid-cols-3 sm:px-6">
            {badges.map((badge) => {
              const Icon = TRUST_ICONS[badge.slug] ?? ShieldCheck;
              return (
                <div key={badge.id} className="flex flex-col items-center gap-3 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background/30">
                    <Icon size={22} className="text-brand" />
                  </div>
                  <p className="font-semibold text-foreground">{badge.title}</p>
                  <p className="text-sm leading-6 text-muted">{badge.body}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Features grid */}
      {features.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="mb-10 text-center font-display text-4xl text-foreground">
            Everything you need to trade
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feat) => {
              const Icon = FEATURE_ICONS[feat.slug] ?? Zap;
              return (
                <article
                  key={feat.id}
                  className="rounded-[28px] border border-border bg-surface-soft p-6"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-brand-soft">
                    <Icon size={20} className="text-brand" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-foreground">{feat.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{feat.body}</p>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Final CTA */}
      <section className="border-t border-border bg-surface-soft py-20 text-center">
        <h2 className="font-display text-4xl text-foreground">Ready to start?</h2>
        <p className="mt-4 text-muted">Join today with an invitation code.</p>
        <Link
          href="/signup"
          className="mt-8 inline-flex rounded-full bg-brand px-10 py-4 text-sm font-semibold text-background transition hover:opacity-90"
        >
          Create account
        </Link>
      </section>

      <footer className="border-t border-border py-6 text-center text-xs text-muted">
        © {new Date().getFullYear()} TrustPro. Trading involves risk.
      </footer>
    </main>
  );
}
