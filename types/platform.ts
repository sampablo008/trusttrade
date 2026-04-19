export type TokenSymbol = "BTC" | "ETH" | "SOL";
export type TradeDirection = "long" | "short";
export type QueueView = "urgent" | "flagged" | "all";
export type TimeframeValue = "1s" | "15s" | "1m" | "5m" | "15m" | "1h";
export type SettlementStatus = "urgent" | "flagged" | "pending";

export interface MarketSnapshot {
  symbol: TokenSymbol;
  name: string;
  priceCents: number;
  dayChangePercent: number;
  shadowOffsetPercent: number;
  volumeLabel: string;
}

export interface TimeframeOption {
  label: string;
  value: TimeframeValue;
}

export interface ExperienceMetric {
  label: string;
  value: string;
  detail: string;
}

export interface QueueFilter {
  label: string;
  value: QueueView;
}

export interface SettlementRow {
  id: string;
  user: string;
  pair: string;
  token: TokenSymbol;
  direction: TradeDirection;
  stakeCents: number;
  expiresIn: string;
  status: SettlementStatus;
  flag: string;
}

export interface FlowStep {
  title: string;
  description: string;
}

export interface SecurityInvariant {
  title: string;
  description: string;
}

export interface ReferralMilestone {
  level: string;
  rateLabel: string;
  note: string;
}
