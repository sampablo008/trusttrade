import "server-only";
import { PostgrestError } from "@supabase/supabase-js";
import { ApiClientError } from "@/lib/api/client";
import { getOptionalServerEnv } from "@/lib/env/server";
import {
  getPreviewInviteCodes,
  mintPreviewInviteCodes,
  revokePreviewInvite,
} from "@/lib/invites/preview-data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  adminInviteCodeSchema,
  adminInviteCodesResultSchema,
  inviteCodeSchema,
  mintInviteCodesInputSchema,
  mintInviteCodesResultSchema,
  revokeInviteCodeResultSchema,
} from "@/schemas/invites";
import type {
  AdminInviteCode,
  AdminInviteCodesResult,
  MintInviteCodesResult,
  RevokeInviteCodeResult,
} from "@/types/invites";

interface AdminInviteRow {
  code: string | null;
  created_at: string | null;
  created_by_admin_id: string | null;
  expires_at: string | null;
  is_single_use: boolean | null;
  last_used_at: string | null;
  note: string | null;
  owner_user_id: string | null;
  revoked_at: string | null;
  source: "admin" | "user" | null;
  status: "active" | "used" | "revoked" | "expired" | null;
  used_count: number | null;
}

interface MintInviteRow {
  code: string | null;
  expires_at: string | null;
  note: string | null;
}

interface RevokeInviteRow {
  code: string | null;
  revoked_at: string | null;
  status: "active" | "used" | "revoked" | "expired" | null;
}

const buildInviteSummary = (items: AdminInviteCode[]) => ({
  activeCount: items.filter((item) => item.status === "active").length,
  adminCount: items.filter((item) => item.source === "admin").length,
  expiredCount: items.filter((item) => item.status === "expired").length,
  revokedCount: items.filter((item) => item.status === "revoked").length,
  totalCount: items.length,
  usedCount: items.filter((item) => item.status === "used").length,
  userCount: items.filter((item) => item.source === "user").length,
});

const mapInviteMutationError = (error: PostgrestError) => {
  if (error.code === "42501") {
    throw new ApiClientError("Admin access required.", 403, "FORBIDDEN", error);
  }

  const detail = typeof error.details === "string" ? error.details : "";

  if (detail === "INVITE_REVOKE_FAILED") {
    throw new ApiClientError("Invite code could not be revoked.", 409, "INVITE_REVOKE_FAILED", error);
  }

  throw new ApiClientError(error.message, 500, "INVITE_ADMIN_ACTION_FAILED", error);
};

const mapAdminInviteRow = (row: AdminInviteRow): AdminInviteCode =>
  adminInviteCodeSchema.parse({
    code: row.code,
    createdAt: row.created_at,
    createdByAdminId: row.created_by_admin_id,
    expiresAt: row.expires_at,
    isSingleUse: Boolean(row.is_single_use),
    lastUsedAt: row.last_used_at,
    mode: "live",
    note: row.note,
    ownerUserId: row.owner_user_id,
    revokedAt: row.revoked_at,
    source: row.source,
    status: row.status,
    usedCount: row.used_count ?? 0,
  });

export const listAdminInviteCodes = async (): Promise<AdminInviteCodesResult> => {
  if (!getOptionalServerEnv()) {
    return getPreviewInviteCodes();
  }

  const adminClient = createSupabaseAdminClient();
  const { data, error } = await adminClient
    .from("invitation_codes")
    .select(
      "code, created_at, created_by_admin_id, expires_at, is_single_use, last_used_at, note, owner_user_id, revoked_at, source, status, used_count",
    )
    .order("created_at", { ascending: false })
    .limit(250);

  if (error) {
    throw new ApiClientError(error.message, 500, "INVITE_LIST_FAILED", error);
  }

  const items = (data ?? []).map((row) => mapAdminInviteRow(row as AdminInviteRow));

  return adminInviteCodesResultSchema.parse({
    items,
    summary: buildInviteSummary(items),
  });
};

export const mintAdminInviteCodes = async (payload: unknown): Promise<MintInviteCodesResult> => {
  const input = mintInviteCodesInputSchema.parse(payload);

  if (!getOptionalServerEnv()) {
    return mintPreviewInviteCodes(input);
  }

  const adminClient = createSupabaseAdminClient();
  const { data, error } = await adminClient.rpc("mint_invite_codes", {
    p_count: input.count,
    p_expires_at: input.expiresAt,
    p_note: input.note,
  });

  if (error) {
    mapInviteMutationError(error);
  }

  const createdAt = new Date().toISOString();
  const batch = (Array.isArray(data) ? data : []).map((row) => {
    const typedRow = row as MintInviteRow;

    return {
      code: typedRow.code,
      createdAt,
      expiresAt: typedRow.expires_at,
      mode: "live" as const,
      note: typedRow.note,
    };
  });

  return mintInviteCodesResultSchema.parse({
    batch,
    mode: "live",
  });
};

export const revokeInviteCode = async (rawCode: string): Promise<RevokeInviteCodeResult> => {
  const code = inviteCodeSchema.parse(rawCode);

  if (!getOptionalServerEnv()) {
    return revokePreviewInvite(code);
  }

  const adminClient = createSupabaseAdminClient();
  const { data, error } = await adminClient.rpc("revoke_invite", {
    p_code: code,
  });

  if (error) {
    mapInviteMutationError(error);
  }

  const row = Array.isArray(data) ? (data[0] as RevokeInviteRow | undefined) : undefined;

  return revokeInviteCodeResultSchema.parse({
    code: row?.code ?? code,
    mode: "live",
    revokedAt: row?.revoked_at ?? new Date().toISOString(),
    status: row?.status ?? "revoked",
  });
};
