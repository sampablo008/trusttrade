import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import { connection } from "next/server";
import InviteControlPanel from "@/components/admin/invite-control-panel";
import { listAdminInviteCodes } from "@/lib/invites/admin-service";

export const metadata = { title: "Invites — Admin" };

export default async function AdminInvitesPage() {
  // Admin pages are auth-gated and per-request; pin to request time so the
  // preview-data fallback (used on placeholder build env) runs at request, not
  // during prerender where Cache Components forbids Date.now()/non-deferred data.
  await connection();
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
