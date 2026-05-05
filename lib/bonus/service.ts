import "server-only";
import { ApiClientError } from "@/lib/api/client";
import { getOptionalServerEnv } from "@/lib/env/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  bonusTicketsResultSchema,
  signupBonusClaimResultSchema,
  signupBonusStatusSchema,
} from "@/schemas/bonus";
import type {
  BonusTicket,
  BonusTicketsResult,
  SignupBonusClaimResult,
  SignupBonusStatus,
} from "@/types/bonus";
import { getPreviewBonusTickets } from "./preview-data";

interface TicketRow {
  id: string;
  user_id: string;
  kind: string;
  amount_cents: number | bigint;
  wager_required_cents: number | bigint;
  wager_progress_cents: number | bigint;
  status: string;
  reference_type: string | null;
  reference_id: string | null;
  note: string | null;
  expires_at: string;
  released_at: string | null;
  created_at: string;
}

const toNum = (v: number | bigint | null | undefined): number => {
  if (v == null) return 0;
  if (typeof v === "bigint") return Number(v);
  return v;
};

const mapTicketRow = (row: TicketRow): BonusTicket => ({
  id: row.id,
  userId: row.user_id,
  kind: row.kind as BonusTicket["kind"],
  amountCents: toNum(row.amount_cents),
  wagerRequiredCents: toNum(row.wager_required_cents),
  wagerProgressCents: toNum(row.wager_progress_cents),
  status: row.status as BonusTicket["status"],
  referenceType: row.reference_type,
  referenceId: row.reference_id,
  note: row.note,
  expiresAt: row.expires_at,
  releasedAt: row.released_at,
  createdAt: row.created_at,
});

export const listBonusTickets = async (userId: string): Promise<BonusTicketsResult> => {
  if (!getOptionalServerEnv()) {
    return getPreviewBonusTickets();
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("bonus_tickets")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new ApiClientError(error.message, 500, "BONUS_FETCH_FAILED", error);
  }

  const items = (data ?? []).map((r) => mapTicketRow(r as unknown as TicketRow));
  const totalLockedCents = items
    .filter((t) => t.status === "locked")
    .reduce((sum, t) => sum + t.amountCents, 0);

  return bonusTicketsResultSchema.parse({ items, totalLockedCents });
};

export const getSignupBonusStatus = async (
  userId: string,
): Promise<SignupBonusStatus> => {
  if (!getOptionalServerEnv()) {
    return signupBonusStatusSchema.parse({
      state: "pending",
      amountCents: 1000,
      claimedAt: null,
    });
  }

  const admin = createSupabaseAdminClient();

  const [profileRes, configRes] = await Promise.all([
    admin
      .from("profiles")
      .select("signup_bonus_claimed_at")
      .eq("user_id", userId)
      .maybeSingle(),
    admin.from("app_config").select("signup_bonus_cents").eq("id", 1).maybeSingle(),
  ]);

  if (profileRes.error) {
    throw new ApiClientError(profileRes.error.message, 500, "PROFILE_FETCH_FAILED");
  }
  if (!profileRes.data) {
    throw new ApiClientError("Profile not found.", 404, "PROFILE_NOT_FOUND");
  }
  if (configRes.error) {
    throw new ApiClientError(configRes.error.message, 500, "CONFIG_FETCH_FAILED");
  }

  const amountCents = configRes.data?.signup_bonus_cents ?? 0;
  const claimedAt = profileRes.data.signup_bonus_claimed_at;

  const state: SignupBonusStatus["state"] = claimedAt
    ? "claimed"
    : amountCents > 0
      ? "pending"
      : "unavailable";

  return signupBonusStatusSchema.parse({ state, amountCents, claimedAt });
};

export const claimSignupBonus = async (
  userId: string,
): Promise<SignupBonusClaimResult> => {
  if (!getOptionalServerEnv()) {
    throw new ApiClientError(
      "Claim is unavailable in preview mode.",
      400,
      "BONUS_PREVIEW_DISABLED",
    );
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("claim_signup_bonus", {
    p_user_id: userId,
  });

  if (error) {
    const code =
      error.message.includes("BONUS_ALREADY_CLAIMED")
        ? "BONUS_ALREADY_CLAIMED"
        : error.message.includes("BONUS_NOT_CONFIGURED")
          ? "BONUS_NOT_CONFIGURED"
          : "BONUS_CLAIM_FAILED";
    const status = code === "BONUS_ALREADY_CLAIMED" ? 409 : 400;
    throw new ApiClientError(error.message, status, code, error);
  }
  if (!data) {
    throw new ApiClientError("Claim returned no ticket.", 500, "BONUS_CLAIM_FAILED");
  }

  const row = data as unknown as TicketRow;
  const ticket = mapTicketRow(row);

  return signupBonusClaimResultSchema.parse({
    ticket,
    amountCents: ticket.amountCents,
  });
};
