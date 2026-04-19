import Link from "next/link";
import { ArrowLeft, Users, ShieldAlert, Sliders, GitBranch } from "lucide-react";
import { signOutPreview } from "@/app/actions/auth";
import { assertAdmin } from "@/lib/auth/assertAdmin";
import { listAdminCommissions } from "@/lib/referrals/admin-service";
import { listAdminFlags } from "@/lib/referrals/admin-service";

export const metadata = { title: "Referrals — Admin" };

export default async function AdminReferralsPage() {
  const session = await assertAdmin();

  const [commissionsData, flagsData] = await Promise.all([
    listAdminCommissions({ status: "pending", limit: 1 }),
    listAdminFlags({ isResolved: false, limit: 1 }),
  ]);

  const pendingCount = commissionsData.total;
  const openFlags = flagsData.total;

  const modules = [
    {
      href: "/admin/referrals/queue",
      icon: <Users size={22} className="text-brand" />,
      title: "Commission queue",
      description: "Approve or reject pending referral commissions. Bulk approve supported.",
      badge: pendingCount > 0 ? `${pendingCount} pending` : null,
      badgeColor: "bg-brand/10 text-brand",
    },
    {
      href: "/admin/referrals/flags",
      icon: <ShieldAlert size={22} className="text-orange-400" />,
      title: "Fraud flags",
      description: "Advisory signals — same IP, velocity, rapid chain. Resolve after review.",
      badge: openFlags > 0 ? `${openFlags} open` : null,
      badgeColor: "bg-orange-500/10 text-orange-400",
    },
    {
      href: "/admin/referrals/rates",
      icon: <Sliders size={22} className="text-brand" />,
      title: "Commission rates",
      description: "Per-user bps overrides for all 5 referral levels.",
      badge: null,
      badgeColor: "",
    },
    {
      href: "/admin/referrals/tree",
      icon: <GitBranch size={22} className="text-brand" />,
      title: "Tree inspector",
      description: "Search any user and view their full upline and downline.",
      badge: null,
      badgeColor: "",
    },
  ];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-[36px] border border-border bg-surface-soft p-8">
        <div className="flex flex-col gap-6 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background/30 px-4 py-2 text-sm font-semibold text-foreground transition hover:border-brand"
            >
              <ArrowLeft size={16} />
              Back to admin
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand">
                Admin / Referrals
              </p>
              <h1 className="mt-3 font-display text-5xl tracking-tight text-foreground">
                Referrals
              </h1>
            </div>
            <p className="max-w-3xl text-base leading-8 text-muted">
              5-level referral pyramid controls. Commission approval queue, fraud flags, per-user
              rate overrides, and full tree inspection.
            </p>
          </div>
          <form action={signOutPreview}>
            <button
              type="submit"
              className="rounded-full border border-border bg-background/35 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-brand"
            >
              Sign out {session.username ? `(${session.username})` : ""}
            </button>
          </form>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {modules.map((mod) => (
            <Link
              key={mod.href}
              href={mod.href}
              className="group rounded-2xl border border-border bg-background/20 p-6 transition hover:border-brand"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {mod.icon}
                    <h2 className="font-bold text-foreground group-hover:text-brand">
                      {mod.title}
                    </h2>
                    {mod.badge && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold ${mod.badgeColor}`}
                      >
                        {mod.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted">{mod.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
