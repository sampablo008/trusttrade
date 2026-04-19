import { z } from "zod";

export const SUPPORTED_NETWORKS = ["USDT-TRC20", "USDT-ERC20", "USDT-BEP20", "BTC"] as const;
export type SupportedNetwork = (typeof SUPPORTED_NETWORKS)[number];

export const adminWalletAddressSchema = z.object({
  address: z.string().min(10).max(128),
  createdAt: z.string().datetime(),
  id: z.string().uuid(),
  isEnabled: z.boolean(),
  memo: z.string().max(128).nullable(),
  minDepositCents: z.number().int().positive(),
  network: z.string().min(2).max(32),
  qrCodePath: z.string().nullable().optional(),
  tokenSymbol: z.string().regex(/^[A-Z0-9]{2,12}$/),
  updatedAt: z.string().datetime(),
});

export const adminWalletAddressesResultSchema = z.object({
  items: z.array(adminWalletAddressSchema),
});

export const upsertAdminWalletAddressInputSchema = z.object({
  address: z
    .string()
    .trim()
    .min(10, "Address must be at least 10 characters.")
    .max(128, "Address is too long."),
  isEnabled: z.boolean(),
  memo: z.string().trim().max(128, "Memo is too long.").nullable(),
  minDepositCents: z.coerce.number().int().positive("Min deposit must be positive."),
  network: z
    .string()
    .trim()
    .min(2, "Network is required.")
    .max(32, "Network name is too long."),
  qrCodePath: z.string().nullable().optional(),
  tokenSymbol: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,12}$/, "Token symbol format is invalid."),
});

export const deleteAdminWalletAddressResultSchema = z.object({
  id: z.string().uuid(),
});

export const publicWalletAddressSchema = z.object({
  address: z.string().min(10),
  id: z.string().uuid(),
  memo: z.string().nullable(),
  minDepositCents: z.number().int().positive(),
  network: z.string().min(2),
  qrCodePath: z.string().nullable().optional(),
  tokenSymbol: z.string().regex(/^[A-Z0-9]{2,12}$/),
});

export const publicWalletAddressesResultSchema = z.object({
  items: z.array(publicWalletAddressSchema),
});
