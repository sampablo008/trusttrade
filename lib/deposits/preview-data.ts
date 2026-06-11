import { randomUUID } from "node:crypto";
import type {
  AdminDepositsResult,
  Deposit,
  DepositsResult,
} from "@/types/deposit";

const PREVIEW_USER_ID = "00000000-0000-4000-8000-0000000000a1";
const PREVIEW_TOKEN_ID = "00000000-0000-4000-8000-0000000000b1";

const now = new Date();

const makeDeposit = (overrides: Partial<Deposit> = {}): Deposit => ({
  id: randomUUID(),
  userId: PREVIEW_USER_ID,
  userUsername: "previewtrader",
  userEmail: "preview@trusttrade.pro",
  tokenId: PREVIEW_TOKEN_ID,
  tokenSymbol: "USDT",
  iconPath: null,
  network: "TRC20",
  amount: 500,
  amountCents: 0,
  usdValueCents: 500_00,
  proofPath: "deposit-proofs/preview/proof.webp",
  txHash: null,
  status: "pending",
  adminNote: null,
  reviewedBy: null,
  reviewedAt: null,
  createdAt: new Date(now.getTime() - 3600_000).toISOString(),
  ...overrides,
});

const previewDeposits: Deposit[] = [
  makeDeposit({
    id: "00000000-0000-4000-8000-000000000d01",
    status: "pending",
    amount: 500,
  }),
  makeDeposit({
    id: "00000000-0000-4000-8000-000000000d02",
    status: "approved",
    amount: 1000,
    amountCents: 100_000,
    txHash: "TX_PREVIEW_HASH_1",
    adminNote: "Verified on-chain",
    reviewedAt: new Date(now.getTime() - 1800_000).toISOString(),
    createdAt: new Date(now.getTime() - 7_200_000).toISOString(),
  }),
  makeDeposit({
    id: "00000000-0000-4000-8000-000000000d03",
    status: "rejected",
    amount: 250,
    adminNote: "Screenshot unclear — please re-upload",
    reviewedAt: new Date(now.getTime() - 3600_000).toISOString(),
    createdAt: new Date(now.getTime() - 10_800_000).toISOString(),
  }),
];

export const getPreviewDeposits = (): DepositsResult => ({
  items: previewDeposits,
  total: previewDeposits.length,
});

export const getPreviewAdminDeposits = (): AdminDepositsResult => ({
  items: previewDeposits,
  total: previewDeposits.length,
});

export const previewSubmitDeposit = (input: {
  tokenSymbol: string;
  network: string;
  amount: number;
  proofPath: string;
  txHash?: string;
}): Deposit => {
  const deposit = makeDeposit({
    id: randomUUID(),
    tokenSymbol: input.tokenSymbol.toUpperCase(),
    network: input.network,
    amount: input.amount,
    amountCents: 0,
    proofPath: input.proofPath,
    txHash: input.txHash ?? null,
    createdAt: new Date().toISOString(),
  });
  previewDeposits.unshift(deposit);
  return deposit;
};
