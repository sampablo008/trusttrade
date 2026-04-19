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
