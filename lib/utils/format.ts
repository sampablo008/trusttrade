const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export const formatUsdFromCents = (valueInCents: number) =>
  usdFormatter.format(valueInCents / 100);

export const formatSignedPercent = (value: number) =>
  `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
