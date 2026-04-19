import { create } from "zustand";
import type { QueueView, TimeframeValue, TokenSymbol, TradeDirection } from "@/types/platform";
import type { UserBalance, UserTrade } from "@/types/trade";

interface TradingShellState {
  // Order ticket
  activeDirection: TradeDirection;
  activeStakeCents: number;
  activeTimeframe: TimeframeValue;
  queueView: QueueView;
  selectedToken: TokenSymbol;
  setActiveDirection: (direction: TradeDirection) => void;
  setActiveStakeCents: (amount: number) => void;
  setActiveTimeframe: (timeframe: TimeframeValue) => void;
  setQueueView: (view: QueueView) => void;
  setSelectedToken: (token: TokenSymbol) => void;

  // Live state
  activeTrades: UserTrade[];
  balance: UserBalance | null;
  streamConnected: boolean;
  upsertTrade: (trade: UserTrade) => void;
  removeTrade: (tradeId: string) => void;
  setActiveTrades: (trades: UserTrade[]) => void;
  setBalance: (balance: UserBalance) => void;
  setStreamConnected: (connected: boolean) => void;

  // Selected period for order ticket
  selectedPeriodId: string | null;
  setSelectedPeriodId: (id: string | null) => void;
}

export const useTradingShellStore = create<TradingShellState>((set) => ({
  activeDirection: "long",
  activeStakeCents: 25_000,
  activeTimeframe: "1m",
  queueView: "urgent",
  selectedToken: "BTC",
  setActiveDirection: (activeDirection) => set({ activeDirection }),
  setActiveStakeCents: (activeStakeCents) => set({ activeStakeCents }),
  setActiveTimeframe: (activeTimeframe) => set({ activeTimeframe }),
  setQueueView: (queueView) => set({ queueView }),
  setSelectedToken: (selectedToken) => set({ selectedToken }),

  activeTrades: [],
  balance: null,
  streamConnected: false,
  upsertTrade: (trade) =>
    set((state) => {
      const existing = state.activeTrades.findIndex((t) => t.id === trade.id);
      if (existing >= 0) {
        const updated = [...state.activeTrades];
        updated[existing] = trade;
        return { activeTrades: updated };
      }
      if (trade.status === "active") {
        return { activeTrades: [...state.activeTrades, trade] };
      }
      return {};
    }),
  removeTrade: (tradeId) =>
    set((state) => ({
      activeTrades: state.activeTrades.filter((t) => t.id !== tradeId),
    })),
  setActiveTrades: (activeTrades) => set({ activeTrades }),
  setBalance: (balance) => set({ balance }),
  setStreamConnected: (streamConnected) => set({ streamConnected }),

  selectedPeriodId: null,
  setSelectedPeriodId: (selectedPeriodId) => set({ selectedPeriodId }),
}));
