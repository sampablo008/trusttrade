"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PencilLine, Plus, Save, ShieldAlert, Trash2, Wallet } from "lucide-react";
import { fetchJson } from "@/lib/api/client";
import {
  adminWalletAddressSchema,
  deleteAdminWalletAddressResultSchema,
  upsertAdminWalletAddressInputSchema,
} from "@/schemas/wallet";
import type { AdminWalletAddress, AdminWalletAddressesResult } from "@/types/wallet";
import { formatUsdFromCents } from "@/lib/utils/format";

interface WalletControlPanelProps {
  initialData: AdminWalletAddressesResult;
}

interface WalletFormState {
  address: string;
  confirmLast8: string;
  isEnabled: boolean;
  memo: string;
  minDepositCents: string;
  network: string;
  tokenSymbol: string;
}

const createEmptyDraft = (): WalletFormState => ({
  address: "",
  confirmLast8: "",
  isEnabled: true,
  memo: "",
  minDepositCents: "1000",
  network: "USDT-TRC20",
  tokenSymbol: "USDT",
});

const mapWalletToDraft = (wallet: AdminWalletAddress): WalletFormState => ({
  address: wallet.address,
  confirmLast8: "",
  isEnabled: wallet.isEnabled,
  memo: wallet.memo ?? "",
  minDepositCents: String(wallet.minDepositCents),
  network: wallet.network,
  tokenSymbol: wallet.tokenSymbol,
});

