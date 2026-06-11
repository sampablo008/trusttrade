import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import { connection } from "next/server";
import DepositsQueue from "@/components/admin/deposits-queue";
import { listAdminDeposits } from "@/lib/deposits/admin-service";

export const metadata = { title: "Deposits — Admin" };

export default async function AdminDepositsPage() {
  // Admin pages are auth-gated and per-request; pin to request time so the
  // preview-data fallback (used on placeholder build env) runs at request, not
  // during prerender where Cache Components forbids Date.now()/non-deferred data.
  await connection();
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
