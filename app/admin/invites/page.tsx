import { Suspense } from "react";
import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import { connection } from "next/server";
import InviteControlPanel from "@/components/admin/invite-control-panel";
import { Skeleton } from "@/components/ui/Skeleton";
import { listAdminInviteCodes } from "@/lib/invites/admin-service";

export const metadata = { title: "Invites — Admin" };

// Live admin data. Must stay in its own Suspense boundary so Cache Components
// streams it fresh per request instead of serving the prerendered static shell
// (which would show empty/stale data for the route's stale-time window).
async function AdminInvitesPageData() {
  // Admin pages are auth-gated and per-request; pin to request time so the
  // preview-data fallback (used on placeholder build env) runs at request, not
  // during prerender where Cache Components forbids Date.now()/non-deferred data.
  await connection();
  const inviteData = await listAdminInviteCodes();

  return <InviteControlPanel initialData={inviteData} />;
}

export default function AdminInvitesPage() {
  return (
    <>
      <AdminPageHeader
        eyebrow="Invitation control"
        title="Invites"
        description="Mint root codes, inspect every referral or admin invite, revoke active codes, and export the last batch to CSV."
      />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <AdminInvitesPageData />
      </Suspense>
    </>
  );
}