export default function WalletControlPanel({ initialData }: WalletControlPanelProps) {
  "use no memo";

  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(initialData.items[0]?.id ?? null);
  const [draft, setDraft] = useState<WalletFormState>(
    initialData.items[0] ? mapWalletToDraft(initialData.items[0]) : createEmptyDraft(),
  );
  const [isCreatingNew, setIsCreatingNew] = useState(initialData.items.length === 0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedWallet = initialData.items.find((w) => w.id === selectedId) ?? null;
  const title = isCreatingNew
    ? "Add deposit wallet"
    : selectedWallet
      ? `Edit ${selectedWallet.network}`
      : "Add deposit wallet";

  const updateDraft = <K extends keyof WalletFormState>(key: K, value: WalletFormState[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleSelectWallet = (wallet: AdminWalletAddress) => {
    setSelectedId(wallet.id);
    setIsCreatingNew(false);
    setDraft(mapWalletToDraft(wallet));
    setFeedback(null);
    setErrorMessage(null);
  };

  const handleCreateNew = () => {
    setSelectedId(null);
    setIsCreatingNew(true);
    setDraft(createEmptyDraft());
    setFeedback(null);
    setErrorMessage(null);
  };

  const validateAddressConfirm = (): boolean => {
    if (isCreatingNew) return true;
    const last8 = draft.address.slice(-8);
    return draft.confirmLast8 === last8;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    setErrorMessage(null);

    if (!isCreatingNew && !validateAddressConfirm()) {
      setErrorMessage("Last 8 characters of address do not match. Re-type to confirm.");
      return;
    }

    const parsed = upsertAdminWalletAddressInputSchema.safeParse({
      address: draft.address,
      isEnabled: draft.isEnabled,
      memo: draft.memo || null,
      minDepositCents: draft.minDepositCents,
      network: draft.network,
      tokenSymbol: draft.tokenSymbol,
    });

    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "Wallet form is invalid.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await fetchJson(
          isCreatingNew ? "/api/admin/wallets" : `/api/admin/wallets/${selectedId}`,
          adminWalletAddressSchema,
          {
            body: JSON.stringify(parsed.data),
            method: isCreatingNew ? "POST" : "PATCH",
          },
        );

        setFeedback(
          isCreatingNew
            ? `Created wallet for ${result.network}.`
            : `Saved wallet for ${result.network}.`,
        );
        setSelectedId(result.id);
        setIsCreatingNew(false);
        setDraft((prev) => ({ ...prev, confirmLast8: "" }));
        router.refresh();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Wallet save failed.");
      }
    });
  };

  const handleDelete = () => {
    if (!selectedId || isCreatingNew) return;

    setFeedback(null);
    setErrorMessage(null);

    if (!validateAddressConfirm()) {
      setErrorMessage("Re-type last 8 characters of address before deleting.");
      return;
    }

    startTransition(async () => {
      try {
        await fetchJson(`/api/admin/wallets/${selectedId}`, deleteAdminWalletAddressResultSchema, {
          method: "DELETE",
        });

        setFeedback("Wallet deleted.");
        setSelectedId(null);
        setIsCreatingNew(true);
        setDraft(createEmptyDraft());
        router.refresh();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Wallet delete failed.");
      }
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
      <section className="rounded-[32px] border border-border bg-surface-soft p-6">
        <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Wallet registry
            </p>
            <h2 className="mt-2 font-display text-3xl text-foreground">Deposit addresses</h2>
          </div>

          <button
            type="button"
            onClick={handleCreateNew}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-4 py-3 text-sm font-semibold text-background transition hover:bg-brand"
          >
            <Plus size={15} />
            New wallet
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {initialData.items.map((wallet) => {
            const isSelected = !isCreatingNew && wallet.id === selectedId;

            return (
              <button
                key={wallet.id}
                type="button"
                onClick={() => handleSelectWallet(wallet)}
                className={`flex w-full items-center justify-between rounded-[24px] border px-4 py-4 text-left transition ${
                  isSelected
                    ? "border-brand bg-brand-soft"
                    : "border-border bg-background/25 hover:border-brand/40"
                }`}
              >
                <div>
                  <div className="flex items-center gap-3">
                    <p className="font-display text-xl text-foreground">{wallet.network}</p>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                        wallet.isEnabled ? "bg-up/10 text-up" : "bg-down/10 text-down"
                      }`}
                    >
                      {wallet.isEnabled ? "active" : "off"}
                    </span>
                  </div>
                  <p className="mt-1.5 font-mono text-xs text-muted">
                    {wallet.address.slice(0, 12)}…{wallet.address.slice(-8)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    min
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    {formatUsdFromCents(wallet.minDepositCents)}
                  </p>
                </div>
              </button>
            );
          })}

          {!initialData.items.length && (
            <div className="rounded-[24px] border border-dashed border-border bg-background/20 px-5 py-8 text-sm leading-7 text-muted">
              No deposit wallets yet. Add the first address from the editor.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[32px] border border-border bg-surface-soft p-6">
        <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Wallet editor
            </p>
            <h2 className="mt-2 font-display text-3xl text-foreground">{title}</h2>
          </div>

          {!isCreatingNew && selectedWallet ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-soft px-3 py-2 text-xs uppercase tracking-[0.18em] text-brand">
              <PencilLine size={14} />
              {selectedWallet.network}
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full border border-up/30 bg-up/10 px-3 py-2 text-xs uppercase tracking-[0.18em] text-up">
              <Wallet size={14} />
              Fresh draft
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="mt-5 rounded-[20px] border border-down/30 bg-down/10 px-4 py-3 text-sm text-down">
            {errorMessage}
          </div>
        )}

        {feedback && (
          <div className="mt-5 rounded-[20px] border border-up/30 bg-up/10 px-4 py-3 text-sm text-up">
            {feedback}
          </div>
        )}

        <form className="mt-6 grid gap-5 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Token symbol
            </label>
            <input
              value={draft.tokenSymbol}
              onChange={(e) => updateDraft("tokenSymbol", e.target.value)}
              placeholder="USDT"
              className="w-full rounded-[20px] border border-border bg-background/35 px-4 py-4 text-sm text-foreground outline-none transition focus:border-brand"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Network
            </label>
            <input
              value={draft.network}
              onChange={(e) => updateDraft("network", e.target.value)}
              placeholder="USDT-TRC20"
              className="w-full rounded-[20px] border border-border bg-background/35 px-4 py-4 text-sm text-foreground outline-none transition focus:border-brand"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Deposit address
            </label>
            <input
              value={draft.address}
              onChange={(e) => updateDraft("address", e.target.value)}
              placeholder="Wallet address"
              className="w-full rounded-[20px] border border-border bg-background/35 px-4 py-4 font-mono text-sm text-foreground outline-none transition focus:border-brand"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Memo / tag (optional)
            </label>
            <input
              value={draft.memo}
              onChange={(e) => updateDraft("memo", e.target.value)}
              placeholder="e.g. 12345678"
              className="w-full rounded-[20px] border border-border bg-background/35 px-4 py-4 text-sm text-foreground outline-none transition focus:border-brand"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Min deposit cents
            </label>
            <input
              inputMode="numeric"
              value={draft.minDepositCents}
              onChange={(e) => updateDraft("minDepositCents", e.target.value)}
              className="w-full rounded-[20px] border border-border bg-background/35 px-4 py-4 text-sm text-foreground outline-none transition focus:border-brand"
            />
          </div>

          {!isCreatingNew && (
            <div className="space-y-2 md:col-span-2">
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-amber-400">
                <ShieldAlert size={13} />
                Confirm change — re-type last 8 chars of address
              </label>
              <input
                value={draft.confirmLast8}
                onChange={(e) => updateDraft("confirmLast8", e.target.value)}
                placeholder={
                  draft.address.length >= 8
                    ? `…${draft.address.slice(-8)}`
                    : "Enter address first"
                }
                className="w-full rounded-[20px] border border-amber-400/40 bg-background/35 px-4 py-4 font-mono text-sm text-foreground outline-none transition focus:border-amber-400"
              />
            </div>
          )}

          <label className="md:col-span-2 flex items-center gap-3 rounded-[20px] border border-border bg-background/25 px-4 py-4 text-sm text-foreground">
            <input
              type="checkbox"
              checked={draft.isEnabled}
              onChange={(e) => updateDraft("isEnabled", e.target.checked)}
            />
            Enabled (visible to depositors)
          </label>

          <div className="md:col-span-2 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-5 py-4 text-sm font-semibold text-background transition hover:bg-brand disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={16} />
              {isPending ? "Saving..." : isCreatingNew ? "Add wallet" : "Save wallet"}
            </button>

            {!isCreatingNew && (
              <button
                type="button"
                disabled={isPending}
                onClick={handleDelete}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-down/30 bg-down/10 px-5 py-4 text-sm font-semibold text-down transition hover:border-down disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 size={16} />
                Delete wallet
              </button>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
