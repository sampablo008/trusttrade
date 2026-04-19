import "server-only";
import { ApiClientError } from "@/lib/api/client";
import { getOptionalServerEnv } from "@/lib/env/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { bonusTicketsResultSchema } from "@/schemas/bonus";
import type { BonusTicket, BonusTicketsResult } from "@/types/bonus";
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
