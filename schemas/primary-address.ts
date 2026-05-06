import { z } from "zod";

const pinString = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter your 6-digit withdrawal PIN.");

const addressString = z
  .string()
  .trim()
  .min(8, "Address looks too short.")
  .max(128, "Address is too long.");

const networkString = z
  .string()
  .trim()
  .min(1, "Network is required.")
  .max(32);

const tokenSymbolString = z
  .string()
  .trim()
  .min(1, "Token symbol is required.")
  .max(16);

export const primaryAddressSchema = z.object({
  tokenId: z.string().uuid(),
  tokenSymbol: z.string().min(1),
  network: z.string().min(1),
  address: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const primaryAddressesResultSchema = z.object({
  items: z.array(primaryAddressSchema),
});

export const setPrimaryAddressInputSchema = z.object({
  tokenSymbol: tokenSymbolString,
  network: networkString,
  address: addressString,
  withdrawalPin: pinString,
});

export const removePrimaryAddressInputSchema = z.object({
  tokenSymbol: tokenSymbolString,
  network: networkString,
  withdrawalPin: pinString,
});
