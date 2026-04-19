import Link from "next/link";
import { ArrowDownToLine, ArrowUpRight, PieChart, Users } from "lucide-react";
import { formatUsdFromCents } from "@/lib/utils/format";

interface WalletHeroProps {
  balanceCents: number;
  lockedInTradesCents: number;
  lockedBonusCents: number;
  withdrawableCents: number;
}

const QUICK_ACTIONS = [
  {
    href: "/wallet/deposit",
    label: "Deposit",
    sub: "Fund account",
    icon: ArrowUpRight,
    accent: "from-[hsl(var(--color-up))]/20 to-brand/10 text-[hsl(var(--color-up))]",
  },
  {
    href: "/wallet/withdraw",
    label: "Withdraw",
    sub: "Cash out",
    icon: ArrowDownToLine,
    accent: "from-brand/20 to-[hsl(var(--color-down))]/10 text-brand",
  },
  {
    href: "/portfolio",
    label: "Portfolio",
    sub: "Trade history",
    icon: PieChart,
    accent: "from-[hsl(var(--color-down))]/20 to-brand/10 text-[hsl(var(--color-down))]",
  },
  {
    href: "/referrals",
    label: "Referrals",
    sub: "Earn bonuses",
    icon: Users,
    accent: "from-yellow-400/20 to-brand/10 text-yellow-400",
  },
];

export default function WalletHero({
  balanceCents,
  lockedInTradesCents,
  lockedBonusCents,
  withdrawableCents,
}: WalletHeroProps) {
  const totalLocked = lockedInTradesCents + lockedBonusCents;

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-border bg-linear-to-br from-surface to-surface-soft p-6 sm:p-8">
      {/* Background glow */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-[hsl(var(--color-up))]/10 blur-3xl" />

      <div className="relative flex flex-col gap-6">
        {/* Total balance */}
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
            Total balance
          </p>
          <p className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {formatUsdFromCents(balanceCents)}
          </p>
          <p className="text-xs text-muted">
            Across all tokens · updated in real-time
          </p>
        </div>

        {/* Breakdown */}
        <div className="grid gap-3 sm:grid-cols-3">
          <BreakdownPill
            label="Withdrawable"
            value={formatUsdFromCents(withdrawableCents)}
            valueClass="text-[hsl(var(--color-up))]"
            badge="Available"
          />
          <BreakdownPill
            label="In trades"
            value={formatUsdFromCents(lockedInTradesCents)}
            valueClass="text-yellow-400"
            badge="Active"
          />
          <BreakdownPill
            label="Bonus locked"
            value={formatUsdFromCents(lockedBonusCents)}
            valueClass="text-foreground"
            badge="Wagered"
          />
        </div>

        {/* Quick actions */}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-border bg-background/40 p-4 transition hover:border-brand/60 hover:bg-background/60"
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br ${action.accent}`}
                >
                  <Icon size={18} />
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-semibold text-foreground">{action.label}</span>
                  <span className="text-xs text-muted">{action.sub}</span>
                </div>
                <span className="ml-auto text-muted transition group-hover:translate-x-0.5 group-hover:text-foreground">
                  →
                </span>
              </Link>
            );
          })}
        </div>

        {totalLocked > 0 && (
          <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/30 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-400/10 text-yellow-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <p className="text-xs text-muted">
              <span className="font-semibold text-foreground">
                {formatUsdFromCents(totalLocked)}
              </span>{" "}
              is locked and not withdrawable until trades settle or bonus wagering is complete.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function BreakdownPill({
  label,
  value,
  valueClass,
  badge,
}: {
  label: string;
  value: string;
  valueClass: string;
  badge: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-border bg-background/35 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">{label}</span>
        <span className="rounded-full bg-background/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
          {badge}
        </span>
      </div>
      <span className={`font-display text-2xl font-semibold tabular-nums ${valueClass}`}>
        {value}
      </span>
    </div>
  );
}
