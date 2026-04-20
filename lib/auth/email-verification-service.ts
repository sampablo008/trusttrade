import "server-only";
import { ApiClientError } from "@/lib/api/client";
import { loadIdentityByEmail } from "@/lib/account/profile-lookup";
import {
  sendVerificationCodeEmail,
  sendWelcomeEmail,
} from "@/lib/email/send";
import { getOptionalServerEnv } from "@/lib/env/server";
import {
  consumeVerificationCode,
  issueVerificationCode,
} from "@/lib/otp/service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  resendCodeInputSchema,
  verifyEmailInputSchema,
} from "@/schemas/password-reset";

const OTP_TTL_SECONDS = 10 * 60;
const OTP_TTL_MINUTES = OTP_TTL_SECONDS / 60;

export const issueSignupVerification = async (params: {
  email: string;
  userId: string;
}) => {
  const email = params.email.trim().toLowerCase();
  const { code } = await issueVerificationCode({
    email,
    purpose: "email_verification",
    userId: params.userId,
    ttlSeconds: OTP_TTL_SECONDS,
  });

  await sendVerificationCodeEmail({
    to: email,
    code,
    expiresInMinutes: OTP_TTL_MINUTES,
  }).catch((err) => {
    console.error("[verify-email] failed to send code", err);
  });
};

export const verifyEmail = async (payload: unknown): Promise<{ ok: true }> => {
  const input = verifyEmailInputSchema.parse(payload);
  const email = input.email.trim().toLowerCase();

  await consumeVerificationCode(email, "email_verification", input.code);

  const identity = await loadIdentityByEmail(email);
  if (!identity) {
    throw new ApiClientError(
      "We could not find an account for that email.",
      404,
      "ACCOUNT_NOT_FOUND",
    );
  }

  if (getOptionalServerEnv()) {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.auth.admin.updateUserById(identity.userId, {
      email_confirm: true,
    });
    if (error) {
      throw new ApiClientError(
        error.message,
        500,
        "EMAIL_CONFIRM_FAILED",
        error,
      );
    }
  }

  await sendWelcomeEmail({
    to: email,
    displayName: identity.displayName ?? identity.username,
  }).catch((err) => {
    console.error("[verify-email] welcome email failed", err);
  });

  return { ok: true };
};

export const resendVerificationCode = async (
  payload: unknown,
): Promise<{ ok: true }> => {
  const input = resendCodeInputSchema.parse(payload);
  const email = input.email.trim().toLowerCase();

  const identity = await loadIdentityByEmail(email);
  // Avoid enumeration: always return ok.
  if (!identity) return { ok: true };

  if (input.purpose === "email_verification" && identity.emailVerified) {
    return { ok: true };
  }

  const { code } = await issueVerificationCode({
    email,
    purpose: input.purpose,
    userId: identity.userId,
    ttlSeconds: OTP_TTL_SECONDS,
  });

  if (input.purpose === "email_verification") {
    await sendVerificationCodeEmail({
      to: email,
      code,
      expiresInMinutes: OTP_TTL_MINUTES,
    }).catch((err) => console.error("[resend] verify email failed", err));
  }

  return { ok: true };
};
