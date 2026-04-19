export interface AdminWalletAddress {
  address: string;
  createdAt: string;
  id: string;
  isEnabled: boolean;
  memo: string | null;
  minDepositCents: number;
  network: string;
  tokenSymbol: string;
  updatedAt: string;
}

export interface AdminWalletAddressesResult {
  items: AdminWalletAddress[];
}

export interface UpsertAdminWalletAddressInput {
  address: string;
  isEnabled: boolean;
  memo: string | null;
  minDepositCents: number;
  network: string;
  tokenSymbol: string;
}

export interface DeleteAdminWalletAddressResult {
  id: string;
}

export interface PublicWalletAddress {
  address: string;
  id: string;
  memo: string | null;
  minDepositCents: number;
  network: string;
  tokenSymbol: string;
}

export interface PublicWalletAddressesResult {
  items: PublicWalletAddress[];
}
