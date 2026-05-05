import { randomUUID } from "node:crypto";
import { ApiClientError } from "@/lib/api/client";
import { findTopCoin } from "@/lib/markets/top-coins";
import {
  adminTokenSchema,
  adminTokensResultSchema,
  deleteAdminTokenResultSchema,
  publicCandlesResultSchema,
  publicTokenSchema,
  publicTokensResultSchema,
  publicTradePeriodSchema,
  publicTradePeriodsResultSchema,
  upsertAdminTokenInputSchema,
} from "@/schemas/market";
import type {
  AdminTradePeriod,
  AdminTradePeriodsResult,
  AdminToken,
  AdminTokensResult,
  ChartTimeframeValue,
  DeleteAdminTradePeriodResult,
  DeleteAdminTokenResult,
  PublicCandle,
  PublicCandlesResult,
  PublicToken,
  PublicTokensResult,
  PublicTradePeriodsResult,
  UpsertAdminTradePeriodInput,
  UpsertAdminTokenInput,
} from "@/types/market";
import {
  adminTradePeriodSchema,
  adminTradePeriodsResultSchema,
  deleteAdminTradePeriodResultSchema,
  upsertAdminTradePeriodInputSchema,
} from "@/schemas/market";

const PREVIEW_DEFAULTS = {
  BTC:  { decimals: 8,  coingeckoId: "bitcoin"          },
  ETH:  { decimals: 18, coingeckoId: "ethereum"         },
  SOL:  { decimals: 9,  coingeckoId: "solana"           },
} as const;

const parsePreviewAdminToken = (
  token: Omit<AdminToken, "decimals" | "minDeposit" | "swapFeeBps" | "minSwap" | "coingeckoId" | "minWithdrawal" | "withdrawFeeBps"> &
    Partial<Pick<AdminToken, "decimals" | "minDeposit" | "swapFeeBps" | "minSwap" | "coingeckoId" | "minWithdrawal" | "withdrawFeeBps">>,
): AdminToken => {
  const fallback = PREVIEW_DEFAULTS[token.symbol as keyof typeof PREVIEW_DEFAULTS];
  return adminTokenSchema.parse({
    ...token,
    decimals: token.decimals ?? fallback?.decimals ?? 8,
    minDeposit: token.minDeposit ?? 0,
    swapFeeBps: token.swapFeeBps ?? 100,
    minSwap: token.minSwap ?? 0,
    coingeckoId: token.coingeckoId ?? fallback?.coingeckoId ?? null,
    minWithdrawal: token.minWithdrawal ?? 0,
    withdrawFeeBps: token.withdrawFeeBps ?? 0,
  });
};

const previewTokenRegistry = new Map<string, AdminToken>([
  [
    "BTC",
    parsePreviewAdminToken({
      basePriceCents: 8200000,
      createdAt: "2026-04-19T12:00:00.000Z",
      feedSource: "shadow",
      iconPath: null,
      id: "00000000-0000-4000-8000-0000000000b1",
      isEnabled: true,
      lastPriceCents: 8445234,
      lastShadowPriceCents: 8445234,
      name: "Bitcoin",
      priceOffsetCents: 96000,
      priceScale: 1.0065,
      shadowSymbol: "BTCUSDT",
      symbol: "BTC",
      updatedAt: "2026-04-19T12:00:00.000Z",
      volatilityFactor: 1.12,
    }),
  ],
  [
    "ETH",
    parsePreviewAdminToken({
      basePriceCents: 279000,
      createdAt: "2026-04-19T12:00:00.000Z",
      feedSource: "shadow",
      iconPath: null,
      id: "00000000-0000-4000-8000-0000000000e1",
      isEnabled: true,
      lastPriceCents: 284342,
      lastShadowPriceCents: 284342,
      name: "Ethereum",
      priceOffsetCents: -1400,
      priceScale: 0.9975,
      shadowSymbol: "ETHUSDT",
      symbol: "ETH",
      updatedAt: "2026-04-19T12:00:00.000Z",
      volatilityFactor: 1.08,
    }),
  ],
  [
    "SOL",
    parsePreviewAdminToken({
      basePriceCents: 18000,
      createdAt: "2026-04-19T12:00:00.000Z",
      feedSource: "shadow",
      iconPath: null,
      id: "00000000-0000-4000-8000-000000000051",
      isEnabled: true,
      lastPriceCents: 17844,
      lastShadowPriceCents: 17844,
      name: "Solana",
      priceOffsetCents: 65,
      priceScale: 1.0035,
      shadowSymbol: "SOLUSDT",
      symbol: "SOL",
      updatedAt: "2026-04-19T12:00:00.000Z",
      volatilityFactor: 1.19,
    }),
  ],
]);

