import { randomUUID } from "node:crypto";
import { calcWithdrawable } from "@/lib/utils/money";
import type {
  ActiveTradesResult,
  CancelTradeResult,
  PlaceTradeInput,
  PlaceTradeResult,
  SettledTradesResult,
  UserBalance,
  UserProfile,
  UserTrade,
} from "@/types/trade";

const PREVIEW_USER_ID = "00000000-0000-4000-8000-0000000000a1";
const PREVIEW_BTC_TOKEN_ID = "00000000-0000-4000-8000-0000000000b1";
const PREVIEW_PERIOD_1M_ID = "00000000-0000-4000-8000-0000000000p1";

const makeActiveTrade = (overrides: Partial<UserTrade> = {}): UserTrade => {
  const now = new Date();
  const endTime = new Date(now.getTime() + 45_000);
  return {
    direction: "long",
    endTime: endTime.toISOString(),
    entryPriceCents: 8_445_234,
    id: randomUUID(),
    outcome: null,
    payoutBps: 18500,
    periodId: PREVIEW_PERIOD_1M_ID,
    stakeCents: 25_000,
    startedAt: new Date(now.getTime() - 15_000).toISOString(),
    status: "active",
    strikePriceCents: null,
    tokenId: PREVIEW_BTC_TOKEN_ID,
    tokenSymbol: "BTC",
    userId: PREVIEW_USER_ID,
    ...overrides,
  };
};

const makeSettledTrade = (outcome: "win" | "lose", overrides: Partial<UserTrade> = {}): UserTrade => {
  const past = new Date(Date.now() - 3_600_000);
  return {
    direction: outcome === "win" ? "long" : "short",
    endTime: new Date(past.getTime() + 60_000).toISOString(),
    entryPriceCents: 8_400_000,
    id: randomUUID(),
    outcome,
    payoutBps: 18500,
    periodId: PREVIEW_PERIOD_1M_ID,
    stakeCents: 25_000,
    startedAt: past.toISOString(),
    status: "settled",
    strikePriceCents: outcome === "win" ? 8_450_000 : 8_350_000,
    tokenId: PREVIEW_BTC_TOKEN_ID,
    tokenSymbol: "BTC",
    userId: PREVIEW_USER_ID,
    ...overrides,
  };
};

// In-memory store for preview trades
const previewActiveTrades = new Map<string, UserTrade>([
  [
    "preview-trade-1",
    makeActiveTrade({
      id: "00000000-0000-4000-8000-0000000000t1",
      direction: "long",
      stakeCents: 50_000,
    }),
  ],
  [
    "preview-trade-2",
    makeActiveTrade({
      id: "00000000-0000-4000-8000-0000000000t2",
      direction: "short",
      stakeCents: 25_000,
      endTime: new Date(Date.now() + 8_000).toISOString(),
    }),
  ],
]);

const previewSettledTrades: UserTrade[] = [
  makeSettledTrade("win"),
  makeSettledTrade("lose"),
  makeSettledTrade("win"),
];

export const getPreviewActiveTrades = (): ActiveTradesResult => ({
  items: Array.from(previewActiveTrades.values()),
});

export const getPreviewSettledTrades = (): SettledTradesResult => ({
  items: previewSettledTrades,
  total: previewSettledTrades.length,
});

export const getPreviewTrade = (id: string): UserTrade | null => {
  const active = previewActiveTrades.get(id) ??
    Array.from(previewActiveTrades.values()).find((t) => t.id === id);
  if (active) return active;
  return previewSettledTrades.find((t) => t.id === id) ?? null;
};

export const previewPlaceTrade = (input: PlaceTradeInput): PlaceTradeResult => {
  const trade = makeActiveTrade({
    id: randomUUID(),
    direction: input.direction,
    stakeCents: input.amountCents,
    tokenId: input.tokenId,
    periodId: input.periodId,
    endTime: new Date(Date.now() + 60_000).toISOString(),
  });
  previewActiveTrades.set(trade.id, trade);
  return { trade };
};

export const previewCancelTrade = (id: string): CancelTradeResult => {
  previewActiveTrades.delete(id);
  return { id };
};

export const getPreviewProfile = (): UserProfile => ({
  avatarPath: null,
  balanceCents: 184_500,
  displayName: "Preview Trader",
  email: "preview@trustpro.io",
  lockedBonusCents: 0,
  lockedInTradesCents: 75_000,
  role: "user",
  userId: PREVIEW_USER_ID,
  username: "preview_trader",
});

export const getPreviewBalance = (): UserBalance => {
  const balance = 184_500;
  const locked = 75_000;
  const bonus = 0;
  return {
    balanceCents: balance,
    lockedBonusCents: bonus,
    lockedInTradesCents: locked,
    withdrawableCents: calcWithdrawable(balance, locked, bonus),
  };
};
