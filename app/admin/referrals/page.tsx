import Link from "next/link";
import { ArrowRight, Flag, GitBranch, ListChecks, Percent } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import { listAdminCommissions, listAdminFlags } from "@/lib/referrals/admin-service";

export const metadata = { title: "Referrals — Admin" };

type ModuleCard = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  badge: string | null;
  tone: "brand" | "warning";
};

export default async function AdminReferralsPage() {
  const [commissionsData, flagsData] = await Promise.all([
    listAdminCommissions({ status: "pending", limit: 1 }),
    listAdminFlags({ isResolved: false, limit: 1 }),
  ]);

  const modules: ModuleCard[] = [
    {
      href: "/admin/referrals/queue",
      icon: ListChecks,
      title: "Commission queue",
      description: "Approve or reject pending referral commissions. Bulk approve supported.",
      badge: commissionsData.total > 0 ? `${commissionsData.total} pending` : null,
      tone: "brand",
    },
    {
      href: "/admin/referrals/flags",
      icon: Flag,
      title: "Fraud flags",
      description: "Advisory signals — same IP, velocity, rapid chain. Resolve after review.",
      badge: flagsData.total > 0 ? `${flagsData.total} open` : null,
      tone: "warning",
    },
    {
      href: "/admin/referrals/rates",
      icon: Percent,
      title: "Commission rates",
      description: "Per-user bps overrides for all 5 referral levels.",
      badge: null,
      tone: "brand",
    },
    {
      href: "/admin/referrals/tree",
      icon: GitBranch,
      title: "Tree inspector",
      description: "Search any user and view their full upline and downline.",
      badge: null,
      tone: "brand",
    },
  ];

  return (
    <>
      <AdminPageHeader
        eyebrow="Referrals"
        title="Referral controls"
        description="5-level pyramid controls. Commission approval queue, fraud flag review, per-user bps overrides, and full upline/downline tree inspection."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {modules.map((mod) => {
          const Icon = mod.icon;
          const badgeClass =
            mod.tone === "warning"
              ? "bg-warning/15 text-warning"
              : "bg-brand/15 text-brand";
          return (
            <Link
              key={mod.href}
              href={mod.href}
              className="group flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 transition hover:border-brand/40"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-strong text-brand">
                  <Icon size={16} />
                </span>
                {mod.badge ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${badgeClass}`}
                  >
                    {mod.badge}
                  </span>
                ) : null}
              </div>
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-foreground">{mod.title}</h2>
                <p className="text-xs leading-5 text-muted">{mod.description}</p>
              </div>
              <span className="mt-auto inline-flex items-center gap-1.5 text-xs font-medium text-muted transition group-hover:text-brand">
                Open
                <ArrowRight size={12} />
              </span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