export const updatePreviewAdminTokenIconPath = (symbol: string, iconPath: string | null): void => {
  const key = symbol.toUpperCase();
  const existing = previewTokenRegistry.get(key);
  if (existing) {
    previewTokenRegistry.set(key, { ...existing, iconPath });
    return;
  }

  const coin = findTopCoin(key);
  const now = new Date().toISOString();
  previewTokenRegistry.set(
    key,
    parsePreviewAdminToken({
      basePriceCents: 100,
      createdAt: now,
      feedSource: coin?.binanceSymbol ? "shadow" : "synthetic",
      iconPath,
      id: randomUUID(),
      isEnabled: true,
      lastPriceCents: null,
      lastShadowPriceCents: null,
      name: coin?.name ?? key,
      priceOffsetCents: 0,
      priceScale: 1,
      shadowSymbol: coin?.binanceSymbol ? coin.binanceSymbol.toUpperCase() : null,
      symbol: key,
      updatedAt: now,
      volatilityFactor: 1,
    }),
  );
};

const parsePreviewAdminTradePeriod = (period: AdminTradePeriod): AdminTradePeriod =>
  adminTradePeriodSchema.parse(period);

const previewTradePeriodRegistry = new Map<string, AdminTradePeriod>([
  [
    "30s",
    parsePreviewAdminTradePeriod({
      createdAt: "2026-04-19T12:00:00.000Z",
      durationSeconds: 30,
      id: "10000000-0000-4000-8000-000000000030",
      isEnabled: true,
      label: "30s",
      maxAmountCents: 50000,
      minAmountCents: 1000,
      payoutBps: 18500,
      updatedAt: "2026-04-19T12:00:00.000Z",
    }),
  ],
  [
    "60s",
    parsePreviewAdminTradePeriod({
      createdAt: "2026-04-19T12:00:00.000Z",
      durationSeconds: 60,
      id: "10000000-0000-4000-8000-000000000060",
      isEnabled: true,
      label: "60s",
      maxAmountCents: 100000,
      minAmountCents: 1000,
      payoutBps: 18500,
      updatedAt: "2026-04-19T12:00:00.000Z",
    }),
  ],
  [
    "5m",
    parsePreviewAdminTradePeriod({
      createdAt: "2026-04-19T12:00:00.000Z",
      durationSeconds: 300,
      id: "10000000-0000-4000-8000-000000000300",
      isEnabled: true,
      label: "5m",
      maxAmountCents: 150000,
      minAmountCents: 2500,
      payoutBps: 18500,
      updatedAt: "2026-04-19T12:00:00.000Z",
    }),
  ],
  [
    "15m",
    parsePreviewAdminTradePeriod({
      createdAt: "2026-04-19T12:00:00.000Z",
      durationSeconds: 900,
      id: "10000000-0000-4000-8000-000000000900",
      isEnabled: true,
      label: "15m",
      maxAmountCents: 250000,
      minAmountCents: 5000,
      payoutBps: 18500,
      updatedAt: "2026-04-19T12:00:00.000Z",
    }),
  ],
  [
    "1h",
    parsePreviewAdminTradePeriod({
      createdAt: "2026-04-19T12:00:00.000Z",
      durationSeconds: 3600,
      id: "10000000-0000-4000-8000-000000003600",
      isEnabled: true,
      label: "1h",
      maxAmountCents: 500000,
      minAmountCents: 10000,
      payoutBps: 18500,
      updatedAt: "2026-04-19T12:00:00.000Z",
    }),
  ],
  [
    "1d",
    parsePreviewAdminTradePeriod({
      createdAt: "2026-04-19T12:00:00.000Z",
      durationSeconds: 86400,
      id: "10000000-0000-4000-8000-000000086400",
      isEnabled: true,
      label: "1d",
      maxAmountCents: 1000000,
      minAmountCents: 25000,
      payoutBps: 18500,
      updatedAt: "2026-04-19T12:00:00.000Z",
    }),
  ],
]);

