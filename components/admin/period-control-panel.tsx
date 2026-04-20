"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock3, PencilLine, Plus, Save, Trash2 } from "lucide-react";
import { fetchJson } from "@/lib/api/client";
import {
  adminTradePeriodSchema,
  deleteAdminTradePeriodResultSchema,
  upsertAdminTradePeriodInputSchema,
} from "@/schemas/market";
import type { AdminTradePeriod, AdminTradePeriodsResult } from "@/types/market";
import { formatUsdFromCents } from "@/lib/utils/format";

interface PeriodControlPanelProps {
  initialData: AdminTradePeriodsResult;
}

interface PeriodFormState {
  durationSeconds: string;
  isEnabled: boolean;
  label: string;
  maxAmountDollars: string;
  minAmountDollars: string;
  payoutPercent: string;
}

const formatPercentFromBps = (bps: number) => {
  const percent = bps / 100;
  return Number.isInteger(percent) ? String(percent) : percent.toFixed(2);
};

const formatDollarsFromCents = (cents: number) => {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? String(dollars) : dollars.toFixed(2);
};

const createEmptyDraft = (): PeriodFormState => ({
  durationSeconds: "60",
  isEnabled: true,
  label: "",
  maxAmountDollars: "1000",
  minAmountDollars: "10",
  payoutPercent: "185",
});

const mapPeriodToDraft = (period: AdminTradePeriod): PeriodFormState => ({
  durationSeconds: String(period.durationSeconds),
  isEnabled: period.isEnabled,
  label: period.label,
  maxAmountDollars: formatDollarsFromCents(period.maxAmountCents),
  minAmountDollars: formatDollarsFromCents(period.minAmountCents),
  payoutPercent: formatPercentFromBps(period.payoutBps),
});

const formatDuration = (seconds: number) => {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  if (seconds < 3600) {
    return `${Math.round(seconds / 60)}m`;
  }

  if (seconds < 86400) {
    return `${Math.round(seconds / 3600)}h`;
  }

  return `${Math.round(seconds / 86400)}d`;
};

