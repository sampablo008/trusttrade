"use client";

import { useState, useCallback } from "react";
import {
  Users,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Clock,
  ExternalLink,
} from "lucide-react";
import type { ReferralCommission, ReferralStats, ReferralTreeNode } from "@/types/referrals";
import { formatUsdFromCents } from "@/lib/utils/format";

interface ReferralsShellProps {
  stats: ReferralStats;
  tree: ReferralTreeNode[];
  commissions: ReferralCommission[];
  baseUrl: string;
}

function QRShareSection({ code, baseUrl }: { code: string; baseUrl: string }) {
  const [copied, setCopied] = useState(false);
  const shareLink = `${baseUrl}/signup?ref=${code}`;

  const copyLink = useCallback(async () => {
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [shareLink]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="rounded-xl bg-brand/10 px-4 py-2 font-mono text-lg font-bold tracking-widest text-brand">
          {code}
        </span>
        <button
          onClick={copyLink}
          className="flex items-center gap-2 rounded-full border border-border bg-background/30 px-4 py-2 text-sm font-semibold text-foreground transition hover:border-brand"
        >
          {copied ? <Check size={14} className="text-up" /> : <Copy size={14} />}
          {copied ? "Copied!" : "Copy code"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">Share your link:</span>
        <button
          onClick={copyLink}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-soft px-3 py-1.5 font-mono text-xs text-muted transition hover:border-brand hover:text-foreground"
        >
          <ExternalLink size={12} />
          {shareLink.length > 48 ? shareLink.slice(0, 48) + "…" : shareLink}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent("Join me on TrustPro! " + shareLink)}` },
          { label: "Telegram", href: `https://t.me/share/url?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent("Join me on TrustPro!")}` },
          { label: "X / Twitter", href: `https://twitter.com/intent/tweet?text=${encodeURIComponent("Join me on TrustPro! " + shareLink)}` },
        ].map(({ label, href }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-border bg-background/30 px-4 py-2 text-sm font-semibold text-foreground transition hover:border-brand"
          >
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}

function StatsCards({ stats }: { stats: ReferralStats }) {
  const cards = [
    {
      label: "Total referrals",
      value: stats.totalReferrals,
      sub: `${stats.directReferrals} direct`,
      icon: <Users size={18} className="text-brand" />,
    },
    {
      label: "Pending earnings",
      value: formatUsdFromCents(stats.pendingCommissionCents),
      sub: "Awaiting admin approval",
      icon: <Clock size={18} className="text-brand" />,
    },
    {
      label: "Approved earnings",
      value: formatUsdFromCents(stats.approvedCommissionCents),
      sub: "Locked — wager 3× to withdraw",
      icon: <TrendingUp size={18} className="text-up" />,
    },
    {
      label: "Lifetime total",
      value: formatUsdFromCents(stats.totalCommissionCents),
      sub: "Pending + approved",
      icon: <TrendingUp size={18} className="text-brand" />,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-2xl border border-border bg-surface-soft p-5 space-y-2"
        >
          <div className="flex items-center gap-2">
            {c.icon}
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">
              {c.label}
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">{c.value}</p>
          <p className="text-xs text-muted">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}

function TreeAccordion({ tree }: { tree: ReferralTreeNode[] }) {
  const [openLevels, setOpenLevels] = useState<Set<number>>(new Set([1]));

  const levels = [1, 2, 3, 4, 5];
  const byLevel = (lvl: number) => tree.filter((n) => n.level === lvl);

  const toggle = (lvl: number) =>
    setOpenLevels((prev) => {
      const next = new Set(prev);
      if (next.has(lvl)) { next.delete(lvl); } else { next.add(lvl); }
      return next;
    });

  const levelLabel = (lvl: number) => {
    const items = byLevel(lvl);
    return `Level ${lvl} — ${items.length} ${items.length === 1 ? "referral" : "referrals"}`;
  };

  return (
    <div className="space-y-2">
      {levels.map((lvl) => {
        const items = byLevel(lvl);
        const isOpen = openLevels.has(lvl);
        return (
          <div key={lvl} className="rounded-2xl border border-border overflow-hidden">
            <button
              onClick={() => toggle(lvl)}
              className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-surface-soft"
            >
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-bold text-brand">
                  L{lvl}
                </span>
                <span className="font-semibold text-foreground">{levelLabel(lvl)}</span>
              </div>
              {isOpen ? (
                <ChevronDown size={16} className="text-muted" />
              ) : (
                <ChevronRight size={16} className="text-muted" />
              )}
            </button>

            {isOpen && items.length > 0 && (
              <div className="border-t border-border divide-y divide-border">
                {items.map((node) => (
                  <div
                    key={node.refereeUserId}
                    className="flex items-center justify-between px-5 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand">
                        {node.refereeUsername.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {node.refereeUsername}
                        </p>
                        <p className="text-xs text-muted">{node.refereeEmail}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted">
                      Joined {new Date(node.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {isOpen && items.length === 0 && (
              <div className="border-t border-border px-5 py-6 text-center text-sm text-muted">
                No referrals at level {lvl} yet.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const STATUS_PILL: Record<string, string> = {
  approved: "bg-up/10 text-up",
  clawed_back: "bg-down/10 text-down",
  pending: "bg-brand/10 text-brand",
  rejected: "bg-down/10 text-down",
};

function CommissionTable({ commissions }: { commissions: ReferralCommission[] }) {
  if (commissions.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface-soft p-8 text-center">
        <Users size={32} className="mx-auto mb-3 text-muted" />
        <p className="text-sm text-muted">No commissions yet. Invite friends to start earning.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-soft">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
              Date
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
              Referee
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
              Level
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted">
              Amount
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {commissions.map((c) => (
            <tr key={c.id} className="transition hover:bg-surface-soft/50">
              <td className="px-4 py-3 text-muted">
                {new Date(c.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 font-medium text-foreground">{c.refereeUsername}</td>
              <td className="px-4 py-3 text-muted">L{c.level}</td>
              <td className="px-4 py-3 text-right font-semibold text-foreground">
                {formatUsdFromCents(c.commissionCents)}
              </td>
              <td className="px-4 py-3 text-center">
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_PILL[c.status] ?? ""}`}
                >
                  {c.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ReferralsShell({
  stats,
  tree,
  commissions,
  baseUrl,
}: ReferralsShellProps) {
  const [tab, setTab] = useState<"tree" | "commissions">("tree");

  return (
    <div className="space-y-8">
      {/* Stats */}
      <StatsCards stats={stats} />

      {/* Share */}
      <div className="rounded-2xl border border-border bg-surface-soft p-6">
        <h2 className="mb-4 text-base font-bold text-foreground">Your referral code</h2>
        <QRShareSection code={stats.code} baseUrl={baseUrl} />
      </div>

      {/* Tabs */}
      <div>
        <div className="mb-4 flex gap-2 border-b border-border">
          {(["tree", "commissions"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-semibold transition ${
                tab === t
                  ? "border-b-2 border-brand text-brand"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {t === "tree" ? "Referral tree" : "Commission history"}
            </button>
          ))}
        </div>

        {tab === "tree" && <TreeAccordion tree={tree} />}
        {tab === "commissions" && <CommissionTable commissions={commissions} />}
      </div>
    </div>
  );
}
