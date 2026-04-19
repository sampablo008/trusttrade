import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import DepositsQueue from "@/components/admin/deposits-queue";
import { listAdminDeposits } from "@/lib/deposits/admin-service";

export const metadata = { title: "Deposits — Admin" };

export default async function AdminDepositsPage() {
  const result = await listAdminDeposits({ status: "pending", limit: 100, offset: 0 });

  return (
    <>
      <AdminPageHeader
        eyebrow="Deposit queue"
        title="Deposits"
        description="Review user deposit claims. Approving credits the balance and fires referral commissions. Reject with a reason visible to the user."
      />
      <DepositsQueue initialDeposits={result.items} />
    </>
  );
}
