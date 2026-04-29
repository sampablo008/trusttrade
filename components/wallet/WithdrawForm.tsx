"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowDownToLine, CheckCircle, Lock, ShieldCheck, X } from "lucide-react";
import CoinIcon from "@/components/ui/CoinIcon";
import { formatTokenAmount, formatUsdFromCents } from "@/lib/utils/format";
import type { PublicToken } from "@/types/market";
import type { WalletBalancesResult } from "@/types/wallet-balance";

const NETWORKS = ["TRC20", "ERC20", "BEP20", "BTC"];

interface Props {
  balances: WalletBalancesResult;
  tokens: PublicToken[];
  hasWithdrawalPin: boolean;
}

interface WithdrawableToken {
  tokenId: string;
  symbol: string;
  name: string;
  iconPath: string | null;
  decimals: number;
  balance: number;
  usdPriceCents: number;
  minWithdrawal: number;
  withdrawFeeBps: number;
}

export default function WithdrawForm({ balances, tokens, hasWithdrawalPin }: Props) {
  const withdrawable = useMemo<WithdrawableToken[]>(() => {
    return balances.tokens
      .filter((b) => b.balance > 0)
      .map((b) => {
        const meta = tokens.find((t) => t.symbol === b.symbol);
        return {
          tokenId: b.tokenId,
          symbol: b.symbol,
          name: b.name,
          iconPath: b.iconPath,
          decimals: b.decimals,
          balance: b.balance,
          usdPriceCents: b.usdPriceCents,
          minWithdrawal: meta?.minWithdrawal ?? 0,
          withdrawFeeBps: meta?.withdrawFeeBps ?? 0,
        };
      });
  }, [balances.tokens, tokens]);

  const [selectedSymbol, setSelectedSymbol] = useState(withdrawable[0]?.symbol ?? "");
  const [network, setNetwork] = useState("TRC20");
  const [amountStr, setAmountStr] = useState("");
  const [destination, setDestination] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [withdrawalPin, setWithdrawalPin] = useState("");
  const [submitStatus, setSubmitStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selected = withdrawable.find((t) => t.symbol === selectedSymbol);
  const amount = Number.parseFloat(amountStr);
  const validAmount = Number.isFinite(amount) && amount > 0;
  const minOk = !selected || amount >= selected.minWithdrawal;
  const balanceOk = !!selected && amount <= selected.balance;
  const fee = selected
    ? Number((amount * (selected.withdrawFeeBps / 10000)).toFixed(8))
    : 0;
  const net = Math.max(amount - fee, 0);
  const canReview =
    !!selected && validAmount && minOk && balanceOk && destination.trim().length >= 10;

  if (!hasWithdrawalPin) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[20px] border border-border bg-surface-soft p-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Lock size={22} />
        </div>
        <h3 className="font-display text-xl text-foreground">Set a withdrawal PIN first</h3>
        <p className="max-w-sm text-sm text-muted">
          For your security, every withdrawal requires a 6-digit PIN. Set one from your
          profile to continue.
        </p>
        <Link
          href="/me"
          className="mt-2 inline-flex items-center justify-center rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-background transition hover:opacity-90"
        >
          Set withdrawal PIN
        </Link>
      </div>
    );
  }

  if (withdrawable.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-background/20 p-10 text-center">
        <AlertCircle size={28} className="text-yellow-400" />
        <p className="text-sm font-semibold text-foreground">No withdrawable balance</p>
        <p className="max-w-sm text-xs text-muted">
          Deposit a token first, or swap into a token you want to withdraw.
        </p>
      </div>
    );
  }

  if (submitStatus === "success") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[20px] border border-border bg-surface-soft p-10 text-center">
        <CheckCircle size={40} className="text-up" />
        <h3 className="font-display text-2xl text-foreground">Withdrawal submitted</h3>
        <p className="max-w-xs text-sm text-muted">
          Your request is pending admin review. Funds are held until the decision is made.
        </p>
      </div>
    );
  }

  const submitWithPin = async () => {
    if (!selected) return;
    if (!/^\d{6}$/.test(withdrawalPin)) {
      setErrorMsg("Enter your 6-digit withdrawal PIN.");
      return;
    }

    setSubmitStatus("loading");
    setErrorMsg(null);

    const res = await fetch("/api/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tokenSymbol: selected.symbol,
        network,
        amount,
        destinationAddress: destination.trim(),
        withdrawalPin,
      }),
    });

    if (res.ok) {
      setSubmitStatus("success");
      setReviewOpen(false);
    } else {
      const json = (await res.json()) as { error?: { message?: string } };
      setErrorMsg(json.error?.message ?? "Withdrawal request failed.");
      setSubmitStatus("error");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Token selector */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
          Token
        </label>
        <div className="flex flex-wrap gap-2">
          {withdrawable.map((t) => (
            <button
              key={t.symbol}
              type="button"
              onClick={() => {
                setSelectedSymbol(t.symbol);
                setAmountStr("");
              }}
              className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition ${
                selectedSymbol === t.symbol
                  ? "bg-brand text-background"
                  : "border border-border bg-background/30 text-foreground hover:border-brand"
              }`}
            >
              <CoinIcon symbol={t.symbol} iconPath={t.iconPath} size={16} />
              {t.symbol}
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <div className="rounded-2xl border border-border bg-background/30 p-5">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted">Available</span>
              <span className="font-mono text-foreground">
                {formatTokenAmount(selected.balance, selected.symbol, selected.decimals)}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted">Min</span>
              <span className="font-mono text-foreground">
                {selected.minWithdrawal > 0
                  ? formatTokenAmount(selected.minWithdrawal, selected.symbol, selected.decimals)
                  : "—"}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted">Fee</span>
              <span className="font-mono text-foreground">
                {(selected.withdrawFeeBps / 100).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Amount */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
          Amount ({selected?.symbol ?? "TOKEN"})
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            step="any"
            placeholder={`Enter amount in ${selected?.symbol ?? ""}`}
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            className="w-full rounded-xl border border-border bg-background/30 px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-brand focus:outline-none"
          />
          <button
            type="button"
            onClick={() => selected && setAmountStr(String(selected.balance))}
            className="rounded-full border border-border bg-background/40 px-3 py-2 text-xs font-semibold text-muted transition hover:border-brand hover:text-foreground"
          >
            Max
          </button>
        </div>
        {selected && validAmount && (
          <p className="text-xs text-muted">
            ≈ {formatUsdFromCents(Math.round(amount * selected.usdPriceCents))}
          </p>
        )}
        {validAmount && !minOk && selected && (
          <p className="text-xs text-down">
            Below min withdrawal ({formatTokenAmount(selected.minWithdrawal, selected.symbol, selected.decimals)}).
          </p>
        )}
        {validAmount && !balanceOk && (
          <p className="text-xs text-down">Amount exceeds available balance.</p>
        )}
      </div>

      {/* Network */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
          Network
        </label>
        <div className="flex flex-wrap gap-2">
          {NETWORKS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNetwork(n)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                network === n
                  ? "bg-brand text-background"
                  : "border border-border bg-background/30 text-foreground hover:border-brand"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Destination */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
          Destination address
        </label>
        <input
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Paste your wallet address"
          className="w-full rounded-xl border border-border bg-background/30 px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted focus:border-brand focus:outline-none"
        />
      </div>

      {/* Net preview */}
      {selected && validAmount && minOk && balanceOk && (
        <div className="rounded-2xl border border-border bg-background/30 p-4 text-sm">
          <dl className="flex flex-col gap-1.5 text-muted">
            <div className="flex justify-between">
              <dt>You send</dt>
              <dd className="font-mono text-foreground">
                {formatTokenAmount(amount, selected.symbol, selected.decimals)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>Fee ({(selected.withdrawFeeBps / 100).toFixed(2)}%)</dt>
              <dd className="font-mono text-foreground">
                {formatTokenAmount(fee, selected.symbol, selected.decimals)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>You receive</dt>
              <dd className="font-mono font-semibold text-foreground">
                {formatTokenAmount(net, selected.symbol, selected.decimals)}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {errorMsg && !reviewOpen && (
        <div className="flex items-center gap-2 rounded-xl border border-down/40 bg-down/10 px-4 py-3">
          <AlertCircle size={16} className="text-down" />
          <p className="text-sm text-down">{errorMsg}</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setWithdrawalPin("");
          setErrorMsg(null);
          setReviewOpen(true);
        }}
        disabled={!canReview || submitStatus === "loading"}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-4 text-sm font-semibold text-background shadow-lg shadow-brand/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
      >
        <ArrowDownToLine size={16} />
        Review withdrawal
      </button>

      {reviewOpen && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-border bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-brand" />
                <h3 className="font-display text-base text-foreground">Review withdrawal</h3>
              </div>
              <button
                type="button"
                onClick={() => setReviewOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted transition hover:border-brand hover:text-foreground"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex flex-col gap-4 px-6 py-5">
              <div className="rounded-2xl border border-border bg-background/30 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                  You will receive
                </p>
                <p className="mt-1 font-display text-3xl font-bold text-foreground tabular-nums">
                  {formatTokenAmount(net, selected.symbol, selected.decimals)}
                </p>
                <p className="text-xs text-muted">
                  ≈ {formatUsdFromCents(Math.round(net * selected.usdPriceCents))} on {network}
                </p>
              </div>

              <dl className="flex flex-col gap-2 text-sm">
                <Row label="Token" value={selected.symbol} />
                <Row label="Network" value={network} />
                <Row
                  label="Destination"
                  value={
                    destination.length > 16
                      ? `${destination.slice(0, 8)}…${destination.slice(-8)}`
                      : destination
                  }
                  mono
                />
                <Row
                  label="Fee"
                  value={`${formatTokenAmount(fee, selected.symbol, selected.decimals)} (${(selected.withdrawFeeBps / 100).toFixed(2)}%)`}
                />
                <Row label="ETA" value="1-3 hours" />
              </dl>

              <div className="flex flex-col gap-2 rounded-2xl border border-border bg-background/30 px-4 py-4">
                <label
                  htmlFor="withdrawalPin"
                  className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted"
                >
                  Confirm with 6-digit withdrawal PIN
                </label>
                <input
                  id="withdrawalPin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  pattern="\d{6}"
                  maxLength={6}
                  autoFocus
                  value={withdrawalPin}
                  onChange={(event) =>
                    setWithdrawalPin(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  className="rounded-xl border border-border bg-background/40 px-4 py-2.5 text-center font-mono text-lg tracking-[0.4em] text-foreground outline-none focus:border-brand"
                />
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 rounded-xl border border-down/40 bg-down/10 px-3 py-2">
                  <AlertCircle size={14} className="text-down" />
                  <p className="text-xs text-down">{errorMsg}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewOpen(false)}
                  disabled={submitStatus === "loading"}
                  className="flex-1 rounded-xl border border-border bg-background/40 px-4 py-3 text-sm font-semibold text-foreground transition hover:border-border/80 disabled:opacity-40"
                >
                  Edit details
                </button>
                <button
                  type="button"
                  onClick={submitWithPin}
                  disabled={submitStatus === "loading"}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-background shadow-lg shadow-brand/25 transition hover:brightness-110 disabled:opacity-40"
                >
                  {submitStatus === "loading" ? "Submitting…" : "Confirm & submit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0 last:pb-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`text-sm font-semibold text-foreground ${mono ? "font-mono" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
