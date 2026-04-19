import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import ReferralTreeInspector from "@/components/admin/referral-tree-inspector";
import { listAdminUsers } from "@/lib/admin/users-service";

export const metadata = { title: "Tree Inspector — Admin" };

export default async function AdminReferralTreePage() {
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
