import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import { connection } from "next/server";
import ReferralFlagsPanel from "@/components/admin/referral-flags-panel";
import { listAdminFlags } from "@/lib/referrals/admin-service";

export const metadata = { title: "Fraud Flags — Admin" };

export default async function AdminReferralFlagsPage() {
  // Admin pages are auth-gated and per-request; pin to request time so the
  // preview-data fallback (used on placeholder build env) runs at request, not
  // during prerender where Cache Components forbids Date.now()/non-deferred data.
  await connection();
  const flagsData = await listAdminFlags({ isResolved: false, limit: 200 });

  return (
    <>
      <AdminPageHeader
        eyebrow="Referrals"
        title="Fraud flags"
        description="Advisory signals raised automatically — same IP, velocity, rapid chain. Review and resolve; never auto-blocked."
      />
      <ReferralFlagsPanel initialFlags={flagsData.items} />
    </>
  );
}
