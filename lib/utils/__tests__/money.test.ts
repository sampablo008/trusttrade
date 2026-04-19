import { describe, expect, it } from "vitest";
import {
  bpsToMultiplierLabel,
  bpsToPercent,
  calcCommission,
  calcProfit,
  calcTotalPayout,
  calcWagerRequired,
  calcWithdrawable,
} from "../money";

describe("calcTotalPayout", () => {
  it("returns stake × 1.85 for standard 85% payout", () => {
    // 18_500 bps = 1.85×; $100 stake → $185 payout
    expect(calcTotalPayout(10_000, 18_500)).toBe(18_500);
  });

  it("floors fractional cents", () => {
    // $1 stake × 1.85× = $1.85 → floors to 185 cents
    expect(calcTotalPayout(100, 18_500)).toBe(185);
  });

  it("returns stake for 1× payout (void refund scenario)", () => {
    expect(calcTotalPayout(5_000, 10_000)).toBe(5_000);
  });

  it("handles zero stake", () => {
    expect(calcTotalPayout(0, 18_500)).toBe(0);
  });
});

describe("calcProfit", () => {
  it("is positive on a standard win", () => {
    // $100 stake, 85% profit → $85 profit
    expect(calcProfit(10_000, 18_500)).toBe(8_500);
  });

  it("is zero on breakeven (1×)", () => {
    expect(calcProfit(10_000, 10_000)).toBe(0);
  });

  it("is negative if payout_bps < 10_000 (sub-even)", () => {
    // 0.5× payout → user loses $50 on a $100 stake partial refund
    expect(calcProfit(10_000, 5_000)).toBe(-5_000);
  });
});

describe("calcWithdrawable", () => {
  it("subtracts locked amounts from balance", () => {
    expect(calcWithdrawable(100_000, 20_000, 10_000)).toBe(70_000);
  });

  it("floors at zero — never negative", () => {
    expect(calcWithdrawable(5_000, 3_000, 4_000)).toBe(0);
  });

  it("returns full balance when nothing is locked", () => {
    expect(calcWithdrawable(50_000, 0, 0)).toBe(50_000);
  });

  it("treats zero balance as zero withdrawable", () => {
    expect(calcWithdrawable(0, 0, 0)).toBe(0);
  });
});

describe("calcWagerRequired", () => {
  it("uses 3× default multiplier for $25 bonus → $75 wager", () => {
    expect(calcWagerRequired(2_500, 3)).toBe(7_500);
  });

  it("rounds to whole cents", () => {
    // $10 bonus × 3.333 → 3333 cents
    expect(calcWagerRequired(1_000, 3.333)).toBe(3_333);
  });

  it("handles zero bonus", () => {
    expect(calcWagerRequired(0, 3)).toBe(0);
  });
});

describe("calcCommission", () => {
  it("calculates L1 5% commission on $500 deposit", () => {
    // 500 bps × $500 / 10_000 = $25
    expect(calcCommission(50_000, 500)).toBe(2_500);
  });

  it("calculates L2 3% on $500", () => {
    expect(calcCommission(50_000, 300)).toBe(1_500);
  });

  it("calculates L5 0.5% on $1_000 deposit", () => {
    // 50 bps × $1_000 / 10_000 = $5
    expect(calcCommission(100_000, 50)).toBe(500);
  });

  it("floors sub-cent commissions", () => {
    // $10 deposit × 500 bps = $0.50 = 50 cents
    expect(calcCommission(1_000, 500)).toBe(50);
  });

  it("returns zero for zero deposit", () => {
    expect(calcCommission(0, 500)).toBe(0);
  });
});

describe("bpsToPercent", () => {
  it("converts 500 bps → 5.00%", () => {
    expect(bpsToPercent(500)).toBe("5.00%");
  });
});

describe("bpsToMultiplierLabel", () => {
  it("converts 18_500 bps → 1.85×", () => {
    expect(bpsToMultiplierLabel(18_500)).toBe("1.85×");
  });
});
