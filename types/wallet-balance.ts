export interface TokenBalance {
  tokenId: string;
  symbol: string;
  name: string;
  iconPath: string | null;
  decimals: number;
  balance: number;
  lockedBalance: number;
  usdValueCents: number;
  freeUsdValueCents: number;
  usdPriceCents: number;
}

export interface WalletBalancesResult {
  withdrawableCents: number;
  tokens: TokenBalance[];
  totalUsdValueCents: number;
  totalFreeUsdValueCents: number;
}
