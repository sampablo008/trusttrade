/**
 * Pure, side-effect-free money math used by UI components and services.
 * All amounts in integer cents. No floats stored.
 */

/** Total payout = stake × (payoutBps / 10_000). Floored to whole cents. */
export const calcTotalPayout = (stakeCents: number, payoutBps: number): number =>
  Math.floor((stakeCents * payoutBps) / 10_000);

/** Profit on a winning trade = totalPayout − stake. */
export const calcProfit = (stakeCents: number, payoutBps: number): number =>
  calcTotalPayout(stakeCents, payoutBps) - stakeCents;

/** Balance available to withdraw = total − locked_in_trades − locked_bonus. */
export const calcWithdrawable = (
  balanceCents: number,
  lockedInTradesCents: number,
  lockedBonusCents: number,
): number => Math.max(0, balanceCents - lockedInTradesCents - lockedBonusCents);

/** Wager threshold for a bonus ticket = bonusCents × multiplier, rounded. */
export const calcWagerRequired = (bonusCents: number, multiplier: number): number =>
  Math.round(bonusCents * multiplier);

/** Commission cents from a deposit = Math.floor(depositCents × bps / 10_000). */
export const calcCommission = (depositCents: number, bps: number): number =>
  Math.floor((depositCents * bps) / 10_000);

/** Convert basis points to a human-readable percentage string (500 → "5.00%"). */
export const bpsToPercent = (bps: number): string => `${(bps / 100).toFixed(2)}%`;

/** Payout multiplier as a ×-prefixed string (18500 → "1.85×"). */
export const bpsToMultiplierLabel = (payoutBps: number): string =>
  `${(payoutBps / 10_000).toFixed(2)}×`;
