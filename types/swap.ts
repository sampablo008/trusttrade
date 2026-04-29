export interface SwapQuote {
  fromSymbol: string;
  toSymbol: string;
  fromAmount: number;
  feeAmount: number;
  feeBps: number;
  netAmount: number;
  toAmount: number;
  fromUsdPriceCents: number;
  toUsdPriceCents: number;
  rate: number;
}

export interface SwapRecord {
  id: string;
  userId: string;
  fromSymbol: string;
  toSymbol: string;
  fromTokenId: string | null;
  toTokenId: string | null;
  fromAmount: number;
  toAmount: number;
  feeAmount: number;
  feeBpsApplied: number;
  fromPriceUsdCents: number;
  toPriceUsdCents: number;
  createdAt: string;
}

export interface SwapsResult {
  items: SwapRecord[];
}

export interface ExecuteSwapInput {
  fromSymbol: string;
  toSymbol: string;
  fromAmount: number;
}
