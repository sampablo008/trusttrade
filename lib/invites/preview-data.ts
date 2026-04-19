import type { InviteValidationResult } from "@/types/invites";

const previewInvites = new Map<string, Omit<InviteValidationResult, "code" | "isValid" | "message">>([
  [
    "REF_ATLAS",
    {
      expiresAt: null,
      isSingleUse: false,
      mode: "preview",
      ownerUserId: null,
      source: "user",
      status: "active",
    },
  ],
  [
    "K7X9M2PQ4R",
    {
      expiresAt: null,
      isSingleUse: true,
      mode: "preview",
      ownerUserId: null,
      source: "admin",
      status: "active",
    },
  ],
]);

export const getPreviewInvite = (code: string): InviteValidationResult => {
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

  return {
    code: normalizedCode,
    ...previewInvite,
    isValid: true,
    message:
      previewInvite.source === "admin"
        ? "Valid admin invite. Single-use root signup."
        : "Valid referral invite. This signup joins a user downline.",
  };
};
