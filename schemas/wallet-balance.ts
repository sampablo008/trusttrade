import { z } from "zod";

export const tokenBalanceSchema = z.object({
  tokenId: z.string().uuid(),
  symbol: z.string(),
  name: z.string(),
  iconPath: z.string().nullable(),
  decimals: z.number().int().min(0).max(30),
  balance: z.number().nonnegative(),
  lockedBalance: z.number().nonnegative().default(0),
  usdValueCents: z.number().int().nonnegative(),
  freeUsdValueCents: z.number().int().nonnegative(),
  usdPriceCents: z.number().int().nonnegative(),
});

export const walletBalancesResultSchema = z.object({
  usdBalanceCents: z.number().int(),
  lockedInTradesCents: z.number().int(),
  lockedBonusCents: z.number().int(),
  withdrawableCents: z.number().int(),
  tokens: z.array(tokenBalanceSchema),
  totalUsdValueCents: z.number().int().nonnegative(),
  totalFreeUsdValueCents: z.number().int().nonnegative(),
});
