export interface PrimaryAddress {
  tokenId: string;
  tokenSymbol: string;
  network: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

export interface PrimaryAddressesResult {
  items: PrimaryAddress[];
}

export interface SetPrimaryAddressInput {
  tokenSymbol: string;
  network: string;
  address: string;
  withdrawalPin: string;
}

export interface RemovePrimaryAddressInput {
  tokenSymbol: string;
  network: string;
  withdrawalPin: string;
}
