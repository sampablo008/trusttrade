export type TradeDirection = "long" | "short";
export type TradeStatus = "active" | "settled" | "cancelled";
export type TradeOutcome = "win" | "lose" | "void";

export interface UserTrade {
  adminForcedOutcome: TradeOutcome | null;
  direction: TradeDirection;
  endTime: string;
  entryPriceCents: number;
  exitPriceCents: number | null;
  id: string;
  outcome: TradeOutcome | null;
  payoutBps: number;
  periodId: string;
  stakeCents: number;
  startedAt: string;
  status: TradeStatus;
  strikePriceCents: number | null;
  tokenId: string;
  tokenSymbol: string;
  userId: string;
}

export interface ActiveTradesResult {
  items: UserTrade[];
}

export interface SettledTradesResult {
  items: UserTrade[];
  total: number;
}

export interface PlaceTradeInput {
  amountCents: number;
  direction: TradeDirection;
  periodId: string;
  tokenId: string;
}

export interface PlaceTradeResult {
  trade: UserTrade;
}

export interface CancelTradeResult {
  id: string;
}

export interface UserProfile {
  avatarPath: string | null;
  balanceCents: number;
  displayName: string | null;
  email: string;
  lockedBonusCents: number;
  lockedInTradesCents: number;
  role: "user" | "admin";
  userId: string;
  username: string;
}

export interface UserBalance {
  balanceCents: number;
  lockedBonusCents: number;
  lockedInTradesCents: number;
  withdrawableCents: number;
}

export interface UpdateProfileInput {
  avatarPath?: string;
  displayName?: string;
}
