import { z } from "zod";

export const tradeDirectionSchema = z.enum(["long", "short"]);
export const tradeStatusSchema = z.enum(["active", "settled", "cancelled"]);
export const tradeOutcomeSchema = z.enum(["win", "lose", "void"]);

export const userTradeSchema = z.object({
  adminForcedOutcome: tradeOutcomeSchema.nullable().default(null),
  direction: tradeDirectionSchema,
  endTime: z.string(),
  entryPriceCents: z.number().int().positive(),
  exitPriceCents: z.number().int().positive().nullable().default(null),
  id: z.string().uuid(),
  outcome: tradeOutcomeSchema.nullable(),
  payoutBps: z.number().int().positive(),
  periodId: z.string().uuid(),
  stakeCents: z.number().int().positive(),
  startedAt: z.string(),
  status: tradeStatusSchema,
  strikePriceCents: z.number().int().positive().nullable(),
  tokenId: z.string().uuid(),
  tokenSymbol: z.string(),
  userId: z.string().uuid(),
});

export const activeTradesResultSchema = z.object({
  items: z.array(userTradeSchema),
});

export const settledTradesResultSchema = z.object({
  items: z.array(userTradeSchema),
  total: z.number().int().nonnegative(),
});

export const placeTradeInputSchema = z.object({
  amountCents: z.number().int().positive(),
  direction: tradeDirectionSchema,
  periodId: z.string().uuid(),
  tokenId: z.string().uuid(),
});

export const placeTradeResultSchema = z.object({
  trade: userTradeSchema,
});

export const cancelTradeResultSchema = z.object({
  id: z.string().uuid(),
});

export const userProfileSchema = z.object({
  avatarPath: z.string().nullable(),
  balanceCents: z.number().int().nonnegative(),
  displayName: z.string().nullable(),
  email: z.string().email(),
  lockedBonusCents: z.number().int().nonnegative(),
  lockedInTradesCents: z.number().int().nonnegative(),
  role: z.enum(["user", "admin"]),
  userId: z.string().uuid(),
  username: z.string(),
});

export const userBalanceSchema = z.object({
  balanceCents: z.number().int().nonnegative(),
  lockedBonusCents: z.number().int().nonnegative(),
  lockedInTradesCents: z.number().int().nonnegative(),
  withdrawableCents: z.number().int().nonnegative(),
});

export const updateProfileInputSchema = z.object({
  avatarPath: z.string().optional(),
  displayName: z.string().min(1).max(50).optional(),
});

export const listTradesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
  outcome: tradeOutcomeSchema.optional(),
  status: tradeStatusSchema.optional(),
  tokenId: z.string().uuid().optional(),
});
