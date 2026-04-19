"use client";

import { useDeferredValue, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  KeyRound,
  Link2Off,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { fetchJson } from "@/lib/api/client";
import {
  mintInviteCodesResultSchema,
  revokeInviteCodeResultSchema,
} from "@/schemas/invites";
import type { AdminInviteCodesResult, MintInviteCodesResult } from "@/types/invites";

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
  { key: "totalCount", label: "Total codes" },
  { key: "activeCount", label: "Active now" },
  { key: "adminCount", label: "Admin root" },
  { key: "userCount", label: "Referral roots" },
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

export default function InviteControlPanel({ initialData }: InviteControlPanelProps) {
  "use no memo";

  const router = useRouter();
  const [searchValue, setSearchValue] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [mintedCode, setMintedCode] = useState<MintInviteCodesResult["batch"][number] | null>(null);
  const [copied, setCopied] = useState(false);
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

  const handleMint = () => {
    setActionError(null);
    setCopied(false);

    startTransition(async () => {
      try {
        const result = await fetchJson("/api/admin/codes/mint", mintInviteCodesResultSchema, {
          body: JSON.stringify({ count: 1, expiresAt: null, note: null }),
          method: "POST",
        });

        const next = result.batch[0] ?? null;
        setMintedCode(next);
        router.refresh();
      } catch (error) {
        setMintedCode(null);
        setActionError(error instanceof Error ? error.message : "Invite mint failed.");
      }
    });
  };

  const handleRevoke = (code: string) => {
    setActionError(null);

    startTransition(async () => {
      try {
        await fetchJson(
          `/api/admin/codes/${encodeURIComponent(code)}/revoke`,
          revokeInviteCodeResultSchema,
          { method: "POST" },
        );

        router.refresh();
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Invite revoke failed.");
      }
    });
  };

  const handleCopy = async () => {
    if (!mintedCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(mintedCode.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setActionError("Copy failed. Select and copy the code manually.");
    }
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

      {actionError ? (
        <div className="rounded-[24px] border border-down/30 bg-down/10 px-5 py-4 text-sm text-down">
          {actionError}
        </div>
      ) : null}

      <section className="rounded-[32px] border border-border bg-surface-soft p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-soft px-3 py-1 text-xs uppercase tracking-[0.24em] text-brand">
              <ShieldCheck size={14} />
              {modeLabel}
            </div>
            <p className="max-w-2xl text-sm leading-7 text-muted">
              One click mints a fresh single-use root code. The registry below updates instantly.
            </p>
          </div>

          <button
            type="button"
            onClick={handleMint}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-6 py-4 text-sm font-semibold text-background transition hover:bg-brand disabled:cursor-not-allowed disabled:opacity-60"
          >
            <KeyRound size={16} />
            {isPending ? "Minting..." : "Mint invite code"}
          </button>
        </div>

        {mintedCode ? (
          <div className="mt-6 flex flex-col gap-4 rounded-[24px] border border-brand/30 bg-brand-soft/40 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/15 text-brand">
                <Sparkles size={18} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-muted">Just minted</p>
                <p className="mt-1 font-display text-2xl text-foreground">{mintedCode.code}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background/40 px-5 py-2.5 text-sm font-semibold text-foreground transition hover:border-brand"
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? "Copied" : "Copy code"}
            </button>
          </div>
        ) : null}
      </section>

      <section className="rounded-[32px] border border-border bg-surface-soft p-6">
        <div className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              All codes
            </p>
            <p className="mt-2 text-sm leading-7 text-muted">
              Every referral and admin invite. Revoke any active code before it gets consumed.
            </p>
          </div>

          <label className="relative flex w-full max-w-sm items-center lg:justify-end">
            <Search className="pointer-events-none absolute left-4 text-muted" size={16} />
            <input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Find by code, note, source, status"
              className="w-full rounded-full border border-border bg-background/35 py-3 pr-4 pl-11 text-sm text-foreground outline-none transition focus:border-brand"
            />
          </label>
        </div>

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
      </section>
    </div>
  );
}
