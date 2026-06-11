import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import { connection } from "next/server";
import UsersPanel from "@/components/admin/users-panel";
import { listAdminUsers } from "@/lib/admin/users-service";

export const metadata = { title: "Users — Admin" };

export default async function AdminUsersPage() {
  // Admin pages are auth-gated and per-request; pin to request time so the
  // preview-data fallback (used on placeholder build env) runs at request, not
  // during prerender where Cache Components forbids Date.now()/non-deferred data.
  await connection();
  const usersData = await listAdminUsers("", 50, 0, "user");

  return (
    <>
      <AdminPageHeader
        eyebrow="User management"
        title="Users"
        description="Search by email or username. View full balance breakdowns and trade history. Freeze accounts or apply manual balance adjustments with a required audit note."
      />
      <UsersPanel initialData={usersData} />
    </>
  );
}
