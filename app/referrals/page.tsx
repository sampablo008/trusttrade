import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { assertAuthenticated } from "@/lib/auth/session";
import { getMyReferralStats, getMyReferralTree, getMyCommissions } from "@/lib/referrals/service";
import { assertUserApi } from "@/lib/auth/assert-user-api";
import ReferralsShell from "@/components/referrals/ReferralsShell";
import { headers } from "next/headers";

export const metadata = { title: "Referrals — TrustPro" };

export default async function ReferralsPage() {
  await assertAuthenticated();
  const session = await assertUserApi();

  const [stats, treeData, commissionsData] = await Promise.all([
    getMyReferralStats(session.userId),
    getMyReferralTree(session.userId, undefined, 200, 0),
    getMyCommissions(session.userId, 100, 0),
  ]);

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-[36px] border border-border bg-surface-soft p-8">
        <div className="flex flex-col gap-6 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <Link
              href="/trade"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background/30 px-4 py-2 text-sm font-semibold text-foreground transition hover:border-brand"
            >
              <ArrowLeft size={16} />
              Back to trading
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand">
                5-level referral pyramid
              </p>
              <h1 className="mt-3 font-display text-5xl tracking-tight text-foreground">
                Referrals
              </h1>
            </div>
            <p className="max-w-2xl text-base leading-8 text-muted">
              Invite friends with your code. Earn commissions on their first deposit — up to 5
              levels deep. Commissions are locked until wagered 3×.
            </p>
          </div>
        </div>

        <div className="mt-8">
          <ReferralsShell
            stats={stats}
            tree={treeData.items}
            commissions={commissionsData.items}
            baseUrl={baseUrl}
          />
        </div>
      </section>
    </main>
  );
}
