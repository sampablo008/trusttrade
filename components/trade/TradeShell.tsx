"use client";

import { useCallback, useState } from "react";
import ActivePositionsList from "@/components/trade/ActivePositionsList";
import BalanceHeader from "@/components/trade/BalanceHeader";
import OrderTicket from "@/components/trade/OrderTicket";
import SettlementToast from "@/components/trade/SettlementToast";
import TradingChart from "@/components/chart/TradingChart";
import { useUserStream } from "@/hooks/useUserStream";
import { useTradingShellStore } from "@/stores/trading-shell-store";
import type { PublicCandlesResult, PublicToken, PublicTradePeriod } from "@/types/market";
import type { UserBalance, UserTrade } from "@/types/trade";

interface TradeShellProps {
  token: PublicToken;
  periods: PublicTradePeriod[];
  initialBalance: UserBalance;
  initialTrades: UserTrade[];
  initialCandles: PublicCandlesResult;
}

export default function TradeShell({
  token,
  periods,
  initialBalance,
  initialTrades,
  initialCandles,
}: TradeShellProps) {
  const { setBalance, setActiveTrades } = useTradingShellStore();
  const activeTrades = useTradingShellStore((s) => s.activeTrades);
  const [toasts, setToasts] = useState<UserTrade[]>([]);

  // Seed initial state from server props
  const initialized = useTradingShellStore((s) => s.balance !== null);
  if (!initialized) {
    setBalance(initialBalance);
    setActiveTrades(initialTrades);
  }

  const handleSettlement = useCallback((trade: UserTrade) => {
    setToasts((prev) => [...prev, trade]);
  }, []);

  useUserStream(handleSettlement);

  return (
    <div className="flex h-full flex-col gap-4 lg:flex-row">
      {/* Chart + positions */}
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              {token.symbol}/USDT
            </h1>
            <p className="text-xs text-muted">{token.name}</p>
          </div>
          <BalanceHeader />
        </div>

        <div className="min-h-90 overflow-hidden rounded-[28px] border border-border bg-surface-soft lg:min-h-120">
          <TradingChart
            symbol={token.symbol}
            initialCandles={initialCandles}
            activeTrades={activeTrades.filter((t) => t.tokenSymbol === token.symbol)}
          />
        </div>

        <ActivePositionsList />
      </div>

      {/* Order ticket */}
      <div className="w-full lg:w-[320px] lg:shrink-0">
        <OrderTicket token={token} periods={periods} />
      </div>

      {/* Settlement toasts */}
      <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {toasts.map((t) => (
          <SettlementToast
            key={t.id}
            trade={t}
            onDismiss={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
          />
        ))}
      </div>
    </div>
  );
}
