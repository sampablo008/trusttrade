"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, ImagePlus, Save, Wallet, X } from "lucide-react";
import { fetchJson } from "@/lib/api/client";
import { buildMediaUrl } from "@/lib/media/path";
import { TOP_COINS, type TopCoin } from "@/lib/markets/top-coins";
import { adminWalletAddressSchema, upsertAdminWalletAddressInputSchema } from "@/schemas/wallet";
import type { AdminToken, AdminTokensResult } from "@/types/market";
import type { AdminWalletAddress, AdminWalletAddressesResult } from "@/types/wallet";

interface TokenWalletPanelProps {
  initialData: AdminWalletAddressesResult;
  initialTokens: AdminTokensResult;
}

interface DraftState {
  address: string;
  network: string;
  qrCodePath: string | null;
  isEnabled: boolean;
}

function findWalletForCoin(
  wallets: AdminWalletAddress[],
  symbol: string,
): AdminWalletAddress | undefined {
  return wallets.find((w) => w.tokenSymbol === symbol);
}

function findTokenForCoin(tokens: AdminToken[], symbol: string): AdminToken | undefined {
  return tokens.find((t) => t.symbol === symbol);
}

type CoinStatus = "empty" | "enabled" | "disabled";

function resolveStatus(wallet: AdminWalletAddress | undefined): CoinStatus {
  if (!wallet) return "empty";
  return wallet.isEnabled ? "enabled" : "disabled";
}

const STATUS_META: Record<CoinStatus, { label: string; dot: string; chip: string }> = {
  empty: {
    chip: "border-white/15 bg-white/5 text-muted",
    dot: "bg-white/30",
    label: "Not set",
  },
  enabled: {
    chip: "border-emerald-400/50 bg-emerald-400/15 text-emerald-300",
    dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]",
    label: "Enabled",
  },
  disabled: {
    chip: "border-rose-400/50 bg-rose-400/15 text-rose-300",
    dot: "bg-rose-400",
    label: "Disabled",
  },
};

