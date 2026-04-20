import "server-only";
import { ApiClientError } from "@/lib/api/client";
import { sendPasswordChangedEmail } from "@/lib/email/send";
import { getOptionalServerEnv } from "@/lib/env/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseAnonClient } from "@/lib/supabase/anon";
import { changePasswordInputSchema } from "@/schemas/account";

export interface ChangePasswordContext {
  userId: string;
  email: string;
  requestIp?: string | null;
}

export const changePassword = async (
  context: ChangePasswordContext,
  payload: unknown,
): Promise<{ changedAt: string }> => {
  const input = changePasswordInputSchema.parse(payload);
  const changedAt = new Date().toISOString();

  if (!getOptionalServerEnv()) {
    // Preview mode: no real auth backend, accept and no-op (email still renders to console).
    await sendPasswordChangedEmail({
      to: context.email,
      changedAtIso: changedAt,
      requestIp: context.requestIp ?? null,
    }).catch(() => undefined);
    return { changedAt };
  }

  const anon = createSupabaseAnonClient();
  const { error: signInError } = await anon.auth.signInWithPassword({
    email: context.email,
    password: input.currentPassword,
  });

  if (signInError) {
    throw new ApiClientError(
      "Current password is incorrect.",
      400,
      "INVALID_CURRENT_PASSWORD",
    );
  }

  await anon.auth.signOut().catch(() => undefined);

  const admin = createSupabaseAdminClient();
  const { error: updateError } = await admin.auth.admin.updateUserById(context.userId, {
    password: input.newPassword,
  });

  if (updateError) {
    throw new ApiClientError(
      updateError.message,
      500,
      "PASSWORD_UPDATE_FAILED",
      updateError,
    );
  }

  await sendPasswordChangedEmail({
    to: context.email,
    changedAtIso: changedAt,
    requestIp: context.requestIp ?? null,
  }).catch((err) => {
    console.error("[password-service] notification email failed", err);
  });

  return { changedAt };
};
