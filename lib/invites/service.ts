import "server-only";
import { PostgrestError } from "@supabase/supabase-js";
import { ApiClientError } from "@/lib/api/client";
import { getOptionalServerEnv } from "@/lib/env/server";
import { getPreviewInvite } from "@/lib/invites/preview-data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  inviteCodeSchema,
  invitedSignupSchema,
  inviteValidationResultSchema,
} from "@/schemas/invites";
import type { InviteSignupResult, InviteValidationResult } from "@/types/invites";

interface ValidateInviteRpcRow {
  code: string | null;
  expires_at: string | null;
  is_single_use: boolean | null;
  owner_user_id: string | null;
  source: "admin" | "user" | null;
  status: string | null;
  valid: boolean | null;
}

const normalizeInviteCode = (code: string) => inviteCodeSchema.parse(code);

const mapInviteRow = (
  row: ValidateInviteRpcRow | null | undefined,
): InviteValidationResult => {
  if (!row || !row.valid || !row.code) {
    return {
      code: row?.code ?? "",
      expiresAt: row?.expires_at ?? null,
      isSingleUse: Boolean(row?.is_single_use),
      isValid: false,
      message: "Invite code is not active.",
      mode: "live",
      ownerUserId: row?.owner_user_id ?? null,
      source: row?.source ?? null,
      status: row?.status ?? null,
    };
  }

  return inviteValidationResultSchema.parse({
    code: row.code,
    expiresAt: row.expires_at,
    isSingleUse: Boolean(row.is_single_use),
    isValid: true,
    message:
      row.source === "admin"
        ? "Valid admin invite. Single-use root signup."
        : "Valid referral invite. This signup joins a user downline.",
    mode: "live",
    ownerUserId: row.owner_user_id,
    source: row.source,
    status: row.status,
  });
};

const mapProfileUpdateError = (error: PostgrestError) => {
  if (error.code === "23505") {
    throw new ApiClientError("Username is already taken.", 409, "USERNAME_TAKEN");
  }

  throw new ApiClientError(error.message, 500, "PROFILE_UPDATE_FAILED", error);
};

export const validateInviteCode = async (
  rawCode: string,
): Promise<InviteValidationResult> => {
  const code = normalizeInviteCode(rawCode);

  if (!getOptionalServerEnv()) {
    return getPreviewInvite(code);
  }

  const adminClient = createSupabaseAdminClient();
  const { data, error } = await adminClient.rpc("validate_invite", { p_code: code });

  if (error) {
    throw new ApiClientError(error.message, 500, "INVITE_VALIDATE_FAILED", error);
  }

  const row = Array.isArray(data) ? (data[0] as ValidateInviteRpcRow | undefined) : (data as ValidateInviteRpcRow | null);
  const invite = mapInviteRow(row);

  return invite.code ? invite : { ...invite, code };
};

export const createInvitedUser = async (
  payload: unknown,
): Promise<InviteSignupResult> => {
  const input = invitedSignupSchema.parse(payload);

  if (!getOptionalServerEnv()) {
    throw new ApiClientError(
      "Supabase setup is still required before signup can create real users.",
      503,
      "SUPABASE_SETUP_REQUIRED",
    );
  }

  const invite = await validateInviteCode(input.code);

  if (!invite.isValid) {
    throw new ApiClientError("Invite code is not active.", 409, "CODE_INACTIVE");
  }

  const adminClient = createSupabaseAdminClient();
  const createUserResult = await adminClient.auth.admin.createUser({
    email: input.email.toLowerCase(),
    email_confirm: true,
    password: input.password,
    user_metadata: {
      display_name: input.username,
    },
  });

  if (createUserResult.error || !createUserResult.data.user) {
    throw new ApiClientError(
      createUserResult.error?.message ?? "Failed to create auth user.",
      500,
      "AUTH_USER_CREATE_FAILED",
      createUserResult.error,
    );
  }

  const createdUser = createUserResult.data.user;

  try {
    const { error: profileUpdateError } = await adminClient
      .from("profiles")
      .update({
        username: input.username,
        display_name: input.username,
      })
      .eq("user_id", createdUser.id);

    if (profileUpdateError) {
      mapProfileUpdateError(profileUpdateError);
    }

    const consumeResult = await adminClient.rpc("consume_invite", {
      p_code: input.code,
      p_ip: null,
      p_user_agent: "next-route-handler",
      p_user_id: createdUser.id,
    });

    if (consumeResult.error) {
      throw new ApiClientError(
        consumeResult.error.message,
        500,
        "INVITE_CONSUME_FAILED",
        consumeResult.error,
      );
    }

    return {
      nextPath: "/login?next=/trade&signup=1",
      userId: createdUser.id,
    };
  } catch (error) {
    await adminClient.auth.admin.deleteUser(createdUser.id).catch(() => undefined);

    throw error;
  }
};
