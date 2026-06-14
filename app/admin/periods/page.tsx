import { Suspense } from "react";
import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import { connection } from "next/server";
import PeriodControlPanel from "@/components/admin/period-control-panel";
import { Skeleton } from "@/components/ui/Skeleton";
import { listAdminTradePeriods } from "@/lib/markets/admin-service";

export const metadata = { title: "Periods — Admin" };

// Live admin data. Must stay in its own Suspense boundary so Cache Components
// streams it fresh per request instead of serving the prerendered static shell
// (which would show empty/stale data for the route's stale-time window).
async function AdminPeriodsPageData() {
  // Admin pages are auth-gated and per-request; pin to request time so the
  // preview-data fallback (used on placeholder build env) runs at request, not
  // during prerender where Cache Components forbids Date.now()/non-deferred data.
  await connection();
  const periodData = await listAdminTradePeriods();

  return <PeriodControlPanel initialData={periodData} />;
}

export default function AdminPeriodsPage() {
  return (
    <>
      <AdminPageHeader
        eyebrow="Trade period registry"
        title="Periods"
        description="Manage duration labels, min/max ticket size, payout bands, and public visibility from the period registry the order ticket reads from."
      />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <AdminPeriodsPageData />
      </Suspense>
    </>
  );
}
