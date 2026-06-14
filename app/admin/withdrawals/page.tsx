import { Suspense } from "react";
import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import { connection } from "next/server";
import WithdrawalsQueue from "@/components/admin/withdrawals-queue";
import { Skeleton } from "@/components/ui/Skeleton";
import { listAdminWithdrawals } from "@/lib/withdrawals/admin-service";

export const metadata = { title: "Withdrawals — Admin" };

// Live payout queue. Must stay in its own Suspense boundary so Cache Components
// streams it fresh per request instead of serving the prerendered static shell
// (which would show an empty queue for the route's stale-time window).
async function WithdrawalsData() {
  // Admin pages are auth-gated and per-request; pin to request time so the
  // preview-data fallback (used on placeholder build env) runs at request, not
  // during prerender where Cache Components forbids Date.now()/non-deferred data.
  await connection();
  const [pendingResult, approvedResult, paidResult] = await Promise.all([
    listAdminWithdrawals({ status: "pending", limit: 100, offset: 0 }),
    listAdminWithdrawals({ status: "approved", limit: 100, offset: 0 }),
    listAdminWithdrawals({ status: "paid", limit: 100, offset: 0 }),
  ]);

  const allItems = [
    ...pendingResult.items,
    ...approvedResult.items,
    ...paidResult.items,
  ];

  return <WithdrawalsQueue initialWithdrawals={allItems} />;
}

export default function AdminWithdrawalsPage() {
  return (
    <>
      <AdminPageHeader
        eyebrow="Payout pipeline"
        title="Withdrawals"
        description="Two-phase flow. Review tab → approve or reject. Payout tab → paste tx hash with last-8-char address confirmation before marking paid."
      />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <WithdrawalsData />
      </Suspense>
    </>
  );
}
