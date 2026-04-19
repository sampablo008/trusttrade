"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Copy, CheckCircle, Upload, AlertCircle } from "lucide-react";
import type { PublicWalletAddress } from "@/types/wallet";
import type { PublicToken } from "@/types/market";

const schema = z.object({
  tokenId: z.string().uuid(),
  network: z.string().min(1),
  amountCents: z.number().int().positive(),
  txHash: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  wallets: PublicWalletAddress[];
  tokens: PublicToken[];
}

const AMOUNT_PRESETS = [50, 100, 200, 500];

export default function DepositForm({ wallets, tokens }: Props) {
  const [selectedTokenId, setSelectedTokenId] = useState(tokens[0]?.id ?? "");
  const [selectedNetwork, setSelectedNetwork] = useState("");
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [proofPath, setProofPath] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedToken = tokens.find((t) => t.id === selectedTokenId);
  const availableNetworks = wallets
    .filter((w) => w.tokenSymbol === selectedToken?.symbol)
    .map((w) => w.network);
  const selectedWallet = wallets.find(
    (w) => w.tokenSymbol === selectedToken?.symbol && w.network === selectedNetwork,
  );

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tokenId: selectedTokenId, network: "", amountCents: 0 },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const amountCents = watch("amountCents");

  const handleCopy = async () => {
    if (!selectedWallet?.address) return;
    await navigator.clipboard.writeText(selectedWallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadStatus("uploading");

    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/upload/deposit-proof", { method: "POST", body: fd });
    if (res.ok) {
      const data = await res.json() as { path: string };
      setProofPath(data.path);
      setUploadStatus("done");
    } else {
      setUploadStatus("error");
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!proofPath) {
      setErrorMsg("Please upload a deposit screenshot first.");
      return;
    }
    setSubmitStatus("loading");
    setErrorMsg(null);

    const res = await fetch("/api/deposits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, proofPath }),
    });

    if (res.ok) {
      setSubmitStatus("success");
    } else {
      const json = await res.json() as { error?: { message?: string } };
      setErrorMsg(json.error?.message ?? "Deposit submission failed.");
      setSubmitStatus("error");
    }
  };

  if (submitStatus === "success") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[20px] border border-border bg-surface-soft p-10 text-center">
        <CheckCircle size={40} className="text-up" />
        <h3 className="font-display text-2xl text-foreground">Deposit submitted</h3>
        <p className="max-w-xs text-sm text-muted">
          Your deposit is pending admin review. Your balance will update once approved.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      {/* Token selector */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
          Token
        </label>
        <div className="flex flex-wrap gap-2">
          {tokens.map((token) => (
            <button
              key={token.id}
              type="button"
              onClick={() => {
                setSelectedTokenId(token.id);
                setSelectedNetwork("");
                setValue("tokenId", token.id);
                setValue("network", "");
              }}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                selectedTokenId === token.id
                  ? "bg-brand text-background"
                  : "border border-border bg-background/30 text-foreground hover:border-brand"
              }`}
            >
              {token.symbol}
            </button>
          ))}
        </div>
        <input type="hidden" {...register("tokenId")} />
      </div>

      {/* Network selector */}
      {availableNetworks.length > 0 && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
            Network
          </label>
          <div className="flex flex-wrap gap-2">
            {availableNetworks.map((net) => (
              <button
                key={net}
                type="button"
                onClick={() => {
                  setSelectedNetwork(net);
                  setValue("network", net);
                }}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  selectedNetwork === net
                    ? "bg-brand text-background"
                    : "border border-border bg-background/30 text-foreground hover:border-brand"
                }`}
              >
                {net}
              </button>
            ))}
          </div>
          <input type="hidden" {...register("network")} />
        </div>
      )}

      {/* Wallet address + QR */}
      {selectedWallet && (
        <div className="rounded-2xl border border-border bg-background/30 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
            Deposit address
          </p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <code className="break-all font-mono text-sm text-foreground">
              {selectedWallet.address}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 rounded-full border border-border bg-background/30 p-2 transition hover:border-brand"
            >
              {copied ? (
                <CheckCircle size={16} className="text-up" />
              ) : (
                <Copy size={16} className="text-muted" />
              )}
            </button>
          </div>
          {selectedWallet.memo && (
            <p className="mt-2 text-xs text-muted">
              Memo / Tag: <span className="font-mono text-foreground">{selectedWallet.memo}</span>
            </p>
          )}
          <p className="mt-2 text-xs text-muted">
            Min deposit: {(selectedWallet.minDepositCents / 100).toFixed(2)} USD
          </p>
        </div>
      )}

      {/* Amount */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
          Amount (USD)
        </label>
        <div className="flex flex-wrap gap-2">
          {AMOUNT_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setValue("amountCents", preset * 100)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                amountCents === preset * 100
                  ? "bg-brand text-background"
                  : "border border-border bg-background/30 text-foreground hover:border-brand"
              }`}
            >
              ${preset}
            </button>
          ))}
        </div>
        <input
          type="number"
          min={0}
          step={1}
          placeholder="Enter USD amount"
          className="mt-1 w-full rounded-xl border border-border bg-background/30 px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-brand focus:outline-none"
          onChange={(e) => setValue("amountCents", Math.round(parseFloat(e.target.value) * 100) || 0)}
        />
        {errors.amountCents && (
          <p className="text-xs text-down">{errors.amountCents.message}</p>
        )}
      </div>

      {/* Tx hash */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
          Transaction Hash (optional)
        </label>
        <input
          type="text"
          {...register("txHash")}
          placeholder="Paste tx hash from wallet"
          className="w-full rounded-xl border border-border bg-background/30 px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted focus:border-brand focus:outline-none"
        />
      </div>

      {/* Screenshot upload */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
          Deposit Screenshot <span className="text-down">*</span>
        </label>
        <label className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border bg-background/20 px-6 py-8 transition hover:border-brand">
          {uploadStatus === "idle" && (
            <>
              <Upload size={28} className="text-muted" />
              <span className="text-sm text-muted">Click to upload screenshot</span>
              <span className="text-xs text-muted">PNG, JPEG, WebP — max 5 MB</span>
            </>
          )}
          {uploadStatus === "uploading" && (
            <span className="text-sm text-brand">Uploading…</span>
          )}
          {uploadStatus === "done" && (
            <>
              <CheckCircle size={28} className="text-up" />
              <span className="text-sm text-up">Screenshot uploaded</span>
            </>
          )}
          {uploadStatus === "error" && (
            <>
              <AlertCircle size={28} className="text-down" />
              <span className="text-sm text-down">Upload failed — try again</span>
            </>
          )}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-down/40 bg-down/10 px-4 py-3">
          <AlertCircle size={16} className="text-down" />
          <p className="text-sm text-down">{errorMsg}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={submitStatus === "loading" || !proofPath || !selectedWallet}
        className="w-full rounded-full bg-brand px-6 py-4 text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-40"
      >
        {submitStatus === "loading" ? "Submitting…" : "Submit Deposit"}
      </button>
    </form>
  );
}
