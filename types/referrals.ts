export type CommissionStatus = "pending" | "approved" | "rejected" | "clawed_back";
export type ReferralFlagKind =
  | "SAME_IP"
  | "VELOCITY"
  | "RAPID_CHAIN"
  | "SELF_REFERRAL_ATTEMPT"
  | "SUSPICIOUS_DEPOSIT";

export interface Referral {
  createdAt: string;
  firstDepositFired: boolean;
  id: string;
  invitedViaCode: string;
  refereeUserId: string;
  referrerUserId: string;
}

export interface ReferralUplineEntry {
  ancestorId: string;
  ancestorUsername: string;
  level: number;
  userId: string;
}

export interface ReferralTreeNode {
  createdAt: string;
  level: number;
  refereeUserId: string;
  refereeUsername: string;
  refereeEmail: string;
}

export interface ReferralRates {
  l1Bps: number;
  l2Bps: number;
  l3Bps: number;
  l4Bps: number;
  l5Bps: number;
  userId: string;
}

export interface ReferralCommission {
  baseAmountCents: number;
  beneficiaryUserId: string;
  commissionCents: number;
  createdAt: string;
  depositId: string | null;
  id: string;
  level: number;
  bpsApplied: number;
  refereeUserId: string;
  refereeUsername: string;
  reviewNote: string | null;
  reviewedAt: string | null;
  reviewedByAdminId: string | null;
  status: CommissionStatus;
  updatedAt: string;
}

export interface ReferralFlag {
  createdAt: string;
  detail: Record<string, unknown>;
  id: string;
  isResolved: boolean;
  kind: ReferralFlagKind;
  resolvedAt: string | null;
  resolvedByAdminId: string | null;
  userId: string;
  username: string;
}

export interface ReferralStats {
  approvedCommissionCents: number;
  code: string;
  directReferrals: number;
  pendingCommissionCents: number;
  totalCommissionCents: number;
  totalReferrals: number;
}

export interface ReferralListResult {
  items: ReferralTreeNode[];
  total: number;
}

export interface ReferralCommissionListResult {
  items: ReferralCommission[];
  total: number;
}

export interface ReferralFlagListResult {
  items: ReferralFlag[];
  total: number;
}

export interface SetRatesInput {
  l1Bps: number;
  l2Bps: number;
  l3Bps: number;
  l4Bps: number;
  l5Bps: number;
}

export interface CommissionFilters {
  limit?: number;
  offset?: number;
  status?: CommissionStatus;
  userId?: string;
}

export interface FlagFilters {
  isResolved?: boolean;
  kind?: ReferralFlagKind;
  limit?: number;
  offset?: number;
}
