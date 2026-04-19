import { create } from "zustand";
import type { QueueView, TimeframeValue, TokenSymbol, TradeDirection } from "@/types/platform";

interface TradingShellState {
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
}

export const useTradingShellStore = create<TradingShellState>((set) => ({
  activeDirection: "long",
  activeStakeCents: 25000,
  activeTimeframe: "1m",
  queueView: "urgent",
  selectedToken: "BTC",
  setActiveDirection: (activeDirection) => set({ activeDirection }),
  setActiveStakeCents: (activeStakeCents) => set({ activeStakeCents }),
  setActiveTimeframe: (activeTimeframe) => set({ activeTimeframe }),
  setQueueView: (queueView) => set({ queueView }),
  setSelectedToken: (selectedToken) => set({ selectedToken }),
}));
