import { z } from "zod";

export const chartTimeframeSchema = z.enum(["1s", "15s", "1m", "5m", "15m", "1h", "4h", "1d"]);

export const publicTokenSchema = z.object({
  dayChangePercent: z.number(),
  feedSource: z.enum(["synthetic", "shadow", "replay", "frozen"]),
  iconPath: z.string().nullable(),
  id: z.string().uuid(),
  lastPriceAt: z.string().datetime().nullable(),
  name: z.string().min(1),
  priceCents: z.number().int().positive(),
  shadowOffsetPercent: z.number(),
  symbol: z.string().regex(/^[A-Z0-9]{2,12}$/),
  volumeLabel: z.string().min(1),
});

export const publicTokensResultSchema = z.object({
  items: z.array(publicTokenSchema),
});

export const publicTradePeriodSchema = z.object({
  durationSeconds: z.number().int().positive(),
  id: z.string().uuid(),
  isEnabled: z.boolean(),
  label: z.string().min(1),
  maxAmountCents: z.number().int().positive(),
  minAmountCents: z.number().int().positive(),
  payoutBps: z.number().int().positive(),
});

export const publicTradePeriodsResultSchema = z.object({
  items: z.array(publicTradePeriodSchema),
});

export const publicCandlesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(120),
  symbol: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,12}$/, "Symbol format is invalid."),
  tf: chartTimeframeSchema.default("1m"),
});

export const publicCandleSchema = z.object({
  closeCents: z.number().int().positive(),
  highCents: z.number().int().positive(),
  lowCents: z.number().int().positive(),
  openCents: z.number().int().positive(),
  time: z.string().datetime(),
  volume: z.number().nonnegative(),
});

export const publicCandlesResultSchema = z.object({
  items: z.array(publicCandleSchema),
  symbol: z.string().regex(/^[A-Z0-9]{2,12}$/),
  timeframe: chartTimeframeSchema,
});

export const adminTokenSchema = z.object({
  basePriceCents: z.number().int().positive(),
  createdAt: z.string().datetime(),
  feedSource: z.enum(["synthetic", "shadow", "replay", "frozen"]),
  iconPath: z.string().nullable(),
  id: z.string().uuid(),
  isEnabled: z.boolean(),
  lastPriceCents: z.number().int().positive().nullable(),
  lastShadowPriceCents: z.number().int().positive().nullable(),
  name: z.string().min(1).max(64),
  priceOffsetCents: z.number().int(),
  priceScale: z.number().positive(),
  shadowSymbol: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,20}$/)
    .nullable(),
  symbol: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2,12}$/),
  updatedAt: z.string().datetime(),
  volatilityFactor: z.number().positive(),
});

export const adminTokensResultSchema = z.object({
  items: z.array(adminTokenSchema),
});

export const upsertAdminTokenInputSchema = z.object({
  basePriceCents: z.coerce.number().int().positive("Base price must be positive."),
  feedSource: z.enum(["synthetic", "shadow", "replay", "frozen"]),
  iconPath: z.string().trim().nullable(),
  isEnabled: z.boolean(),
  name: z.string().trim().min(1, "Name is required.").max(64, "Name is too long."),
  priceOffsetCents: z.coerce.number().int(),
  priceScale: z.coerce.number().positive("Scale must be positive."),
  shadowSymbol: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,20}$/, "Shadow symbol format is invalid.")
    .nullable(),
  symbol: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,12}$/, "Symbol format is invalid."),
  volatilityFactor: z.coerce.number().positive("Volatility must be positive."),
});

export const deleteAdminTokenResultSchema = z.object({
  id: z.string().uuid(),
});
