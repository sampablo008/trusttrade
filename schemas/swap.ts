import { z } from "zod";

export const swapSideSymbolSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{2,12}$/, "Invalid symbol.");

export const swapQuoteInputSchema = z
  .object({
    fromSymbol: swapSideSymbolSchema,
    toSymbol: swapSideSymbolSchema,
    fromAmount: z.number().positive().optional(),
    toAmount: z.number().positive().optional(),
  })
  .refine(
    (v) => (v.fromAmount != null) !== (v.toAmount != null),
    { message: "Specify exactly one of fromAmount or toAmount." },
  );

export const swapQuoteSchema = z.object({
  fromSymbol: z.string(),
  toSymbol: z.string(),
  fromAmount: z.number().positive(),
  feeAmount: z.number().nonnegative(),
  feeBps: z.number().int().nonnegative(),
  netAmount: z.number().positive(),
  toAmount: z.number().positive(),
  fromUsdPriceCents: z.number().int().positive(),
  toUsdPriceCents: z.number().int().positive(),
  rate: z.number().positive(),
});

export const executeSwapInputSchema = z.object({
  fromSymbol: swapSideSymbolSchema,
  toSymbol: swapSideSymbolSchema,
  fromAmount: z.number().positive(),
});

export const swapRecordSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  fromSymbol: z.string(),
  toSymbol: z.string(),
  fromTokenId: z.string().uuid().nullable(),
  toTokenId: z.string().uuid().nullable(),
  fromAmount: z.number(),
  toAmount: z.number(),
  feeAmount: z.number(),
  feeBpsApplied: z.number().int(),
  fromPriceUsdCents: z.number().int(),
  toPriceUsdCents: z.number().int(),
  createdAt: z.string(),
});

export const swapsResultSchema = z.object({
  items: z.array(swapRecordSchema),
});
