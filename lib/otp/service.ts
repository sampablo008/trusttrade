import "server-only";
import { randomInt, createHash } from "crypto";
import { ApiClientError } from "@/lib/api/client";
import { getOptionalServerEnv } from "@/lib/env/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  previewConsumeCode,
  previewIssueCode,
} from "@/lib/otp/preview-data";
import type {
  ConsumeCodeResult,
  IssueCodeInput,
  IssueCodeResult,
  OtpPurpose,
} from "@/types/otp";

const DEFAULT_TTL_SECONDS = 10 * 60;

const generateCode = (): string =>
  randomInt(0, 1_000_000).toString().padStart(6, "0");

const hashCode = (code: string): string =>
  createHash("sha256").update(`${code}`).digest("hex");

export const issueVerificationCode = async (
  input: IssueCodeInput,
): Promise<IssueCodeResult> => {
  const email = input.email.trim().toLowerCase();
  const ttlSeconds = input.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const code = generateCode();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  if (!getOptionalServerEnv()) {
    previewIssueCode(email, input.purpose, code, input.userId ?? null, ttlSeconds);
    return { code, expiresAt };
  }

  const admin = createSupabaseAdminClient();

  const { error: invalidateError } = await admin.rpc("invalidate_verification_codes", {
    p_email: email,
    p_purpose: input.purpose,
  });
  if (invalidateError) {
    throw new ApiClientError(
      invalidateError.message,
      500,
      "OTP_ISSUE_FAILED",
      invalidateError,
    );
  }

  const { error } = await admin
    .from("verification_codes")
    .insert({
      email,
      user_id: input.userId ?? null,
      purpose: input.purpose,
      code_hash: hashCode(code),
      expires_at: expiresAt,
    });

  if (error) {
    throw new ApiClientError(error.message, 500, "OTP_ISSUE_FAILED", error);
  }

  return { code, expiresAt };
};

export const consumeVerificationCode = async (
  email: string,
  purpose: OtpPurpose,
  code: string,
): Promise<ConsumeCodeResult> => {
  const normalized = email.trim().toLowerCase();
  const trimmed = code.trim();

  if (!/^\d{6}$/.test(trimmed)) {
    throw new ApiClientError("Enter the 6-digit code.", 400, "CODE_INVALID");
  }

  if (!getOptionalServerEnv()) {
    try {
      const { userId } = previewConsumeCode(normalized, purpose, trimmed);
      return { userId, email: normalized };
    } catch (err) {
      const message = err instanceof Error ? err.message : "CODE_INVALID";
      const mapped =
        message === "CODE_EXPIRED"
          ? { msg: "Code has expired. Request a new one.", code: "CODE_EXPIRED" }
          : { msg: "Invalid verification code.", code: "CODE_INVALID" };
      throw new ApiClientError(mapped.msg, 400, mapped.code);
    }
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("consume_verification_code", {
    p_email: normalized,
    p_purpose: purpose,
    p_code_hash: hashCode(trimmed),
  });

  if (error || !data) {
    const msg = error?.message ?? "Invalid verification code.";
    const code = msg.includes("CODE_INVALID") ? "CODE_INVALID" : "CODE_INVALID";
    throw new ApiClientError("Invalid or expired code.", 400, code, error);
  }

  const row = Array.isArray(data) ? data[0] : data;

  return {
    email: normalized,
    userId: (row as { user_id: string | null }).user_id ?? null,
  };
};
