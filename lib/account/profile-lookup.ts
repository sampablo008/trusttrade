import "server-only";
import { ApiClientError } from "@/lib/api/client";
import { getOptionalServerEnv } from "@/lib/env/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface AccountIdentity {
  userId: string;
  email: string;
  displayName: string;
  username: string;
  hasWithdrawalPin: boolean;
  emailVerified: boolean;
}

export const loadAccountIdentity = async (
  userId: string,
): Promise<AccountIdentity> => {
  if (!getOptionalServerEnv()) {
    return {
      userId,
      email: "preview@trusttrade.pro",
      displayName: "Preview Trader",
      username: "preview",
      hasWithdrawalPin: false,
      emailVerified: true,
    };
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("user_id, email, username, display_name, withdrawal_pin_hash")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new ApiClientError(error.message, 500, "PROFILE_FETCH_FAILED", error);
  }
  if (!data) {
    throw new ApiClientError("Profile not found.", 404, "PROFILE_NOT_FOUND");
  }

  const authLookup = await admin.auth.admin.getUserById(userId);
  const emailVerified = Boolean(authLookup.data.user?.email_confirmed_at);

  return {
    userId: data.user_id,
    email: data.email,
    displayName: (data.display_name as string | null) ?? (data.username as string),
    username: data.username as string,
    hasWithdrawalPin: Boolean(data.withdrawal_pin_hash),
    emailVerified,
  };
};

export const loadIdentityByEmail = async (
  email: string,
): Promise<AccountIdentity | null> => {
  if (!getOptionalServerEnv()) {
    return {
      userId: "00000000-0000-4000-8000-0000000000a1",
      email: email.toLowerCase(),
      displayName: "Preview Trader",
      username: "preview",
      hasWithdrawalPin: false,
      emailVerified: true,
    };
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("user_id, email, username, display_name, withdrawal_pin_hash")
    .ilike("email", email)
    .maybeSingle();

  if (error) {
    throw new ApiClientError(error.message, 500, "PROFILE_FETCH_FAILED", error);
  }
  if (!data) return null;

  const authLookup = await admin.auth.admin.getUserById(data.user_id as string);
  const emailVerified = Boolean(authLookup.data.user?.email_confirmed_at);

  return {
    userId: data.user_id as string,
    email: data.email as string,
    displayName:
      (data.display_name as string | null) ?? (data.username as string),
    username: data.username as string,
    hasWithdrawalPin: Boolean(data.withdrawal_pin_hash),
    emailVerified,
  };
};
