import type { BonusTicket, BonusTicketsResult } from "@/types/bonus";

const PREVIEW_USER_ID = "00000000-0000-4000-8000-0000000000a1";

const now = new Date();

const previewTickets: BonusTicket[] = [
  {
    id: "00000000-0000-4000-8000-000000000bt1",
    userId: PREVIEW_USER_ID,
    kind: "signup",
    amountCents: 1_000,
    wagerRequiredCents: 3_000,
    wagerProgressCents: 1_200,
    status: "locked",
    referenceType: null,
    referenceId: null,
    note: "Welcome bonus",
    expiresAt: new Date(now.getTime() + 90 * 24 * 3600_000).toISOString(),
    releasedAt: null,
    createdAt: new Date(now.getTime() - 7 * 24 * 3600_000).toISOString(),
  },
  {
    id: "00000000-0000-4000-8000-000000000bt2",
    userId: PREVIEW_USER_ID,
    kind: "commission",
    amountCents: 2_500,
    wagerRequiredCents: 7_500,
    wagerProgressCents: 7_500,
    status: "released",
    referenceType: "referral_commissions",
    referenceId: "00000000-0000-4000-8000-000000000rc1",
    note: null,
    expiresAt: new Date(now.getTime() + 60 * 24 * 3600_000).toISOString(),
    releasedAt: new Date(now.getTime() - 2 * 24 * 3600_000).toISOString(),
    createdAt: new Date(now.getTime() - 14 * 24 * 3600_000).toISOString(),
  },
];

export const getPreviewBonusTickets = (): BonusTicketsResult => {
  const locked = previewTickets.filter((t) => t.status === "locked");
  const totalLockedCents = locked.reduce((sum, t) => sum + t.amountCents, 0);
  return { items: previewTickets, totalLockedCents };
};
