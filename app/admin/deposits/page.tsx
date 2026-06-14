import { Suspense } from "react";
import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import { connection } from "next/server";
import DepositsQueue from "@/components/admin/deposits-queue";
import { Skeleton } from "@/components/ui/Skeleton";
import { listAdminDeposits } from "@/lib/deposits/admin-service";

export const metadata = { title: "Deposits — Admin" };

// Live deposit queue. Must stay in its own Suspense boundary so Cache Components
// streams it fresh per request instead of serving the prerendered static shell
// (which would show an empty queue for the route's stale-time window).
async function DepositsData() {
  // Admin pages are auth-gated and per-request; pin to request time so the
  // preview-data fallback (used on placeholder build env) runs at request, not
  // during prerender where Cache Components forbids Date.now()/non-deferred data.
  await connection();
  const result = await listAdminDeposits({ status: "pending", limit: 100, offset: 0 });

  return <DepositsQueue initialDeposits={result.items} />;
}

export default function AdminDepositsPage() {
  return (
    <>
      <AdminPageHeader
        eyebrow="Deposit queue"
        title="Deposits"
        description="Review user deposit claims. Approving credits the balance and fires referral commissions. Reject with a reason visible to the user."
      />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <DepositsData />
      </Suspense>
    </>
  );
}
