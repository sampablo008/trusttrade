export type InviteSource = "admin" | "user";
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
