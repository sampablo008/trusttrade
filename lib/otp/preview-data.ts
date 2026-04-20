import "server-only";
import type { OtpPurpose } from "@/types/otp";

interface PreviewCode {
  code: string;
  email: string;
  purpose: OtpPurpose;
  userId: string | null;
  expiresAt: number;
  consumed: boolean;
}

const store = new Map<string, PreviewCode>();

const keyFor = (email: string, purpose: OtpPurpose) =>
  `${email.toLowerCase()}::${purpose}`;

export const previewIssueCode = (
  email: string,
  purpose: OtpPurpose,
  code: string,
  userId: string | null,
  ttlSeconds: number,
) => {
  store.set(keyFor(email, purpose), {
    code,
    email: email.toLowerCase(),
    purpose,
    userId,
    expiresAt: Date.now() + ttlSeconds * 1000,
    consumed: false,
  });
};

export const previewConsumeCode = (
  email: string,
  purpose: OtpPurpose,
  code: string,
): { userId: string | null } => {
  const record = store.get(keyFor(email, purpose));
  if (!record || record.consumed) {
    throw new Error("CODE_INVALID");
  }
  if (record.expiresAt < Date.now()) {
    throw new Error("CODE_EXPIRED");
  }
  if (record.code !== code) {
    throw new Error("CODE_INVALID");
  }
  record.consumed = true;
  return { userId: record.userId };
};

export const previewPeekCode = (
  email: string,
  purpose: OtpPurpose,
): string | null => {
  const record = store.get(keyFor(email, purpose));
  if (!record || record.consumed || record.expiresAt < Date.now()) return null;
  return record.code;
};
