import type { ReactNode } from "react";
import AdminShell from "@/components/admin/shell/AdminShell";
import { assertAdmin } from "@/lib/auth/assertAdmin";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await assertAdmin();
  return <AdminShell username={session.username}>{children}</AdminShell>;
}
