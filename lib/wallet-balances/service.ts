import "server-only";
import { ApiClientError } from "@/lib/api/client";
import { getOptionalServerEnv } from "@/lib/env/server";
import { getLiveUsdPrices } from "@/lib/markets/live-prices";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { walletBalancesResultSchema } from "@/schemas/wallet-balance";
import type { TokenBalance, WalletBalancesResult } from "@/types/wallet-balance";
import { getPreviewWalletBalances } from "./preview-data";

interface BalanceRow {
  token_id: string;
  balance: number | string;
  locked_balance: number | string | null;
  tokens?:
    | {
        symbol: string;
        name: string;
        icon_path: string | null;
        decimals: number | string | null;
        shadow_symbol: string | null;
        last_price_cents: number | string | null;
        last_shadow_price_cents: number | string | null;
      }
    | null;
}

const toNum = (v: number | string | null | undefined): number => {
  if (v == null) return 0;
  if (typeof v === "string") return Number(v);
  return v;
};

export const getWalletBalances = async (
  userId: string,
): Promise<WalletBalancesResult> => {
  if (!getOptionalServerEnv()) {
    return getPreviewWalletBalances();
  }

  const admin = createSupabaseAdminClient();

  const tokenRes = await admin
    .from("user_token_balances")
    .select(
      "token_id, balance, locked_balance, tokens(symbol, name, icon_path, decimals, shadow_symbol, last_price_cents, last_shadow_price_cents)",
    )
    .eq("user_id", userId)
    .or("balance.gt.0,locked_balance.gt.0");

  if (tokenRes.error) {
    throw new ApiClientError(
      tokenRes.error.message,
      500,
      "TOKEN_BALANCE_FETCH_FAILED",
      tokenRes.error,
    );
  }

  const rows = (tokenRes.data ?? []) as unknown as BalanceRow[];
  const priceLookups = rows
    .filter((r) => r.tokens?.symbol)
    .map((r) => ({
      symbol: r.tokens!.symbol,
      shadowSymbol: r.tokens?.shadow_symbol ?? null,
    }));
  let livePrices: Record<string, number> = {};
  try {
    livePrices = await getLiveUsdPrices(priceLookups);
  } catch {
    livePrices = {};
  }

  // Opportunistic write-back: keep tokens.last_price_cents warm so
  // the trade-execution fallback chain and admin dashboards have fresh data
  // even when the cron is between ticks.
  const writebackUpdates: Array<{ tokenId: string; cents: number }> = [];

  const tokens: TokenBalance[] = rows.map((row) => {
    const t = row.tokens;
    const balance = toNum(row.balance);
    const lockedBalance = toNum(row.locked_balance);
    const decimals = t?.decimals != null ? Math.round(toNum(t.decimals)) : 8;
    const symbol = t?.symbol ?? "";
    const livePriceUsd = symbol ? livePrices[symbol] : undefined;
    const liveCents = livePriceUsd != null ? Math.round(livePriceUsd * 100) : 0;
    // Fallback order: live → last_price_cents (cron/opportunistic) →
    // last_shadow_price_cents. Never base_price_cents (it's just a seed value
    // that produced the "1 BTC = $1" bug). 0 here means "price unavailable"
    // and the UI surfaces that explicitly.
    const usdPriceCents =
      liveCents ||
      Math.round(toNum(t?.last_price_cents)) ||
      Math.round(toNum(t?.last_shadow_price_cents)) ||
      0;
    if (liveCents > 0 && row.token_id) {
      writebackUpdates.push({ tokenId: row.token_id, cents: liveCents });
    }
    const freeUsdValueCents = Math.round(balance * usdPriceCents);
    const usdValueCents = Math.round((balance + lockedBalance) * usdPriceCents);
    return {
      tokenId: row.token_id,
      symbol,
      name: t?.name ?? symbol,
      iconPath: t?.icon_path ?? null,
      decimals,
      balance,
      lockedBalance,
      usdPriceCents,
      freeUsdValueCents,
      usdValueCents,
    };
  });

  tokens.sort((a, b) => b.usdValueCents - a.usdValueCents);

  if (writebackUpdates.length > 0) {
    const nowIso = new Date().toISOString();
    void Promise.allSettled(
      writebackUpdates.map((u) =>
        admin
          .from("tokens")
          .update({
            last_price_cents: u.cents,
            last_price_at: nowIso,
            last_shadow_price_cents: u.cents,
            last_shadow_at: nowIso,
          })
          .eq("id", u.tokenId),
      ),
    );
  }

  const totalUsdValueCents = tokens.reduce((sum, t) => sum + t.usdValueCents, 0);
  const totalFreeUsdValueCents = tokens.reduce((sum, t) => sum + t.freeUsdValueCents, 0);

  return walletBalancesResultSchema.parse({
    withdrawableCents: totalFreeUsdValueCents,
    tokens,
    totalUsdValueCents,
    totalFreeUsdValueCents,
  });
};
