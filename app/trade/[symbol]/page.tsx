import { notFound } from "next/navigation";
import TradeShell from "@/components/trade/TradeShell";
import { assertAuthenticated } from "@/lib/auth/session";
import { getOptionalServerEnv } from "@/lib/env/server";
import { listCandles, listMarketTokens, listTradePeriods } from "@/lib/markets/service";
import { getBalance, listActiveTrades } from "@/lib/trades/service";

const PREVIEW_USER_ID = "00000000-0000-4000-8000-0000000000a1";

export default async function TradeSymbolPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  await assertAuthenticated();
  const { symbol } = await params;
  const upperSymbol = symbol.toUpperCase();

  const [tokensResult, periodsResult] = await Promise.all([
    listMarketTokens(),
    listTradePeriods(),
  ]);

  const token = tokensResult.items.find((t) => t.symbol === upperSymbol);
  if (!token) notFound();

  let userId = PREVIEW_USER_ID;
  if (getOptionalServerEnv()) {
    // In live mode, get user from Supabase — import inline to avoid polluting
    // the server component's dependency graph with cookie-writing code
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const client = await createSupabaseServerClient();
    const { data: { user } } = await client.auth.getUser();
    if (user) userId = user.id;
  }

  const [balance, activeTrades, initialCandles] = await Promise.all([
    getBalance(userId),
    listActiveTrades(userId),
    listCandles({ symbol: upperSymbol, tf: "1m", limit: 200 }),
  ]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <TradeShell
        token={token}
        periods={periodsResult.items}
        initialBalance={balance}
        initialTrades={activeTrades.items}
        initialCandles={initialCandles}
      />
    </main>
  );
}
