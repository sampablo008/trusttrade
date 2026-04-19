export type WithdrawalStatus =
  | "pending"
  | "approved"
  | "paid"
  | "rejected"
  | "cancelled";

export type WithdrawalFlag =
  | "NEW_USER"
  | "LOW_TRADE_VOLUME"
  | "ADDRESS_REUSE"
  | "RAPID"
  | "POST_BONUS"
  | "FIRST_WITHDRAW";

export interface Withdrawal {
  id: string;
  userId: string;
  amountCents: number;
  feeCents: number;
  netAmountCents: number;
  tokenSymbol: string;
  network: string;
  destinationAddress: string;
  status: WithdrawalStatus;
  flags: WithdrawalFlag[];
  adminNote: string | null;
  payoutTxHash: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  paidBy: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface RequestWithdrawalInput {
  amountCents: number;
  tokenSymbol: string;
  network: string;
  destinationAddress: string;
}

export interface WithdrawalsResult {
  items: Withdrawal[];
  total: number;
}

export interface AdminWithdrawalsResult {
  items: Withdrawal[];
  total: number;
}

export interface AdminWithdrawalFilters {
  status?: WithdrawalStatus;
  userId?: string;
  limit?: number;
  offset?: number;
}
