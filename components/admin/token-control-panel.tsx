"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Activity, ImagePlus, PencilLine, Plus, Save, Trash2 } from "lucide-react";
import { ApiClientError, createApiEnvelopeSchema, fetchJson } from "@/lib/api/client";
import { buildMediaUrl } from "@/lib/media/path";
import {
  adminTokenSchema,
  deleteAdminTokenResultSchema,
  upsertAdminTokenInputSchema,
} from "@/schemas/market";
import { tokenIconUploadResultSchema } from "@/schemas/media";
import type { AdminToken, AdminTokensResult, TokenFeedSource } from "@/types/market";

interface TokenControlPanelProps {
  initialData: AdminTokensResult;
}

interface TokenFormState {
  basePriceCents: string;
  feedSource: TokenFeedSource;
  iconPath: string;
  isEnabled: boolean;
  name: string;
  priceOffsetCents: string;
  priceScale: string;
  shadowSymbol: string;
  symbol: string;
  volatilityFactor: string;
  decimals: string;
  minDeposit: string;
  swapFeeBps: string;
  coingeckoId: string;
  minWithdrawal: string;
  withdrawFeeBps: string;
}

const feedSourceOptions: TokenFeedSource[] = ["shadow", "synthetic", "replay", "frozen"];

const createEmptyDraft = (): TokenFormState => ({
  basePriceCents: "100000",
  feedSource: "shadow",
  iconPath: "",
  isEnabled: true,
  name: "",
  priceOffsetCents: "0",
  priceScale: "1",
  shadowSymbol: "",
  symbol: "",
  volatilityFactor: "1",
  decimals: "8",
  minDeposit: "0",
  swapFeeBps: "100",
  coingeckoId: "",
  minWithdrawal: "0",
  withdrawFeeBps: "0",
});

const mapTokenToDraft = (token: AdminToken): TokenFormState => ({
  basePriceCents: String(token.basePriceCents),
  feedSource: token.feedSource,
  iconPath: token.iconPath ?? "",
  isEnabled: token.isEnabled,
  name: token.name,
  priceOffsetCents: String(token.priceOffsetCents),
  priceScale: String(token.priceScale),
  shadowSymbol: token.shadowSymbol ?? "",
  symbol: token.symbol,
  volatilityFactor: String(token.volatilityFactor),
  decimals: String(token.decimals),
  minDeposit: String(token.minDeposit),
  swapFeeBps: String(token.swapFeeBps),
  coingeckoId: token.coingeckoId ?? "",
  minWithdrawal: String(token.minWithdrawal),
  withdrawFeeBps: String(token.withdrawFeeBps),
});

const statusClasses = {
  disabled: "bg-down/10 text-down",
  enabled: "bg-up/10 text-up",
} as const;

const uploadTokenIcon = async (file: File, symbol: string) => {
  const formData = new FormData();

  formData.set("file", file);
  formData.set("symbol", symbol);

  const response = await fetch("/api/admin/upload/token-icon", {
    body: formData,
    method: "POST",
  });
  const payload = await response
    .json()
    .catch(() => ({ error: { code: "INVALID_JSON", message: "Response was not valid JSON." } }));
  const envelope = createApiEnvelopeSchema(tokenIconUploadResultSchema).parse(payload);

  if (!response.ok || envelope.error) {
    const error = envelope.error ?? {
      code: "TOKEN_ICON_UPLOAD_FAILED",
      message: "Token icon upload failed.",
      details: payload,
    };

    throw new ApiClientError(error.message, response.status, error.code, error.details);
  }

  if (!envelope.data) {
    throw new ApiClientError("Response did not include an upload payload.", response.status);
  }

  return envelope.data;
};

