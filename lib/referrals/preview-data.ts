import type {
  ReferralCommission,
  ReferralFlag,
  ReferralStats,
  ReferralTreeNode,
} from "@/types/referrals";

export const PREVIEW_USER_ID = "00000000-0000-0000-0000-000000000001";
export const PREVIEW_USER_2_ID = "00000000-0000-0000-0000-000000000002";
export const PREVIEW_USER_3_ID = "00000000-0000-0000-0000-000000000003";
export const PREVIEW_USER_4_ID = "00000000-0000-0000-0000-000000000004";
export const PREVIEW_USER_5_ID = "00000000-0000-0000-0000-000000000005";

export const previewReferralStats: ReferralStats = {
  approvedCommissionCents: 1250,
  code: "REF_PREVIEW",
  directReferrals: 3,
  pendingCommissionCents: 750,
  totalCommissionCents: 2000,
  totalReferrals: 5,
};

export const previewReferralTree: ReferralTreeNode[] = [
  {
    createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    level: 1,
    refereeEmail: "alice@example.com",
    refereeUserId: PREVIEW_USER_2_ID,
    refereeUsername: "alice",
  },
  {
    createdAt: new Date(Date.now() - 5 * 86_400_000).toISOString(),
    level: 1,
    refereeEmail: "bob@example.com",
    refereeUserId: PREVIEW_USER_3_ID,
    refereeUsername: "bob",
  },
  {
    createdAt: new Date(Date.now() - 10 * 86_400_000).toISOString(),
    level: 1,
    refereeEmail: "charlie@example.com",
    refereeUserId: PREVIEW_USER_4_ID,
    refereeUsername: "charlie",
  },
  {
    createdAt: new Date(Date.now() - 12 * 86_400_000).toISOString(),
    level: 2,
    refereeEmail: "dan@example.com",
    refereeUserId: PREVIEW_USER_5_ID,
    refereeUsername: "dan",
  },
];

export const previewCommissions: ReferralCommission[] = [
  {
    baseAmountCents: 25000,
    beneficiaryUserId: PREVIEW_USER_ID,
    bpsApplied: 500,
    commissionCents: 1250,
    createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    depositId: "00000000-0000-0000-0000-000000000010",
    id: "00000000-0000-0000-0000-000000000020",
    level: 1,
    refereeUserId: PREVIEW_USER_2_ID,
    refereeUsername: "alice",
    reviewNote: null,
    reviewedAt: null,
    reviewedByAdminId: null,
    status: "pending",
    updatedAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
  },
  {
    baseAmountCents: 15000,
    beneficiaryUserId: PREVIEW_USER_ID,
    bpsApplied: 500,
    commissionCents: 750,
    createdAt: new Date(Date.now() - 8 * 86_400_000).toISOString(),
    depositId: "00000000-0000-0000-0000-000000000011",
    id: "00000000-0000-0000-0000-000000000021",
    level: 1,
    refereeUserId: PREVIEW_USER_3_ID,
    refereeUsername: "bob",
    reviewNote: "Approved — valid deposit",
    reviewedAt: new Date(Date.now() - 7 * 86_400_000).toISOString(),
    reviewedByAdminId: "00000000-0000-0000-0000-000000000099",
    status: "approved",
    updatedAt: new Date(Date.now() - 7 * 86_400_000).toISOString(),
  },
];

export const previewAdminCommissions: ReferralCommission[] = [
  ...previewCommissions,
  {
    baseAmountCents: 50000,
    beneficiaryUserId: PREVIEW_USER_2_ID,
    bpsApplied: 500,
    commissionCents: 2500,
    createdAt: new Date(Date.now() - 1 * 86_400_000).toISOString(),
    depositId: "00000000-0000-0000-0000-000000000012",
    id: "00000000-0000-0000-0000-000000000022",
    level: 1,
    refereeUserId: PREVIEW_USER_3_ID,
    refereeUsername: "bob",
    reviewNote: null,
    reviewedAt: null,
    reviewedByAdminId: null,
    status: "pending",
    updatedAt: new Date(Date.now() - 1 * 86_400_000).toISOString(),
  },
];

export const previewReferralFlags: ReferralFlag[] = [
  {
    createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    detail: { ip: "192.168.1.1", same_as_referrer: true },
    id: "00000000-0000-0000-0000-000000000030",
    isResolved: false,
    kind: "SAME_IP",
    resolvedAt: null,
    resolvedByAdminId: null,
    userId: PREVIEW_USER_2_ID,
    username: "alice",
  },
  {
    createdAt: new Date(Date.now() - 6 * 86_400_000).toISOString(),
    detail: { referrals_in_24h: 7 },
    id: "00000000-0000-0000-0000-000000000031",
    isResolved: false,
    kind: "VELOCITY",
    resolvedAt: null,
    resolvedByAdminId: null,
    userId: PREVIEW_USER_ID,
    username: "preview",
  },
];
