import { Suspense } from "react";
import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import { connection } from "next/server";
import ReferralRatesPanel from "@/components/admin/referral-rates-panel";
import { Skeleton } from "@/components/ui/Skeleton";
import { listAdminUsers } from "@/lib/admin/users-service";

export const metadata = { title: "Commission Rates — Admin" };

// Live admin data. Must stay in its own Suspense boundary so Cache Components
// streams it fresh per request instead of serving the prerendered static shell
// (which would show empty/stale data for the route's stale-time window).
async function AdminReferralRatesPageData() {
  // Admin pages are auth-gated and per-request; pin to request time so the
  // preview-data fallback (used on placeholder build env) runs at request, not
  // during prerender where Cache Components forbids Date.now()/non-deferred data.
  await connection();
  const usersData = await listAdminUsers("", 200, 0);

  return <ReferralRatesPanel users={usersData.items} />;
}

export default function AdminReferralRatesPage() {
  return (
    <>
      <AdminPageHeader
        eyebrow="Referrals"
        title="Commission rates"
        description="Override the 5-level bps rates for individual users. Falls back to global defaults when no override is set."
      />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <AdminReferralRatesPageData />
      </Suspense>
    </>
  );
}
