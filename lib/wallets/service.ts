import "server-only";
import { ApiClientError } from "@/lib/api/client";
import { getOptionalServerEnv } from "@/lib/env/server";
import { getPreviewPublicWallets } from "@/lib/wallets/preview-data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { publicWalletAddressesResultSchema } from "@/schemas/wallet";
import type { PublicWalletAddressesResult } from "@/types/wallet";

export const listPublicWallets = async (): Promise<PublicWalletAddressesResult> => {
  if (!getOptionalServerEnv()) {
    return getPreviewPublicWallets();
  }

  const adminClient = createSupabaseAdminClient();
  const { data, error } = await adminClient
    .from("wallet_addresses")
    .select("id, token_symbol, network, address, memo, min_deposit_cents")
    .eq("is_enabled", true)
    .order("network", { ascending: true });

  if (error) {
    throw new ApiClientError(error.message, 500, "WALLETS_FETCH_FAILED", error);
  }

  if (!data?.length) {
    return getPreviewPublicWallets();
  }

  return publicWalletAddressesResultSchema.parse({
    items: data.map((row) => ({
      address: row.address,
      id: row.id,
      memo: row.memo,
      minDepositCents: Number(row.min_deposit_cents),
      network: row.network,
      tokenSymbol: row.token_symbol,
    })),
  });
};
