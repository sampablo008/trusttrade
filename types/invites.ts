export type InviteSource = "admin" | "user";
export type InviteStatus = "active" | "used" | "revoked" | "expired";
export type InviteValidationMode = "live" | "preview";

export interface InviteValidationResult {
  code: string;
  expiresAt: string | null;
  isSingleUse: boolean;
  isValid: boolean;
  message: string;
  mode: InviteValidationMode;
  ownerUserId: string | null;
  source: InviteSource | null;
  status: string | null;
}

export interface InviteSignupResult {
  nextPath: string;
  userId: string;
}

export interface AdminInviteCode {
  code: string;
  createdAt: string;
  createdByAdminId: string | null;
  expiresAt: string | null;
  isSingleUse: boolean;
  lastUsedAt: string | null;
  mode: InviteValidationMode;
  note: string | null;
  ownerUserId: string | null;
  revokedAt: string | null;
  source: InviteSource;
  status: InviteStatus;
  usedCount: number;
}

export interface AdminInviteSummary {
  activeCount: number;
  adminCount: number;
  expiredCount: number;
  revokedCount: number;
  totalCount: number;
  usedCount: number;
  userCount: number;
}

export interface AdminInviteCodesResult {
  items: AdminInviteCode[];
  summary: AdminInviteSummary;
}

export interface MintInviteCodesInput {
  count: number;
  expiresAt: string | null;
  note: string | null;
}

export interface MintedInviteCode {
  code: string;
  createdAt: string;
  expiresAt: string | null;
  mode: InviteValidationMode;
  note: string | null;
}

export interface MintInviteCodesResult {
  batch: MintedInviteCode[];
  mode: InviteValidationMode;
}

export interface RevokeInviteCodeResult {
  code: string;
  mode: InviteValidationMode;
  revokedAt: string;
  status: InviteStatus;
}
