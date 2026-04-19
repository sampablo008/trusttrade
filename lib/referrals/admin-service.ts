import "server-only";
import { ApiClientError } from "@/lib/api/client";
import { getOptionalServerEnv } from "@/lib/env/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  referralCommissionListResultSchema,
  referralCommissionSchema,
  referralFlagListResultSchema,
  referralFlagSchema,
  referralRatesSchema,
} from "@/schemas/referrals";
import type {
  CommissionFilters,
  FlagFilters,
  ReferralCommission,
  ReferralCommissionListResult,
  ReferralFlagListResult,
  ReferralRates,
  SetRatesInput,
} from "@/types/referrals";
import {
  previewAdminCommissions,
  previewReferralFlags,
  PREVIEW_USER_ID,
} from "./preview-data";

const toNumber = (v: number | string | bigint | null | undefined): number => {
  if (v == null) return 0;
  if (typeof v === "bigint") return Number(v);
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};

const mapCommissionRow = (row: Record<string, unknown>): ReferralCommission => {
  const profile = Array.isArray(row.profiles) ? (row.profiles as unknown[])[0] : row.profiles;
  return referralCommissionSchema.parse({
    baseAmountCents: toNumber(row.base_amount_cents as number),
    beneficiaryUserId: row.beneficiary_user_id,
    bpsApplied: toNumber(row.bps_applied as number),
    commissionCents: toNumber(row.commission_cents as number),
    createdAt: row.created_at,
    depositId: row.deposit_id ?? null,
    id: row.id,
    level: row.level,
    refereeUserId: row.referee_user_id,
    refereeUsername: (profile as { username?: string })?.username ?? "",
    reviewNote: row.review_note ?? null,
    reviewedAt: row.reviewed_at ?? null,
    reviewedByAdminId: row.reviewed_by_admin_id ?? null,
    status: row.status,
    updatedAt: row.updated_at,
  });
};

export const listAdminCommissions = async (
  filters: CommissionFilters = {},
): Promise<ReferralCommissionListResult> => {
  if (!getOptionalServerEnv()) {
    const items = previewAdminCommissions
      .filter((c) => !filters.status || c.status === filters.status)
      .filter((c) => !filters.userId || c.beneficiaryUserId === filters.userId);
    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;
    return referralCommissionListResultSchema.parse({
      items: items.slice(offset, offset + limit),
      total: items.length,
    });
  }

  const admin = createSupabaseAdminClient();
  let query = admin
    .from("referral_commissions")
    .select(
      "*, profiles!referral_commissions_referee_user_id_fkey(username)",
      { count: "exact" },
    );

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.userId) query = query.eq("beneficiary_user_id", filters.userId);

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new ApiClientError(error.message, 500, "ADMIN_COMMISSIONS_FETCH_FAILED", error);

  return referralCommissionListResultSchema.parse({
    items: (data ?? []).map((r) => mapCommissionRow(r as unknown as Record<string, unknown>)),
    total: count ?? 0,
  });
};

