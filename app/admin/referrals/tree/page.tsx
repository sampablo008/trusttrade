import { Suspense } from "react";
import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import { connection } from "next/server";
import ReferralTreeInspector from "@/components/admin/referral-tree-inspector";
import { Skeleton } from "@/components/ui/Skeleton";
import { listAdminUsers } from "@/lib/admin/users-service";

export const metadata = { title: "Tree Inspector — Admin" };

// Live admin data. Must stay in its own Suspense boundary so Cache Components
// streams it fresh per request instead of serving the prerendered static shell
// (which would show empty/stale data for the route's stale-time window).
async function AdminReferralTreePageData() {
  // Admin pages are auth-gated and per-request; pin to request time so the
  // preview-data fallback (used on placeholder build env) runs at request, not
  // during prerender where Cache Components forbids Date.now()/non-deferred data.
  await connection();
  const usersData = await listAdminUsers("", 500, 0);

  return <ReferralTreeInspector users={usersData.items} />;
}

export default function AdminReferralTreePage() {
  return (
    <>
      <AdminPageHeader
        eyebrow="Referrals"
        title="Tree inspector"
        description="Search any user and see their full upline (who they came through) and downline (who they recruited). For dispute resolution and fraud review."
      />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <AdminReferralTreePageData />
      </Suspense>
    </>
  );
}
