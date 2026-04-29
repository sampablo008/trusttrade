const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const compactUsdFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 1,
  notation: "compact",
  style: "currency",
});

export const formatUsdFromCents = (valueInCents: number) =>
  usdFormatter.format(valueInCents / 100);

export const formatSignedPercent = (value: number) =>
  `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;

export const formatCompactUsd = (value: number) => compactUsdFormatter.format(value / 100);

export const formatTokenAmount = (
  amount: number,
  symbol: string,
  decimals = 8,
): string => {
  const displayDecimals = Math.min(decimals, 8);
  const trimmed = Number(amount.toFixed(displayDecimals));
  return `${trimmed.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: displayDecimals,
  })} ${symbol}`;
};

// Cent-denominated values that semantically represent USDT amounts (since
// 1 USD-cent = 0.01 USDT). Used while the legacy *_cents columns are still
// in place but their meaning has shifted from USD to USDT.
export const formatUsdtFromCents = (valueInCents: number): string =>
  `${(valueInCents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} USDT`;
