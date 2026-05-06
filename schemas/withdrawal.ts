import { z } from "zod";

export const withdrawalStatusSchema = z.enum([
  "pending",
  "approved",
  "paid",
  "rejected",
  "cancelled",
]);

export const withdrawalFlagSchema = z.enum([
  "NEW_USER",
  "LOW_TRADE_VOLUME",
  "ADDRESS_REUSE",
  "RAPID",
  "POST_BONUS",
  "FIRST_WITHDRAW",
]);

export const withdrawalSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  tokenId: z.string().uuid().nullable(),
  amount: z.number().nonnegative().nullable(),
  feeAmount: z.number().nonnegative().nullable(),
  netAmount: z.number().nonnegative().nullable(),
  amountCents: z.number().int().nonnegative(),
  usdValueCents: z.number().int().nonnegative().nullable().default(null),
  feeCents: z.number().int().min(0),
  netAmountCents: z.number().int().min(0),
  tokenSymbol: z.string().min(1),
  iconPath: z.string().nullable().default(null),
  network: z.string().min(1),
  destinationAddress: z.string().min(1),
  status: withdrawalStatusSchema,
  flags: z.array(withdrawalFlagSchema),
  adminNote: z.string().nullable(),
  payoutTxHash: z.string().nullable(),
  reviewedBy: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  paidBy: z.string().nullable(),
  paidAt: z.string().nullable(),
  createdAt: z.string(),
});

export const withdrawalsResultSchema = z.object({
  items: z.array(withdrawalSchema),
  total: z.number().int().min(0),
});

export const requestWithdrawalInputSchema = z.object({
  tokenSymbol: z.string().min(1),
  network: z.string().min(1),
  amount: z.number().positive("Amount must be greater than zero."),
  destinationAddress: z.string().min(10, "Destination address is required."),
  withdrawalPin: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter your 6-digit withdrawal PIN."),
});

export const adminWithdrawalFiltersSchema = z.object({
  status: withdrawalStatusSchema.optional(),
  userId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const adminApproveWithdrawalSchema = z.object({
  note: z.string().optional(),
});

export const adminMarkPaidSchema = z.object({
  txHash: z.string().min(1, "Transaction hash is required."),
  addressConfirm: z.string().min(8),
});

export const adminRejectWithdrawalSchema = z.object({
  note: z.string().min(1, "Rejection reason is required."),
});
