import { Suspense, type ReactNode } from "react";
import AdminShell from "@/components/admin/shell/AdminShell";
import { assertAdmin } from "@/lib/auth/assertAdmin";

export default function AdminLayout({ children }: { children: ReactNode }) {
  // Children must NOT appear in the Suspense fallback. The fallback is the
  // statically-prerendered shell; rendering page content there forces every
  // admin page (and its data fetch) to run at build time. With a placeholder
  // build env that means executing preview-data, which trips Cache Components
  // (Date.now, schema-invalid mock UUIDs, etc.). Children belong only in the
  // resolved branch below, which is request-time via assertAdmin -> cookies().
  return (
    <Suspense fallback={<AdminShell username={null} />}>
      <AdminShellWithSession>{children}</AdminShellWithSession>
    </Suspense>
  );
}

async function AdminShellWithSession({ children }: { children: ReactNode }) {
  const session = await assertAdmin();
  return <AdminShell username={session.username}>{children}</AdminShell>;
}
