import { randomUUID } from "node:crypto";
import type {
  AdminWithdrawalsResult,
  Withdrawal,
  WithdrawalsResult,
} from "@/types/withdrawal";

const PREVIEW_USER_ID = "00000000-0000-4000-8000-0000000000a1";

const now = new Date();

const makeWithdrawal = (overrides: Partial<Withdrawal> = {}): Withdrawal => ({
  id: randomUUID(),
  userId: PREVIEW_USER_ID,
  amountCents: 10_000,
  feeCents: 0,
  netAmountCents: 10_000,
  tokenSymbol: "USDT",
  network: "TRC20",
  destinationAddress: "TPreviewAddress1234567890",
  status: "pending",
  flags: ["FIRST_WITHDRAW"],
  adminNote: null,
  payoutTxHash: null,
  reviewedBy: null,
  reviewedAt: null,
  paidBy: null,
  paidAt: null,
  createdAt: new Date(now.getTime() - 1800_000).toISOString(),
  ...overrides,
});

const previewWithdrawals: Withdrawal[] = [
  makeWithdrawal({
    id: "00000000-0000-4000-8000-000000000w01",
    status: "pending",
    amountCents: 10_000,
    flags: ["FIRST_WITHDRAW", "LOW_TRADE_VOLUME"],
  }),
  makeWithdrawal({
    id: "00000000-0000-4000-8000-000000000w02",
    status: "approved",
    amountCents: 25_000,
    flags: [],
    reviewedAt: new Date(now.getTime() - 900_000).toISOString(),
    createdAt: new Date(now.getTime() - 3600_000).toISOString(),
  }),
  makeWithdrawal({
    id: "00000000-0000-4000-8000-000000000w03",
    status: "paid",
    amountCents: 50_000,
    payoutTxHash: "TX_PREVIEW_PAYOUT_HASH",
    reviewedAt: new Date(now.getTime() - 7200_000).toISOString(),
    paidAt: new Date(now.getTime() - 3600_000).toISOString(),
    flags: [],
    createdAt: new Date(now.getTime() - 10_800_000).toISOString(),
  }),
];

export const getPreviewWithdrawals = (): WithdrawalsResult => ({
  items: previewWithdrawals,
  total: previewWithdrawals.length,
});

export const getPreviewAdminWithdrawals = (): AdminWithdrawalsResult => ({
  items: previewWithdrawals,
  total: previewWithdrawals.length,
});

export const previewRequestWithdrawal = (input: {
  amountCents: number;
  tokenSymbol: string;
  network: string;
  destinationAddress: string;
}): Withdrawal => {
  const w = makeWithdrawal({
    id: randomUUID(),
    amountCents: input.amountCents,
    netAmountCents: input.amountCents,
    tokenSymbol: input.tokenSymbol,
    network: input.network,
    destinationAddress: input.destinationAddress,
    flags: ["FIRST_WITHDRAW"],
    createdAt: new Date().toISOString(),
  });
  previewWithdrawals.unshift(w);
  return w;
};