function CoinStatusChip({ status }: { status: CoinStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${meta.chip}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

export default function TokenWalletPanel({ initialData, initialTokens }: TokenWalletPanelProps) {
  "use no memo";

  const router = useRouter();
  const [wallets, setWallets] = useState(initialData.items);
  const [tokens, setTokens] = useState(initialData.items.length ? initialTokens.items : initialTokens.items);
  const [selectedSymbol, setSelectedSymbol] = useState<string>(TOP_COINS[0].symbol);

  const [draft, setDraft] = useState<DraftState>(() => {
    const existing = findWalletForCoin(initialData.items, TOP_COINS[0].symbol);
    return {
      address: existing?.address ?? "",
      network: existing?.network ?? TOP_COINS[0].symbol,
      qrCodePath: existing?.qrCodePath ?? null,
      isEnabled: existing?.isEnabled ?? true,
    };
  });

  const [qrPreviewUrl, setQrPreviewUrl] = useState<string | null>(() => {
    const existing = findWalletForCoin(initialData.items, TOP_COINS[0].symbol);
    return existing?.qrCodePath ? buildMediaUrl("token-icons", existing.qrCodePath) : null;
  });

  const [iconPreviewUrl, setIconPreviewUrl] = useState<string | null>(() => {
    const existing = findTokenForCoin(initialTokens.items, TOP_COINS[0].symbol);
    return existing?.iconPath ? buildMediaUrl("token-icons", existing.iconPath) : null;
  });

  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isUploadingQr, setIsUploadingQr] = useState(false);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);

  const selectedCoin = TOP_COINS.find((c) => c.symbol === selectedSymbol)!;
  const existingWallet = findWalletForCoin(wallets, selectedSymbol);

  const selectCoin = (coin: TopCoin) => {
    setSelectedSymbol(coin.symbol);
    setFeedback(null);
    setErrorMsg(null);
    const existing = findWalletForCoin(wallets, coin.symbol);
    setDraft({
      address: existing?.address ?? "",
      network: existing?.network ?? coin.symbol,
      qrCodePath: existing?.qrCodePath ?? null,
      isEnabled: existing?.isEnabled ?? true,
    });
    setQrPreviewUrl(
      existing?.qrCodePath ? buildMediaUrl("token-icons", existing.qrCodePath) : null,
    );
    const existingToken = findTokenForCoin(tokens, coin.symbol);
    setIconPreviewUrl(
      existingToken?.iconPath ? buildMediaUrl("token-icons", existingToken.iconPath) : null,
    );
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingQr(true);
    setErrorMsg(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("symbol", selectedSymbol);

      const res = await fetch("/api/upload/wallet-qr", { method: "POST", body: fd });
      const json = (await res.json()) as { path?: string; error?: { message?: string } };

      if (!res.ok || !json.path) {
        setErrorMsg(json.error?.message ?? "QR upload failed.");
        return;
      }

      setDraft((prev) => ({ ...prev, qrCodePath: json.path! }));
      setQrPreviewUrl(buildMediaUrl("token-icons", json.path!));
    } catch {
      setErrorMsg("QR upload failed.");
    } finally {
      setIsUploadingQr(false);
      e.target.value = "";
    }
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingIcon(true);
    setErrorMsg(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("symbol", selectedSymbol);

      const res = await fetch("/api/upload/token-icon", { method: "POST", body: fd });
      const json = (await res.json()) as { path?: string; error?: { message?: string } };

      if (!res.ok || !json.path) {
        setErrorMsg(json.error?.message ?? "Icon upload failed.");
        return;
      }

      setIconPreviewUrl(buildMediaUrl("token-icons", json.path!));
      setTokens((prev) =>
        prev.map((t) => (t.symbol === selectedSymbol ? { ...t, iconPath: json.path! } : t)),
      );
      setFeedback(`${selectedSymbol} icon updated.`);
      router.refresh();
    } catch {
      setErrorMsg("Icon upload failed.");
    } finally {
      setIsUploadingIcon(false);
      e.target.value = "";
    }
  };

  const handleSave = () => {
    setFeedback(null);
    setErrorMsg(null);

    const parsed = upsertAdminWalletAddressInputSchema.safeParse({
      address: draft.address,
      isEnabled: draft.isEnabled,
      memo: null,
      minDepositCents: 1000,
      network: draft.network,
      qrCodePath: draft.qrCodePath,
      tokenSymbol: selectedSymbol,
    });

    if (!parsed.success) {
      setErrorMsg(parsed.error.issues[0]?.message ?? "Invalid wallet data.");
      return;
    }

    startTransition(async () => {
      try {
        const isNew = !existingWallet;
        const result = await fetchJson(
          isNew ? "/api/admin/wallets" : `/api/admin/wallets/${existingWallet.id}`,
          adminWalletAddressSchema,
          {
            body: JSON.stringify(parsed.data),
            method: isNew ? "POST" : "PATCH",
          },
        );

        setWallets((prev) => {
          const without = prev.filter((w) => w.tokenSymbol !== selectedSymbol);
          return [...without, result];
        });
        setFeedback(`${selectedSymbol} wallet saved.`);
        router.refresh();
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Save failed.");
      }
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      {/* Left — coin list */}
      <section className="rounded-4xl border border-border bg-surface-soft p-6">
        <div className="border-b border-border pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
            Token registry
          </p>
          <h2 className="mt-2 font-display text-3xl text-foreground">Top 12 coins</h2>
        </div>

        <div className="mt-5 space-y-2">
          {TOP_COINS.map((coin) => {
            const wallet = findWalletForCoin(wallets, coin.symbol);
            const token = findTokenForCoin(tokens, coin.symbol);
            const isSelected = coin.symbol === selectedSymbol;
            const status = resolveStatus(wallet);

            return (
              <button
                key={coin.symbol}
                type="button"
                onClick={() => selectCoin(coin)}
                className={`flex w-full items-center justify-between rounded-[22px] border px-4 py-3.5 text-left transition ${
                  isSelected
                    ? "border-brand bg-brand-soft"
                    : "border-border bg-background/25 hover:border-brand/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  {token?.iconPath ? (
                    <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full">
                      <Image
                        src={buildMediaUrl("token-icons", token.iconPath)}
                        alt={coin.symbol}
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/15 text-[10px] font-bold text-brand">
                      {coin.symbol.slice(0, 2)}
                    </span>
                  )}
                  <div className="flex flex-col gap-1">
                    <p className="font-display text-lg text-foreground leading-none">
                      {coin.symbol}
                    </p>
                    <p className="text-xs text-muted">{coin.name}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <CoinStatusChip status={status} />
                      {wallet?.qrCodePath && (
                        <span className="rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand">
                          QR
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {wallet ? (
                    <p className="text-xs font-mono text-muted">
                      {wallet.address.slice(0, 8)}…
                    </p>
                  ) : (
                    <p className="text-xs text-muted/50">no address</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Right — editor */}
      <section className="rounded-4xl border border-border bg-surface-soft p-6">
        <div className="flex items-start justify-between border-b border-border pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Wallet editor
            </p>
            <h2 className="mt-2 font-display text-3xl text-foreground">
              {selectedCoin.name}
            </h2>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-soft px-3 py-2 text-xs uppercase tracking-[0.18em] text-brand">
            <Wallet size={13} />
            {selectedCoin.symbol}
          </div>
        </div>

        {errorMsg && (
          <div className="mt-5 rounded-[20px] border border-down/30 bg-down/10 px-4 py-3 text-sm text-down">
            {errorMsg}
          </div>
        )}
        {feedback && (
          <div className="mt-5 flex items-center gap-2 rounded-[20px] border border-up/30 bg-up/10 px-4 py-3 text-sm text-up">
            <Check size={14} />
            {feedback}
          </div>
        )}

        <div className="mt-6 space-y-5">
          {/* Token icon */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Token icon
            </label>
            <div className="flex items-start gap-4">
              {iconPreviewUrl ? (
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-border bg-white">
                  <Image
                    src={iconPreviewUrl}
                    alt={`${selectedSymbol} icon`}
                    fill
                    className="object-contain p-1.5"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIconPreviewUrl(null);
                      setTokens((prev) =>
                        prev.map((t) => (t.symbol === selectedSymbol ? { ...t, iconPath: null } : t)),
                      );
                    }}
                    className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
                    aria-label="Remove icon"
                  >
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-dashed border-border bg-background/20 text-muted">
                  <ImagePlus size={20} />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-full border border-border bg-background/30 px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-brand">
                  <ImagePlus size={15} />
                  {isUploadingIcon ? "Uploading…" : iconPreviewUrl ? "Replace icon" : "Upload icon"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleIconUpload}
                    disabled={isUploadingIcon}
                  />
                </label>
                <p className="text-xs text-muted">PNG, JPG, WebP — max 512 KB</p>
                <p className="text-xs text-muted">Shown in the trade switcher and deposit form.</p>
              </div>
            </div>
          </div>

          {/* Network */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Network / chain
            </label>
            <input
              value={draft.network}
              onChange={(e) => setDraft((p) => ({ ...p, network: e.target.value }))}
              placeholder={`e.g. ${selectedCoin.symbol}`}
              className="w-full rounded-[20px] border border-border bg-background/35 px-4 py-4 text-sm text-foreground outline-none transition focus:border-brand"
            />
          </div>

          {/* Wallet address */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Deposit address
            </label>
            <input
              value={draft.address}
              onChange={(e) => setDraft((p) => ({ ...p, address: e.target.value }))}
              placeholder="Paste wallet address…"
              className="w-full rounded-[20px] border border-border bg-background/35 px-4 py-4 font-mono text-sm text-foreground outline-none transition focus:border-brand"
            />
          </div>

          {/* QR code */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              QR code (optional)
            </label>
            <div className="flex items-start gap-4">
              {qrPreviewUrl ? (
                <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-border bg-white">
                  <Image
                    src={qrPreviewUrl}
                    alt={`${selectedSymbol} QR`}
                    fill
                    className="object-contain p-1"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setDraft((p) => ({ ...p, qrCodePath: null }));
                      setQrPreviewUrl(null);
                    }}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
                    aria-label="Remove QR"
                  >
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl border border-dashed border-border bg-background/20 text-muted">
                  <ImagePlus size={24} />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-full border border-border bg-background/30 px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-brand">
                  <ImagePlus size={15} />
                  {isUploadingQr ? "Uploading…" : qrPreviewUrl ? "Replace QR" : "Upload QR"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleQrUpload}
                    disabled={isUploadingQr}
                  />
                </label>
                <p className="text-xs text-muted">PNG, JPG, WebP — max 512 KB</p>
                <p className="text-xs text-muted">
                  Shown alongside the address during deposit.
                </p>
              </div>
            </div>
          </div>

          {/* Enabled toggle */}
          <label className="flex cursor-pointer items-center gap-3 rounded-[20px] border border-border bg-background/25 px-4 py-4 text-sm text-foreground">
            <input
              type="checkbox"
              checked={draft.isEnabled}
              onChange={(e) => setDraft((p) => ({ ...p, isEnabled: e.target.checked }))}
              className="accent-brand"
            />
            Enabled — visible to users during deposit
          </label>

          {/* Save */}
          <button
            type="button"
            disabled={isPending || isUploadingQr || isUploadingIcon || !draft.address}
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-4 text-sm font-semibold text-background transition hover:bg-brand disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={16} />
            {isPending ? "Saving…" : existingWallet ? "Save wallet" : "Add wallet"}
          </button>
        </div>
      </section>
    </div>
  );
}
