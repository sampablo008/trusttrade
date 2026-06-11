import "server-only";
import { ApiClientError } from "@/lib/api/client";
import { loadIdentityByEmail } from "@/lib/account/profile-lookup";
import { generateEmailOtp } from "@/lib/auth/otp";
import {
  establishSession,
  resolveIdentity,
  resolveRedirectPath,
} from "@/lib/auth/session";
import {
  sendPasswordChangedEmail,
  sendPasswordResetCodeEmail,
} from "@/lib/email/send";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseAnonClient } from "@/lib/supabase/anon";
import {
  forgotPasswordInputSchema,
  resetPasswordInputSchema,
} from "@/schemas/password-reset";

export interface RequestContext {
  requestIp?: string | null;
}

export const requestPasswordReset = async (
  payload: unknown,
  context: RequestContext = {},
): Promise<{ ok: true }> => {
  const input = forgotPasswordInputSchema.parse(payload);
  const email = input.email.trim().toLowerCase();

  // Anti-enumeration: unknown emails get the same "ok" without any work.
  const identity = await loadIdentityByEmail(email);
  if (!identity) return { ok: true };

  // Best-effort delivery: never leak failures to the caller, but log loudly.
  try {
    const { code, expiresInMinutes } = await generateEmailOtp({
      email,
      type: "recovery",
    });
    await sendPasswordResetCodeEmail({
      to: email,
      code,
      expiresInMinutes,
      requestIp: context.requestIp ?? null,
    });
  } catch (err) {
    console.error("[password-reset] otp send failed", err);
  }

  return { ok: true };
};

export const confirmPasswordReset = async (
  payload: unknown,
  context: RequestContext = {},
): Promise<{ ok: true; redirectTo: string }> => {
  const input = resetPasswordInputSchema.parse(payload);
  const email = input.email.trim().toLowerCase();
  const code = input.code.trim();

  const anon = createSupabaseAnonClient();
  const { data, error } = await anon.auth.verifyOtp({
    email,
    token: code,
    type: "recovery",
  });
  if (error || !data.user) {
    throw new ApiClientError(
      "Invalid or expired code.",
      400,
      "CODE_INVALID",
      error ?? undefined,
    );
  }

  const admin = createSupabaseAdminClient();
  const { error: updateError } = await admin.auth.admin.updateUserById(
    data.user.id,
    { password: input.newPassword },
  );
  if (updateError) {
    throw new ApiClientError(
      updateError.message,
      500,
      "PASSWORD_UPDATE_FAILED",
      updateError,
    );
  }

  await sendPasswordChangedEmail({
    to: email,
    changedAtIso: new Date().toISOString(),
    requestIp: context.requestIp ?? null,
  }).catch(() => undefined);

  // Log the user in directly: a successful recovery OTP proves email ownership,
  // so establish the session and hand the client a destination.
  const identity = await resolveIdentity(email);
  if (!identity) {
    // Password was updated but we can't resolve a profile — fall back to login.
    return { ok: true, redirectTo: "/login?reset=1" };
  }

  await establishSession({ ...identity, emailVerified: true });

  return { ok: true, redirectTo: resolveRedirectPath(identity, "/trade") };
};