const timeframeSeconds: Record<ChartTimeframeValue, number> = {
  "1s": 1,
  "15s": 15,
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "1h": 3600,
  "4h": 14400,
  "1d": 86400,
};

const symbolSeeds = new Map(
  Array.from(previewTokenRegistry.values()).map((token, index) => [
    token.symbol,
    (token.lastPriceCents ?? token.basePriceCents) + index * 137,
  ] as const),
);

const roundToCents = (value: number) => Math.max(Math.round(value), 1);
const getPreviewTokenValues = () => Array.from(previewTokenRegistry.values());

const buildPublicToken = (token: AdminToken): PublicToken => {
  const priceCents = token.lastPriceCents ?? token.lastShadowPriceCents ?? token.basePriceCents;
  const dayChangePercent = ((priceCents - token.basePriceCents) / Math.max(token.basePriceCents, 1)) * 100;
  const shadowOffsetPercent =
    (token.priceScale - 1) * 100 +
    (token.priceOffsetCents / Math.max(token.basePriceCents, 1)) * 100;
  const volumeBase = Math.max(priceCents * token.volatilityFactor * 24, priceCents);

  return publicTokenSchema.parse({
    dayChangePercent: Number(dayChangePercent.toFixed(2)),
    feedSource: token.feedSource,
    iconPath: token.iconPath,
    id: token.id,
    lastPriceAt: token.updatedAt,
    name: token.name,
    priceCents,
    shadowOffsetPercent: Number(shadowOffsetPercent.toFixed(2)),
    symbol: token.symbol,
    volumeLabel: new Intl.NumberFormat("en-US", {
      currency: "USD",
      maximumFractionDigits: 1,
      notation: "compact",
      style: "currency",
    }).format(volumeBase / 100),
    decimals: token.decimals,
    minDeposit: token.minDeposit,
    swapFeeBps: token.swapFeeBps,
    minSwap: token.minSwap,
    minWithdrawal: token.minWithdrawal,
    withdrawFeeBps: token.withdrawFeeBps,
  });
};

const buildPreviewCandleSeries = (
  symbol: string,
  timeframe: ChartTimeframeValue,
  limit: number,
): PublicCandle[] => {
  const basePrice =
    symbolSeeds.get(symbol) ??
    getPreviewTokenValues()[0]?.lastPriceCents ??
    getPreviewTokenValues()[0]?.basePriceCents ??
    10000;
  const bucketSeconds = timeframeSeconds[timeframe];
  const bucketMs = bucketSeconds * 1000;
  const seriesEnd = Math.floor(Date.now() / bucketMs) * bucketMs;
  const symbolSeed = symbol
    .split("")
    .reduce((total, character) => total + character.charCodeAt(0), 0);
  const priceAmplitude = Math.max(basePrice * 0.0022, 120);
  const candles: PublicCandle[] = [];

  for (let index = limit - 1; index >= 0; index -= 1) {
    const time = new Date(seriesEnd - index * bucketMs).toISOString();
    const motionIndex = limit - index;
    const center =
      basePrice +
      Math.sin((motionIndex + symbolSeed) / 4.2) * priceAmplitude +
      Math.cos((motionIndex + symbolSeed) / 9.1) * priceAmplitude * 0.58;
    const open = roundToCents(center - Math.sin((motionIndex + symbolSeed) / 2.6) * priceAmplitude * 0.16);
    const close = roundToCents(center + Math.cos((motionIndex + symbolSeed) / 3.3) * priceAmplitude * 0.19);
    const high = roundToCents(Math.max(open, close) + priceAmplitude * (0.09 + ((motionIndex + symbolSeed) % 5) * 0.012));
    const low = roundToCents(Math.min(open, close) - priceAmplitude * (0.08 + ((motionIndex + symbolSeed) % 4) * 0.01));
    const volume = Number((48 + Math.abs(close - open) / Math.max(basePrice, 1) * 18000 + (motionIndex % 9) * 6).toFixed(2));

    candles.push({
      closeCents: close,
      highCents: Math.max(high, open, close),
      lowCents: Math.max(1, Math.min(low, open, close)),
      openCents: open,
      time,
      volume,
    });
  }

  return candles;
};

