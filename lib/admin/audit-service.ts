import "server-only";
import { ApiClientError } from "@/lib/api/client";
import { getOptionalServerEnv } from "@/lib/env/server";
import { previewAuditLog } from "@/lib/admin/preview-data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { auditLogResultSchema } from "@/schemas/admin";
import type { AuditLogResult } from "@/types/admin";

interface AuditRow {
  action: string;
  admin_id: string;
  after_json: Record<string, unknown> | null;
  before_json: Record<string, unknown> | null;
  created_at: string;
  id: string;
  ip_address: string | null;
  notes: string | null;
  target_id: string | null;
  target_type: string | null;
  profiles?: { email: string } | { email: string }[] | null;
}

const resolveEmail = (profiles: AuditRow["profiles"]): string => {
  if (!profiles) return "";
  if (Array.isArray(profiles)) return profiles[0]?.email ?? "";
  return profiles.email;
};

const mapAuditRow = (row: AuditRow) => ({
  action: row.action,
  adminEmail: resolveEmail(row.profiles),
  adminId: row.admin_id,
  afterJson: row.after_json ?? null,
  beforeJson: row.before_json ?? null,
  createdAt: row.created_at,
  id: row.id,
  ipAddress: row.ip_address ?? null,
  notes: row.notes ?? null,
  targetId: row.target_id ?? null,
  targetType: row.target_type ?? null,
});

export const listAuditLog = async (
  action?: string,
  adminId?: string,
  targetType?: string,
  limit = 50,
  offset = 0,
): Promise<AuditLogResult> => {
  if (!getOptionalServerEnv()) {
    const filtered = previewAuditLog
      .filter((e) => !action || e.action === action)
      .filter((e) => !adminId || e.adminId === adminId)
      .filter((e) => !targetType || e.targetType === targetType);

    return auditLogResultSchema.parse({
      items: filtered.slice(offset, offset + limit),
      total: filtered.length,
    });
  }

  const admin = createSupabaseAdminClient();
  let query = admin
    .from("admin_actions")
    .select(
      "id, admin_id, action, target_type, target_id, before_json, after_json, notes, ip_address, created_at, profiles(email)",
      { count: "exact" },
    );

  if (action) query = query.eq("action", action);
  if (adminId) query = query.eq("admin_id", adminId);
  if (targetType) query = query.eq("target_type", targetType);

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new ApiClientError(error.message, 500, "AUDIT_FETCH_FAILED", error);

  return auditLogResultSchema.parse({
    items: (data ?? []).map((r) => mapAuditRow(r as AuditRow)),
    total: count ?? 0,
  });
};
