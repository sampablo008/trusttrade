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
  userUsername: string | null;
  userEmail: string | null;
  tokenId: string | null;
  amount: number | null;
  feeAmount: number | null;
  netAmount: number | null;
  amountCents: number;
  usdValueCents: number | null;
  feeCents: number;
  netAmountCents: number;
  tokenSymbol: string;
  iconPath: string | null;
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
  tokenSymbol: string;
  network: string;
  amount: number;
  destinationAddress: string;
  withdrawalPin: string;
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
