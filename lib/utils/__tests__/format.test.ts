import { describe, expect, it } from "vitest";
import { bpsToMultiplierLabel, bpsToPercent } from "../money";
import { formatCompactUsd, formatSignedPercent, formatUsdFromCents } from "../format";

describe("formatUsdFromCents", () => {
  it("formats whole dollar amounts", () => {
    expect(formatUsdFromCents(10_000)).toBe("$100.00");
  });

  it("formats fractional cents", () => {
    expect(formatUsdFromCents(9_999)).toBe("$99.99");
  });

  it("formats zero", () => {
    expect(formatUsdFromCents(0)).toBe("$0.00");
  });

  it("formats large amounts", () => {
    expect(formatUsdFromCents(1_000_000)).toBe("$10,000.00");
  });

  it("formats large trading balances", () => {
    expect(formatUsdFromCents(8_445_234)).toBe("$84,452.34");
  });
});

describe("formatSignedPercent", () => {
  it("prefixes positive values with +", () => {
    expect(formatSignedPercent(5.5)).toBe("+5.50%");
  });

  it("does not double-prefix negative values", () => {
    expect(formatSignedPercent(-3.14)).toBe("-3.14%");
  });

  it("formats zero without sign", () => {
    expect(formatSignedPercent(0)).toBe("0.00%");
  });
});

describe("formatCompactUsd", () => {
  it("compacts thousands", () => {
    const result = formatCompactUsd(1_000_000);
    expect(result).toMatch(/\$10(\.\d)?K/i);
  });

  it("compacts millions", () => {
    const result = formatCompactUsd(100_000_000);
    expect(result).toMatch(/\$1(\.\d)?M/i);
  });
});

describe("bpsToPercent", () => {
  it("converts L1 commission rate", () => {
    expect(bpsToPercent(500)).toBe("5.00%");
  });

  it("converts L5 commission rate", () => {
    expect(bpsToPercent(50)).toBe("0.50%");
  });

  it("converts zero", () => {
    expect(bpsToPercent(0)).toBe("0.00%");
  });
});

describe("bpsToMultiplierLabel", () => {
  it("converts standard 85% payout to 1.85×", () => {
    expect(bpsToMultiplierLabel(18_500)).toBe("1.85×");
  });

  it("converts 100% (even money) payout", () => {
    expect(bpsToMultiplierLabel(20_000)).toBe("2.00×");
  });
});
