import { Suspense } from "react";
import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import { connection } from "next/server";
import AuditLogPanel from "@/components/admin/audit-log-panel";
import { Skeleton } from "@/components/ui/Skeleton";
import { listAuditLog } from "@/lib/admin/audit-service";

export const metadata = { title: "Audit Log — Admin" };

// Live admin data. Must stay in its own Suspense boundary so Cache Components
// streams it fresh per request instead of serving the prerendered static shell
// (which would show empty/stale data for the route's stale-time window).
async function AdminAuditPageData() {
  // Admin pages are auth-gated and per-request; pin to request time so the
  // preview-data fallback (used on placeholder build env) runs at request, not
  // during prerender where Cache Components forbids Date.now()/non-deferred data.
  await connection();
  const auditData = await listAuditLog(undefined, undefined, undefined, 50, 0);

  return <AuditLogPanel initialData={auditData} />;
}

export default function AdminAuditPage() {
  return (
    <>
      <AdminPageHeader
        eyebrow="Immutable trail"
        title="Audit log"
        description="Every admin action — who, when, what, before/after JSON, IP address. Filter by action type. Expand any row for the full diff."
      />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <AdminAuditPageData />
      </Suspense>
    </>
  );
}
