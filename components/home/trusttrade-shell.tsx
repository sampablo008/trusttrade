import {
  ArrowRight,
  ChartCandlestick,
  Cpu,
  Layers3,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import SectionHeading from "@/components/home/section-heading";
import SettlementQueueTable from "@/components/home/settlement-queue-table";
import TradingWorkbench from "@/components/home/trading-workbench";
import { moneyLoop, referralMilestones, securityInvariants } from "@/lib/constants/platform";
import type { MarketSnapshot } from "@/types/platform";

interface TrustTradeShellProps {
  marketSnapshots: MarketSnapshot[];
}

export default function TrustTradeShell({ marketSnapshots }: TrustTradeShellProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-16 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="overflow-hidden rounded-[36px] border border-border bg-surface-soft px-6 py-6 shadow-[0_24px_80px_rgba(3,6,15,0.45)] sm:px-8 lg:px-10">
        <div className="flex flex-col gap-6 border-b border-border pb-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-soft px-4 py-2 text-xs uppercase tracking-[0.28em] text-brand">
              <Cpu size={14} />
              Sprint 0 foundation in flight
            </div>
            <div className="space-y-4">
              <h1 className="max-w-4xl font-display text-5xl leading-none tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                Shadow exchange shell. Real product feel. Admin control at the core.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-muted sm:text-lg">
                TrustTrade now has a real app shell: controlled market snapshots, a trade ticket,
                a live admin queue surface, and the first server-only backend modules wired for the
                rest of the build.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:w-[460px]">
            <div className="rounded-[28px] border border-border bg-background/35 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-muted">Chart shell</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">1s → 1h</p>
            </div>
            <div className="rounded-[28px] border border-border bg-background/35 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-muted">Outcome control</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">God-mode</p>
            </div>
            <div className="rounded-[28px] border border-border bg-background/35 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-muted">Money math</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">Cents only</p>
            </div>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-full border border-border bg-background/45 py-3">
          <div className="ticker-track flex min-w-max items-center gap-10 px-6 text-sm uppercase tracking-[0.28em] text-muted">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={`ticker-${index}`} className="flex items-center gap-10">
                <span className="inline-flex items-center gap-2 text-up">
                  <ChartCandlestick size={14} />
                  Shadow Binance feed
                </span>
                <span className="inline-flex items-center gap-2 text-brand">
                  <Layers3 size={14} />
                  Zustand shared state
                </span>
                <span className="inline-flex items-center gap-2 text-warning">
                  <WalletCards size={14} />
                  Wallet rails queued
                </span>
                <span className="inline-flex items-center gap-2 text-foreground">
                  <ShieldCheck size={14} />
                  Server-only Supabase path
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <TradingWorkbench marketSnapshots={marketSnapshots} />

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[36px] border border-border bg-surface-soft p-6">
          <SectionHeading
            eyebrow="Money Loop"
            title="Business logic, shown plain"
            description="The core loop now has a visible product narrative so future flows can land into a consistent UI without placeholder scaffolding."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {moneyLoop.map((step, index) => (
              <article
                key={step.title}
                className="rounded-[28px] border border-border bg-background/30 p-5"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand">
                  0{index + 1}
                </div>
                <h3 className="mt-5 text-xl font-semibold text-foreground">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted">{step.description}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-[36px] border border-border bg-surface-soft p-6">
          <SectionHeading
            eyebrow="Referral Ladder"
            title="Five levels. Locked until wager clears."
            description="The referral section is shaped early so later commission pages can reuse the same visual language."
          />
          <div className="mt-8 space-y-3">
            {referralMilestones.map((milestone) => (
              <div
                key={milestone.level}
                className="flex items-center justify-between rounded-[24px] border border-border bg-background/30 px-4 py-4"
              >
                <div>
                  <p className="font-semibold text-foreground">{milestone.level}</p>
                  <p className="text-sm text-muted">{milestone.note}</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-sm font-semibold text-brand">
                  {milestone.rateLabel}
                  <ArrowRight size={14} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SettlementQueueTable />

      <section className="rounded-[36px] border border-border bg-surface-soft p-6">
        <SectionHeading
          eyebrow="Invariants"
          title="Rules that future phases cannot violate"
          description="These are rendered into the shell now because they drive how the API layer, wallet work, and auth middleware need to be built."
        />
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {securityInvariants.map((item) => (
            <article
              key={item.title}
              className="rounded-[28px] border border-border bg-background/30 p-5"
            >
              <div className="inline-flex rounded-full bg-up/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-up">
                Locked rule
              </div>
              <h3 className="mt-4 text-xl font-semibold text-foreground">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted">{item.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
