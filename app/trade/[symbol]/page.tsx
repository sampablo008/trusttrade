import { type Metadata } from "next";
import { notFound } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import TradeShell from "@/components/trade/TradeShell";
import TokenSwitcher from "@/components/trade/TokenSwitcher";
import { assertAuthenticated } from "@/lib/auth/session";
import { getOptionalServerEnv } from "@/lib/env/server";
import { TOP_COINS, findTopCoin } from "@/lib/markets/top-coins";
import { listMarketTokens, listTradePeriods } from "@/lib/markets/service";
import { getBalance, listActiveTrades } from "@/lib/trades/service";
import type { PublicToken } from "@/types/market";

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
  };
}

export default async function TradeSymbolPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const session = await assertAuthenticated();
  const { symbol } = await params;
  const upperSymbol = symbol.toUpperCase();

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

  const [balance, activeTrades] = userId
    ? await Promise.all([getBalance(userId), listActiveTrades(userId)])
    : [
        { balanceCents: 0, lockedInTradesCents: 0, lockedBonusCents: 0, withdrawableCents: 0 },
        { items: [] },
      ];

  const iconPaths = Object.fromEntries(
    tokensResult.items.map((t) => [t.symbol, t.iconPath ?? null]),
  );

  return (
    <AppShell>
      <main className="mx-auto flex w-full max-w-350 flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <TokenSwitcher coins={TOP_COINS} iconPaths={iconPaths} />
        <TradeShell
          coin={coin}
          token={token}
          periods={periodsResult.items}
          initialBalance={balance}
          initialTrades={activeTrades.items}
        />
      </main>
    </AppShell>
  );
}
