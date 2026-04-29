"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTradingShellStore } from "@/stores/trading-shell-store";
import type { UserBalance, UserTrade } from "@/types/trade";

interface SnapshotPayload {
  trades: { items: UserTrade[] };
  balance: UserBalance;
}

interface TradePayload {
  id: string;
  status?: string;
  outcome?: string | null;
  [key: string]: unknown;
}


const RECONNECT_BASE_MS = 3_000;
const RECONNECT_MAX_MS = 30_000;

export const useUserStream = (onSettlement?: (trade: UserTrade) => void) => {
  const queryClient = useQueryClient();
  const { setActiveTrades, setBalance, setStreamConnected, upsertTrade, removeTrade } =
    useTradingShellStore();
  const esRef = useRef<EventSource | null>(null);
  const reconnectDelay = useRef(RECONNECT_BASE_MS);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let stopped = false;

    const connect = () => {
      if (stopped) return;

      const es = new EventSource("/api/stream/user");
      esRef.current = es;

      es.addEventListener("hello", () => {
        setStreamConnected(true);
        reconnectDelay.current = RECONNECT_BASE_MS;
        // Invalidate any stale server state
        queryClient.invalidateQueries({ queryKey: ["trades"] });
        queryClient.invalidateQueries({ queryKey: ["balance"] });
      });

      es.addEventListener("snapshot", (e) => {
        try {
          const payload = JSON.parse(e.data) as SnapshotPayload;
          setActiveTrades(payload.trades.items);
          setBalance(payload.balance);
        } catch {
          // Malformed snapshot — ignore
        }
      });

      es.addEventListener("trade", (e) => {
        try {
          const payload = JSON.parse(e.data) as TradePayload;

          if (payload.status === "settled" || payload.status === "cancelled") {
            removeTrade(payload.id);
            queryClient.invalidateQueries({ queryKey: ["trades", "settled"] });
            if (payload.status === "settled" && onSettlement) {
              onSettlement(payload as unknown as UserTrade);
            }
          } else {
            upsertTrade(payload as unknown as UserTrade);
          }

          queryClient.invalidateQueries({ queryKey: ["trades"] });
        } catch {
          // Malformed trade event — ignore
        }
      });

      // A user_token_balances row mutated. We don't reconstruct UserBalance
      // from a single row — the synthetic UserBalance is derived from token
      // totals server-side. Invalidate the relevant queries so the next
      // fetch picks up the updated holdings.
      es.addEventListener("token-balance", () => {
        queryClient.invalidateQueries({ queryKey: ["balance"] });
        queryClient.invalidateQueries({ queryKey: ["wallet-balances"] });
      });

      es.onerror = () => {
        es.close();
        setStreamConnected(false);

        if (!stopped) {
          reconnectTimer.current = setTimeout(() => {
            reconnectDelay.current = Math.min(reconnectDelay.current * 2, RECONNECT_MAX_MS);
            connect();
          }, reconnectDelay.current);
        }
      };
    };

    connect();

    return () => {
      stopped = true;
      setStreamConnected(false);
      esRef.current?.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [queryClient, setActiveTrades, setBalance, setStreamConnected, upsertTrade, removeTrade, onSettlement]);
};