export const approveCommission = async (
  commissionId: string,
  adminId: string,
  note?: string,
): Promise<ReferralCommission> => {
  if (!getOptionalServerEnv()) {
    const comm = previewAdminCommissions.find((c) => c.id === commissionId);
    if (!comm) throw new ApiClientError("Commission not found.", 404, "COMMISSION_NOT_FOUND");
    if (comm.status !== "pending") throw new ApiClientError("Already reviewed.", 409, "ALREADY_REVIEWED");
    return referralCommissionSchema.parse({ ...comm, status: "approved", reviewedAt: new Date().toISOString() });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("approve_commission", {
    p_commission_id: commissionId,
    p_admin_id: adminId,
    p_note: note ?? null,
  });

  if (error) {
    const msg = error.message ?? "Approve failed.";
    const code = msg.includes("COMMISSION_NOT_FOUND") ? "COMMISSION_NOT_FOUND"
      : msg.includes("ALREADY_REVIEWED") ? "ALREADY_REVIEWED"
      : "INTERNAL_ERROR";
    const status = code === "COMMISSION_NOT_FOUND" ? 404 : code === "ALREADY_REVIEWED" ? 409 : 500;
    throw new ApiClientError(msg, status, code, error);
  }

  return mapCommissionRow(data as unknown as Record<string, unknown>);
};

export const rejectCommission = async (
  commissionId: string,
  adminId: string,
  note?: string,
): Promise<ReferralCommission> => {
  if (!getOptionalServerEnv()) {
    const comm = previewAdminCommissions.find((c) => c.id === commissionId);
    if (!comm) throw new ApiClientError("Commission not found.", 404, "COMMISSION_NOT_FOUND");
    if (comm.status !== "pending") throw new ApiClientError("Already reviewed.", 409, "ALREADY_REVIEWED");
    return referralCommissionSchema.parse({ ...comm, status: "rejected", reviewedAt: new Date().toISOString() });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("reject_commission", {
    p_commission_id: commissionId,
    p_admin_id: adminId,
    p_note: note ?? null,
  });

  if (error) {
    const msg = error.message ?? "Reject failed.";
    const code = msg.includes("COMMISSION_NOT_FOUND") ? "COMMISSION_NOT_FOUND"
      : msg.includes("ALREADY_REVIEWED") ? "ALREADY_REVIEWED"
      : "INTERNAL_ERROR";
    const status = code === "COMMISSION_NOT_FOUND" ? 404 : code === "ALREADY_REVIEWED" ? 409 : 500;
    throw new ApiClientError(msg, status, code, error);
  }

  return mapCommissionRow(data as unknown as Record<string, unknown>);
};

export const bulkApproveCommissions = async (
  commissionIds: string[],
  adminId: string,
  note?: string,
): Promise<{ approved: string[]; failed: string[] }> => {
  if (!getOptionalServerEnv()) {
    return { approved: commissionIds, failed: [] };
  }

  const results = await Promise.allSettled(
    commissionIds.map((id) => approveCommission(id, adminId, note)),
  );

  const approved: string[] = [];
  const failed: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") approved.push(commissionIds[i]);
    else failed.push(commissionIds[i]);
  });

  return { approved, failed };
};

export const listAdminFlags = async (
  filters: FlagFilters = {},
): Promise<ReferralFlagListResult> => {
  if (!getOptionalServerEnv()) {
    const items = previewReferralFlags
      .filter((f) => filters.isResolved == null || f.isResolved === filters.isResolved)
      .filter((f) => !filters.kind || f.kind === filters.kind);
    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;
    return referralFlagListResultSchema.parse({
      items: items.slice(offset, offset + limit),
      total: items.length,
    });
  }

  const admin = createSupabaseAdminClient();
  let query = admin
    .from("referral_flags")
    .select("*, profiles!referral_flags_user_id_fkey(username)", { count: "exact" });

  if (filters.isResolved != null) query = query.eq("is_resolved", filters.isResolved);
  if (filters.kind) query = query.eq("kind", filters.kind);

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new ApiClientError(error.message, 500, "FLAGS_FETCH_FAILED", error);

  const items = (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? (row.profiles as unknown[])[0] : row.profiles;
    return referralFlagSchema.parse({
      createdAt: row.created_at,
      detail: row.detail ?? {},
      id: row.id,
      isResolved: row.is_resolved,
      kind: row.kind,
      resolvedAt: row.resolved_at ?? null,
      resolvedByAdminId: row.resolved_by_admin_id ?? null,
      userId: row.user_id,
      username: (profile as { username?: string })?.username ?? "",
    });
  });

  return referralFlagListResultSchema.parse({ items, total: count ?? 0 });
};

