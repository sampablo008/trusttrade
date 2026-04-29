import { z } from "zod";
import { tradeDirectionSchema, tradeOutcomeSchema, tradeStatusSchema, userTradeSchema } from "@/schemas/trade";

export const adminTradeFlagSchema = z.enum([
  "NEW_USER",
  "LOW_TRADE_VOLUME",
  "HIGH_STAKE",
  "EXPIRING_SOON",
]);

export const adminTradeSchema = userTradeSchema.extend({
  flags: z.array(adminTradeFlagSchema),
  periodLabel: z.string(),
  timeRemainingMs: z.number(),
  userEmail: z.string(),
  username: z.string(),
});

export const adminTradeListResultSchema = z.object({
  items: z.array(adminTradeSchema),
  total: z.number().int().nonnegative(),
});

export const settleTradeInputSchema = z.object({
  outcome: tradeOutcomeSchema,
  reason: z.string().max(500).optional(),
});

export const forceTradeOutcomeInputSchema = z.object({
  outcome: tradeOutcomeSchema,
  reason: z.string().max(500).optional(),
});

export const bulkSettleInputSchema = z.object({
  outcome: tradeOutcomeSchema,
  reason: z.string().max(500).optional(),
  tradeIds: z.array(z.string().uuid()).min(1).max(200),
});

export const adminTokenBalanceSchema = z.object({
  tokenId: z.string().uuid(),
  symbol: z.string(),
  name: z.string(),
  iconPath: z.string().nullable(),
  decimals: z.number().int().nonnegative(),
  balance: z.number(),
  lockedBalance: z.number(),
  usdPriceCents: z.number().int().nonnegative(),
  usdValueCents: z.number().int().nonnegative(),
});

export const adminUserSchema = z.object({
  avatarPath: z.string().nullable(),
  displayName: z.string().nullable(),
  email: z.string().email(),
  forcedOutcome: tradeOutcomeSchema.nullable(),
  isFrozen: z.boolean(),
  joinedAt: z.string(),
  role: z.enum(["user", "admin"]),
  totalSettledTrades: z.number().int().nonnegative(),
  totalStakeCents: z.number().int().nonnegative(),
  userId: z.string().uuid(),
  username: z.string(),
  tokenBalances: z.array(adminTokenBalanceSchema).optional(),
});

export const adminUserListResultSchema = z.object({
  items: z.array(adminUserSchema),
  total: z.number().int().nonnegative(),
});

export const freezeUserInputSchema = z.object({
  isFrozen: z.boolean(),
  reason: z.string().max(500).optional(),
});

export const setForcedOutcomeInputSchema = z.object({
  forcedOutcome: tradeOutcomeSchema.nullable(),
  reason: z.string().max(500).optional(),
});

export const adjustTokenBalanceInputSchema = z.object({
  tokenId: z.string().uuid(),
  deltaAmount: z.number().refine((v) => v !== 0, "Delta must be non-zero"),
  note: z.string().min(3).max(500),
});

export const adminTransactionSchema = z.object({
  amountCents: z.number().int(),
  balanceAfterCents: z.number().int().nullable(),
  createdAt: z.string(),
  id: z.string(),
  kind: z.string(),
  memo: z.string().nullable(),
  referenceId: z.string().nullable(),
  userId: z.string(),
  tokenId: z.string().nullable(),
  tokenSymbol: z.string().nullable(),
  tokenAmount: z.number().nullable(),
});

export const adminTransactionListResultSchema = z.object({
  items: z.array(adminTransactionSchema),
  total: z.number().int().nonnegative(),
});

export const auditLogEntrySchema = z.object({
  action: z.string(),
  adminEmail: z.string(),
  adminId: z.string().uuid().nullable(),
  afterJson: z.record(z.string(), z.unknown()).nullable(),
  beforeJson: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string(),
  id: z.string().uuid(),
  ipAddress: z.string().nullable(),
  notes: z.string().nullable(),
  targetId: z.string().nullable(),
  targetType: z.string().nullable(),
});

export const auditLogResultSchema = z.object({
  items: z.array(auditLogEntrySchema),
  total: z.number().int().nonnegative(),
});

export const adminTradeFiltersSchema = z.object({
  direction: tradeDirectionSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  maxStakeCents: z.coerce.number().int().positive().optional(),
  minStakeCents: z.coerce.number().int().positive().optional(),
  offset: z.coerce.number().int().nonnegative().default(0),
  status: tradeStatusSchema.optional(),
  tokenId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
});

export const adminUserFiltersSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
  role: z.enum(["user", "admin"]).optional(),
  search: z.string().max(100).optional(),
});

export const adminTransactionFiltersSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const auditFiltersSchema = z.object({
  action: z.string().optional(),
  adminId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
  targetType: z.string().optional(),
});
