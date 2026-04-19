import "server-only";
import { ApiClientError } from "@/lib/api/client";
import { getOptionalServerEnv } from "@/lib/env/server";
import {
  createPreviewAdminWallet,
  deletePreviewAdminWallet,
  listPreviewAdminWallets,
  updatePreviewAdminWallet,
} from "@/lib/wallets/preview-data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  adminWalletAddressSchema,
  adminWalletAddressesResultSchema,
  deleteAdminWalletAddressResultSchema,
  upsertAdminWalletAddressInputSchema,
} from "@/schemas/wallet";
import type {
  AdminWalletAddress,
  AdminWalletAddressesResult,
  DeleteAdminWalletAddressResult,
} from "@/types/wallet";

interface WalletRow {
  address: string;
  created_at: string;
  id: string;
  is_enabled: boolean;
  memo: string | null;
  min_deposit_cents: number | string;
  network: string;
  qr_code_path: string | null;
  token_symbol: string;
  updated_at: string;
}

const toIsoZ = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString();
};

const mapWalletRow = (row: WalletRow): AdminWalletAddress =>
  adminWalletAddressSchema.parse({
    address: row.address,
    createdAt: toIsoZ(row.created_at),
    id: row.id,
    isEnabled: row.is_enabled,
    memo: row.memo,
    minDepositCents: Number(row.min_deposit_cents),
    network: row.network,
    qrCodePath: row.qr_code_path,
    tokenSymbol: row.token_symbol,
    updatedAt: toIsoZ(row.updated_at),
  });

const selectWalletFields =
  "id, token_symbol, network, address, memo, min_deposit_cents, is_enabled, qr_code_path, created_at, updated_at";

export const listAdminWallets = async (): Promise<AdminWalletAddressesResult> => {
  if (!getOptionalServerEnv()) {
    return listPreviewAdminWallets();
  }

  const adminClient = createSupabaseAdminClient();
  const { data, error } = await adminClient
    .from("wallet_addresses")
    .select(selectWalletFields)
    .order("network", { ascending: true });

  if (error) {
    throw new ApiClientError(error.message, 500, "ADMIN_WALLETS_FETCH_FAILED", error);
  }

  return adminWalletAddressesResultSchema.parse({
    items: (data ?? []).map((row) => mapWalletRow(row as WalletRow)),
  });
};

export const createAdminWallet = async (payload: unknown): Promise<AdminWalletAddress> => {
  const input = upsertAdminWalletAddressInputSchema.parse(payload);

  if (!getOptionalServerEnv()) {
    return createPreviewAdminWallet(input);
  }

  const adminClient = createSupabaseAdminClient();
  const { data, error } = await adminClient
    .from("wallet_addresses")
    .insert({
      address: input.address,
      is_enabled: input.isEnabled,
      memo: input.memo,
      min_deposit_cents: input.minDepositCents,
      network: input.network,
      qr_code_path: input.qrCodePath ?? null,
      token_symbol: input.tokenSymbol,
    })
    .select(selectWalletFields)
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new ApiClientError(
        "A wallet for this token + network already exists.",
        409,
        "WALLET_DUPLICATE",
        error,
      );
    }
    throw new ApiClientError(error.message, 500, "ADMIN_WALLET_CREATE_FAILED", error);
  }

  return mapWalletRow(data as WalletRow);
};

export const updateAdminWallet = async (
  id: string,
  payload: unknown,
): Promise<AdminWalletAddress> => {
  const input = upsertAdminWalletAddressInputSchema.parse(payload);

  if (!getOptionalServerEnv()) {
    return updatePreviewAdminWallet(id, input);
  }

  const adminClient = createSupabaseAdminClient();
  const { data, error } = await adminClient
    .from("wallet_addresses")
    .update({
      address: input.address,
      is_enabled: input.isEnabled,
      memo: input.memo,
      min_deposit_cents: input.minDepositCents,
      network: input.network,
      qr_code_path: input.qrCodePath ?? null,
      token_symbol: input.tokenSymbol,
    })
    .eq("id", id)
    .select(selectWalletFields)
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      throw new ApiClientError(
        "A wallet for this token + network already exists.",
        409,
        "WALLET_DUPLICATE",
        error,
      );
    }
    throw new ApiClientError(error.message, 500, "ADMIN_WALLET_UPDATE_FAILED", error);
  }

  if (!data) {
    throw new ApiClientError("Wallet address not found.", 404, "WALLET_NOT_FOUND");
  }

  return mapWalletRow(data as WalletRow);
};

export const deleteAdminWallet = async (id: string): Promise<DeleteAdminWalletAddressResult> => {
  if (!getOptionalServerEnv()) {
    return deletePreviewAdminWallet(id);
  }

  const adminClient = createSupabaseAdminClient();
  const { data, error } = await adminClient
    .from("wallet_addresses")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new ApiClientError(error.message, 500, "ADMIN_WALLET_DELETE_FAILED", error);
  }

  if (!data?.id) {
    throw new ApiClientError("Wallet address not found.", 404, "WALLET_NOT_FOUND");
  }

  return deleteAdminWalletAddressResultSchema.parse({ id: data.id });
};
