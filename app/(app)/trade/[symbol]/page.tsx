import { Suspense } from "react";
import { type Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import TradeShell from "@/components/trade/TradeShell";
import TokenSwitcher from "@/components/trade/TokenSwitcher";
import { RouteSkeleton } from "@/components/ui/RouteSkeleton";
import { assertAuthenticated } from "@/lib/auth/session";
import { getOptionalServerEnv } from "@/lib/env/server";
import { TOP_COINS, findTopCoin } from "@/lib/markets/top-coins";
import { getLiveUsdPrice } from "@/lib/markets/live-prices";
import { listMarketTokens, listTradePeriods } from "@/lib/markets/service";
import { getBalance, listActiveTrades } from "@/lib/trades/service";
import { getWalletBalances } from "@/lib/wallet-balances/service";
import type { PublicToken } from "@/types/market";

// Pre-generate static shells for the known tradable symbols so the route's
// static shell (nav frame + skeleton) is prerenderable. Unknown symbols still
// render dynamically.
export function generateStaticParams() {
  return TOP_COINS.map((coin) => ({ symbol: coin.symbol }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ symbol: string }> },
): Promise<Metadata> {
  const { symbol } = await params;
  return {
    title: `${symbol.toUpperCase()} Trading`,
    description: `Trade ${symbol.toUpperCase()} long or short with live charts and up to 85% payout.`,
  };
}

const PREVIEW_USER_ID = "00000000-0000-4000-8000-0000000000a1";

function stubToken(symbol: string, name: string): PublicToken {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    symbol,
    name,
    iconPath: null,
    priceCents: 0,
    dayChangePercent: 0,
    volumeLabel: "—",
    feedSource: "synthetic",
    shadowOffsetPercent: 0,
    lastPriceAt: null,
    decimals: 8,
    minDeposit: 0,
    minSwap: 0,
    minWithdrawal: 0,
    withdrawFeeBps: 0,
  };
}

export default function TradeSymbolPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  return (
    <main className="flex w-full flex-col gap-3 px-4 py-4 sm:px-6 lg:min-h-[calc(100dvh-3.75rem)] lg:px-16">
      <Suspense fallback={<RouteSkeleton className="space-y-6" />}>
        <TradeSymbolContent params={params} />
      </Suspense>
    </main>
  );
}

async function TradeSymbolContent({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const session = await assertAuthenticated();
  const { symbol } = await params;
  const upperSymbol = symbol.toUpperCase();

  // Stablecoins are not chartable — redirect to the first non-stable in TOP_COINS.
  if (upperSymbol === "USDT" || upperSymbol === "USDC") {
    const fallback = TOP_COINS.find(
      (c) => c.symbol !== "USDT" && c.symbol !== "USDC",
    );
    if (fallback) redirect(`/trade/${fallback.symbol}`);
  }

  const coin = findTopCoin(upperSymbol);
  if (!coin) notFound();

  const [tokensResult, periodsResult] = await Promise.all([
    listMarketTokens(),
    listTradePeriods(),
  ]);

  const token =
    tokensResult.items.find((t) => t.symbol === upperSymbol) ??
    stubToken(coin.symbol, coin.name);

  const userId =
    session.userId ?? (getOptionalServerEnv() ? null : PREVIEW_USER_ID);

  const [balance, activeTrades, walletBalances] = userId
    ? await Promise.all([
        getBalance(userId),
        listActiveTrades(userId),
        getWalletBalances(userId),
      ])
    : [
        { balanceCents: 0, lockedInTradesCents: 0, lockedBonusCents: 0, withdrawableCents: 0 },
        { items: [] },
        null,
      ];

  // Trades are funded from the chart token's balance.
  const chartTokenEntry =
    walletBalances?.tokens.find((t) => t.symbol === upperSymbol) ?? null;
  const tokenFreeBalance = chartTokenEntry?.balance ?? 0;

  // Resolve the chart token's USD price independent of whether the user holds it.
  // Fallback chain: wallet entry (live-fetched on render) → token row from
  // listMarketTokens (live + DB cache) → fresh live lookup for the chart symbol.
  // Never fall back to base_price_cents — that's the seed value that caused 1 BTC = $1.
  let tokenUsdPriceCents = chartTokenEntry?.usdPriceCents ?? token.priceCents;
  if (tokenUsdPriceCents <= 0) {
    const liveUsd = await getLiveUsdPrice(upperSymbol).catch(() => null);
    if (liveUsd != null && liveUsd > 0) {
      tokenUsdPriceCents = Math.round(liveUsd * 100);
    }
  }

  const iconPaths = Object.fromEntries(
    tokensResult.items.map((t) => [t.symbol, t.iconPath ?? null]),
  );

  return (
    <>
      <TokenSwitcher coins={TOP_COINS} iconPaths={iconPaths} />
      <TradeShell
        coin={coin}
        coins={TOP_COINS}
        iconPaths={iconPaths}
        token={token}
        periods={periodsResult.items}
        initialBalance={balance}
        initialTrades={activeTrades.items}
        tokenFreeBalance={tokenFreeBalance}
        tokenUsdPriceCents={tokenUsdPriceCents}
      />
    </>
  );
}
