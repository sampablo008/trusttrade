import "server-only";
import { ApiClientError } from "@/lib/api/client";
import { loadIdentityByEmail } from "@/lib/account/profile-lookup";
import {
  sendPasswordChangedEmail,
  sendPasswordResetCodeEmail,
} from "@/lib/email/send";
import { getOptionalServerEnv } from "@/lib/env/server";
import {
  consumeVerificationCode,
  issueVerificationCode,
} from "@/lib/otp/service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  forgotPasswordInputSchema,
  resetPasswordInputSchema,
} from "@/schemas/password-reset";

const OTP_TTL_SECONDS = 10 * 60;
const OTP_TTL_MINUTES = OTP_TTL_SECONDS / 60;

export interface RequestContext {
  requestIp?: string | null;
}

export const requestPasswordReset = async (
  payload: unknown,
  context: RequestContext = {},
): Promise<{ ok: true }> => {
  const input = forgotPasswordInputSchema.parse(payload);
  const email = input.email.trim().toLowerCase();

  const identity = await loadIdentityByEmail(email);
  // Always return ok to avoid account enumeration, but only email if user exists.
  if (identity) {
    const { code } = await issueVerificationCode({
      email,
      purpose: "password_reset",
      userId: identity.userId,
      ttlSeconds: OTP_TTL_SECONDS,
    });

    await sendPasswordResetCodeEmail({
      to: email,
      code,
      expiresInMinutes: OTP_TTL_MINUTES,
      requestIp: context.requestIp ?? null,
    }).catch((err) => {
      console.error("[password-reset] email send failed", err);
    });
  }

  return { ok: true };
};

export const confirmPasswordReset = async (
  payload: unknown,
  context: RequestContext = {},
): Promise<{ ok: true }> => {
  const input = resetPasswordInputSchema.parse(payload);
  const email = input.email.trim().toLowerCase();

  await consumeVerificationCode(email, "password_reset", input.code);

  const identity = await loadIdentityByEmail(email);
  if (!identity) {
    throw new ApiClientError(
      "Could not reset password for that email.",
      404,
      "ACCOUNT_NOT_FOUND",
    );
  }

  if (getOptionalServerEnv()) {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.auth.admin.updateUserById(identity.userId, {
      password: input.newPassword,
    });
    if (error) {
      throw new ApiClientError(
        error.message,
        500,
        "PASSWORD_UPDATE_FAILED",
        error,
      );
    }
  }

  await sendPasswordChangedEmail({
    to: email,
    changedAtIso: new Date().toISOString(),
    requestIp: context.requestIp ?? null,
  }).catch(() => undefined);

  return { ok: true };
};
