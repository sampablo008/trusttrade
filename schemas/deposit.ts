import { z } from "zod";

export const depositStatusSchema = z.enum(["pending", "approved", "rejected"]);

export const depositSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  tokenId: z.string().uuid(),
  tokenSymbol: z.string(),
  network: z.string().min(1),
  amountCents: z.number().int().positive(),
  proofPath: z.string().min(1),
  txHash: z.string().nullable(),
  status: depositStatusSchema,
  adminNote: z.string().nullable(),
  reviewedBy: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  createdAt: z.string(),
});

export const depositsResultSchema = z.object({
  items: z.array(depositSchema),
  total: z.number().int().min(0),
});

export const submitDepositInputSchema = z.object({
  tokenSymbol: z.string().min(1, "Token is required."),
  network: z.string().min(1, "Network is required."),
  amountCents: z.number().int().positive(),
  proofPath: z.string().min(1),
  txHash: z.string().optional(),
});

export const adminDepositFiltersSchema = z.object({
  status: depositStatusSchema.optional(),
  userId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const adminApproveDepositSchema = z.object({
  note: z.string().optional(),
});

export const adminRejectDepositSchema = z.object({
  note: z.string().min(1, "Rejection reason is required."),
});
