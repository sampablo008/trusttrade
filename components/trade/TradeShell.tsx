"use client";

import { useCallback, useState } from "react";
import { Zap } from "lucide-react";
import ActivePositionsList from "@/components/trade/ActivePositionsList";
import MarketStatsBar from "@/components/trade/MarketStatsBar";
import MobileTradeDrawer from "@/components/trade/MobileTradeDrawer";
import OrderTicket from "@/components/trade/OrderTicket";
import SettlementToast from "@/components/trade/SettlementToast";
import StickyCountdownBanner from "@/components/trade/StickyCountdownBanner";
import LiveBinanceChart from "@/components/chart/LiveBinanceChart";
import { useUserStream } from "@/hooks/useUserStream";
import { useTradingShellStore } from "@/stores/trading-shell-store";
import type { TopCoin } from "@/lib/markets/top-coins";
import type { PublicToken, PublicTradePeriod } from "@/types/market";
import type { UserBalance, UserTrade } from "@/types/trade";

interface TradeShellProps {
  coin: TopCoin;
  token: PublicToken;
  periods: PublicTradePeriod[];
  initialBalance: UserBalance;
  initialTrades: UserTrade[];
}

export default function TradeShell({
  coin,
  token,
  periods,
  initialBalance,
  initialTrades,
}: TradeShellProps) {
  const { setBalance, setActiveTrades } = useTradingShellStore();
  const [toasts, setToasts] = useState<UserTrade[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

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
      <StickyCountdownBanner />

      <MarketStatsBar coin={coin} iconPath={token.iconPath} />

      <div className="flex h-full flex-col gap-4 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="h-72 overflow-hidden rounded-[28px] border border-border bg-surface-soft sm:h-80 lg:h-128">
            <LiveBinanceChart binanceSymbol={coin.binanceSymbol} />
          </div>

          <ActivePositionsList />
        </div>

        <div className="hidden w-full lg:block lg:w-88 lg:shrink-0">
          <OrderTicket token={token} periods={periods} />
        </div>
      </div>

      <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2 rounded-full bg-brand px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand/30 transition-transform active:scale-95"
        >
          <Zap size={16} />
          Place Trade
        </button>
      </div>

      <MobileTradeDrawer
        token={token}
        periods={periods}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

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
