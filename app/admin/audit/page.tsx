import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import AuditLogPanel from "@/components/admin/audit-log-panel";
import { listAuditLog } from "@/lib/admin/audit-service";

export const metadata = { title: "Audit Log — Admin" };

export default async function AdminAuditPage() {
  const auditData = await listAuditLog(undefined, undefined, undefined, 50, 0);

  return (
    <>
      <AdminPageHeader
        eyebrow="Immutable trail"
        title="Audit log"
        description="Every admin action — who, when, what, before/after JSON, IP address. Filter by action type. Expand any row for the full diff."
      />
      <AuditLogPanel initialData={auditData} />
    </>
  );
}