export default function TokenControlPanel({ initialData }: TokenControlPanelProps) {
  "use no memo";

  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(initialData.items[0]?.id ?? null);
  const [draft, setDraft] = useState<TokenFormState>(
    initialData.items[0] ? mapTokenToDraft(initialData.items[0]) : createEmptyDraft(),
  );
  const [isCreatingNew, setIsCreatingNew] = useState(initialData.items.length === 0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isUploadingIcon, startUploadTransition] = useTransition();

  const selectedToken = initialData.items.find((item) => item.id === selectedId) ?? null;
  const title = isCreatingNew
    ? "Create token"
    : selectedToken
      ? `Edit ${selectedToken.symbol}`
      : "Create token";
  const iconPreviewUrl = draft.iconPath ? buildMediaUrl("token-icons", draft.iconPath) : null;

  const updateDraft = <K extends keyof TokenFormState>(key: K, value: TokenFormState[K]) => {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSelectToken = (token: AdminToken) => {
    setSelectedId(token.id);
    setIsCreatingNew(false);
    setDraft(mapTokenToDraft(token));
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

  const handleIconUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setFeedback(null);
    setErrorMessage(null);

    startUploadTransition(async () => {
      try {
        const result = await uploadTokenIcon(file, draft.symbol.trim().toUpperCase());

        setDraft((current) => ({
          ...current,
          iconPath: result.path,
        }));
        setFeedback("Token icon uploaded.");
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Token icon upload failed.");
      }
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    setErrorMessage(null);

    const parsed = upsertAdminTokenInputSchema.safeParse({
      basePriceCents: draft.basePriceCents,
      feedSource: draft.feedSource,
      iconPath: draft.iconPath.trim() || null,
      isEnabled: draft.isEnabled,
      name: draft.name,
      priceOffsetCents: draft.priceOffsetCents,
      priceScale: draft.priceScale,
      shadowSymbol: draft.shadowSymbol.trim() || null,
      symbol: draft.symbol,
      volatilityFactor: draft.volatilityFactor,
      decimals: draft.decimals,
      minDeposit: draft.minDeposit,
      swapFeeBps: draft.swapFeeBps,
      coingeckoId: draft.coingeckoId.trim() || null,
      minWithdrawal: draft.minWithdrawal,
      withdrawFeeBps: draft.withdrawFeeBps,
    });

    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "Token form is invalid.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await fetchJson(
          isCreatingNew ? "/api/admin/tokens" : `/api/admin/tokens/${selectedId}`,
          adminTokenSchema,
          {
            body: JSON.stringify(parsed.data),
            method: isCreatingNew ? "POST" : "PATCH",
          },
        );

        setFeedback(isCreatingNew ? `Created ${result.symbol}.` : `Saved ${result.symbol}.`);
        setSelectedId(result.id);
        setIsCreatingNew(false);
        router.refresh();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Token save failed.");
      }
    });
  };

  const handleDelete = () => {
    if (!selectedId || isCreatingNew) {
      return;
    }

    setFeedback(null);
    setErrorMessage(null);

    startTransition(async () => {
      try {
        await fetchJson(
          `/api/admin/tokens/${selectedId}`,
          deleteAdminTokenResultSchema,
          {
            method: "DELETE",
          },
        );

        setFeedback("Token deleted.");
        setSelectedId(null);
        setIsCreatingNew(true);
        setDraft(createEmptyDraft());
        router.refresh();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Token delete failed.");
      }
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
      <section className="rounded-[32px] border border-border bg-surface-soft p-6">
        <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Token registry
            </p>
            <h2 className="mt-2 font-display text-3xl text-foreground">Enabled and staged pairs</h2>
          </div>

          <button
            type="button"
            onClick={handleCreateNew}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-4 py-3 text-sm font-semibold text-background transition hover:bg-brand"
          >
            <Plus size={15} />
            New token
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {initialData.items.map((token) => {
            const isSelected = !isCreatingNew && token.id === selectedId;

            return (
              <button
                key={token.id}
                type="button"
                onClick={() => handleSelectToken(token)}
                className={`flex w-full items-center justify-between rounded-[24px] border px-4 py-4 text-left transition ${
                  isSelected
                    ? "border-brand bg-brand-soft"
                    : "border-border bg-background/25 hover:border-brand/40"
                }`}
              >
                <div>
                  <div className="flex items-center gap-3">
                    <p className="font-display text-2xl text-foreground">{token.symbol}</p>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                        token.isEnabled ? statusClasses.enabled : statusClasses.disabled
                      }`}
                    >
                      {token.isEnabled ? "enabled" : "disabled"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted">{token.name}</p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">{token.feedSource}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted">
                    scale {token.priceScale.toFixed(4)}
                  </p>
                </div>
              </button>
            );
          })}

          {!initialData.items.length ? (
            <div className="rounded-[24px] border border-dashed border-border bg-background/20 px-5 py-8 text-sm leading-7 text-muted">
              No tokens yet. Create the first tradable pair from the editor.
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-[32px] border border-border bg-surface-soft p-6">
        <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Token editor
            </p>
            <h2 className="mt-2 font-display text-3xl text-foreground">{title}</h2>
          </div>

          {!isCreatingNew && selectedToken ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-soft px-3 py-2 text-xs uppercase tracking-[0.18em] text-brand">
              <PencilLine size={14} />
              {selectedToken.symbol}
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full border border-up/30 bg-up/10 px-3 py-2 text-xs uppercase tracking-[0.18em] text-up">
              <Activity size={14} />
              Fresh draft
            </div>
          )}
        </div>

        {errorMessage ? (
          <div className="mt-5 rounded-[20px] border border-down/30 bg-down/10 px-4 py-3 text-sm text-down">
            {errorMessage}
          </div>
        ) : null}

        {feedback ? (
          <div className="mt-5 rounded-[20px] border border-up/30 bg-up/10 px-4 py-3 text-sm text-up">
            {feedback}
          </div>
        ) : null}

        <form className="mt-6 grid gap-5 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Symbol
            </label>
            <input
              value={draft.symbol}
              onChange={(event) => updateDraft("symbol", event.target.value.toUpperCase())}
              className="w-full rounded-[20px] border border-border bg-background/35 px-4 py-4 text-sm text-foreground outline-none transition focus:border-brand"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Name
            </label>
            <input
              value={draft.name}
              onChange={(event) => updateDraft("name", event.target.value)}
              className="w-full rounded-[20px] border border-border bg-background/35 px-4 py-4 text-sm text-foreground outline-none transition focus:border-brand"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Base price cents
            </label>
            <input
              inputMode="numeric"
              value={draft.basePriceCents}
              onChange={(event) => updateDraft("basePriceCents", event.target.value)}
              className="w-full rounded-[20px] border border-border bg-background/35 px-4 py-4 text-sm text-foreground outline-none transition focus:border-brand"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Volatility factor
            </label>
            <input
              inputMode="decimal"
              value={draft.volatilityFactor}
              onChange={(event) => updateDraft("volatilityFactor", event.target.value)}
              className="w-full rounded-[20px] border border-border bg-background/35 px-4 py-4 text-sm text-foreground outline-none transition focus:border-brand"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Feed source
            </label>
            <select
              value={draft.feedSource}
              onChange={(event) => updateDraft("feedSource", event.target.value as TokenFeedSource)}
              className="w-full rounded-[20px] border border-border bg-background/35 px-4 py-4 text-sm text-foreground outline-none transition focus:border-brand"
            >
              {feedSourceOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Shadow symbol
            </label>
            <input
              value={draft.shadowSymbol}
              onChange={(event) => updateDraft("shadowSymbol", event.target.value.toUpperCase())}
              className="w-full rounded-[20px] border border-border bg-background/35 px-4 py-4 text-sm text-foreground outline-none transition focus:border-brand"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Scale
            </label>
            <input
              inputMode="decimal"
              value={draft.priceScale}
              onChange={(event) => updateDraft("priceScale", event.target.value)}
              className="w-full rounded-[20px] border border-border bg-background/35 px-4 py-4 text-sm text-foreground outline-none transition focus:border-brand"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Offset cents
            </label>
            <input
              inputMode="numeric"
              value={draft.priceOffsetCents}
              onChange={(event) => updateDraft("priceOffsetCents", event.target.value)}
              className="w-full rounded-[20px] border border-border bg-background/35 px-4 py-4 text-sm text-foreground outline-none transition focus:border-brand"
            />
          </div>

          <div className="grid gap-4 md:col-span-2 xl:grid-cols-[1fr_220px]">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                Icon path
              </label>
              <input
                value={draft.iconPath}
                onChange={(event) => updateDraft("iconPath", event.target.value)}
                placeholder="btc/asset.webp"
                className="w-full rounded-[20px] border border-border bg-background/35 px-4 py-4 text-sm text-foreground outline-none transition focus:border-brand"
              />
              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-brand/30 bg-brand-soft px-4 py-3 text-sm font-semibold text-brand transition hover:border-brand">
                  <ImagePlus size={16} />
                  {isUploadingIcon ? "Uploading..." : "Upload icon"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleIconUpload}
                    disabled={isPending || isUploadingIcon}
                    className="sr-only"
                  />
                </label>
                <p className="text-xs uppercase tracking-[0.18em] text-muted">
                  PNG, JPG, or WebP. Max 512 KB. SVG disabled.
                </p>
              </div>
            </div>

            <div className="rounded-[24px] border border-border bg-background/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                Icon preview
              </p>
              <div className="mt-4 flex min-h-[148px] items-center justify-center rounded-[20px] border border-dashed border-border bg-background/35 p-4">
                {iconPreviewUrl ? (
                  <Image
                    src={iconPreviewUrl}
                    alt={`${draft.symbol || draft.name || "Token"} icon`}
                    className="h-20 w-20 rounded-[20px] object-contain"
                    height={80}
                    unoptimized
                    width={80}
                  />
                ) : (
                  <p className="max-w-[10rem] text-center text-xs uppercase tracking-[0.18em] text-muted">
                    Upload an icon or paste a token path.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Decimals
            </label>
            <input
              inputMode="numeric"
              value={draft.decimals}
              onChange={(event) => updateDraft("decimals", event.target.value)}
              className="w-full rounded-[20px] border border-border bg-background/35 px-4 py-4 text-sm text-foreground outline-none transition focus:border-brand"
            />
            <p className="text-[11px] text-muted">Native unit precision (BTC=8, ETH=18, USDT=6).</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Min deposit (native units)
            </label>
            <input
              inputMode="decimal"
              value={draft.minDeposit}
              onChange={(event) => updateDraft("minDeposit", event.target.value)}
              className="w-full rounded-[20px] border border-border bg-background/35 px-4 py-4 text-sm text-foreground outline-none transition focus:border-brand"
            />
            <p className="text-[11px] text-muted">Smallest accepted user deposit, in this token&apos;s units.</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Swap fee (bps)
            </label>
            <input
              inputMode="numeric"
              value={draft.swapFeeBps}
              onChange={(event) => updateDraft("swapFeeBps", event.target.value)}
              className="w-full rounded-[20px] border border-border bg-background/35 px-4 py-4 text-sm text-foreground outline-none transition focus:border-brand"
            />
            <p className="text-[11px] text-muted">Charged when this token is the FROM side. 100 bps = 1%.</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              CoinGecko id
            </label>
            <input
              value={draft.coingeckoId}
              onChange={(event) => updateDraft("coingeckoId", event.target.value.toLowerCase())}
              placeholder="bitcoin"
              className="w-full rounded-[20px] border border-border bg-background/35 px-4 py-4 text-sm text-foreground outline-none transition focus:border-brand"
            />
            <p className="text-[11px] text-muted">Used to fetch live USD price for deposits and swaps.</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Min withdrawal (native units)
            </label>
            <input
              inputMode="decimal"
              value={draft.minWithdrawal}
              onChange={(event) => updateDraft("minWithdrawal", event.target.value)}
              className="w-full rounded-[20px] border border-border bg-background/35 px-4 py-4 text-sm text-foreground outline-none transition focus:border-brand"
            />
            <p className="text-[11px] text-muted">Smallest accepted withdrawal, in this token&apos;s units.</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Withdraw fee (bps)
            </label>
            <input
              inputMode="numeric"
              value={draft.withdrawFeeBps}
              onChange={(event) => updateDraft("withdrawFeeBps", event.target.value)}
              className="w-full rounded-[20px] border border-border bg-background/35 px-4 py-4 text-sm text-foreground outline-none transition focus:border-brand"
            />
            <p className="text-[11px] text-muted">Charged on the withdrawal amount. 100 bps = 1%.</p>
          </div>

          <label className="md:col-span-2 flex items-center gap-3 rounded-[20px] border border-border bg-background/25 px-4 py-4 text-sm text-foreground">
            <input
              type="checkbox"
              checked={draft.isEnabled}
              onChange={(event) => updateDraft("isEnabled", event.target.checked)}
            />
            Enabled for public token reads
          </label>

          <div className="md:col-span-2 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-5 py-4 text-sm font-semibold text-background transition hover:bg-brand disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={16} />
              {isPending ? "Saving..." : isCreatingNew ? "Create token" : "Save token"}
            </button>

            {!isCreatingNew ? (
              <button
                type="button"
                disabled={isPending}
                onClick={handleDelete}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-down/30 bg-down/10 px-5 py-4 text-sm font-semibold text-down transition hover:border-down disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 size={16} />
                Delete token
              </button>
            ) : null}
          </div>
        </form>
      </section>
    </div>
  );
}
