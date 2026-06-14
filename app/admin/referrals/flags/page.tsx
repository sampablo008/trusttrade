import { Suspense } from "react";
import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import { connection } from "next/server";
import ReferralFlagsPanel from "@/components/admin/referral-flags-panel";
import { Skeleton } from "@/components/ui/Skeleton";
import { listAdminFlags } from "@/lib/referrals/admin-service";

export const metadata = { title: "Fraud Flags — Admin" };

// Live admin data. Must stay in its own Suspense boundary so Cache Components
// streams it fresh per request instead of serving the prerendered static shell
// (which would show empty/stale data for the route's stale-time window).
async function AdminReferralFlagsPageData() {
  // Admin pages are auth-gated and per-request; pin to request time so the
  // preview-data fallback (used on placeholder build env) runs at request, not
  // during prerender where Cache Components forbids Date.now()/non-deferred data.
  await connection();
  const flagsData = await listAdminFlags({ isResolved: false, limit: 200 });

  return <ReferralFlagsPanel initialFlags={flagsData.items} />;
}

export default function AdminReferralFlagsPage() {
  return (
    <>
      <AdminPageHeader
        eyebrow="Referrals"
        title="Fraud flags"
        description="Advisory signals raised automatically — same IP, velocity, rapid chain. Review and resolve; never auto-blocked."
      />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <AdminReferralFlagsPageData />
      </Suspense>
    </>
  );
}
