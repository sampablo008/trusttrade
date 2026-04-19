export type DepositStatus = "pending" | "approved" | "rejected";
export type DepositNetwork = "TRC20" | "ERC20" | "BEP20" | "BTC";

export interface Deposit {
  id: string;
  userId: string;
  tokenId: string;
  tokenSymbol: string;
  network: DepositNetwork;
  amountCents: number;
  proofPath: string;
  txHash: string | null;
  status: DepositStatus;
  adminNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface SubmitDepositInput {
  tokenId: string;
  network: DepositNetwork;
  amountCents: number;
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
