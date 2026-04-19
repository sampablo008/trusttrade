import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import InviteControlPanel from "@/components/admin/invite-control-panel";
import { listAdminInviteCodes } from "@/lib/invites/admin-service";

export const metadata = { title: "Invites — Admin" };

export default async function AdminInvitesPage() {
  const inviteData = await listAdminInviteCodes();

  return (
    <>
      <AdminPageHeader
        eyebrow="Invitation control"
        title="Invites"
        description="Mint root codes, inspect every referral or admin invite, revoke active codes, and export the last batch to CSV."
      />
      <InviteControlPanel initialData={inviteData} />
    </>
  );
}
