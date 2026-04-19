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
  tokenId: PREVIEW_TOKEN_ID,
  tokenSymbol: "USDT",
  network: "TRC20",
  amountCents: 50_000,
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
    amountCents: 50_000,
  }),
  makeDeposit({
    id: "00000000-0000-4000-8000-000000000d02",
    status: "approved",
    amountCents: 100_000,
    txHash: "TX_PREVIEW_HASH_1",
    adminNote: "Verified on-chain",
    reviewedAt: new Date(now.getTime() - 1800_000).toISOString(),
    createdAt: new Date(now.getTime() - 7_200_000).toISOString(),
  }),
  makeDeposit({
    id: "00000000-0000-4000-8000-000000000d03",
    status: "rejected",
    amountCents: 25_000,
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
  tokenId: string;
  network: string;
  amountCents: number;
  proofPath: string;
  txHash?: string;
}): Deposit => {
  const deposit = makeDeposit({
    id: randomUUID(),
    tokenId: input.tokenId,
    network: input.network as Deposit["network"],
    amountCents: input.amountCents,
    proofPath: input.proofPath,
    txHash: input.txHash ?? null,
    createdAt: new Date().toISOString(),
  });
  previewDeposits.unshift(deposit);
  return deposit;
};
