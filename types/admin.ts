import type { TradeDirection, TradeOutcome, TradeStatus, UserTrade } from "@/types/trade";

export interface AdminTrade extends UserTrade {
  username: string;
  userEmail: string;
  tokenSymbol: string;
  periodLabel: string;
  timeRemainingMs: number;
  flags: AdminTradeFlag[];
}

export type AdminTradeFlag =
  | "NEW_USER"
  | "LOW_TRADE_VOLUME"
  | "HIGH_STAKE"
  | "EXPIRING_SOON";

export interface AdminTradeListResult {
  items: AdminTrade[];
  total: number;
}

export interface SettleTradeInput {
  outcome: TradeOutcome;
  reason?: string;
}

export interface ForceTradeOutcomeInput {
  outcome: TradeOutcome;
  reason?: string;
}

export interface BulkSettleInput {
  outcome: TradeOutcome;
  reason?: string;
  tradeIds: string[];
}

export interface BulkSettleResult {
  failed: string[];
  settled: string[];
}

export interface AdminTokenBalance {
  tokenId: string;
  symbol: string;
  name: string;
  iconPath: string | null;
  decimals: number;
  balance: number;
  lockedBalance: number;
  usdPriceCents: number;
  usdValueCents: number;
}

export interface AdminUser {
  avatarPath: string | null;
  displayName: string | null;
  email: string;
  forcedOutcome: TradeOutcome | null;
  isFrozen: boolean;
  joinedAt: string;
  role: "user" | "admin";
  totalSettledTrades: number;
  totalStakeCents: number;
  userId: string;
  username: string;
  tokenBalances?: AdminTokenBalance[];
}

export interface AdminUserListResult {
  items: AdminUser[];
  total: number;
}

export interface FreezeUserInput {
  isFrozen: boolean;
  reason?: string;
}

export interface DeleteUserInput {
  reason?: string;
}

export interface SetForcedOutcomeInput {
  forcedOutcome: TradeOutcome | null;
  reason?: string;
}

export interface AdjustTokenBalanceInput {
  tokenId: string;
  deltaAmount: number;
  note: string;
}

export interface AdminTransaction {
  amountCents: number;
  balanceAfterCents: number | null;
  createdAt: string;
  id: string;
  kind: string;
  memo: string | null;
  referenceId: string | null;
  userId: string;
  tokenId: string | null;
  tokenSymbol: string | null;
  tokenAmount: number | null;
  tokenUsdCents: number | null;
}

export interface AdminTransactionListResult {
  items: AdminTransaction[];
  total: number;
}

export interface AuditLogEntry {
  action: string;
  adminEmail: string;
  adminId: string | null;
  afterJson: Record<string, unknown> | null;
  beforeJson: Record<string, unknown> | null;
  createdAt: string;
  id: string;
  ipAddress: string | null;
  notes: string | null;
  targetId: string | null;
  targetType: string | null;
}

export interface AuditLogResult {
  items: AuditLogEntry[];
  total: number;
}

export interface AdminTradeFilters {
  direction?: TradeDirection;
  limit?: number;
  maxStakeCents?: number;
  minStakeCents?: number;
  offset?: number;
  status?: TradeStatus;
  tokenId?: string;
  userId?: string;
}

export interface AdminTransactionFilters {
  limit?: number;
  offset?: number;
}

export type ExpiryPolicy = "auto_lose" | "auto_win" | "void" | "leave_pending";

export interface AppConfig {
  bonusTicketTtlDays: number;
  bonusWagerMultiplier: number;
  depositBonusMaxCents: number;
  depositBonusPctBps: number;
  expiryPolicy: ExpiryPolicy;
  globalTradeFreezeEnabled: boolean;
  id: number;
  refDefaultL1Bps: number;
  refDefaultL2Bps: number;
  refDefaultL3Bps: number;
  refDefaultL4Bps: number;
  refDefaultL5Bps: number;
  refMinDepositCents: number;
  signupBonusCents: number;
  supportTelegram: string | null;
  supportWhatsapp: string | null;
  swapFeeBps: number;
  withdrawFeeBps: number;
  withdrawMinCents: number;
}

export interface UpdateAppConfigInput {
  bonusTicketTtlDays?: number;
  bonusWagerMultiplier?: number;
  depositBonusMaxCents?: number;
  depositBonusPctBps?: number;
  expiryPolicy?: ExpiryPolicy;
  globalTradeFreezeEnabled?: boolean;
  refDefaultL1Bps?: number;
  refDefaultL2Bps?: number;
  refDefaultL3Bps?: number;
  refDefaultL4Bps?: number;
  refDefaultL5Bps?: number;
  refMinDepositCents?: number;
  signupBonusCents?: number;
  supportTelegram?: string | null;
  supportWhatsapp?: string | null;
  swapFeeBps?: number;
  withdrawFeeBps?: number;
  withdrawMinCents?: number;
}

export interface SupportContacts {
  telegram: string | null;
  whatsapp: string | null;
}

export interface BusinessDashboard {
  activeTrades: number;
  dailyNetPnlCents: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  topLosers: DashboardUser[];
  topWinners: DashboardUser[];
  totalExposureCents: number;
  totalStakedTodayCents: number;
}

export interface DashboardUser {
  netPnlCents: number;
  totalTrades: number;
  userId: string;
  username: string;
}
