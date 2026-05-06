import "server-only";
import { ApiClientError } from "@/lib/api/client";
import { getOptionalServerEnv } from "@/lib/env/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { primaryAddressesResultSchema } from "@/schemas/primary-address";
import type {
  PrimaryAddress,
  PrimaryAddressesResult,
  RemovePrimaryAddressInput,
  SetPrimaryAddressInput,
} from "@/types/primary-address";
import { verifyWithdrawalPin } from "./pin-service";

interface PrimaryAddressRow {
  token_id: string;
  network: string;
  address: string;
  created_at: string;
  updated_at: string;
  tokens: { symbol: string } | { symbol: string }[] | null;
}

const previewStore = new Map<string, PrimaryAddress[]>();

const keyOf = (tokenSymbol: string, network: string) =>
  `${tokenSymbol.toUpperCase()}::${network.toUpperCase()}`;

const previewList = (userId: string): PrimaryAddress[] =>
  previewStore.get(userId) ?? [];

const resolveSymbol = (tokens: PrimaryAddressRow["tokens"]): string => {
  if (!tokens) return "";
  return Array.isArray(tokens) ? tokens[0]?.symbol ?? "" : tokens.symbol;
};

const mapRow = (row: PrimaryAddressRow): PrimaryAddress => ({
  tokenId: row.token_id,
  tokenSymbol: resolveSymbol(row.tokens),
  network: row.network,
  address: row.address,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const lookupTokenId = async (symbol: string): Promise<string> => {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("tokens")
    .select("id")
    .eq("symbol", symbol.toUpperCase())
    .maybeSingle();
  if (error || !data) {
    throw new ApiClientError("Token not found.", 404, "TOKEN_NOT_FOUND");
  }
  return data.id as string;
};

export const listPrimaryAddresses = async (
  userId: string,
): Promise<PrimaryAddressesResult> => {
  if (!getOptionalServerEnv()) {
    return { items: previewList(userId) };
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_primary_withdrawal_addresses")
    .select("token_id, network, address, created_at, updated_at, tokens(symbol)")
    .eq("user_id", userId);

  if (error) {
    throw new ApiClientError(
      error.message,
      500,
      "PRIMARY_ADDRESSES_FETCH_FAILED",
      error,
    );
  }

  return primaryAddressesResultSchema.parse({
    items: (data ?? []).map((r) => mapRow(r as unknown as PrimaryAddressRow)),
  });
};

export const getPrimaryAddress = async (
  userId: string,
  tokenSymbol: string,
  network: string,
): Promise<PrimaryAddress | null> => {
  const list = await listPrimaryAddresses(userId);
  return (
    list.items.find(
      (item) =>
        item.tokenSymbol.toUpperCase() === tokenSymbol.toUpperCase() &&
        item.network.toUpperCase() === network.toUpperCase(),
    ) ?? null
  );
};

export const setPrimaryAddress = async (
  userId: string,
  input: SetPrimaryAddressInput,
): Promise<PrimaryAddress> => {
  await verifyWithdrawalPin(userId, input.withdrawalPin);

  const tokenSymbol = input.tokenSymbol.toUpperCase();
  const network = input.network.toUpperCase();
  const address = input.address.trim();
  const now = new Date().toISOString();

  if (!getOptionalServerEnv()) {
    const list = previewList(userId).slice();
    const idx = list.findIndex(
      (item) =>
        item.tokenSymbol === tokenSymbol && item.network === network,
    );
    const next: PrimaryAddress = {
      tokenId: keyOf(tokenSymbol, network),
      tokenSymbol,
      network,
      address,
      createdAt: idx >= 0 ? list[idx]!.createdAt : now,
      updatedAt: now,
    };
    if (idx >= 0) list[idx] = next;
    else list.push(next);
    previewStore.set(userId, list);
    return next;
  }

  const tokenId = await lookupTokenId(tokenSymbol);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("user_primary_withdrawal_addresses")
    .upsert(
      {
        user_id: userId,
        token_id: tokenId,
        network,
        address,
        updated_at: now,
      },
      { onConflict: "user_id,token_id,network" },
    )
    .select("token_id, network, address, created_at, updated_at, tokens(symbol)")
    .single();

  if (error || !data) {
    throw new ApiClientError(
      error?.message ?? "Failed to set primary address.",
      500,
      "PRIMARY_ADDRESS_SET_FAILED",
      error,
    );
  }

  return mapRow(data as unknown as PrimaryAddressRow);
};

export const removePrimaryAddress = async (
  userId: string,
  input: RemovePrimaryAddressInput,
): Promise<void> => {
  await verifyWithdrawalPin(userId, input.withdrawalPin);

  const tokenSymbol = input.tokenSymbol.toUpperCase();
  const network = input.network.toUpperCase();

  if (!getOptionalServerEnv()) {
    const list = previewList(userId).filter(
      (item) =>
        !(item.tokenSymbol === tokenSymbol && item.network === network),
    );
    previewStore.set(userId, list);
    return;
  }

  const tokenId = await lookupTokenId(tokenSymbol);
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("user_primary_withdrawal_addresses")
    .delete()
    .eq("user_id", userId)
    .eq("token_id", tokenId)
    .eq("network", network);

  if (error) {
    throw new ApiClientError(
      error.message,
      500,
      "PRIMARY_ADDRESS_REMOVE_FAILED",
      error,
    );
  }
};
