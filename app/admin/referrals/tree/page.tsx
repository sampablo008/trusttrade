import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import { connection } from "next/server";
import ReferralTreeInspector from "@/components/admin/referral-tree-inspector";
import { listAdminUsers } from "@/lib/admin/users-service";

export const metadata = { title: "Tree Inspector — Admin" };

export default async function AdminReferralTreePage() {
  // Admin pages are auth-gated and per-request; pin to request time so the
  // preview-data fallback (used on placeholder build env) runs at request, not
  // during prerender where Cache Components forbids Date.now()/non-deferred data.
  await connection();
  const usersData = await listAdminUsers("", 500, 0);

  return (
    <>
      <AdminPageHeader
        eyebrow="Referrals"
        title="Tree inspector"
        description="Search any user and see their full upline (who they came through) and downline (who they recruited). For dispute resolution and fraud review."
      />
      <ReferralTreeInspector users={usersData.items} />
    </>
  );
}
