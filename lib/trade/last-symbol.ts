import { findTopCoin } from "@/lib/markets/top-coins";

const STORAGE_KEY = "trustpro:lastTradeSymbol";

export function saveLastTradeSymbol(symbol: string) {
  if (typeof window === "undefined") return;
  const upper = symbol.toUpperCase();
  if (upper === "USDT" || upper === "USDC") return;
  if (!findTopCoin(upper)) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, upper);
  } catch {}
}

export function loadLastTradeSymbol(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const upper = stored.toUpperCase();
    if (upper === "USDT" || upper === "USDC") return null;
    return findTopCoin(upper) ? upper : null;
  } catch {
    return null;
  }
}
