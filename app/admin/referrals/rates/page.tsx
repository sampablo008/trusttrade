import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import { connection } from "next/server";
import ReferralRatesPanel from "@/components/admin/referral-rates-panel";
import { listAdminUsers } from "@/lib/admin/users-service";

export const metadata = { title: "Commission Rates — Admin" };

export default async function AdminReferralRatesPage() {
  // Admin pages are auth-gated and per-request; pin to request time so the
  // preview-data fallback (used on placeholder build env) runs at request, not
  // during prerender where Cache Components forbids Date.now()/non-deferred data.
  await connection();
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
