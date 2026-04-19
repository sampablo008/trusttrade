"use client";

import { useCallback, useState } from "react";
import ActivePositionsList from "@/components/trade/ActivePositionsList";
import BalanceHeader from "@/components/trade/BalanceHeader";
import MobileTradeDrawer from "@/components/trade/MobileTradeDrawer";
import OrderTicket from "@/components/trade/OrderTicket";
import SettlementToast from "@/components/trade/SettlementToast";
import StickyCountdownBanner from "@/components/trade/StickyCountdownBanner";
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
  const [drawerOpen, setDrawerOpen] = useState(false);

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
    <div className="flex h-full flex-col gap-4">
      {/* Sticky active-trade banner (mobile only, shown when trades are live) */}
      <StickyCountdownBanner />

      <div className="flex h-full flex-col gap-4 lg:flex-row">
        {/* Chart + positions */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {token.symbol}/USDT
              </h1>
              <p className="text-xs text-muted">{token.name}</p>
            </div>
            <BalanceHeader />
          </div>

          <div className="min-h-72 overflow-hidden rounded-[28px] border border-border bg-surface-soft sm:min-h-80 lg:min-h-120">
            <TradingChart
              symbol={token.symbol}
              initialCandles={initialCandles}
              activeTrades={activeTrades.filter((t) => t.tokenSymbol === token.symbol)}
            />
          </div>

          <ActivePositionsList />
        </div>

        {/* Order ticket — desktop sidebar */}
        <div className="hidden w-full lg:block lg:w-[320px] lg:shrink-0">
          <OrderTicket token={token} periods={periods} />
        </div>
      </div>

      {/* FAB — mobile only, opens order ticket drawer */}
      <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2 rounded-full bg-brand px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand/30 transition-transform active:scale-95"
        >
          <span className="text-base leading-none">⚡</span>
          Place Trade
        </button>
      </div>

      {/* Mobile bottom-sheet drawer */}
      <MobileTradeDrawer
        token={token}
        periods={periods}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      {/* Settlement toasts */}
      <div className="pointer-events-none fixed bottom-20 right-4 z-50 flex flex-col items-end gap-2 sm:bottom-6 sm:right-6">
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
