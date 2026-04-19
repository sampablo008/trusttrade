import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import WithdrawalsQueue from "@/components/admin/withdrawals-queue";
import { listAdminWithdrawals } from "@/lib/withdrawals/admin-service";

export const metadata = { title: "Withdrawals — Admin" };

export default async function AdminWithdrawalsPage() {
  const [pendingResult, approvedResult] = await Promise.all([
    listAdminWithdrawals({ status: "pending", limit: 100, offset: 0 }),
    listAdminWithdrawals({ status: "approved", limit: 100, offset: 0 }),
  ]);

  const allItems = [...pendingResult.items, ...approvedResult.items];

  return (
    <>
      <AdminPageHeader
        eyebrow="Payout pipeline"
        title="Withdrawals"
        description="Two-phase flow. Review tab → approve or reject. Payout tab → paste tx hash with last-8-char address confirmation before marking paid."
      />
      <WithdrawalsQueue initialWithdrawals={allItems} />
    </>
  );
}
