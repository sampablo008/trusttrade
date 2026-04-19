"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ChevronDown,
  LogOut,
  Menu,
  PieChart,
  Settings,
  TrendingUp,
  User,
  Wallet as WalletIcon,
  X,
} from "lucide-react";
import { signOutPreview } from "@/app/actions/auth";
import { formatUsdFromCents } from "@/lib/utils/format";

interface AppHeaderNavProps {
  balanceCents: number;
  availableCents: number;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
}

const NAV_LINKS = [
  { href: "/trade/BTC", label: "Trade", icon: TrendingUp },
  { href: "/portfolio", label: "Portfolio", icon: PieChart },
  { href: "/wallet", label: "Wallet", icon: WalletIcon },
];

export default function AppHeaderNav({
  balanceCents,
  availableCents,
  displayName,
  username,
  avatarUrl,
}: AppHeaderNavProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const initial = (displayName ?? username ?? "U").charAt(0).toUpperCase();
  const isActive = (href: string) => pathname.startsWith(href.replace(/\/BTC$/, "/"));

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-350 items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/trade/BTC" className="flex items-center gap-2">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-linear-to-br from-brand to-[hsl(var(--color-up))] shadow-lg shadow-brand/30">
            <span className="font-display text-sm font-bold text-background">T</span>
          </div>
          <span className="hidden font-display text-base font-semibold tracking-tight text-foreground sm:block">
            TrustPro
          </span>
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

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface/60 text-muted transition hover:border-brand/60 lg:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="border-t border-border bg-surface/95 lg:hidden">
          <div className="mx-auto flex max-w-350 flex-col gap-1 px-4 py-3">
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    active
                      ? "bg-brand-soft text-brand"
                      : "text-muted hover:bg-background/40 hover:text-foreground"
                  }`}
                >
                  <Icon size={16} />
                  {link.label}
                </Link>
              );
            })}
            <div className="mt-1 flex items-center justify-between rounded-xl border border-border bg-background/40 px-3 py-2.5">
              <div className="flex flex-col leading-tight">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                  Available
                </span>
                <span className="font-mono text-sm font-semibold text-foreground">
                  {formatUsdFromCents(availableCents)}
                </span>
              </div>
              <Link
                href="/wallet/deposit"
                onClick={() => setMobileOpen(false)}
                className="rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-background"
              >
                Deposit
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
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
