"use client";

import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTradingShellStore } from "@/stores/trading-shell-store";
import { userTradeSchema } from "@/schemas/trade";
import type { UserTrade } from "@/types/trade";

const POLL_INTERVAL_MS = 800;
const MAX_POLL_DURATION_MS = 20_000;

interface ApiTradeResponse {
  data?: unknown;
  error?: { code?: string; message?: string };
}

/**
 * Fallback for when Supabase Realtime doesn't deliver the settlement event
 * (publication not enabled, network drop, proxy buffering, etc.). When a
 * countdown expires locally, we poll the trade by id until it flips to
 * settled/cancelled, then fire the settlement handler so the toast shows
 * without the user needing to refresh.
 */
export const useSettlementPoll = (onSettlement?: (trade: UserTrade) => void) => {
  const queryClient = useQueryClient();
  const { removeTrade } = useTradingShellStore();
  const timersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const t of timers.values()) clearInterval(t);
      timers.clear();
    };
  }, []);

  return useCallback(
    (tradeId: string) => {
      const timers = timersRef.current;
      if (timers.has(tradeId)) return;

      const startedAt = Date.now();

      const tick = async () => {
        try {
          const res = await fetch(`/api/trades/${tradeId}`, { cache: "no-store" });
          if (!res.ok) return;
          const body = (await res.json()) as ApiTradeResponse;
          const parsed = userTradeSchema.safeParse(body.data);
          if (!parsed.success) return;
          const trade = parsed.data;

          if (trade.status === "settled" || trade.status === "cancelled") {
            clearTimer(timers, tradeId);
            removeTrade(tradeId);
            queryClient.invalidateQueries({ queryKey: ["trades"] });
            queryClient.invalidateQueries({ queryKey: ["trades", "settled"] });
            queryClient.invalidateQueries({ queryKey: ["balance"] });
            if (trade.status === "settled") onSettlement?.(trade);
          }
        } catch {
          // Network blip — next tick retries.
        }

        if (Date.now() - startedAt > MAX_POLL_DURATION_MS) {
          clearTimer(timers, tradeId);
        }
      };

      // Fire once immediately so UX feels snappy, then on interval.
      void tick();
      timers.set(tradeId, setInterval(tick, POLL_INTERVAL_MS));
    },
    [onSettlement, queryClient, removeTrade],
  );
};

function clearTimer(
  timers: Map<string, ReturnType<typeof setInterval>>,
  tradeId: string,
) {
  const t = timers.get(tradeId);
  if (t) {
    clearInterval(t);
    timers.delete(tradeId);
  }
}