export const getPreviewMarketTokens = (): PublicTokensResult =>
  publicTokensResultSchema.parse({
    items: Array.from(previewTokenRegistry.values())
      .filter((token) => token.isEnabled)
      .map((token) => buildPublicToken(token)),
  });

export const getPreviewTradePeriods = (): PublicTradePeriodsResult =>
  publicTradePeriodsResultSchema.parse({
    items: Array.from(previewTradePeriodRegistry.values())
      .filter((period) => period.isEnabled)
      .sort((left, right) => left.durationSeconds - right.durationSeconds)
      .map((period) =>
        publicTradePeriodSchema.parse({
          durationSeconds: period.durationSeconds,
          id: period.id,
          isEnabled: period.isEnabled,
          label: period.label,
          maxAmountCents: period.maxAmountCents,
          minAmountCents: period.minAmountCents,
          payoutBps: period.payoutBps,
        }),
      ),
  });

export const getPreviewCandles = (
  symbol: string,
  timeframe: ChartTimeframeValue,
  limit: number,
): PublicCandlesResult => {
  const normalizedSymbol =
    Array.from(previewTokenRegistry.values()).find((token) => token.symbol === symbol)?.symbol ??
    getPreviewTokenValues()[0]?.symbol ??
    symbol;

  return publicCandlesResultSchema.parse({
    items: buildPreviewCandleSeries(normalizedSymbol, timeframe, limit),
    symbol: normalizedSymbol,
    timeframe,
  });
};

export const listPreviewAdminTokens = (): AdminTokensResult =>
  adminTokensResultSchema.parse({
    items: Array.from(previewTokenRegistry.values()).sort((left, right) =>
      left.symbol.localeCompare(right.symbol),
    ),
  });

export const createPreviewAdminToken = (payload: UpsertAdminTokenInput): AdminToken => {
  const input = upsertAdminTokenInputSchema.parse(payload);

  if (previewTokenRegistry.has(input.symbol)) {
    throw new ApiClientError("Token symbol already exists.", 409, "TOKEN_SYMBOL_TAKEN");
  }

  const now = new Date().toISOString();
  const token = parsePreviewAdminToken({
    basePriceCents: input.basePriceCents,
    createdAt: now,
    feedSource: input.feedSource,
    iconPath: input.iconPath,
    id: randomUUID(),
    isEnabled: input.isEnabled,
    lastPriceCents: input.basePriceCents,
    lastShadowPriceCents: input.basePriceCents,
    name: input.name,
    priceOffsetCents: input.priceOffsetCents,
    priceScale: input.priceScale,
    shadowSymbol: input.shadowSymbol,
    symbol: input.symbol,
    updatedAt: now,
    volatilityFactor: input.volatilityFactor,
    decimals: input.decimals,
    minDeposit: input.minDeposit,
    swapFeeBps: input.swapFeeBps,
    minSwap: input.minSwap,
    coingeckoId: input.coingeckoId,
    minWithdrawal: input.minWithdrawal,
    withdrawFeeBps: input.withdrawFeeBps,
  });

  previewTokenRegistry.set(token.symbol, token);
  symbolSeeds.set(token.symbol, token.basePriceCents);

  return token;
};

