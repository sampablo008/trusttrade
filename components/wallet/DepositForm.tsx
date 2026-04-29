"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import CoinIcon from "@/components/ui/CoinIcon";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertCircle,
  Check,
  CheckCircle,
  Copy,
  FileImage,
  QrCode,
  Upload,
  X,
  ExternalLink,
} from "lucide-react";
import { compressImage } from "@/lib/media/compress";
import { buildMediaUrl } from "@/lib/media/path";
import { TOP_COINS } from "@/lib/markets/top-coins";
import type { PublicWalletAddress } from "@/types/wallet";
import type { PublicToken } from "@/types/market";

const BANXA_URL = "https://checkout.banxa.com";

type DepositMethod = "banxa" | "manual";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED_MIME = ["image/png", "image/jpeg", "image/webp"];

const schema = z.object({
  tokenSymbol: z.string().min(1),
  network: z.string().min(1),
  amount: z.number().positive(),
  txHash: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface DepositableToken {
  symbol: string;
  name: string;
  iconPath: string | null;
  decimals: number;
  minDeposit: number;
  usdPriceCents: number;
}

interface Props {
  wallets: PublicWalletAddress[];
  tokens: PublicToken[];
}

const formatTokenAmount = (value: number, decimals = 8) => {
  const display = Math.min(decimals, 8);
  return Number(value.toFixed(display)).toLocaleString("en-US", {
    maximumFractionDigits: display,
  });
};

function MethodToggle({
  method,
  onChange,
}: {
  method: DepositMethod;
  onChange: (m: DepositMethod) => void;
}) {
  return (
    <div className="flex gap-2 rounded-2xl border border-border bg-background/30 p-1.5">
      {(["manual", "banxa"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
            method === m
              ? "bg-brand text-background shadow-sm"
              : "text-muted hover:text-foreground"
          }`}
        >
          {m === "banxa" ? "Buy via Banxa" : "Manual (Crypto)"}
        </button>
      ))}
    </div>
  );
}

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function DepositForm({ wallets, tokens }: Props) {
  const depositableTokens = useMemo<DepositableToken[]>(() => {
    const uniqueSymbols = [...new Set(wallets.map((w) => w.tokenSymbol))];
    return uniqueSymbols.map((symbol) => {
      const dbToken = tokens.find((t) => t.symbol === symbol);
      const coin = TOP_COINS.find((c) => c.symbol === symbol);
      return {
        symbol,
        name: dbToken?.name ?? coin?.name ?? symbol,
        iconPath: dbToken?.iconPath ?? null,
        decimals: dbToken?.decimals ?? 8,
        minDeposit: dbToken?.minDeposit ?? 0,
        usdPriceCents: dbToken?.priceCents ?? 0,
      };
    });
  }, [tokens, wallets]);

  const initialToken = depositableTokens[0];
  const initialNetworks = initialToken
    ? wallets
        .filter((w) => w.tokenSymbol === initialToken.symbol)
        .map((w) => w.network)
    : [];
  const [method, setMethod] = useState<DepositMethod>("manual");
  const [selectedSymbol, setSelectedSymbol] = useState(
    initialToken?.symbol ?? "",
  );
  const [selectedNetwork, setSelectedNetwork] = useState(
    initialNetworks.length === 1 ? initialNetworks[0] : "",
  );
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedToken = depositableTokens.find(
    (t) => t.symbol === selectedSymbol,
  );
  const availableNetworks = wallets
    .filter((w) => w.tokenSymbol === selectedSymbol)
    .map((w) => w.network);
  const selectedWallet = wallets.find(
    (w) => w.tokenSymbol === selectedSymbol && w.network === selectedNetwork,
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      tokenSymbol: selectedSymbol,
      network: selectedNetwork,
      amount: 0,
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const amount = watch("amount");
  const minDeposit = selectedToken?.minDeposit ?? 0;
  const usdPriceCents = selectedToken?.usdPriceCents ?? 0;
  const canPriceConvert = usdPriceCents > 0;
  const minOk = amount === 0 || amount >= minDeposit;

  // USD input state. The form still submits a token-denominated `amount`;
  // when a price is available we drive that value from `usdInput`.
  const [usdInput, setUsdInput] = useState<string>("");

  const setUsdAmount = (raw: string) => {
    setUsdInput(raw);
    const usd = Number.parseFloat(raw);
    if (!Number.isFinite(usd) || usd <= 0 || !canPriceConvert) {
      setValue("amount", 0);
      return;
    }
    const tokenAmt = Number((usd / (usdPriceCents / 100)).toFixed(8));
    setValue("amount", Number.isFinite(tokenAmt) ? tokenAmt : 0);
  };

  // Re-derive token amount when the user switches token (price changes).
  useEffect(() => {
    if (!canPriceConvert) return;
    const usd = Number.parseFloat(usdInput);
    if (!Number.isFinite(usd) || usd <= 0) return;
    const tokenAmt = Number((usd / (usdPriceCents / 100)).toFixed(8));
    setValue("amount", Number.isFinite(tokenAmt) ? tokenAmt : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usdPriceCents]);

  const minDepositUsdCents = minDeposit > 0 && usdPriceCents > 0
    ? Math.round(minDeposit * usdPriceCents)
    : 0;

  const pickToken = (symbol: string) => {
    setSelectedSymbol(symbol);
    setValue("tokenSymbol", symbol);

    const networksForToken = wallets
      .filter((w) => w.tokenSymbol === symbol)
      .map((w) => w.network);
    const autoNetwork =
      networksForToken.length === 1 ? networksForToken[0] : "";
    setSelectedNetwork(autoNetwork);
    setValue("network", autoNetwork);
  };

  const handleCopy = async () => {
    if (!selectedWallet?.address) return;
    await navigator.clipboard.writeText(selectedWallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(null);

    if (!ACCEPTED_MIME.includes(file.type)) {
      setFileError("Unsupported file. Use PNG, JPEG, or WebP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setFileError("File is too large. Max 5 MB.");
      return;
    }
    setProofFile(file);
  };

  const handleRemoveFile = () => {
    setProofFile(null);
    setFileError(null);
  };

  const uploadProof = async (file: File): Promise<string> => {
    const compressed = await compressImage(file);
    const fd = new FormData();
    fd.append("file", compressed);
    const res = await fetch("/api/upload/deposit-proof", {
      method: "POST",
      body: fd,
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      throw new Error(json?.error?.message ?? "Screenshot upload failed.");
    }
    const data = (await res.json()) as { path: string };
    return data.path;
  };

  const onSubmit = async (data: FormData) => {
    setErrorMsg(null);

    if (!proofFile) {
      setFileError("Please attach a deposit screenshot.");
      return;
    }

    if (data.amount < minDeposit) {
      setErrorMsg(
        `Minimum deposit for ${data.tokenSymbol} is ${formatTokenAmount(minDeposit, selectedToken?.decimals)} ${data.tokenSymbol}.`,
      );
      return;
    }

    setSubmitStatus("loading");

    try {
      const proofPath = await uploadProof(proofFile);

      const res = await fetch("/api/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenSymbol: data.tokenSymbol,
          network: data.network,
          amount: data.amount,
          txHash: data.txHash,
          proofPath,
        }),
      });

      if (res.ok) {
        setSubmitStatus("success");
        return;
      }

      const json = (await res.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setErrorMsg(json?.error?.message ?? "Deposit submission failed.");
      setSubmitStatus("error");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unexpected error.");
      setSubmitStatus("error");
    }
  };

  if (submitStatus === "success") {
    return (
      <div className="flex h-full min-h-80 flex-col items-center justify-center gap-4 text-center">
        <CheckCircle size={40} className="text-up" />
        <h3 className="font-display text-2xl text-foreground">
          Deposit submitted
        </h3>
        <p className="max-w-xs text-sm text-muted">
          Your deposit is pending admin review. Your balance will update once
          approved.
        </p>
      </div>
    );
  }

  if (depositableTokens.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-background/20 p-10 text-center">
        <AlertCircle size={28} className="text-yellow-400" />
        <p className="text-sm font-semibold text-foreground">
          No deposit methods configured
        </p>
        <p className="max-w-sm text-xs text-muted">
          Admin hasn&apos;t added any deposit wallets yet. Please check back
          soon.
        </p>
      </div>
    );
  }

  const steps = [
    { label: "Choose token", done: !!selectedSymbol },
    { label: "Pick network", done: !!selectedNetwork },
    { label: "Enter amount", done: amount > 0 && minOk },
    { label: "Attach proof", done: !!proofFile },
  ];

  const isLoading = submitStatus === "loading";
  const canSubmit =
    !isLoading && !!selectedWallet && amount > 0 && minOk && !!proofFile;

  if (method === "banxa") {
    return (
      <div className="flex flex-col gap-6">
        {/* Method toggle */}
        <MethodToggle method={method} onChange={setMethod} />

        {/* Token selector */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
            Token
          </label>
          <div className="flex flex-wrap gap-2">
            {depositableTokens.map((token) => (
              <button
                key={token.symbol}
                type="button"
                onClick={() => pickToken(token.symbol)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition ${
                  selectedSymbol === token.symbol
                    ? "bg-brand text-background"
                    : "border border-border bg-background/30 text-foreground hover:border-brand"
                }`}
              >
                <CoinIcon
                  symbol={token.symbol}
                  iconPath={token.iconPath}
                  size={16}
                />
                {token.symbol}
              </button>
            ))}
          </div>
        </div>

        {/* Network selector */}
        {availableNetworks.length > 1 && (
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
          </div>
        )}

        {/* Wallet address — copy before paying on Banxa */}
        {selectedWallet ? (
          <div className="rounded-2xl border border-brand/40 bg-brand/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">
              Your {selectedToken?.symbol} deposit address
            </p>
            <p className="mt-1.5 text-xs text-muted">
              Copy this address and paste it as the receiving wallet inside
              Banxa checkout below.
            </p>
            <div className="mt-3 flex items-start gap-4">
              <div className="flex flex-1 items-center justify-between gap-3">
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
            </div>
            {selectedWallet.memo && (
              <p className="mt-2 text-xs text-muted">
                Memo / Tag:{" "}
                <span className="font-mono text-foreground">
                  {selectedWallet.memo}
                </span>
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-yellow-400/40 bg-yellow-400/5 px-4 py-3 text-xs text-yellow-400">
            Select a token{availableNetworks.length > 1 ? " and network" : ""}{" "}
            to see your deposit address.
          </div>
        )}

        {/* Banxa CTA */}
        <a
          href={BANXA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col items-center gap-4 rounded-2xl border border-border bg-background/30 px-6 py-10 text-center transition hover:border-brand"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand transition group-hover:bg-brand/20">
            <ExternalLink size={24} />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-base font-semibold text-foreground">
              Continue to Banxa
            </p>
            <p className="max-w-xs text-xs text-muted">
              Opens in a new tab. Buy crypto with card or bank transfer, then
              send it to the address above.
            </p>
          </div>
          <span className="rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-background shadow-lg shadow-brand/25 transition group-hover:brightness-110">
            Open Banxa checkout →
          </span>
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      {/* Method toggle */}
      <MethodToggle method={method} onChange={setMethod} />

      {/* Progress steps */}
      <ol className="grid grid-cols-4 gap-2">
        {steps.map((step, i) => (
          <li key={step.label} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition ${
                  step.done
                    ? "border-gray-300 bg-[hsl(var(--color-up))] text-black"
                    : "border-white/20 bg-white/6 text-muted"
                }`}
              >
                {step.done ? (
                  <Check size={12} strokeWidth={3} className="text-white" />
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${
                  step.done ? "text-foreground" : "text-muted"
                }`}
              >
                {step.label}
              </span>
            </div>
            <div
              className={`h-1 w-full rounded-full transition ${
                step.done ? "bg-[hsl(var(--color-up))]" : "bg-white/10"
              }`}
            />
          </li>
        ))}
      </ol>

      {/* Token selector */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
          Token
        </label>
        <div className="flex flex-wrap gap-2">
          {depositableTokens.map((token) => (
            <button
              key={token.symbol}
              type="button"
              onClick={() => pickToken(token.symbol)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition ${
                selectedSymbol === token.symbol
                  ? "bg-brand text-background"
                  : "border border-border bg-background/30 text-foreground hover:border-brand"
              }`}
            >
              <CoinIcon
                symbol={token.symbol}
                iconPath={token.iconPath}
                size={16}
              />
              {token.symbol}
            </button>
          ))}
        </div>
        <input type="hidden" {...register("tokenSymbol")} />
      </div>

      {/* Network selector */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
          Network
        </label>
        {availableNetworks.length === 0 ? (
          <div className="rounded-xl border border-yellow-400/40 bg-yellow-400/5 px-4 py-3 text-xs text-yellow-400">
            No deposit network is configured for this token yet.
          </div>
        ) : (
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
        )}
        <input type="hidden" {...register("network")} />
      </div>

      {/* Wallet address */}
      {selectedWallet && (
        <div className="rounded-2xl border border-border bg-background/30 p-5">
          <div className="flex items-start gap-4">
            {selectedWallet.qrCodePath && (
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-border bg-white">
                <Image
                  src={buildMediaUrl("token-icons", selectedWallet.qrCodePath)}
                  alt={`${selectedToken?.symbol} QR`}
                  fill
                  className="object-contain p-1"
                  unoptimized
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted flex items-center gap-1.5">
                {selectedWallet.qrCodePath && <QrCode size={11} />}
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
                  Memo / Tag:{" "}
                  <span className="font-mono text-foreground">
                    {selectedWallet.memo}
                  </span>
                </p>
              )}
              {minDeposit > 0 && selectedToken && (
                <p className="mt-2 text-xs text-muted">
                  Min deposit:{" "}
                  <span className="font-semibold text-foreground">
                    {formatTokenAmount(minDeposit, selectedToken.decimals)}{" "}
                    {selectedToken.symbol}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Amount */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
          Amount ({canPriceConvert ? "USD" : selectedToken?.symbol ?? "TOKEN"})
        </label>
        {canPriceConvert ? (
          <>
            <div className="flex flex-wrap gap-2">
              {[100, 250, 500, 1000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setUsdAmount(String(preset))}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    usdInput === String(preset)
                      ? "bg-brand text-background"
                      : "border border-border bg-background/30 text-foreground hover:border-brand"
                  }`}
                >
                  ${preset.toLocaleString("en-US")}
                </button>
              ))}
            </div>
            <input
              type="number"
              min={0}
              step="any"
              placeholder="Enter USD amount"
              value={usdInput}
              className="mt-1 w-full rounded-xl border border-border bg-background/30 px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-brand focus:outline-none"
              onChange={(e) => setUsdAmount(e.target.value)}
            />
            {amount > 0 && selectedToken && (
              <p className="text-xs text-muted">
                ≈ {formatTokenAmount(amount, selectedToken.decimals)}{" "}
                {selectedToken.symbol}
              </p>
            )}
            {minDepositUsdCents > 0 && (
              <p className="text-[11px] text-muted">
                Min deposit{" "}
                <span className="font-semibold text-foreground">
                  {(minDepositUsdCents / 100).toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                  })}
                </span>{" "}
                ({formatTokenAmount(minDeposit, selectedToken?.decimals)}{" "}
                {selectedToken?.symbol})
              </p>
            )}
          </>
        ) : (
          <>
            {minDeposit > 0 && selectedToken && (
              <div className="flex flex-wrap gap-2">
                {[1, 2, 5, 10].map((mult) => {
                  const value = Number((minDeposit * mult).toFixed(8));
                  return (
                    <button
                      key={mult}
                      type="button"
                      onClick={() => setValue("amount", value)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        amount === value
                          ? "bg-brand text-background"
                          : "border border-border bg-background/30 text-foreground hover:border-brand"
                      }`}
                    >
                      {mult}× min
                    </button>
                  );
                })}
              </div>
            )}
            <input
              type="number"
              min={0}
              step="any"
              placeholder={`Enter ${selectedToken?.symbol ?? "amount"}`}
              value={amount ? amount : ""}
              className="mt-1 w-full rounded-xl border border-border bg-background/30 px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-brand focus:outline-none"
              onChange={(e) => {
                const v = Number.parseFloat(e.target.value);
                setValue("amount", Number.isFinite(v) ? v : 0);
              }}
            />
          </>
        )}
        {amount > 0 && !minOk && selectedToken && (
          <p className="text-xs text-down">
            Below min deposit (
            {formatTokenAmount(minDeposit, selectedToken.decimals)}{" "}
            {selectedToken.symbol}).
          </p>
        )}
        {errors.amount && (
          <p className="text-xs text-down">{errors.amount.message}</p>
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

      {/* Screenshot attach (no upload until submit) */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
          Deposit screenshot <span className="text-down">*</span>
        </label>
        {proofFile ? (
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-background/40 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <FileImage size={16} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="truncate text-sm font-semibold text-foreground">
                {proofFile.name}
              </span>
              <span className="text-xs text-muted">
                {formatBytes(proofFile.size)} · will be uploaded on submit
              </span>
            </div>
            <button
              type="button"
              onClick={handleRemoveFile}
              disabled={isLoading}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-muted transition hover:border-down hover:text-down disabled:opacity-40"
              aria-label="Remove file"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <label className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border bg-background/20 px-6 py-8 transition hover:border-brand">
            <Upload size={28} className="text-muted" />
            <span className="text-sm text-muted">
              Click to attach screenshot
            </span>
            <span className="text-xs text-muted">
              PNG, JPEG, WebP — max 5 MB
            </span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleFileChange}
              disabled={isLoading}
            />
          </label>
        )}
        {fileError && <p className="text-xs text-down">{fileError}</p>}
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-down/40 bg-down/10 px-4 py-3">
          <AlertCircle size={16} className="text-down" />
          <p className="text-sm text-down">{errorMsg}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-4 text-sm font-semibold text-background shadow-lg shadow-brand/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
      >
        {isLoading ? "Uploading & submitting…" : "Submit deposit"}
      </button>

      {!canSubmit && !isLoading && (
        <p className="text-center text-[11px] text-muted">
          {!selectedWallet
            ? "Pick a token and network to continue."
            : amount <= 0
              ? "Enter the amount you sent."
              : !minOk
                ? "Amount is below the minimum deposit."
                : !proofFile
                  ? "Attach a screenshot of your transaction."
                  : ""}
        </p>
      )}
    </form>
  );
}
