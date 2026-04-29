import "server-only";
import { ApiClientError } from "@/lib/api/client";
import { loadIdentityByEmail } from "@/lib/account/profile-lookup";
import { sendWelcomeEmail } from "@/lib/email/send";
import { getAppEnv } from "@/lib/env/server";
import { createSupabaseAnonClient } from "@/lib/supabase/anon";
import {
  resendCodeInputSchema,
  verifyEmailInputSchema,
} from "@/schemas/password-reset";

export const issueSignupVerification = async (params: {
  email: string;
  userId: string;
}) => {
  const email = params.email.trim().toLowerCase();
  const anon = createSupabaseAnonClient();
  const { error } = await anon.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });
  if (error) {
    throw new ApiClientError(
      error.message,
      500,
      "OTP_ISSUE_FAILED",
      error,
    );
  }
};

export const verifyEmail = async (payload: unknown): Promise<{ ok: true }> => {
  const input = verifyEmailInputSchema.parse(payload);
  const email = input.email.trim().toLowerCase();
  const code = input.code.trim();

  const anon = createSupabaseAnonClient();
  const { data, error } = await anon.auth.verifyOtp({
    email,
    token: code,
    type: "email",
  });
  if (error || !data.user) {
    throw new ApiClientError(
      "Invalid or expired code.",
      400,
      "CODE_INVALID",
      error ?? undefined,
    );
  }

  const identity = await loadIdentityByEmail(email);
  if (!identity) {
    throw new ApiClientError(
      "We could not find an account for that email.",
      404,
      "ACCOUNT_NOT_FOUND",
    );
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

  if (input.purpose === "email_verification") {
    if (identity.emailVerified) return { ok: true };
    const anon = createSupabaseAnonClient();
    const { error } = await anon.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    if (error) {
      console.error("[resend] verify email failed", error);
    }
  } else if (input.purpose === "password_reset") {
    const { APP_URL } = getAppEnv();
    const redirectTo = `${APP_URL.replace(/\/$/, "")}/auth/callback?next=${encodeURIComponent(
      `/reset-password?email=${encodeURIComponent(email)}`,
    )}`;
    const anon = createSupabaseAnonClient();
    const { error } = await anon.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      console.error("[resend] password reset failed", error);
    }
  }

  return { ok: true };
};
