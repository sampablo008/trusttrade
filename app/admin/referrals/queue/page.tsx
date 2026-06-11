import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import { connection } from "next/server";
import ReferralCommissionQueue from "@/components/admin/referral-commission-queue";
import { listAdminCommissions } from "@/lib/referrals/admin-service";

export const metadata = { title: "Commission Queue — Admin" };

export default async function AdminReferralQueuePage() {
  // Admin pages are auth-gated and per-request; pin to request time so the
  // preview-data fallback (used on placeholder build env) runs at request, not
  // during prerender where Cache Components forbids Date.now()/non-deferred data.
  await connection();
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
