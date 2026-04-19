import { randomUUID } from "node:crypto";
import { ApiClientError } from "@/lib/api/client";
import {
  adminInviteCodeSchema,
  adminInviteCodesResultSchema,
  mintInviteCodesResultSchema,
  revokeInviteCodeResultSchema,
} from "@/schemas/invites";
import type {
  AdminInviteCode,
  AdminInviteCodesResult,
  AdminInviteSummary,
  InviteValidationResult,
  MintInviteCodesInput,
  MintInviteCodesResult,
  RevokeInviteCodeResult,
} from "@/types/invites";

const createPreviewInvite = (invite: Omit<AdminInviteCode, "mode">): AdminInviteCode =>
  adminInviteCodeSchema.parse({
    ...invite,
    mode: "preview",
  });

const previewInvites = new Map<string, AdminInviteCode>([
  [
    "REF_ATLAS",
    createPreviewInvite({
      code: "REF_ATLAS",
      createdAt: "2026-04-19T09:30:00.000Z",
      createdByAdminId: null,
      expiresAt: null,
      isSingleUse: false,
      lastUsedAt: "2026-04-19T11:10:00.000Z",
      note: "Atlas referral tree root",
      ownerUserId: null,
      revokedAt: null,
      source: "user",
      status: "active",
      usedCount: 3,
    }),
  ],
  [
    "K7X9M2PQ4R",
    createPreviewInvite({
      code: "K7X9M2PQ4R",
      createdAt: "2026-04-19T10:15:00.000Z",
      createdByAdminId: null,
      expiresAt: null,
      isSingleUse: true,
      lastUsedAt: null,
      note: "Preview root invite",
      ownerUserId: null,
      revokedAt: null,
      source: "admin",
      status: "active",
      usedCount: 0,
    }),
  ],
  [
    "H4N7P2M8Q1",
    createPreviewInvite({
      code: "H4N7P2M8Q1",
      createdAt: "2026-04-18T16:45:00.000Z",
      createdByAdminId: null,
      expiresAt: "2026-04-22T23:59:59.000Z",
      isSingleUse: true,
      lastUsedAt: null,
      note: "VIP weekend batch",
      ownerUserId: null,
      revokedAt: null,
      source: "admin",
      status: "active",
      usedCount: 0,
    }),
  ],
  [
    "Z8R4W1Q9L2",
    createPreviewInvite({
      code: "Z8R4W1Q9L2",
      createdAt: "2026-04-17T08:00:00.000Z",
      createdByAdminId: null,
      expiresAt: "2026-04-18T08:00:00.000Z",
      isSingleUse: true,
      lastUsedAt: null,
      note: "Expired launch seed",
      ownerUserId: null,
      revokedAt: null,
      source: "admin",
      status: "expired",
      usedCount: 0,
    }),
  ],
]);

const sortInviteCodes = (items: AdminInviteCode[]) =>
  [...items].sort((left, right) => right.createdAt.localeCompare(left.createdAt));

const buildInviteSummary = (items: AdminInviteCode[]): AdminInviteSummary => ({
  activeCount: items.filter((item) => item.status === "active").length,
  adminCount: items.filter((item) => item.source === "admin").length,
  expiredCount: items.filter((item) => item.status === "expired").length,
  revokedCount: items.filter((item) => item.status === "revoked").length,
  totalCount: items.length,
  usedCount: items.filter((item) => item.status === "used").length,
  userCount: items.filter((item) => item.source === "user").length,
});

const createPreviewCode = () => {
  let code = "";

  while (!code || previewInvites.has(code)) {
    code = randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
  }

  return code;
};

export const getPreviewInvite = (code: string): InviteValidationResult => {
  const normalizedCode = code.trim().toUpperCase();
  const previewInvite = previewInvites.get(normalizedCode);

  if (!previewInvite || previewInvite.status !== "active") {
    return {
      code: normalizedCode,
      expiresAt: previewInvite?.expiresAt ?? null,
      isSingleUse: previewInvite?.isSingleUse ?? false,
      isValid: false,
      message: "Code not found in preview mode.",
      mode: "preview",
      ownerUserId: previewInvite?.ownerUserId ?? null,
      source: previewInvite?.source ?? null,
      status: previewInvite?.status ?? null,
    };
  }

  return {
    code: normalizedCode,
    expiresAt: previewInvite.expiresAt,
    isSingleUse: previewInvite.isSingleUse,
    isValid: true,
    message:
      previewInvite.source === "admin"
        ? "Valid admin invite. Single-use root signup."
        : "Valid referral invite. This signup joins a user downline.",
    mode: "preview",
    ownerUserId: previewInvite.ownerUserId,
    source: previewInvite.source,
    status: previewInvite.status,
  };
};

export const getPreviewInviteCodes = (): AdminInviteCodesResult => {
  const items = sortInviteCodes(Array.from(previewInvites.values()));

  return adminInviteCodesResultSchema.parse({
    items,
    summary: buildInviteSummary(items),
  });
};

export const mintPreviewInviteCodes = (input: MintInviteCodesInput): MintInviteCodesResult => {
  const createdAt = new Date().toISOString();
  const batch = Array.from({ length: input.count }, () => {
    const invite = createPreviewInvite({
      code: createPreviewCode(),
      createdAt,
      createdByAdminId: null,
      expiresAt: input.expiresAt,
      isSingleUse: true,
      lastUsedAt: null,
      note: input.note,
      ownerUserId: null,
      revokedAt: null,
      source: "admin",
      status: "active",
      usedCount: 0,
    });

    previewInvites.set(invite.code, invite);

    return {
      code: invite.code,
      createdAt: invite.createdAt,
      expiresAt: invite.expiresAt,
      mode: invite.mode,
      note: invite.note,
    };
  });

  return mintInviteCodesResultSchema.parse({
    batch,
    mode: "preview",
  });
};

export const revokePreviewInvite = (code: string): RevokeInviteCodeResult => {
  const normalizedCode = code.trim().toUpperCase();
  const invite = previewInvites.get(normalizedCode);

  if (!invite) {
    throw new ApiClientError("Invite code not found.", 404, "INVITE_NOT_FOUND");
  }

  if (invite.status !== "active") {
    throw new ApiClientError("Only active invite codes can be revoked.", 409, "INVITE_NOT_ACTIVE");
  }

  const revokedAt = new Date().toISOString();
  const nextInvite = createPreviewInvite({
    ...invite,
    revokedAt,
    status: "revoked",
  });

  previewInvites.set(normalizedCode, nextInvite);

  return revokeInviteCodeResultSchema.parse({
    code: nextInvite.code,
    mode: "preview",
    revokedAt,
    status: nextInvite.status,
  });
};
