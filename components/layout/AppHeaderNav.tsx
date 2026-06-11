"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeftRight,
  ChevronDown,
  Download,
  Gift,
  LogOut,
  PieChart,
  Settings,
  TrendingUp,
  User,
  Wallet as WalletIcon,
} from "lucide-react";
import { signOutPreview } from "@/app/actions/auth";
import BrandLogo from "@/components/brand/BrandLogo";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { formatUsdFromCents, formatUsdtFromCents } from "@/lib/utils/format";

interface AppHeaderNavProps {
  balanceCents: number;
  availableCents: number;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  pendingBonusCents?: number;
}

const NAV_LINKS = [
  { href: "/trade/BTC", label: "Trade", icon: TrendingUp },
  { href: "/portfolio", label: "Portfolio", icon: PieChart },
  { href: "/wallet", label: "Wallet", icon: WalletIcon },
  { href: "/swap", label: "Swap", icon: ArrowLeftRight },
];

export default function AppHeaderNav({
  balanceCents,
  availableCents,
  displayName,
  username,
  avatarUrl,
  pendingBonusCents = 0,
}: AppHeaderNavProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { canInstall, install } = usePwaInstall();

  const initial = (displayName ?? username ?? "U").charAt(0).toUpperCase();
  const isActive = (href: string) => pathname.startsWith(href.replace(/\/BTC$/, "/"));

  return (
    <>
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-xl">
      <div className="flex w-full items-center gap-4 px-4 py-3 sm:px-6 lg:px-16">
        {/* Logo */}
        <Link href="/" aria-label="TrustTrade home">
          <BrandLogo size={32} wordmarkClassName="hidden sm:block" />
        </Link>

        {/* Desktop nav */}
        <nav className="ml-4 hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-brand-soft text-brand"
                    : "text-muted hover:bg-background/40 hover:text-foreground"
                }`}
              >
                <Icon size={14} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {pendingBonusCents > 0 && (
            <Link
              href="/welcome"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-brand/40 bg-brand-soft px-3 py-2 text-xs font-semibold text-brand transition hover:border-brand sm:px-4"
            >
              <span
                aria-hidden
                className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent transition duration-700 group-hover:translate-x-full"
              />
              <Gift size={14} className="animate-pulse" />
              <span className="hidden sm:inline">
                Claim {formatUsdtFromCents(pendingBonusCents)}
              </span>
              <span className="sm:hidden">Gift</span>
            </Link>
          )}

          {/* Balance pill */}
          <Link
            href="/wallet"
            className="hidden items-center gap-3 rounded-full border border-border bg-surface/60 px-4 py-2 transition hover:border-brand/60 sm:flex"
          >
            <div className="flex flex-col items-end leading-tight">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                Available
              </span>
              <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                {formatUsdFromCents(availableCents)}
              </span>
            </div>
            <span className="h-8 w-px bg-border" />
            <div className="flex flex-col items-end leading-tight">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                Total
              </span>
              <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                {formatUsdFromCents(balanceCents)}
              </span>
            </div>
          </Link>

          {/* Deposit CTA */}
          <Link
            href="/wallet/deposit"
            className="hidden items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-background shadow-lg shadow-brand/25 transition hover:opacity-90 sm:flex"
          >
            + Deposit
          </Link>

          {/* Profile menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full border border-border bg-surface/60 p-1 pr-3 transition hover:border-brand/60"
            >
              <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-brand to-[hsl(var(--color-down))] text-xs font-bold text-background">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  initial
                )}
              </span>
              <ChevronDown size={14} className="hidden text-muted sm:block" />
            </button>

            {menuOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={() => setMenuOpen(false)}
                  className="fixed inset-0 z-30 cursor-default"
                />
                <div className="absolute right-0 top-12 z-40 w-56 overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
                  <div className="border-b border-border px-4 py-3">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {displayName ?? username ?? "Trader"}
                    </p>
                    {username && displayName && (
                      <p className="truncate text-xs text-muted">@{username}</p>
                    )}
                  </div>
                  <div className="flex flex-col py-1.5">
                    <MenuLink href="/me" icon={<User size={14} />} label="Profile" onClose={() => setMenuOpen(false)} />
                    <MenuLink href="/wallet" icon={<WalletIcon size={14} />} label="Wallet" onClose={() => setMenuOpen(false)} />
                    <MenuLink href="/portfolio" icon={<PieChart size={14} />} label="Portfolio" onClose={() => setMenuOpen(false)} />
                    <MenuLink href="/referrals" icon={<Settings size={14} />} label="Referrals" onClose={() => setMenuOpen(false)} />
                  </div>
                  {canInstall && (
                    <div className="border-t border-border py-1.5">
                      <button
                        type="button"
                        onClick={async () => {
                          setMenuOpen(false);
                          await install();
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-foreground transition hover:bg-background/50"
                      >
                        <Download size={14} />
                        Install app
                      </button>
                    </div>
                  )}
                  <div className="border-t border-border py-1.5">
                    <form action={signOutPreview}>
                      <button
                        type="submit"
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-down transition hover:bg-down/10"
                      >
                        <LogOut size={14} />
                        Sign out
                      </button>
                    </form>
                  </div>
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </header>

    {/* Mobile bottom tab bar */}
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto flex w-full max-w-350 items-stretch justify-around">
        {NAV_LINKS.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.href);
          return (
            <li key={link.href} className="flex-1">
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center justify-center gap-1 px-2 py-2.5 text-[11px] font-semibold transition ${
                  active ? "text-brand" : "text-muted hover:text-foreground"
                }`}
              >
                <Icon size={20} />
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
    </>
  );
}

function MenuLink({
  href,
  icon,
  label,
  onClose,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClose: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className="flex items-center gap-2 px-4 py-2 text-sm text-foreground transition hover:bg-background/50"
    >
      {icon}
      {label}
    </Link>
  );
}
