import { randomUUID } from "node:crypto";
import { ApiClientError } from "@/lib/api/client";
import {
  adminWalletAddressSchema,
  adminWalletAddressesResultSchema,
  deleteAdminWalletAddressResultSchema,
  publicWalletAddressesResultSchema,
  upsertAdminWalletAddressInputSchema,
} from "@/schemas/wallet";
import type {
  AdminWalletAddress,
  AdminWalletAddressesResult,
  DeleteAdminWalletAddressResult,
  PublicWalletAddressesResult,
  UpsertAdminWalletAddressInput,
} from "@/types/wallet";

const parsePreviewWallet = (w: AdminWalletAddress): AdminWalletAddress =>
  adminWalletAddressSchema.parse(w);

const previewWalletRegistry = new Map<string, AdminWalletAddress>([
  [
    "USDT-TRC20",
    parsePreviewWallet({
      address: "TXdemoTrc20AddressForPreview123456",
      createdAt: "2026-04-19T12:00:00.000Z",
      id: "a0000000-0000-4000-8000-000000000001",
      isEnabled: true,
      memo: null,
      minDepositCents: 1000,
      network: "USDT-TRC20",
      tokenSymbol: "USDT",
      updatedAt: "2026-04-19T12:00:00.000Z",
    }),
  ],
  [
    "USDT-ERC20",
    parsePreviewWallet({
      address: "0xDemoErc20AddressForPreview1234567890ab",
      createdAt: "2026-04-19T12:00:00.000Z",
      id: "a0000000-0000-4000-8000-000000000002",
      isEnabled: true,
      memo: null,
      minDepositCents: 1000,
      network: "USDT-ERC20",
      tokenSymbol: "USDT",
      updatedAt: "2026-04-19T12:00:00.000Z",
    }),
  ],
  [
    "BTC",
    parsePreviewWallet({
      address: "bc1qDemoBtcAddressForPreviewTrustPro",
      createdAt: "2026-04-19T12:00:00.000Z",
      id: "a0000000-0000-4000-8000-000000000003",
      isEnabled: true,
      memo: null,
      minDepositCents: 5000,
      network: "BTC",
      tokenSymbol: "BTC",
      updatedAt: "2026-04-19T12:00:00.000Z",
    }),
  ],
]);

export const listPreviewAdminWallets = (): AdminWalletAddressesResult =>
  adminWalletAddressesResultSchema.parse({
    items: Array.from(previewWalletRegistry.values()).sort((a, b) =>
      a.network.localeCompare(b.network),
    ),
  });

export const createPreviewAdminWallet = (
  payload: UpsertAdminWalletAddressInput,
): AdminWalletAddress => {
  const input = upsertAdminWalletAddressInputSchema.parse(payload);
  const key = `${input.tokenSymbol}-${input.network}`;

  if (previewWalletRegistry.has(key)) {
    throw new ApiClientError(
      "A wallet for this token + network already exists.",
      409,
      "WALLET_DUPLICATE",
    );
  }

  const now = new Date().toISOString();
  const wallet = parsePreviewWallet({
    address: input.address,
    createdAt: now,
    id: randomUUID(),
    isEnabled: input.isEnabled,
    memo: input.memo,
    minDepositCents: input.minDepositCents,
    network: input.network,
    qrCodePath: input.qrCodePath ?? null,
    tokenSymbol: input.tokenSymbol,
    updatedAt: now,
  });

  previewWalletRegistry.set(key, wallet);

  return wallet;
};

export const updatePreviewAdminWallet = (
  id: string,
  payload: UpsertAdminWalletAddressInput,
): AdminWalletAddress => {
  const input = upsertAdminWalletAddressInputSchema.parse(payload);
  const existing = Array.from(previewWalletRegistry.values()).find((w) => w.id === id);

  if (!existing) {
    throw new ApiClientError("Wallet address not found.", 404, "WALLET_NOT_FOUND");
  }

  const oldKey = `${existing.tokenSymbol}-${existing.network}`;
  const newKey = `${input.tokenSymbol}-${input.network}`;

  if (oldKey !== newKey && previewWalletRegistry.has(newKey)) {
    throw new ApiClientError(
      "A wallet for this token + network already exists.",
      409,
      "WALLET_DUPLICATE",
    );
  }

  previewWalletRegistry.delete(oldKey);

  const wallet = parsePreviewWallet({
    ...existing,
    address: input.address,
    isEnabled: input.isEnabled,
    memo: input.memo,
    minDepositCents: input.minDepositCents,
    network: input.network,
    qrCodePath: input.qrCodePath ?? null,
    tokenSymbol: input.tokenSymbol,
    updatedAt: new Date().toISOString(),
  });

  previewWalletRegistry.set(newKey, wallet);

  return wallet;
};

export const deletePreviewAdminWallet = (id: string): DeleteAdminWalletAddressResult => {
  const existing = Array.from(previewWalletRegistry.values()).find((w) => w.id === id);

  if (!existing) {
    throw new ApiClientError("Wallet address not found.", 404, "WALLET_NOT_FOUND");
  }

  previewWalletRegistry.delete(`${existing.tokenSymbol}-${existing.network}`);

  return deleteAdminWalletAddressResultSchema.parse({ id });
};

export const getPreviewPublicWallets = (): PublicWalletAddressesResult =>
  publicWalletAddressesResultSchema.parse({
    items: Array.from(previewWalletRegistry.values())
      .filter((w) => w.isEnabled)
      .map((w) => ({
        address: w.address,
        id: w.id,
        memo: w.memo,
        minDepositCents: w.minDepositCents,
        network: w.network,
        tokenSymbol: w.tokenSymbol,
      })),
  });
