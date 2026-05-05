export type DepositStatus = "pending" | "approved" | "rejected";

export interface Deposit {
  id: string;
  userId: string;
  tokenId: string;
  tokenSymbol: string;
  network: string;
  amount: number | null;
  amountCents: number;
  usdValueCents: number | null;
  proofPath: string;
  txHash: string | null;
  status: DepositStatus;
  adminNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface SubmitDepositInput {
  tokenSymbol: string;
  network: string;
  amount: number;
  proofPath: string;
  txHash?: string;
}

export interface DepositsResult {
  items: Deposit[];
  total: number;
}

export interface AdminDepositsResult {
  items: Deposit[];
  total: number;
}

export interface AdminDepositFilters {
  status?: DepositStatus;
  userId?: string;
  limit?: number;
  offset?: number;
}