export const resolveFlag = async (
  flagId: string,
  adminId: string,
  note?: string,
): Promise<void> => {
  if (!getOptionalServerEnv()) return;

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("referral_flags")
    .update({
      is_resolved: true,
      resolved_by_admin_id: adminId,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", flagId);

  if (error) throw new ApiClientError(error.message, 500, "FLAG_RESOLVE_FAILED", error);

  await admin.from("admin_actions").insert({
    admin_id: adminId,
    action: "resolve_referral_flag",
    target_type: "referral_flag",
    target_id: flagId,
    notes: note ?? null,
  });
};

export const getUserReferralRates = async (userId: string): Promise<ReferralRates> => {
  const defaults: ReferralRates = {
    l1Bps: 500,
    l2Bps: 300,
    l3Bps: 200,
    l4Bps: 100,
    l5Bps: 50,
    userId,
  };

  if (!getOptionalServerEnv()) return defaults;

  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("referral_rates")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!data) return defaults;

  return referralRatesSchema.parse({
    l1Bps: data.l1_bps,
    l2Bps: data.l2_bps,
    l3Bps: data.l3_bps,
    l4Bps: data.l4_bps,
    l5Bps: data.l5_bps,
    userId,
  });
};

export const setUserReferralRates = async (
  userId: string,
  input: SetRatesInput,
  adminId: string,
): Promise<ReferralRates> => {
  if (!getOptionalServerEnv()) {
    return referralRatesSchema.parse({ ...input, userId });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("referral_rates")
    .upsert({
      user_id: userId,
      l1_bps: input.l1Bps,
      l2_bps: input.l2Bps,
      l3_bps: input.l3Bps,
      l4_bps: input.l4Bps,
      l5_bps: input.l5Bps,
      updated_at: new Date().toISOString(),
      updated_by_admin_id: adminId,
    })
    .select()
    .single();

  if (error) throw new ApiClientError(error.message, 500, "SET_RATES_FAILED", error);

  await admin.from("admin_actions").insert({
    admin_id: adminId,
    action: "set_referral_rates",
    target_type: "user",
    target_id: userId,
    after_json: input,
  });

  return referralRatesSchema.parse({
    l1Bps: data.l1_bps,
    l2Bps: data.l2_bps,
    l3Bps: data.l3_bps,
    l4Bps: data.l4_bps,
    l5Bps: data.l5_bps,
    userId,
  });
};

export const getUserReferralTreeForAdmin = async (
  userId: string,
  limit = 50,
  offset = 0,
): Promise<{ items: Array<{ level: number; refereeUserId: string; refereeUsername: string; refereeEmail: string; createdAt: string }>; total: number }> => {
  if (!getOptionalServerEnv()) {
    const items = previewReferralFlags.map((f) => ({
      level: 1,
      refereeUserId: f.userId,
      refereeUsername: f.username,
      refereeEmail: "",
      createdAt: f.createdAt,
    }));
    return { items: items.slice(offset, offset + limit), total: items.length };
  }

  const admin = createSupabaseAdminClient();
  const { data, error, count } = await admin
    .from("referral_upline")
    .select(
      "level, user_id, profiles!referral_upline_user_id_fkey(username, email, joined_at)",
      { count: "exact" },
    )
    .eq("ancestor_id", userId)
    .order("level", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw new ApiClientError(error.message, 500, "ADMIN_TREE_FETCH_FAILED", error);

  const items = (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? (row.profiles as unknown[])[0] : row.profiles;
    return {
      level: row.level,
      refereeUserId: row.user_id,
      refereeUsername: (profile as { username?: string })?.username ?? "",
      refereeEmail: (profile as { email?: string })?.email ?? "",
      createdAt: (profile as { joined_at?: string })?.joined_at ?? new Date().toISOString(),
    };
  });

  return { items, total: count ?? 0 };
};

export const getUserUplineForAdmin = async (
  userId: string,
): Promise<Array<{ level: number; ancestorId: string; ancestorUsername: string }>> => {
  if (!getOptionalServerEnv()) {
    return [{ level: 1, ancestorId: PREVIEW_USER_ID, ancestorUsername: "preview" }];
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("referral_upline")
    .select("level, ancestor_id, profiles!referral_upline_ancestor_id_fkey(username)")
    .eq("user_id", userId)
    .order("level", { ascending: true });

  if (error) throw new ApiClientError(error.message, 500, "UPLINE_FETCH_FAILED", error);

  return (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? (row.profiles as unknown[])[0] : row.profiles;
    return {
      level: row.level,
      ancestorId: row.ancestor_id,
      ancestorUsername: (profile as { username?: string })?.username ?? "",
    };
  });
};
