import { randomUUID } from "node:crypto";
import type { SwapQuote, SwapRecord, SwapsResult } from "@/types/swap";

const previewSwaps: SwapRecord[] = [];

export const previewQuoteSwap = (
  fromSymbol: string,
  toSymbol: string,
  fromAmount: number,
): SwapQuote => {
  const fromUsd = fromSymbol === "USD" ? 1 : fromSymbol === "BTC" ? 65_000 : fromSymbol === "ETH" ? 3_200 : 1;
  const toUsd = toSymbol === "USD" ? 1 : toSymbol === "BTC" ? 65_000 : toSymbol === "ETH" ? 3_200 : 1;
  const feeBps = 100;
  const feeAmount = Number((fromAmount * feeBps / 10_000).toFixed(8));
  const netAmount = fromAmount - feeAmount;
  const toAmount = Number((netAmount * fromUsd / toUsd).toFixed(8));
  return {
    fromSymbol,
    toSymbol,
    fromAmount,
    feeAmount,
    feeBps,
    netAmount,
    toAmount,
    fromUsdPriceCents: Math.round(fromUsd * 100),
    toUsdPriceCents: Math.round(toUsd * 100),
    rate: fromUsd / toUsd,
  };
};

export const previewExecuteSwap = (
  fromSymbol: string,
  toSymbol: string,
  fromAmount: number,
): SwapRecord => {
  const quote = previewQuoteSwap(fromSymbol, toSymbol, fromAmount);
  const record: SwapRecord = {
    id: randomUUID(),
    userId: "00000000-0000-4000-8000-0000000000a1",
    fromSymbol: quote.fromSymbol,
    toSymbol: quote.toSymbol,
    fromTokenId: null,
    toTokenId: null,
    fromAmount: quote.fromAmount,
    toAmount: quote.toAmount,
    feeAmount: quote.feeAmount,
    feeBpsApplied: quote.feeBps,
    fromPriceUsdCents: quote.fromUsdPriceCents,
    toPriceUsdCents: quote.toUsdPriceCents,
    createdAt: new Date().toISOString(),
  };
  previewSwaps.unshift(record);
  return record;
};

export const previewListSwaps = (): SwapsResult => ({
  items: previewSwaps,
});