export const updatePreviewAdminToken = (id: string, payload: UpsertAdminTokenInput): AdminToken => {
  const input = upsertAdminTokenInputSchema.parse(payload);
  const existing = Array.from(previewTokenRegistry.values()).find((token) => token.id === id);

  if (!existing) {
    throw new ApiClientError("Token not found.", 404, "TOKEN_NOT_FOUND");
  }

  if (existing.symbol !== input.symbol && previewTokenRegistry.has(input.symbol)) {
    throw new ApiClientError("Token symbol already exists.", 409, "TOKEN_SYMBOL_TAKEN");
  }

  previewTokenRegistry.delete(existing.symbol);

  const token = parsePreviewAdminToken({
    ...existing,
    basePriceCents: input.basePriceCents,
    feedSource: input.feedSource,
    iconPath: input.iconPath,
    isEnabled: input.isEnabled,
    lastPriceCents: existing.lastPriceCents ?? input.basePriceCents,
    lastShadowPriceCents: existing.lastShadowPriceCents ?? input.basePriceCents,
    name: input.name,
    priceOffsetCents: input.priceOffsetCents,
    priceScale: input.priceScale,
    shadowSymbol: input.shadowSymbol,
    symbol: input.symbol,
    updatedAt: new Date().toISOString(),
    volatilityFactor: input.volatilityFactor,
    decimals: input.decimals,
    minDeposit: input.minDeposit,
    swapFeeBps: input.swapFeeBps,
    minSwap: input.minSwap,
    coingeckoId: input.coingeckoId,
    minWithdrawal: input.minWithdrawal,
    withdrawFeeBps: input.withdrawFeeBps,
  });

  previewTokenRegistry.set(token.symbol, token);
  symbolSeeds.set(token.symbol, token.basePriceCents);

  return token;
};

export const deletePreviewAdminToken = (id: string): DeleteAdminTokenResult => {
  const existing = Array.from(previewTokenRegistry.values()).find((token) => token.id === id);

  if (!existing) {
    throw new ApiClientError("Token not found.", 404, "TOKEN_NOT_FOUND");
  }

  previewTokenRegistry.delete(existing.symbol);
  symbolSeeds.delete(existing.symbol);

  return deleteAdminTokenResultSchema.parse({
    id,
  });
};

export const listPreviewAdminTradePeriods = (): AdminTradePeriodsResult =>
  adminTradePeriodsResultSchema.parse({
    items: Array.from(previewTradePeriodRegistry.values()).sort(
      (left, right) => left.durationSeconds - right.durationSeconds,
    ),
  });

export const createPreviewAdminTradePeriod = (
  payload: UpsertAdminTradePeriodInput,
): AdminTradePeriod => {
  const input = upsertAdminTradePeriodInputSchema.parse(payload);

  if (previewTradePeriodRegistry.has(input.label)) {
    throw new ApiClientError("Trade period label already exists.", 409, "TRADE_PERIOD_LABEL_TAKEN");
  }

  const now = new Date().toISOString();
  const period = parsePreviewAdminTradePeriod({
    createdAt: now,
    durationSeconds: input.durationSeconds,
    id: randomUUID(),
    isEnabled: input.isEnabled,
    label: input.label,
    maxAmountCents: input.maxAmountCents,
    minAmountCents: input.minAmountCents,
    payoutBps: input.payoutBps,
    updatedAt: now,
  });

  previewTradePeriodRegistry.set(period.label, period);

  return period;
};

export const updatePreviewAdminTradePeriod = (
  id: string,
  payload: UpsertAdminTradePeriodInput,
): AdminTradePeriod => {
  const input = upsertAdminTradePeriodInputSchema.parse(payload);
  const existing = Array.from(previewTradePeriodRegistry.values()).find((period) => period.id === id);

  if (!existing) {
    throw new ApiClientError("Trade period not found.", 404, "TRADE_PERIOD_NOT_FOUND");
  }

  if (existing.label !== input.label && previewTradePeriodRegistry.has(input.label)) {
    throw new ApiClientError("Trade period label already exists.", 409, "TRADE_PERIOD_LABEL_TAKEN");
  }

  previewTradePeriodRegistry.delete(existing.label);

  const period = parsePreviewAdminTradePeriod({
    ...existing,
    durationSeconds: input.durationSeconds,
    isEnabled: input.isEnabled,
    label: input.label,
    maxAmountCents: input.maxAmountCents,
    minAmountCents: input.minAmountCents,
    payoutBps: input.payoutBps,
    updatedAt: new Date().toISOString(),
  });

  previewTradePeriodRegistry.set(period.label, period);

  return period;
};

export const deletePreviewAdminTradePeriod = (id: string): DeleteAdminTradePeriodResult => {
  const existing = Array.from(previewTradePeriodRegistry.values()).find((period) => period.id === id);

  if (!existing) {
    throw new ApiClientError("Trade period not found.", 404, "TRADE_PERIOD_NOT_FOUND");
  }

  previewTradePeriodRegistry.delete(existing.label);

  return deleteAdminTradePeriodResultSchema.parse({
    id,
  });
};
