import { Suspense } from "react";
import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import { connection } from "next/server";
import ReferralCommissionQueue from "@/components/admin/referral-commission-queue";
import { Skeleton } from "@/components/ui/Skeleton";
import { listAdminCommissions } from "@/lib/referrals/admin-service";

export const metadata = { title: "Commission Queue — Admin" };

// Live admin data. Must stay in its own Suspense boundary so Cache Components
// streams it fresh per request instead of serving the prerendered static shell
// (which would show empty/stale data for the route's stale-time window).
async function AdminReferralQueuePageData() {
  // Admin pages are auth-gated and per-request; pin to request time so the
  // preview-data fallback (used on placeholder build env) runs at request, not
  // during prerender where Cache Components forbids Date.now()/non-deferred data.
  await connection();
  const commissionsData = await listAdminCommissions({ limit: 200 });

  return <ReferralCommissionQueue initialCommissions={commissionsData.items} />;
}

export default function AdminReferralQueuePage() {
  return (
    <>
      <AdminPageHeader
        eyebrow="Referrals"
        title="Commission queue"
        description="Approve or reject pending commissions. Approved commissions are credited as locked bonus tickets (3× wager before withdrawal)."
      />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <AdminReferralQueuePageData />
      </Suspense>
    </>
  );
}
