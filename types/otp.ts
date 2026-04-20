export type OtpPurpose =
  | "email_verification"
  | "password_reset"
  | "login_code";

export interface IssueCodeInput {
  email: string;
  purpose: OtpPurpose;
  userId?: string | null;
  ttlSeconds?: number;
}

export interface IssueCodeResult {
  code: string;
  expiresAt: string;
}

export interface ConsumeCodeResult {
  userId: string | null;
  email: string;
}
