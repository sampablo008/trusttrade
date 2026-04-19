"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Download,
  Flame,
  Pause,
  Play,
  RefreshCw,
  UploadCloud,
} from "lucide-react";
import { z } from "zod";
import { fetchJson } from "@/lib/api/client";
import { formatUsdFromCents } from "@/lib/utils/format";
import type { AdminToken, AdminTokensResult } from "@/types/market";

const anySchema = z.unknown();

interface CandleControllerPanelProps {
  initialTokens: AdminTokensResult;
}

const FEED_LABELS: Record<string, string> = {
  frozen: "Frozen",
  replay: "CSV Replay",
  shadow: "Shadow Binance",
  synthetic: "Synthetic",
};

const FEED_COLORS: Record<string, string> = {
  frozen: "text-amber-400",
  replay: "text-brand",
  shadow: "text-up",
  synthetic: "text-muted",
};

export default function CandleControllerPanel({ initialTokens }: CandleControllerPanelProps) {
  "use no memo";

  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>(
    initialTokens.items[0]?.id ?? "",
  );
  const [hardSetPrice, setHardSetPrice] = useState("");
  const [driftBps, setDriftBps] = useState("0");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedToken = initialTokens.items.find((t) => t.id === selectedId) ?? null;

  const clearMessages = () => {
    setFeedback(null);
    setErrorMessage(null);
  };

  const applyFeedSource = (feedSource: AdminToken["feedSource"]) => {
    if (!selectedId) return;
    clearMessages();

    startTransition(async () => {
      try {
        await fetchJson(
          `/api/admin/candles/controller/${selectedId}`,
          anySchema,
          {
            body: JSON.stringify({ feedSource }),
            method: "PATCH",
          },
        );
        setFeedback(`Feed source set to ${FEED_LABELS[feedSource]}.`);
        router.refresh();
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Feed source update failed.");
      }
    });
  };

  const applyDriftBps = () => {
    if (!selectedId) return;
    clearMessages();

    const bps = parseInt(driftBps, 10);
    if (!isFinite(bps)) {
      setErrorMessage("Drift must be an integer bps value.");
      return;
    }

    startTransition(async () => {
      try {
        await fetchJson(
          `/api/admin/candles/controller/${selectedId}`,
          anySchema,
          {
            body: JSON.stringify({ driftBiasBps: bps }),
            method: "PATCH",
          },
        );
        setFeedback(`Drift bias set to ${bps} bps.`);
        router.refresh();
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Drift update failed.");
      }
    });
  };

  const handleHardSet = () => {
    if (!selectedId) return;
    clearMessages();

    const cents = Math.round(parseFloat(hardSetPrice) * 100);
    if (!isFinite(cents) || cents <= 0) {
      setErrorMessage("Enter a valid USD price.");
      return;
    }

    startTransition(async () => {
      try {
        await fetchJson(
          `/api/admin/candles/${selectedId}/hard-set`,
          anySchema,
          {
            body: JSON.stringify({ priceCents: cents }),
            method: "POST",
          },
        );
        setFeedback(`Price frozen at $${hardSetPrice}.`);
        setHardSetPrice("");
        router.refresh();
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Hard-set failed.");
      }
    });
  };

  const handleReplayUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedId) return;
    const file = event.target.files?.[0];
    if (!file) return;
    clearMessages();

    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/candles/${selectedId}/replay/upload`, {
          body: formData,
          method: "POST",
        });

        const json = (await res.json()) as { data?: { imported: number }; error?: { message: string } };

        if (!res.ok || json.error) {
          throw new Error(json.error?.message ?? "Upload failed.");
        }

        setFeedback(`Imported ${json.data?.imported ?? 0} rows into replay bank.`);
        router.refresh();
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Replay upload failed.");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      {/* Token list */}
      <section className="rounded-[32px] border border-border bg-surface-soft p-6">
        <div className="border-b border-border pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
            Token feed status
          </p>
          <h2 className="mt-2 font-display text-3xl text-foreground">Chart control</h2>
        </div>

        <div className="mt-6 space-y-3">
          {initialTokens.items.map((token) => {
            const isSelected = token.id === selectedId;

            return (
              <button
                key={token.id}
                type="button"
                onClick={() => {
                  setSelectedId(token.id);
                  clearMessages();
                }}
                className={`flex w-full items-center justify-between rounded-[24px] border px-4 py-4 text-left transition ${
                  isSelected
                    ? "border-brand bg-brand-soft"
                    : "border-border bg-background/25 hover:border-brand/40"
                }`}
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-xl text-foreground">{token.symbol}</span>
                    <span className={`text-xs font-semibold ${FEED_COLORS[token.feedSource]}`}>
                      {FEED_LABELS[token.feedSource]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {token.lastPriceCents
                      ? formatUsdFromCents(token.lastPriceCents)
                      : "No price yet"}
                  </p>
                </div>

                <Activity
                  size={18}
                  className={token.feedSource === "frozen" ? "text-amber-400" : "text-brand"}
                />
              </button>
            );
          })}
        </div>
      </section>

      {/* Controls */}
      <section className="rounded-[32px] border border-border bg-surface-soft p-6">
        <div className="border-b border-border pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
            Price engine
          </p>
          <h2 className="mt-2 font-display text-3xl text-foreground">
            {selectedToken?.symbol ?? "Select token"}
          </h2>
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

        {selectedToken ? (
          <div className="mt-6 space-y-6">
            {/* Feed source buttons */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                Feed source
              </p>
              <div className="flex flex-wrap gap-2">
                {(["shadow", "synthetic", "replay", "frozen"] as const).map((source) => (
                  <button
                    key={source}
                    type="button"
                    disabled={isPending}
                    onClick={() => applyFeedSource(source)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-semibold transition disabled:opacity-60 ${
                      selectedToken.feedSource === source
                        ? "bg-foreground text-background"
                        : "border border-border bg-background/35 text-muted hover:border-brand hover:text-foreground"
                    }`}
                  >
                    {source === "frozen" && <Pause size={13} />}
                    {source === "shadow" && <RefreshCw size={13} />}
                    {source === "synthetic" && <Activity size={13} />}
                    {source === "replay" && <Play size={13} />}
                    {FEED_LABELS[source]}
                  </button>
                ))}
              </div>
            </div>

            {/* Drift bias */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                Drift bias (bps / tick)
              </p>
              <div className="flex gap-3">
                <input
                  inputMode="numeric"
                  value={driftBps}
                  onChange={(e) => setDriftBps(e.target.value)}
                  placeholder="0"
                  className="w-32 rounded-[20px] border border-border bg-background/35 px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand"
                />
                <button
                  type="button"
                  disabled={isPending}
                  onClick={applyDriftBps}
                  className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-3 text-sm font-semibold text-background transition hover:bg-brand disabled:opacity-60"
                >
                  Apply drift
                </button>
              </div>
            </div>

            {/* Hard-set price */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                Hard-set price (USD) — freezes feed
              </p>
              <div className="flex gap-3">
                <input
                  inputMode="decimal"
                  value={hardSetPrice}
                  onChange={(e) => setHardSetPrice(e.target.value)}
                  placeholder="e.g. 85000.00"
                  className="w-40 rounded-[20px] border border-border bg-background/35 px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand"
                />
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleHardSet}
                  className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-400 transition hover:border-amber-400 disabled:opacity-60"
                >
                  <Flame size={14} />
                  Hard-set
                </button>
              </div>
            </div>

            {/* CSV replay upload */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                CSV replay — import historical OHLCV
              </p>
              <p className="text-xs text-muted">
                Columns: time (unix), open, high, low, close, volume
              </p>
              <div className="flex gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleReplayUpload}
                  disabled={isPending}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-background/35 px-4 py-3 text-sm font-semibold text-foreground transition hover:border-brand disabled:opacity-60"
                >
                  <UploadCloud size={14} />
                  {isPending ? "Uploading..." : "Upload CSV"}
                </button>

                <BinancePullButton tokenId={selectedToken.id} onDone={(msg) => setFeedback(msg)} />
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8 text-sm text-muted">Select a token to control its price feed.</div>
        )}
      </section>
    </div>
  );
}

function BinancePullButton({
  tokenId,
  onDone,
}: {
  tokenId: string;
  onDone: (msg: string) => void;
}) {
  const [isPulling, setIsPulling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePull = async () => {
    setIsPulling(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/candles/${tokenId}/replay/pull-binance`, {
        method: "POST",
      });

      const json = (await res.json()) as {
        data?: { imported: number };
        error?: { message: string };
      };

      if (!res.ok || json.error) {
        throw new Error(json.error?.message ?? "Pull failed.");
      }

      onDone(`Pulled ${json.data?.imported ?? 0} candles from Binance into replay bank.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Binance pull failed.");
    } finally {
      setIsPulling(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        disabled={isPulling}
        onClick={handlePull}
        className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand-soft px-4 py-3 text-sm font-semibold text-brand transition hover:border-brand disabled:opacity-60"
      >
        <Download size={14} />
        {isPulling ? "Pulling..." : "Pull from Binance"}
      </button>
      {error && <p className="mt-2 text-xs text-down">{error}</p>}
    </div>
  );
}
