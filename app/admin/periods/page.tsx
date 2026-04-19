import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import PeriodControlPanel from "@/components/admin/period-control-panel";
import { listAdminTradePeriods } from "@/lib/markets/admin-service";

export const metadata = { title: "Periods — Admin" };

export default async function AdminPeriodsPage() {
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
