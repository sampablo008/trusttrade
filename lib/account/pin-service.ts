import "server-only";
import bcrypt from "bcryptjs";
import { ApiClientError } from "@/lib/api/client";
import { sendPinActivityEmail } from "@/lib/email/send";
import { getOptionalServerEnv } from "@/lib/env/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { setWithdrawalPinInputSchema } from "@/schemas/account";

const BCRYPT_COST = 10;

const previewPinStore = new Map<string, string>();

export interface PinContext {
  userId: string;
  email: string;
  requestIp?: string | null;
}

const hashPin = (pin: string) => bcrypt.hash(pin, BCRYPT_COST);
const verifyPinHash = (pin: string, hash: string) => bcrypt.compare(pin, hash);

const loadPinHash = async (userId: string): Promise<string | null> => {
  if (!getOptionalServerEnv()) {
    return previewPinStore.get(userId) ?? null;
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("withdrawal_pin_hash")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new ApiClientError(
      error.message,
      500,
      "PIN_FETCH_FAILED",
      error,
    );
  }

  return (data?.withdrawal_pin_hash as string | null) ?? null;
};

const persistPinHash = async (userId: string, hash: string): Promise<void> => {
  if (!getOptionalServerEnv()) {
    previewPinStore.set(userId, hash);
    return;
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ withdrawal_pin_hash: hash })
    .eq("user_id", userId);

  if (error) {
    throw new ApiClientError(
      error.message,
      500,
      "PIN_UPDATE_FAILED",
      error,
    );
  }
};

export const setOrChangeWithdrawalPin = async (
  context: PinContext,
  payload: unknown,
): Promise<{ action: "set" | "changed"; actionAt: string }> => {
  const input = setWithdrawalPinInputSchema.parse(payload);
  const actionAt = new Date().toISOString();
  const existingHash = await loadPinHash(context.userId);
  const isChanging = Boolean(existingHash);

  if (isChanging) {
    if (!input.currentPin) {
      throw new ApiClientError(
        "Enter your current PIN to change it.",
        400,
        "CURRENT_PIN_REQUIRED",
      );
    }
    const ok = await verifyPinHash(input.currentPin, existingHash as string);
    if (!ok) {
      throw new ApiClientError(
        "Current PIN is incorrect.",
        400,
        "INVALID_CURRENT_PIN",
      );
    }
    if (input.currentPin === input.newPin) {
      throw new ApiClientError(
        "New PIN must differ from current PIN.",
        400,
        "PIN_UNCHANGED",
      );
    }
  }

  const newHash = await hashPin(input.newPin);
  await persistPinHash(context.userId, newHash);

  const action: "set" | "changed" = isChanging ? "changed" : "set";

  await sendPinActivityEmail({
    to: context.email,
    action,
    actionAtIso: actionAt,
    requestIp: context.requestIp ?? null,
  }).catch((err) => console.error("[pin-service] email failed", err));

  return { action, actionAt };
};

export const verifyWithdrawalPin = async (
  userId: string,
  pin: string,
): Promise<void> => {
  const hash = await loadPinHash(userId);
  if (!hash) {
    throw new ApiClientError(
      "Set a withdrawal PIN before requesting a withdrawal.",
      400,
      "PIN_NOT_SET",
    );
  }

  const ok = await verifyPinHash(pin, hash);
  if (!ok) {
    throw new ApiClientError(
      "Withdrawal PIN is incorrect.",
      400,
      "INVALID_PIN",
    );
  }
};

export const hasWithdrawalPin = async (userId: string): Promise<boolean> => {
  const hash = await loadPinHash(userId);
  return Boolean(hash);
};
