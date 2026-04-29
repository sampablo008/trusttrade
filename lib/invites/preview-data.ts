import { randomUUID } from "node:crypto";
import { ApiClientError } from "@/lib/api/client";
import { issueSignupVerification } from "@/lib/auth/email-verification-service";
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
  InviteSignupResult,
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

const previewUsersByEmail = new Map<string, { email: string; userId: string; username: string }>();
const previewUsersByUsername = new Map<
  string,
  { email: string; userId: string; username: string }
>();

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

const refreshPreviewInviteStatuses = () => {
  const now = Date.now();

  for (const [code, invite] of previewInvites.entries()) {
    if (invite.status !== "active" || !invite.expiresAt) {
      continue;
    }

    if (new Date(invite.expiresAt).getTime() <= now) {
      previewInvites.set(
        code,
        createPreviewInvite({
          ...invite,
          status: "expired",
        }),
      );
    }
  }
};

const createPreviewCode = () => {
  let code = "";

  while (!code || previewInvites.has(code)) {
    code = randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
  }

  return code;
};

export const getPreviewInvite = (code: string): InviteValidationResult => {
  refreshPreviewInviteStatuses();

  const normalizedCode = code.trim().toUpperCase();
  const previewInvite = previewInvites.get(normalizedCode);

  if (!previewInvite) {
    return {
      code: normalizedCode,
      expiresAt: null,
      isSingleUse: false,
      isValid: false,
      message: "Code not found in preview mode.",
      mode: "preview",
      ownerUserId: null,
      source: null,
      status: null,
    };
  }

  if (previewInvite.status !== "active") {
    return {
      code: normalizedCode,
      expiresAt: previewInvite.expiresAt,
      isSingleUse: previewInvite.isSingleUse,
      isValid: false,
      message:
        previewInvite.status === "expired"
          ? "Invite code has expired."
          : "Invite code is not active.",
      mode: "preview",
      ownerUserId: previewInvite.ownerUserId,
      source: previewInvite.source,
      status: previewInvite.status,
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
  refreshPreviewInviteStatuses();

  const items = sortInviteCodes(Array.from(previewInvites.values()));

  return adminInviteCodesResultSchema.parse({
    items,
    summary: buildInviteSummary(items),
  });
};

export const mintPreviewInviteCodes = (input: MintInviteCodesInput): MintInviteCodesResult => {
  refreshPreviewInviteStatuses();

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
  refreshPreviewInviteStatuses();

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

interface CreatePreviewInvitedUserInput {
  code: string;
  email: string;
  username: string;
}

export const createPreviewInvitedUser = ({
  code,
  email,
  username,
}: CreatePreviewInvitedUserInput): Promise<InviteSignupResult> | InviteSignupResult => {
  refreshPreviewInviteStatuses();

  const normalizedCode = code.trim().toUpperCase();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedUsername = username.trim().toLowerCase();
  const invite = previewInvites.get(normalizedCode);

  if (!invite) {
    throw new ApiClientError("Invite code is not active.", 409, "CODE_INACTIVE");
  }

  if (invite.status !== "active") {
    throw new ApiClientError(
      invite.status === "expired" ? "Invite code has expired." : "Invite code is not active.",
      409,
      invite.status === "expired" ? "CODE_EXPIRED" : "CODE_INACTIVE",
    );
  }

  if (previewUsersByEmail.has(normalizedEmail)) {
    throw new ApiClientError("Email is already registered.", 409, "EMAIL_TAKEN");
  }

  if (previewUsersByUsername.has(normalizedUsername)) {
    throw new ApiClientError("Username is already taken.", 409, "USERNAME_TAKEN");
  }

  const userId = randomUUID();
  const createdUser = {
    email: normalizedEmail,
    userId,
    username: normalizedUsername,
  };

  previewUsersByEmail.set(normalizedEmail, createdUser);
  previewUsersByUsername.set(normalizedUsername, createdUser);

  const consumedAt = new Date().toISOString();

  previewInvites.set(
    normalizedCode,
    createPreviewInvite({
      ...invite,
      lastUsedAt: consumedAt,
      revokedAt: invite.isSingleUse ? consumedAt : invite.revokedAt,
      status: invite.isSingleUse ? "revoked" : "active",
      usedCount: invite.usedCount + 1,
    }),
  );

  return (async (): Promise<InviteSignupResult> => {
    await issueSignupVerification({ email: normalizedEmail, userId }).catch(() => undefined);
    return {
      nextPath: `/verify-email?email=${encodeURIComponent(normalizedEmail)}&mode=preview`,
      userId,
    };
  })();
};
