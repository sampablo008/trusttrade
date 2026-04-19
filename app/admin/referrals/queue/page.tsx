import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import ReferralCommissionQueue from "@/components/admin/referral-commission-queue";
import { listAdminCommissions } from "@/lib/referrals/admin-service";

export const metadata = { title: "Commission Queue — Admin" };

export default async function AdminReferralQueuePage() {
  const commissionsData = await listAdminCommissions({ limit: 200 });

  return (
    <>
      <AdminPageHeader
        eyebrow="Referrals"
        title="Commission queue"
        description="Approve or reject pending commissions. Approved commissions are credited as locked bonus tickets (3× wager before withdrawal)."
      />
      <ReferralCommissionQueue initialCommissions={commissionsData.items} />
    </>
  );
}
