import { Suspense } from "react";
import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import { connection } from "next/server";
import UsersPanel from "@/components/admin/users-panel";
import { Skeleton } from "@/components/ui/Skeleton";
import { listAdminUsers } from "@/lib/admin/users-service";

export const metadata = { title: "Users — Admin" };

// Live admin data. Must stay in its own Suspense boundary so Cache Components
// streams it fresh per request instead of serving the prerendered static shell
// (which would show empty/stale data for the route's stale-time window).
async function AdminUsersPageData() {
  // Admin pages are auth-gated and per-request; pin to request time so the
  // preview-data fallback (used on placeholder build env) runs at request, not
  // during prerender where Cache Components forbids Date.now()/non-deferred data.
  await connection();
  const usersData = await listAdminUsers("", 50, 0, "user");

  return <UsersPanel initialData={usersData} />;
}

export default function AdminUsersPage() {
  return (
    <>
      <AdminPageHeader
        eyebrow="User management"
        title="Users"
        description="Search by email or username. View full balance breakdowns and trade history. Freeze accounts or apply manual balance adjustments with a required audit note."
      />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <AdminUsersPageData />
      </Suspense>
    </>
  );
}
