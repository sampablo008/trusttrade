import "server-only";
import { ApiClientError } from "@/lib/api/client";
import { getOptionalServerEnv } from "@/lib/env/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  referralCommissionListResultSchema,
  referralListResultSchema,
  referralStatsSchema,
} from "@/schemas/referrals";
import type {
  ReferralCommissionListResult,
  ReferralListResult,
  ReferralStats,
} from "@/types/referrals";
import {
  previewCommissions,
  previewReferralStats,
  previewReferralTree,
  PREVIEW_USER_ID,
} from "./preview-data";

const toNumber = (v: number | string | bigint | null | undefined): number => {
  if (v == null) return 0;
  if (typeof v === "bigint") return Number(v);
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};

export const getMyReferralStats = async (userId: string): Promise<ReferralStats> => {
  if (!getOptionalServerEnv()) {
    return referralStatsSchema.parse({
      ...previewReferralStats,
      code: userId === PREVIEW_USER_ID ? previewReferralStats.code : "REF_USER",
    });
  }

  const admin = createSupabaseAdminClient();

  const [inviteRow, commissionRows, referralRow] = await Promise.all([
    admin
      .from("invitation_codes")
      .select("code")
      .eq("owner_user_id", userId)
      .eq("source", "user")
      .single(),
    admin
      .from("referral_commissions")
      .select("commission_cents, status")
      .eq("beneficiary_user_id", userId),
    admin
      .from("referrals")
      .select("id", { count: "exact" })
      .eq("referrer_user_id", userId),
  ]);

  const directCount = referralRow.count ?? 0;

  const allLevel1 = await admin
    .from("referral_upline")
    .select("user_id", { count: "exact" })
    .eq("ancestor_id", userId);

  const commissions = commissionRows.data ?? [];
  const pendingCents = commissions
    .filter((c) => c.status === "pending")
    .reduce((s, c) => s + toNumber(c.commission_cents), 0);
  const approvedCents = commissions
    .filter((c) => c.status === "approved")
    .reduce((s, c) => s + toNumber(c.commission_cents), 0);

  return referralStatsSchema.parse({
    approvedCommissionCents: approvedCents,
    code: inviteRow.data?.code ?? "",
    directReferrals: directCount,
    pendingCommissionCents: pendingCents,
    totalCommissionCents: pendingCents + approvedCents,
    totalReferrals: allLevel1.count ?? 0,
  });
};

export const getMyReferralTree = async (
  userId: string,
  level?: number,
  limit = 50,
  offset = 0,
): Promise<ReferralListResult> => {
  if (!getOptionalServerEnv()) {
    const filtered = previewReferralTree.filter((n) => !level || n.level === level);
    return referralListResultSchema.parse({
      items: filtered.slice(offset, offset + limit),
      total: filtered.length,
    });
  }

  const admin = createSupabaseAdminClient();
  let query = admin
    .from("referral_upline")
    .select(
      "level, user_id, ancestor_id, profiles!referral_upline_user_id_fkey(username, email, joined_at)",
      { count: "exact" },
    )
    .eq("ancestor_id", userId);

  if (level != null) query = query.eq("level", level);

  const { data, error, count } = await query
    .order("level", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw new ApiClientError(error.message, 500, "REFERRAL_TREE_FETCH_FAILED", error);

  const items = (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      createdAt: (profile as { joined_at?: string })?.joined_at ?? new Date().toISOString(),
      level: row.level,
      refereeEmail: (profile as { email?: string })?.email ?? "",
      refereeUserId: row.user_id,
      refereeUsername: (profile as { username?: string })?.username ?? "",
    };
  });

  return referralListResultSchema.parse({ items, total: count ?? 0 });
};

export const getMyCommissions = async (
  userId: string,
  limit = 50,
  offset = 0,
  status?: string,
): Promise<ReferralCommissionListResult> => {
  if (!getOptionalServerEnv()) {
    const filtered = previewCommissions
      .filter((c) => c.beneficiaryUserId === userId)
      .filter((c) => !status || c.status === status);
    return referralCommissionListResultSchema.parse({
      items: filtered.slice(offset, offset + limit),
      total: filtered.length,
    });
  }

  const admin = createSupabaseAdminClient();
  let query = admin
    .from("referral_commissions")
    .select(
      "*, profiles!referral_commissions_referee_user_id_fkey(username)",
      { count: "exact" },
    )
    .eq("beneficiary_user_id", userId);

  if (status) query = query.eq("status", status);

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new ApiClientError(error.message, 500, "COMMISSIONS_FETCH_FAILED", error);

  const items = (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      baseAmountCents: toNumber(row.base_amount_cents),
      beneficiaryUserId: row.beneficiary_user_id,
      bpsApplied: toNumber(row.bps_applied),
      commissionCents: toNumber(row.commission_cents),
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
    };
  });

  return referralCommissionListResultSchema.parse({ items, total: count ?? 0 });
};

export const getUserReferralCode = async (userId: string): Promise<string> => {
  if (!getOptionalServerEnv()) return "REF_PREVIEW";

  const client = await createSupabaseServerClient();
  const { data } = await client
    .from("invitation_codes")
    .select("code")
    .eq("owner_user_id", userId)
    .eq("source", "user")
    .single();

  return data?.code ?? "";
};
