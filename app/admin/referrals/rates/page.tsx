import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import ReferralRatesPanel from "@/components/admin/referral-rates-panel";
import { listAdminUsers } from "@/lib/admin/users-service";

export const metadata = { title: "Commission Rates — Admin" };

export default async function AdminReferralRatesPage() {
  const usersData = await listAdminUsers("", 200, 0);

  return (
    <>
      <AdminPageHeader
        eyebrow="Referrals"
        title="Commission rates"
        description="Override the 5-level bps rates for individual users. Falls back to global defaults when no override is set."
      />
      <ReferralRatesPanel users={usersData.items} />
    </>
  );
}