export default function PeriodControlPanel({ initialData }: PeriodControlPanelProps) {
  "use no memo";

  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(initialData.items[0]?.id ?? null);
  const [draft, setDraft] = useState<PeriodFormState>(
    initialData.items[0] ? mapPeriodToDraft(initialData.items[0]) : createEmptyDraft(),
  );
  const [isCreatingNew, setIsCreatingNew] = useState(initialData.items.length === 0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedPeriod = initialData.items.find((item) => item.id === selectedId) ?? null;
  const title = isCreatingNew
    ? "Create trade period"
    : selectedPeriod
      ? `Edit ${selectedPeriod.label}`
      : "Create trade period";

  const updateDraft = <K extends keyof PeriodFormState>(key: K, value: PeriodFormState[K]) => {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSelectPeriod = (period: AdminTradePeriod) => {
    setSelectedId(period.id);
    setIsCreatingNew(false);
    setDraft(mapPeriodToDraft(period));
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

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    setErrorMessage(null);

    const percentValue = Number(draft.payoutPercent);
    if (!Number.isFinite(percentValue) || percentValue <= 0) {
      setErrorMessage("Payout percent must be a positive number.");
      return;
    }

    const minDollars = Number(draft.minAmountDollars);
    const maxDollars = Number(draft.maxAmountDollars);
    if (!Number.isFinite(minDollars) || minDollars <= 0) {
      setErrorMessage("Min amount must be a positive number.");
      return;
    }
    if (!Number.isFinite(maxDollars) || maxDollars <= 0) {
      setErrorMessage("Max amount must be a positive number.");
      return;
    }

    const parsed = upsertAdminTradePeriodInputSchema.safeParse({
      durationSeconds: draft.durationSeconds,
      isEnabled: draft.isEnabled,
      label: draft.label,
      maxAmountCents: Math.round(maxDollars * 100),
      minAmountCents: Math.round(minDollars * 100),
      payoutBps: Math.round(percentValue * 100),
    });

    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "Trade period form is invalid.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await fetchJson(
          isCreatingNew ? "/api/admin/periods" : `/api/admin/periods/${selectedId}`,
          adminTradePeriodSchema,
          {
            body: JSON.stringify(parsed.data),
            method: isCreatingNew ? "POST" : "PATCH",
          },
        );

        setFeedback(isCreatingNew ? `Created ${result.label}.` : `Saved ${result.label}.`);
        setSelectedId(result.id);
        setIsCreatingNew(false);
        router.refresh();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Trade period save failed.");
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
          `/api/admin/periods/${selectedId}`,
          deleteAdminTradePeriodResultSchema,
          {
            method: "DELETE",
          },
        );

        setFeedback("Trade period deleted.");
        setSelectedId(null);
        setIsCreatingNew(true);
        setDraft(createEmptyDraft());
        router.refresh();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Trade period delete failed.");
      }
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
      <section className="rounded-[32px] border border-border bg-surface-soft p-6">
        <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Period registry
            </p>
            <h2 className="mt-2 font-display text-3xl text-foreground">Trade durations</h2>
          </div>

          <button
            type="button"
            onClick={handleCreateNew}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-4 py-3 text-sm font-semibold text-background transition hover:bg-brand"
          >
            <Plus size={15} />
            New period
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {initialData.items.map((period) => {
            const isSelected = !isCreatingNew && period.id === selectedId;

            return (
              <button
                key={period.id}
                type="button"
                onClick={() => handleSelectPeriod(period)}
                className={`flex w-full items-center justify-between rounded-[24px] border px-4 py-4 text-left transition ${
                  isSelected
                    ? "border-brand bg-brand-soft"
                    : "border-border bg-background/25 hover:border-brand/40"
                }`}
              >
                <div>
                  <div className="flex items-center gap-3">
                    <p className="font-display text-2xl text-foreground">{period.label}</p>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                        period.isEnabled ? "bg-up/10 text-up" : "bg-down/10 text-down"
                      }`}
                    >
                      {period.isEnabled ? "enabled" : "disabled"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    {formatUsdFromCents(period.minAmountCents)} → {formatUsdFromCents(period.maxAmountCents)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">{formatDuration(period.durationSeconds)}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted">
                    payout {period.payoutBps / 100}%
                  </p>
                </div>
              </button>
            );
          })}

          {!initialData.items.length ? (
            <div className="rounded-[24px] border border-dashed border-border bg-background/20 px-5 py-8 text-sm leading-7 text-muted">
              No trade periods yet. Create the first duration from the editor.
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-[32px] border border-border bg-surface-soft p-6">
        <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Period editor
            </p>
            <h2 className="mt-2 font-display text-3xl text-foreground">{title}</h2>
          </div>

          {!isCreatingNew && selectedPeriod ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-soft px-3 py-2 text-xs uppercase tracking-[0.18em] text-brand">
              <PencilLine size={14} />
              {selectedPeriod.label}
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full border border-up/30 bg-up/10 px-3 py-2 text-xs uppercase tracking-[0.18em] text-up">
              <Clock3 size={14} />
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
              Label
            </label>
            <input
              value={draft.label}
              onChange={(event) => updateDraft("label", event.target.value)}
              className="w-full rounded-[20px] border border-border bg-background/35 px-4 py-4 text-sm text-foreground outline-none transition focus:border-brand"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Duration seconds
            </label>
            <input
              inputMode="numeric"
              value={draft.durationSeconds}
              onChange={(event) => updateDraft("durationSeconds", event.target.value)}
              className="w-full rounded-[20px] border border-border bg-background/35 px-4 py-4 text-sm text-foreground outline-none transition focus:border-brand"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Min amount ($)
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted">
                $
              </span>
              <input
                inputMode="decimal"
                value={draft.minAmountDollars}
                onChange={(event) => updateDraft("minAmountDollars", event.target.value)}
                className="w-full rounded-[20px] border border-border bg-background/35 px-4 py-4 pl-8 text-sm text-foreground outline-none transition focus:border-brand"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Max amount ($)
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted">
                $
              </span>
              <input
                inputMode="decimal"
                value={draft.maxAmountDollars}
                onChange={(event) => updateDraft("maxAmountDollars", event.target.value)}
                className="w-full rounded-[20px] border border-border bg-background/35 px-4 py-4 pl-8 text-sm text-foreground outline-none transition focus:border-brand"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Payout %
            </label>
            <div className="relative">
              <input
                inputMode="decimal"
                value={draft.payoutPercent}
                onChange={(event) => updateDraft("payoutPercent", event.target.value)}
                className="w-full rounded-[20px] border border-border bg-background/35 px-4 py-4 pr-10 text-sm text-foreground outline-none transition focus:border-brand"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">
                %
              </span>
            </div>
            <p className="text-xs text-muted">
              Total return on stake. 185% means a $100 stake pays $185.
            </p>
          </div>

          <label className="md:col-span-2 flex items-center gap-3 rounded-[20px] border border-border bg-background/25 px-4 py-4 text-sm text-foreground">
            <input
              type="checkbox"
              checked={draft.isEnabled}
              onChange={(event) => updateDraft("isEnabled", event.target.checked)}
            />
            Enabled for public period reads
          </label>

          <div className="md:col-span-2 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-5 py-4 text-sm font-semibold text-background transition hover:bg-brand disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={16} />
              {isPending ? "Saving..." : isCreatingNew ? "Create period" : "Save period"}
            </button>

            {!isCreatingNew ? (
              <button
                type="button"
                disabled={isPending}
                onClick={handleDelete}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-down/30 bg-down/10 px-5 py-4 text-sm font-semibold text-down transition hover:border-down disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 size={16} />
                Delete period
              </button>
            ) : null}
          </div>
        </form>
      </section>
    </div>
  );
}
