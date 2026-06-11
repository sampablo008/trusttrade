import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import { connection } from "next/server";
import WithdrawalsQueue from "@/components/admin/withdrawals-queue";
import { listAdminWithdrawals } from "@/lib/withdrawals/admin-service";

export const metadata = { title: "Withdrawals — Admin" };

export default async function AdminWithdrawalsPage() {
  // Admin pages are auth-gated and per-request; pin to request time so the
  // preview-data fallback (used on placeholder build env) runs at request, not
  // during prerender where Cache Components forbids Date.now()/non-deferred data.
  await connection();
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
