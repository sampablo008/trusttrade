import { z } from "zod";

export const bonusTicketStatusSchema = z.enum(["locked", "released", "expired"]);
export const bonusTicketKindSchema = z.enum(["signup", "commission", "gift", "admin"]);

export const bonusTicketSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  kind: bonusTicketKindSchema,
  amountCents: z.number().int().positive(),
  wagerRequiredCents: z.number().int().positive(),
  wagerProgressCents: z.number().int().min(0),
  status: bonusTicketStatusSchema,
  referenceType: z.string().nullable(),
  referenceId: z.string().uuid().nullable(),
  note: z.string().nullable(),
  expiresAt: z.string(),
  releasedAt: z.string().nullable(),
  createdAt: z.string(),
});

export const bonusTicketsResultSchema = z.object({
  items: z.array(bonusTicketSchema),
  totalLockedCents: z.number().int().min(0),
});
