import { z } from "zod";

export const commissionStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "clawed_back",
]);

export const referralFlagKindSchema = z.enum([
  "SAME_IP",
  "VELOCITY",
  "RAPID_CHAIN",
  "SELF_REFERRAL_ATTEMPT",
  "SUSPICIOUS_DEPOSIT",
]);

export const referralSchema = z.object({
  createdAt: z.string(),
  firstDepositFired: z.boolean(),
  id: z.string().uuid(),
  invitedViaCode: z.string(),
  refereeUserId: z.string().uuid(),
  referrerUserId: z.string().uuid(),
});

export const referralTreeNodeSchema = z.object({
  createdAt: z.string(),
  level: z.number().int().min(1).max(5),
  refereeEmail: z.string(),
  refereeUserId: z.string().uuid(),
  refereeUsername: z.string(),
});

export const referralListResultSchema = z.object({
  items: z.array(referralTreeNodeSchema),
  total: z.number().int().nonnegative(),
});

export const referralRatesSchema = z.object({
  l1Bps: z.number().int().min(0).max(5000),
  l2Bps: z.number().int().min(0).max(5000),
  l3Bps: z.number().int().min(0).max(5000),
  l4Bps: z.number().int().min(0).max(5000),
  l5Bps: z.number().int().min(0).max(5000),
  userId: z.string().uuid(),
});

export const referralCommissionSchema = z.object({
  baseAmountCents: z.number().int().positive(),
  beneficiaryUserId: z.string().uuid(),
  bpsApplied: z.number().int().nonnegative(),
  commissionCents: z.number().int().nonnegative(),
  createdAt: z.string(),
  depositId: z.string().uuid().nullable(),
  id: z.string().uuid(),
  level: z.number().int().min(1).max(5),
  refereeUserId: z.string().uuid(),
  refereeUsername: z.string(),
  reviewNote: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  reviewedByAdminId: z.string().uuid().nullable(),
  status: commissionStatusSchema,
  updatedAt: z.string(),
});

export const referralCommissionListResultSchema = z.object({
  items: z.array(referralCommissionSchema),
  total: z.number().int().nonnegative(),
});

export const referralFlagSchema = z.object({
  createdAt: z.string(),
  detail: z.record(z.string(), z.unknown()),
  id: z.string().uuid(),
  isResolved: z.boolean(),
  kind: referralFlagKindSchema,
  resolvedAt: z.string().nullable(),
  resolvedByAdminId: z.string().uuid().nullable(),
  userId: z.string().uuid(),
  username: z.string(),
});

export const referralFlagListResultSchema = z.object({
  items: z.array(referralFlagSchema),
  total: z.number().int().nonnegative(),
});

export const referralStatsSchema = z.object({
  approvedCommissionCents: z.number().int().nonnegative(),
  code: z.string(),
  directReferrals: z.number().int().nonnegative(),
  pendingCommissionCents: z.number().int().nonnegative(),
  totalCommissionCents: z.number().int().nonnegative(),
  totalReferrals: z.number().int().nonnegative(),
});

export const setRatesInputSchema = z.object({
  l1Bps: z.number().int().min(0).max(5000),
  l2Bps: z.number().int().min(0).max(5000),
  l3Bps: z.number().int().min(0).max(5000),
  l4Bps: z.number().int().min(0).max(5000),
  l5Bps: z.number().int().min(0).max(5000),
});

export const approveRejectCommissionInputSchema = z.object({
  note: z.string().max(500).optional(),
});

export const bulkApproveCommissionsInputSchema = z.object({
  commissionIds: z.array(z.string().uuid()).min(1).max(200),
  note: z.string().max(500).optional(),
});

export const resolveFlagInputSchema = z.object({
  note: z.string().max(500).optional(),
});

export const commissionFiltersSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
  status: commissionStatusSchema.optional(),
  userId: z.string().uuid().optional(),
});

export const flagFiltersSchema = z.object({
  isResolved: z
    .string()
    .optional()
    .transform((v) => (v === "true" ? true : v === "false" ? false : undefined)),
  kind: referralFlagKindSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const referralTreeFiltersSchema = z.object({
  level: z.coerce.number().int().min(1).max(5).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});
