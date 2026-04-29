import type { WalletBalancesResult } from "@/types/wallet-balance";

export const getPreviewWalletBalances = (): WalletBalancesResult => {
  const tokens = [
    {
      tokenId: "00000000-0000-4000-8000-0000000000b1",
      symbol: "BTC",
      name: "Bitcoin",
      iconPath: null,
      decimals: 8,
      balance: 0.025,
      lockedBalance: 0,
      usdPriceCents: 6_500_000,
      freeUsdValueCents: 162_500,
      usdValueCents: 162_500,
    },
    {
      tokenId: "00000000-0000-4000-8000-0000000000e1",
      symbol: "ETH",
      name: "Ethereum",
      iconPath: null,
      decimals: 18,
      balance: 0.4,
      lockedBalance: 0,
      usdPriceCents: 320_000,
      freeUsdValueCents: 128_000,
      usdValueCents: 128_000,
    },
    {
      tokenId: "00000000-0000-4000-8000-0000000000c1",
      symbol: "USDT",
      name: "Tether",
      iconPath: null,
      decimals: 6,
      balance: 250,
      lockedBalance: 0,
      usdPriceCents: 100,
      freeUsdValueCents: 25_000,
      usdValueCents: 25_000,
    },
  ];

  const totalUsdValueCents = tokens.reduce((sum, t) => sum + t.usdValueCents, 0);
  const totalFreeUsdValueCents = tokens.reduce((sum, t) => sum + t.freeUsdValueCents, 0);

  return {
    withdrawableCents: totalFreeUsdValueCents,
    tokens,
    totalUsdValueCents,
    totalFreeUsdValueCents,
  };
};
