import { headers } from "next/headers";
import ReferralsShell from "@/components/referrals/ReferralsShell";
import { assertUserApi } from "@/lib/auth/assert-user-api";
import { assertAuthenticated } from "@/lib/auth/session";
import { getMyCommissions, getMyReferralStats, getMyReferralTree } from "@/lib/referrals/service";

export const metadata = { title: "Referrals — TrustTrade" };

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
    <main className="flex w-full flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-16">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand">
          5-level referral pyramid
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Referrals
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-muted">
          Invite friends with your code. Earn commissions on their first deposit — up to 5
          levels deep. Commissions are locked until wagered 3×.
        </p>
      </header>

      <section className="rounded-[28px] border border-border bg-surface-soft p-6 sm:p-8">
        <ReferralsShell
          stats={stats}
          tree={treeData.items}
          commissions={commissionsData.items}
          baseUrl={baseUrl}
        />
      </section>
    </main>
  );
}
