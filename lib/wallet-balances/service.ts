import "server-only";
import { ApiClientError } from "@/lib/api/client";
import { getOptionalServerEnv } from "@/lib/env/server";
import { getBinanceUsdPrices } from "@/lib/markets/live-prices";
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
        base_price_cents: number | string;
      }
    | null;
}

interface UsdBalanceRow {
  balance_cents: number | string | null;
  locked_in_trades_cents: number | string | null;
  locked_bonus_cents: number | string | null;
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

  const [usdRes, tokenRes] = await Promise.all([
    admin
      .from("user_balances")
      .select("balance_cents, locked_in_trades_cents, locked_bonus_cents")
      .eq("user_id", userId)
      .maybeSingle(),
    admin
      .from("user_token_balances")
      .select(
        "token_id, balance, locked_balance, tokens(symbol, name, icon_path, decimals, shadow_symbol, base_price_cents)",
      )
      .eq("user_id", userId)
      .or("balance.gt.0,locked_balance.gt.0"),
  ]);

  if (usdRes.error) {
    throw new ApiClientError(
      usdRes.error.message,
      500,
      "USD_BALANCE_FETCH_FAILED",
      usdRes.error,
    );
  }
  if (tokenRes.error) {
    throw new ApiClientError(
      tokenRes.error.message,
      500,
      "TOKEN_BALANCE_FETCH_FAILED",
      tokenRes.error,
    );
  }

  const usdRow = (usdRes.data ?? null) as UsdBalanceRow | null;
  const usdBalanceCents = toNum(usdRow?.balance_cents);
  const lockedInTradesCents = toNum(usdRow?.locked_in_trades_cents);
  const lockedBonusCents = toNum(usdRow?.locked_bonus_cents);

  const rows = (tokenRes.data ?? []) as unknown as BalanceRow[];
  const shadowSymbols = rows
    .map((r) => r.tokens?.shadow_symbol)
    .filter((s): s is string => Boolean(s));
  let prices: Record<string, number> = {};
  try {
    prices = await getBinanceUsdPrices(shadowSymbols);
  } catch {
    prices = {};
  }

  // Opportunistic write-back: keep tokens.last_shadow_price_cents warm so
  // the trade-execution fallback chain and admin dashboards have fresh data
  // even when the cron is between ticks.
  const writebackUpdates: Array<{ tokenId: string; cents: number }> = [];

  const tokens: TokenBalance[] = rows.map((row) => {
    const t = row.tokens;
    const balance = toNum(row.balance);
    const lockedBalance = toNum(row.locked_balance);
    const decimals = t?.decimals != null ? Math.round(toNum(t.decimals)) : 8;
    const shadowSymbol = t?.shadow_symbol ?? null;
    const livePriceUsd = shadowSymbol ? prices[shadowSymbol] : undefined;
    const usdPriceCents =
      livePriceUsd != null
        ? Math.round(livePriceUsd * 100)
        : Math.round(toNum(t?.base_price_cents));
    if (livePriceUsd != null && row.token_id) {
      writebackUpdates.push({ tokenId: row.token_id, cents: usdPriceCents });
    }
    const freeUsdValueCents = Math.round(balance * usdPriceCents);
    const usdValueCents = Math.round((balance + lockedBalance) * usdPriceCents);
    return {
      tokenId: row.token_id,
      symbol: t?.symbol ?? "",
      name: t?.name ?? t?.symbol ?? "",
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
          .update({ last_shadow_price_cents: u.cents, last_shadow_at: nowIso })
          .eq("id", u.tokenId),
      ),
    );
  }

  const totalUsdValueCents = tokens.reduce((sum, t) => sum + t.usdValueCents, 0);
  const totalFreeUsdValueCents = tokens.reduce((sum, t) => sum + t.freeUsdValueCents, 0);

  return walletBalancesResultSchema.parse({
    usdBalanceCents,
    lockedInTradesCents,
    lockedBonusCents,
    withdrawableCents: totalFreeUsdValueCents,
    tokens,
    totalUsdValueCents,
    totalFreeUsdValueCents,
  });
};
