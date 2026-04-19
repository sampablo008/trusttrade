import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import ReferralFlagsPanel from "@/components/admin/referral-flags-panel";
import { listAdminFlags } from "@/lib/referrals/admin-service";

export const metadata = { title: "Fraud Flags — Admin" };

export default async function AdminReferralFlagsPage() {
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
