import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import { connection } from "next/server";
import PeriodControlPanel from "@/components/admin/period-control-panel";
import { listAdminTradePeriods } from "@/lib/markets/admin-service";

export const metadata = { title: "Periods — Admin" };

export default async function AdminPeriodsPage() {
  // Admin pages are auth-gated and per-request; pin to request time so the
  // preview-data fallback (used on placeholder build env) runs at request, not
  // during prerender where Cache Components forbids Date.now()/non-deferred data.
  await connection();
  const periodData = await listAdminTradePeriods();

  return (
    <>
      <AdminPageHeader
        eyebrow="Trade period registry"
        title="Periods"
        description="Manage duration labels, min/max ticket size, payout bands, and public visibility from the period registry the order ticket reads from."
      />
      <PeriodControlPanel initialData={periodData} />
    </>
  );
}
