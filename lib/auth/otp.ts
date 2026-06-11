import "server-only";
import { ApiClientError } from "@/lib/api/client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Supabase email OTP default lifetime is 1 hour.
export const EMAIL_OTP_EXPIRY_MINUTES = 60;

type OtpLinkType = "magiclink" | "recovery";

export interface EmailOtp {
  code: string;
  expiresInMinutes: number;
}

/**
 * Generate a Supabase email OTP WITHOUT sending an email.
 *
 * `generateLink` returns the 6-digit `email_otp`; we deliver it ourselves via
 * Resend. The matching `verifyOtp` call still validates it server-side:
 *   - magiclink -> verifyOtp({ type: "email" })   (signup / email verification)
 *   - recovery  -> verifyOtp({ type: "recovery" }) (password reset)
 */
export const generateEmailOtp = async (params: {
  email: string;
  type: OtpLinkType;
}): Promise<EmailOtp> => {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: params.type,
    email: params.email,
  });

  const code = data?.properties?.email_otp;
  if (error || !code) {
    throw new ApiClientError(
      error?.message ?? "Failed to generate verification code.",
      500,
      "OTP_GENERATE_FAILED",
      error ?? undefined,
    );
  }

  return { code, expiresInMinutes: EMAIL_OTP_EXPIRY_MINUTES };
};
