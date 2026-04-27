export interface TopCoin {
  binanceSymbol: string;
  name: string;
  symbol: string;
}

export const TOP_COINS: TopCoin[] = [
  { symbol: "BTC",  name: "Bitcoin",   binanceSymbol: "btcusdt"  },
  { symbol: "ETH",  name: "Ethereum",  binanceSymbol: "ethusdt"  },
  { symbol: "BNB",  name: "BNB",       binanceSymbol: "bnbusdt"  },
  { symbol: "XRP",  name: "XRP",       binanceSymbol: "xrpusdt"  },
  { symbol: "SOL",  name: "Solana",    binanceSymbol: "solusdt"  },
  { symbol: "DOGE", name: "Dogecoin",  binanceSymbol: "dogeusdt" },
  { symbol: "ADA",  name: "Cardano",   binanceSymbol: "adausdt"  },
  { symbol: "AVAX", name: "Avalanche", binanceSymbol: "avaxusdt" },
  { symbol: "LINK", name: "Chainlink", binanceSymbol: "linkusdt" },
  { symbol: "TON",  name: "Toncoin",   binanceSymbol: "tonusdt"  },
  { symbol: "USDT", name: "Tether",    binanceSymbol: "usdcusdt" },
  { symbol: "USDC", name: "USD Coin",  binanceSymbol: "usdcusdt" },
];

export function findTopCoin(symbol: string): TopCoin | undefined {
  return TOP_COINS.find((c) => c.symbol === symbol.toUpperCase());
}
