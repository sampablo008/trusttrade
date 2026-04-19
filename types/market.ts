export type TokenFeedSource = "synthetic" | "shadow" | "replay" | "frozen";
export type ChartTimeframeValue = "1s" | "15s" | "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

export interface PublicToken {
  dayChangePercent: number;
  feedSource: TokenFeedSource;
  iconPath: string | null;
  id: string;
  lastPriceAt: string | null;
  name: string;
  priceCents: number;
  shadowOffsetPercent: number;
  symbol: string;
  volumeLabel: string;
}

export interface PublicTokensResult {
  items: PublicToken[];
}

export interface PublicTradePeriod {
  durationSeconds: number;
  id: string;
  isEnabled: boolean;
  label: string;
  maxAmountCents: number;
  minAmountCents: number;
  payoutBps: number;
}

export interface PublicTradePeriodsResult {
  items: PublicTradePeriod[];
}

export interface PublicCandle {
  closeCents: number;
  highCents: number;
  lowCents: number;
  openCents: number;
  time: string;
  volume: number;
}

export interface PublicCandlesResult {
  items: PublicCandle[];
  symbol: string;
  timeframe: ChartTimeframeValue;
}

export interface AdminToken {
  basePriceCents: number;
  createdAt: string;
  feedSource: TokenFeedSource;
  iconPath: string | null;
  id: string;
  isEnabled: boolean;
  lastPriceCents: number | null;
  lastShadowPriceCents: number | null;
  name: string;
  priceOffsetCents: number;
  priceScale: number;
  shadowSymbol: string | null;
  symbol: string;
  updatedAt: string;
  volatilityFactor: number;
}

export interface AdminTokensResult {
  items: AdminToken[];
}

export interface UpsertAdminTokenInput {
  basePriceCents: number;
  feedSource: TokenFeedSource;
  iconPath: string | null;
  isEnabled: boolean;
  name: string;
  priceOffsetCents: number;
  priceScale: number;
  shadowSymbol: string | null;
  symbol: string;
  volatilityFactor: number;
}

export interface DeleteAdminTokenResult {
  id: string;
}
