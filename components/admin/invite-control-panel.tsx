"use client";

import { useDeferredValue, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  KeyRound,
  Link2Off,
  Search,
  ShieldCheck,
  TicketPlus,
} from "lucide-react";
import { fetchJson } from "@/lib/api/client";
import {
  mintInviteCodesInputSchema,
  mintInviteCodesResultSchema,
  revokeInviteCodeResultSchema,
} from "@/schemas/invites";
import type { AdminInviteCodesResult, MintInviteCodesResult } from "@/types/invites";

type AdminInviteTab = "all" | "mint";

interface InviteControlPanelProps {
  initialData: AdminInviteCodesResult;
}

const statusClasses = {
  active: "bg-up/10 text-up",
  expired: "bg-warning/10 text-warning",
  revoked: "bg-down/10 text-down",
  used: "bg-brand-soft text-brand",
} as const;

const summaryCards = [
  {
    key: "totalCount",
    label: "Total codes",
  },
  {
    key: "activeCount",
    label: "Active now",
  },
  {
    key: "adminCount",
    label: "Admin root",
  },
  {
    key: "userCount",
    label: "Referral roots",
  },
] as const;

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "No limit";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const createBatchCsv = (batch: MintInviteCodesResult["batch"]) => {
  const rows = [
    ["code", "created_at", "expires_at", "note"],
    ...batch.map((item) => [
      item.code,
      item.createdAt,
      item.expiresAt ?? "",
      item.note ?? "",
    ]),
  ];

  return rows
    .map((row) =>
      row
        .map((value) => `"${value.replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n");
};

export default function InviteControlPanel({ initialData }: InviteControlPanelProps) {
  "use no memo";

  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminInviteTab>("all");
  const [count, setCount] = useState("25");
  const [expiresAtLocal, setExpiresAtLocal] = useState("");
  const [note, setNote] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [latestBatch, setLatestBatch] = useState<MintInviteCodesResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const deferredSearch = useDeferredValue(searchValue.trim().toLowerCase());

  const filteredItems = initialData.items.filter((item) => {
    if (!deferredSearch) {
      return true;
    }

    return [item.code, item.note ?? "", item.source, item.status]
      .join(" ")
      .toLowerCase()
      .includes(deferredSearch);
  });

  const modeLabel = initialData.items[0]?.mode === "live" ? "Live registry" : "Preview registry";

  const handleMintSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    const parsed = mintInviteCodesInputSchema.safeParse({
      count,
      expiresAt: expiresAtLocal ? new Date(expiresAtLocal).toISOString() : null,
      note: note.trim() || null,
    });

    if (!parsed.success) {
      setLatestBatch(null);
      setActionError(parsed.error.issues[0]?.message ?? "Mint payload is invalid.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await fetchJson("/api/admin/codes/mint", mintInviteCodesResultSchema, {
          body: JSON.stringify(parsed.data),
          method: "POST",
        });

        setLatestBatch(result);
        setActionSuccess(`Minted ${result.batch.length} invite codes.`);
        setCount("25");
        setExpiresAtLocal("");
        setNote("");
        setActiveTab("all");
        router.refresh();
      } catch (error) {
        setLatestBatch(null);
        setActionError(error instanceof Error ? error.message : "Invite mint failed.");
      }
    });
  };

  const handleRevoke = (code: string) => {
    setActionError(null);
    setActionSuccess(null);

    startTransition(async () => {
      try {
        await fetchJson(
          `/api/admin/codes/${encodeURIComponent(code)}/revoke`,
          revokeInviteCodeResultSchema,
          {
            method: "POST",
          },
        );

        setActionSuccess(`Revoked ${code}.`);
        router.refresh();
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Invite revoke failed.");
      }
    });
  };

  const handleDownloadCsv = () => {
    if (!latestBatch?.batch.length) {
      return;
    }

    const blob = new Blob([createBatchCsv(latestBatch.batch)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `invite-batch-${latestBatch.batch[0]?.createdAt?.slice(0, 10) ?? "export"}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.key}
            className="rounded-[24px] border border-border bg-background/30 p-5"
          >
            <p className="text-xs uppercase tracking-[0.24em] text-muted">{card.label}</p>
            <p className="mt-3 font-display text-4xl text-foreground">
              {initialData.summary[card.key]}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4 rounded-[28px] border border-border bg-background/25 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-soft px-3 py-1 text-xs uppercase tracking-[0.24em] text-brand">
            <ShieldCheck size={14} />
            {modeLabel}
          </div>
          <p className="max-w-3xl text-sm leading-7 text-muted">
            Mint single-use root codes for clean signups. Revoke any active code before it gets
            consumed. Fresh batches can be exported to CSV right after mint.
          </p>
        </div>

        {latestBatch?.batch.length ? (
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background/35 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-brand"
          >
            <Download size={16} />
            Export latest batch
          </button>
        ) : null}
      </div>

      {actionError ? (
        <div className="rounded-[24px] border border-down/30 bg-down/10 px-5 py-4 text-sm text-down">
          {actionError}
        </div>
      ) : null}

      {actionSuccess ? (
        <div className="rounded-[24px] border border-up/30 bg-up/10 px-5 py-4 text-sm text-up">
          {actionSuccess}
        </div>
      ) : null}

      <div className="rounded-[32px] border border-border bg-surface-soft p-6">
        <div className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex rounded-full border border-border bg-background/25 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === "all"
                  ? "bg-foreground text-background"
                  : "text-muted hover:text-foreground"
              }`}
            >
              All Codes
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("mint")}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === "mint"
                  ? "bg-foreground text-background"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Mint
            </button>
          </div>

          {activeTab === "all" ? (
            <label className="relative flex w-full max-w-sm items-center lg:justify-end">
              <Search className="pointer-events-none absolute left-4 text-muted" size={16} />
              <input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Find by code, note, source, status"
                className="w-full rounded-full border border-border bg-background/35 py-3 pr-4 pl-11 text-sm text-foreground outline-none transition focus:border-brand"
              />
            </label>
          ) : null}
        </div>

        {activeTab === "all" ? (
          <div className="mt-6 space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] border border-border bg-background/25 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted">Revoked</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {initialData.summary.revokedCount}
                </p>
              </div>
              <div className="rounded-[24px] border border-border bg-background/25 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted">Used</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {initialData.summary.usedCount}
                </p>
              </div>
              <div className="rounded-[24px] border border-border bg-background/25 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted">Expired</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {initialData.summary.expiredCount}
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-[28px] border border-border">
              <div className="hidden grid-cols-[1.2fr_0.8fr_0.8fr_0.9fr_1.2fr_1.4fr_0.8fr] gap-3 bg-background/45 px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted md:grid">
                <span>Code</span>
                <span>Source</span>
                <span>Status</span>
                <span>Uses</span>
                <span>Expiry</span>
                <span>Note</span>
                <span>Action</span>
              </div>

              <div className="divide-y divide-border bg-surface">
                {filteredItems.map((item) => (
                  <div
                    key={item.code}
                    className="grid gap-4 px-4 py-4 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.9fr_1.2fr_1.4fr_0.8fr] md:items-center"
                  >
                    <div>
                      <p className="font-display text-lg text-foreground">{item.code}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted">
                        Created {formatDateTime(item.createdAt)}
                      </p>
                    </div>
                    <div className="text-sm text-foreground">
                      {item.source === "admin" ? "Admin root" : "Referral"}
                    </div>
                    <div>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                          statusClasses[item.status]
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <div className="text-sm text-foreground">{item.usedCount}</div>
                    <div className="text-sm text-foreground">{formatDateTime(item.expiresAt)}</div>
                    <div className="text-sm text-muted">{item.note ?? "No batch note"}</div>
                    <div>
                      <button
                        type="button"
                        disabled={item.status !== "active" || isPending}
                        onClick={() => handleRevoke(item.code)}
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-background/35 px-4 py-2 text-sm font-semibold text-foreground transition hover:border-down disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <Link2Off size={14} />
                        Revoke
                      </button>
                    </div>
                  </div>
                ))}

                {!filteredItems.length ? (
                  <div className="px-4 py-10 text-center text-sm text-muted">
                    No invite codes match this filter.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <form className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]" onSubmit={handleMintSubmit}>
            <section className="rounded-[28px] border border-border bg-background/25 p-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-soft px-3 py-1 text-xs uppercase tracking-[0.22em] text-brand">
                <TicketPlus size={14} />
                Mint batch
              </div>

              <div className="mt-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                    Count
                  </label>
                  <input
                    value={count}
                    onChange={(event) => setCount(event.target.value)}
                    inputMode="numeric"
                    className="w-full rounded-[20px] border border-border bg-background/35 px-4 py-4 text-sm text-foreground outline-none transition focus:border-brand"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                    Expiry
                  </label>
                  <input
                    type="datetime-local"
                    value={expiresAtLocal}
                    onChange={(event) => setExpiresAtLocal(event.target.value)}
                    className="w-full rounded-[20px] border border-border bg-background/35 px-4 py-4 text-sm text-foreground outline-none transition focus:border-brand"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                    Batch note
                  </label>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={4}
                    className="w-full rounded-[20px] border border-border bg-background/35 px-4 py-4 text-sm text-foreground outline-none transition focus:border-brand"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 py-4 text-sm font-semibold text-background transition hover:bg-brand disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <KeyRound size={16} />
                  {isPending ? "Minting..." : "Mint invite batch"}
                </button>
              </div>
            </section>

            <section className="rounded-[28px] border border-border bg-background/25 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                Batch output
              </p>
              <div className="mt-4 rounded-[24px] border border-border bg-background/30 p-5">
                {latestBatch?.batch.length ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-display text-3xl text-foreground">
                          {latestBatch.batch.length} codes ready
                        </p>
                        <p className="mt-2 text-sm leading-7 text-muted">
                          Fresh batch sits here until the next mint. Export to CSV if you need share
                          links outside the panel.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleDownloadCsv}
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-background/35 px-4 py-2 text-sm font-semibold text-foreground transition hover:border-brand"
                      >
                        <Download size={15} />
                        CSV
                      </button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      {latestBatch.batch.map((item) => (
                        <div
                          key={item.code}
                          className="rounded-[22px] border border-border bg-surface px-4 py-4"
                        >
                          <p className="font-display text-2xl text-foreground">{item.code}</p>
                          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted">
                            Created {formatDateTime(item.createdAt)}
                          </p>
                          <p className="mt-3 text-sm text-muted">
                            Expiry: {formatDateTime(item.expiresAt)}
                          </p>
                          <p className="mt-2 text-sm text-muted">{item.note ?? "No batch note"}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-64 items-center justify-center rounded-[20px] border border-dashed border-border px-6 text-center text-sm leading-7 text-muted">
                    Mint a batch. Fresh codes appear here. Export button wakes up once the batch is
                    real.
                  </div>
                )}
              </div>
            </section>
          </form>
        )}
      </div>
    </div>
  );
}
