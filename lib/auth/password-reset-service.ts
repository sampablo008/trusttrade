import "server-only";
import { ApiClientError } from "@/lib/api/client";
import { sendPasswordChangedEmail } from "@/lib/email/send";
import { getAppEnv } from "@/lib/env/server";
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
  _context: RequestContext = {},
): Promise<{ ok: true }> => {
  const input = forgotPasswordInputSchema.parse(payload);
  const email = input.email.trim().toLowerCase();

  const { APP_URL } = getAppEnv();
  const redirectTo = `${APP_URL.replace(/\/$/, "")}/auth/callback?next=${encodeURIComponent(
    `/reset-password?email=${encodeURIComponent(email)}`,
  )}`;

  const anon = createSupabaseAnonClient();
  const { error } = await anon.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) {
    // Always return ok to avoid enumeration; log for observability.
    console.error("[password-reset] email send failed", error);
  }

  return { ok: true };
};

export const confirmPasswordReset = async (
  payload: unknown,
  context: RequestContext = {},
): Promise<{ ok: true }> => {
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

  return { ok: true };
};
