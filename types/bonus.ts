export type BonusTicketStatus = "locked" | "released" | "expired";
export type BonusTicketKind = "signup" | "commission" | "gift" | "admin";

export interface BonusTicket {
  id: string;
  userId: string;
  kind: BonusTicketKind;
  amountCents: number;
  wagerRequiredCents: number;
  wagerProgressCents: number;
  status: BonusTicketStatus;
  referenceType: string | null;
  referenceId: string | null;
  note: string | null;
  expiresAt: string;
  releasedAt: string | null;
  createdAt: string;
}

export interface BonusTicketsResult {
  items: BonusTicket[];
  totalLockedCents: number;
}
