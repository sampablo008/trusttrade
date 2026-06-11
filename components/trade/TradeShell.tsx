"use client";

import { useCallback, useRef, useState } from "react";
import { Zap } from "lucide-react";
import { toast } from "sonner";
import ActivePositionsList from "@/components/trade/ActivePositionsList";
import MarketStatsBar from "@/components/trade/MarketStatsBar";
import MobileTradeDrawer from "@/components/trade/MobileTradeDrawer";
import OrderTicket from "@/components/trade/OrderTicket";
import StickyCountdownBanner from "@/components/trade/StickyCountdownBanner";
import LiveBinanceChart from "@/components/chart/LiveBinanceChart";
import OrderBookIllusion from "@/components/chart/OrderBookIllusion";
import RecentTradesIllusion from "@/components/chart/RecentTradesIllusion";
import { useBinanceTicker } from "@/hooks/useBinanceTicker";
import { useSettlementPoll } from "@/hooks/useSettlementPoll";
import { useUserStream } from "@/hooks/useUserStream";
import { useTradingShellStore } from "@/stores/trading-shell-store";
import { formatUsdFromCents } from "@/lib/utils/format";
import type { TopCoin } from "@/lib/markets/top-coins";
import type { PublicToken, PublicTradePeriod } from "@/types/market";
import type { UserBalance, UserTrade } from "@/types/trade";

interface TradeShellProps {
  coin: TopCoin;
  coins: TopCoin[];
  iconPaths: Record<string, string | null | undefined>;
  token: PublicToken;
  periods: PublicTradePeriod[];
  initialBalance: UserBalance;
  initialTrades: UserTrade[];
  tokenFreeBalance: number;
  tokenUsdPriceCents: number;
}

const profitCentsOf = (t: UserTrade) =>
  Math.round((t.stakeCents * t.payoutBps) / 10_000) - t.stakeCents;

export default function TradeShell({
  coin,
  coins,
  iconPaths,
  token,
  periods,
  initialBalance,
  initialTrades,
  tokenFreeBalance,
  tokenUsdPriceCents,
}: TradeShellProps) {
  const { setBalance, setActiveTrades } = useTradingShellStore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const notifiedRef = useRef<Set<string>>(new Set());

  const initialized = useTradingShellStore((s) => s.balance !== null);
  if (!initialized) {
    setBalance(initialBalance);
    setActiveTrades(initialTrades);
  }

  const handleSettlement = useCallback((trade: UserTrade) => {
    if (notifiedRef.current.has(trade.id)) return;
    notifiedRef.current.add(trade.id);

    const pair = `${trade.tokenSymbol} ${trade.direction === "long" ? "Long" : "Short"}`;
    const stake = formatUsdFromCents(trade.stakeCents);

    if (trade.outcome === "win") {
      toast.success("Trade Won", {
        description: `${pair} · +${formatUsdFromCents(profitCentsOf(trade))} profit`,
        id: trade.id,
      });
    } else if (trade.outcome === "void") {
      toast("Trade Voided", {
        description: `${pair} · Stake refunded ${stake}`,
        id: trade.id,
      });
    } else {
      toast.error("Trade Lost", {
        description: `${pair} · Stake ${stake}`,
        id: trade.id,
      });
    }
  }, []);

  useUserStream(handleSettlement);
  const pollSettlement = useSettlementPoll(handleSettlement);

  const ticker = useBinanceTicker(coin.binanceSymbol);
  const liveCents = ticker?.price != null && ticker.price > 0
    ? Math.round(ticker.price * 100)
    : token.priceCents;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <StickyCountdownBanner />

      <div className="shrink-0">
        <MarketStatsBar coin={coin} iconPath={token.iconPath} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row lg:items-stretch">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="h-72 flex-none overflow-hidden rounded-2xl border border-border bg-surface-soft sm:h-80 lg:h-auto lg:min-h-0 lg:flex-1">
            <LiveBinanceChart binanceSymbol={coin.binanceSymbol} />
          </div>

          <ActivePositionsList onTradeExpire={pollSettlement} />
        </div>

        <div className="hidden lg:flex lg:min-h-0 lg:w-64 lg:shrink-0 lg:flex-col lg:gap-3">
          {liveCents > 0 ? (
            <>
              <div className="shrink-0">
                <OrderBookIllusion lastPriceCents={liveCents} symbol={token.symbol} />
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                <RecentTradesIllusion lastPriceCents={liveCents} symbol={token.symbol} />
              </div>
            </>
          ) : null}
        </div>

        <div className="hidden w-full lg:block lg:w-88 lg:shrink-0 lg:min-h-0 lg:overflow-y-auto">
          <OrderTicket
            token={token}
            periods={periods}
            tokenFreeBalance={tokenFreeBalance}
            tokenUsdPriceCents={tokenUsdPriceCents}
            coins={coins}
            iconPaths={iconPaths}
          />
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
        tokenFreeBalance={tokenFreeBalance}
        tokenUsdPriceCents={tokenUsdPriceCents}
        coins={coins}
        iconPaths={iconPaths}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
