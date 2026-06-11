import { Suspense, type ReactNode } from "react";
import AdminShell from "@/components/admin/shell/AdminShell";
import { assertAdmin } from "@/lib/auth/assertAdmin";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AdminShell username={null}>{children}</AdminShell>}>
      <AdminShellWithSession>{children}</AdminShellWithSession>
    </Suspense>
  );
}

async function AdminShellWithSession({ children }: { children: ReactNode }) {
  const session = await assertAdmin();
  return <AdminShell username={session.username}>{children}</AdminShell>;
}
