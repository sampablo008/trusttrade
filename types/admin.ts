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

export interface BulkSettleInput {
  outcome: TradeOutcome;
  reason?: string;
  tradeIds: string[];
}

export interface BulkSettleResult {
  failed: string[];
  settled: string[];
}

export interface AdminUser {
  avatarPath: string | null;
  balanceCents: number;
  displayName: string | null;
  email: string;
  isFrozen: boolean;
  joinedAt: string;
  lockedBonusCents: number;
  lockedInTradesCents: number;
  role: "user" | "admin";
  totalSettledTrades: number;
  totalStakeCents: number;
  userId: string;
  username: string;
}

export interface AdminUserListResult {
  items: AdminUser[];
  total: number;
}

export interface FreezeUserInput {
  isFrozen: boolean;
  reason?: string;
}

export interface AdjustBalanceInput {
  deltaCents: number;
  note: string;
}

export interface AuditLogEntry {
  action: string;
  adminEmail: string;
  adminId: string;
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

export type ExpiryPolicy = "auto_lose" | "auto_win" | "void" | "leave_pending";

export interface AppConfig {
  bonusTicketTtlDays: number;
  bonusWagerMultiplier: number;
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
  withdrawFeeCents: number;
  withdrawMinCents: number;
}

export interface UpdateAppConfigInput {
  bonusTicketTtlDays?: number;
  bonusWagerMultiplier?: number;
  expiryPolicy?: ExpiryPolicy;
  globalTradeFreezeEnabled?: boolean;
  refDefaultL1Bps?: number;
  refDefaultL2Bps?: number;
  refDefaultL3Bps?: number;
  refDefaultL4Bps?: number;
  refDefaultL5Bps?: number;
  refMinDepositCents?: number;
  signupBonusCents?: number;
  withdrawFeeCents?: number;
  withdrawMinCents?: number;
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
