"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownUp, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import CoinIcon from "@/components/ui/CoinIcon";
import { formatTokenAmount, formatUsdFromCents } from "@/lib/utils/format";
import type { PublicToken } from "@/types/market";
import type { SwapQuote } from "@/types/swap";
import type { WalletBalancesResult } from "@/types/wallet-balance";

interface SwapSide {
  symbol: string;
  name: string;
  iconPath: string | null;
  decimals: number;
  isUsd: boolean;
  usdPriceCents: number;
  swapFeeBps: number;
}

interface Props {
  tokens: PublicToken[];
  balances: WalletBalancesResult;
}

const buildSides = (tokens: PublicToken[]): SwapSide[] =>
  tokens.map((t) => ({
    symbol: t.symbol,
    name: t.name,
    iconPath: t.iconPath,
    decimals: t.decimals,
    isUsd: false,
    usdPriceCents: t.priceCents,
    swapFeeBps: t.swapFeeBps,
  }));

const balanceFor = (
  side: SwapSide,
  balances: WalletBalancesResult,
): number => {
  if (side.isUsd) return balances.usdBalanceCents / 100;
  const t = balances.tokens.find((x) => x.symbol === side.symbol);
  return t?.balance ?? 0;
};

export default function SwapForm({ tokens, balances }: Props) {
  const sides = useMemo(() => buildSides(tokens), [tokens]);
  const [fromSymbol, setFromSymbol] = useState(
    balances.tokens[0]?.symbol ?? sides[0]?.symbol ?? "",
  );
  const [toSymbol, setToSymbol] = useState(
    // default the destination to a different token than `from`
    sides.find((s) => s.symbol !== (balances.tokens[0]?.symbol ?? sides[0]?.symbol))?.symbol ??
      sides[1]?.symbol ??
      sides[0]?.symbol ??
      "",
  );
  const [amountStr, setAmountStr] = useState("");
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SwapQuote | null>(null);

  const fromSide = sides.find((s) => s.symbol === fromSymbol) ?? sides[0];
  const toSide = sides.find((s) => s.symbol === toSymbol) ?? sides[0];
  const amount = Number.parseFloat(amountStr);
  const validAmount = Number.isFinite(amount) && amount > 0;
  const fromBalance = fromSide ? balanceFor(fromSide, balances) : 0;
  const sufficient = validAmount && amount <= fromBalance;
  const sameSide = fromSymbol === toSymbol;

  useEffect(() => {
    if (!validAmount || sameSide) {
      setQuote(null);
      setQuoteError(null);
      return;
    }
    let cancelled = false;
    setQuoting(true);
    setQuoteError(null);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/swaps/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fromSymbol, toSymbol, fromAmount: amount }),
        });
        const json = (await res.json()) as
          | { data: SwapQuote }
          | { error: { message: string } };
        if (cancelled) return;
        if ("data" in json) {
          setQuote(json.data);
        } else {
          setQuote(null);
          setQuoteError(json.error?.message ?? "Quote failed.");
        }
      } catch (err) {
        if (!cancelled) {
          setQuote(null);
          setQuoteError(err instanceof Error ? err.message : "Quote failed.");
        }
      } finally {
        if (!cancelled) setQuoting(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [fromSymbol, toSymbol, amount, validAmount, sameSide]);

  const flip = () => {
    const prevFrom = fromSymbol;
    setFromSymbol(toSymbol);
    setToSymbol(prevFrom);
    setQuote(null);
  };

  const handleMax = () => {
    if (!fromSide) return;
    const decimals = Math.min(fromSide.decimals, 8);
    setAmountStr(Number(fromBalance.toFixed(decimals)).toString());
  };

  const submit = async () => {
    if (!quote || !validAmount || !sufficient) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/swaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromSymbol, toSymbol, fromAmount: amount }),
      });
      const json = (await res.json()) as
        | { data: unknown }
        | { error: { message: string } };
      if ("data" in json) {
        setSuccess(quote);
        setAmountStr("");
        setQuote(null);
      } else {
        setSubmitError(json.error?.message ?? "Swap failed.");
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Swap failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-up/40 bg-up/5 p-8 text-center">
        <CheckCircle size={36} className="text-up" />
        <h3 className="font-display text-2xl text-foreground">Swap complete</h3>
        <p className="text-sm text-muted">
          You swapped {success.fromAmount} {success.fromSymbol} for{" "}
          {formatTokenAmount(success.toAmount, success.toSymbol, 8)}.
        </p>
        <button
          type="button"
          onClick={() => {
            setSuccess(null);
            location.reload();
          }}
          className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-background transition hover:brightness-110"
        >
          Make another swap
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* From — allow USD (bonus pool) as a source */}
      <SideCard
        label="You pay"
        sides={sides}
        selected={fromSymbol}
        onSelect={(s) => {
          if (s === toSymbol) setToSymbol(fromSymbol);
          setFromSymbol(s);
        }}
        amount={amountStr}
        onAmountChange={setAmountStr}
        balance={fromBalance}
        balanceSymbol={fromSide?.symbol ?? ""}
        showMax
        onMax={handleMax}
      />

      <div className="flex justify-center">
        <button
          type="button"
          onClick={flip}
          className="rounded-full border border-border bg-background/40 p-2 text-muted transition hover:border-brand hover:text-foreground"
        >
          <ArrowDownUp size={16} />
        </button>
      </div>

      {/* To */}
      <SideCard
        label="You receive"
        sides={sides}
        selected={toSymbol}
        onSelect={(s) => {
          if (s === fromSymbol) setFromSymbol(toSymbol);
          setToSymbol(s);
        }}
        amount={
          quote ? formatTokenAmount(quote.toAmount, toSide?.symbol ?? "", toSide?.decimals ?? 8) : ""
        }
        balance={toSide ? balanceFor(toSide, balances) : 0}
        balanceSymbol={toSide?.symbol ?? ""}
        readOnly
      />

      {/* Quote panel */}
      <div className="rounded-2xl border border-border bg-background/30 p-4 text-sm">
        {sameSide ? (
          <p className="text-muted">Pick two different sides.</p>
        ) : !validAmount ? (
          <p className="text-muted">Enter an amount to get a quote.</p>
        ) : quoting ? (
          <p className="flex items-center gap-2 text-muted">
            <Loader2 size={14} className="animate-spin" /> Fetching live rate…
          </p>
        ) : quoteError ? (
          <p className="flex items-center gap-2 text-down">
            <AlertCircle size={14} /> {quoteError}
          </p>
        ) : quote ? (
          <dl className="flex flex-col gap-1.5 text-muted">
            <div className="flex justify-between">
              <dt>Rate</dt>
              <dd className="font-mono text-foreground">
                1 {quote.fromSymbol} ≈ {quote.rate.toFixed(8)} {quote.toSymbol}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>Fee ({(quote.feeBps / 100).toFixed(2)}%)</dt>
              <dd className="font-mono text-foreground">
                {formatTokenAmount(quote.feeAmount, quote.fromSymbol, 8)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>You receive</dt>
              <dd className="font-mono font-semibold text-foreground">
                {formatTokenAmount(quote.toAmount, quote.toSymbol, 8)}
              </dd>
            </div>
            <div className="flex justify-between text-xs">
              <dt>USD reference</dt>
              <dd className="text-muted">
                {formatUsdFromCents(Math.round(amount * quote.fromUsdPriceCents))}
              </dd>
            </div>
          </dl>
        ) : null}
      </div>

      {submitError && (
        <div className="flex items-center gap-2 rounded-xl border border-down/40 bg-down/10 px-4 py-3 text-sm text-down">
          <AlertCircle size={14} />
          <span>{submitError}</span>
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!quote || !sufficient || submitting || sameSide}
        className="rounded-2xl bg-brand px-6 py-4 text-sm font-semibold text-background shadow-lg shadow-brand/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
      >
        {submitting
          ? "Swapping…"
          : sameSide
            ? "Pick two different sides"
            : !validAmount
              ? "Enter amount"
              : !sufficient
                ? `Insufficient ${fromSide?.symbol ?? ""}`
                : `Swap ${fromSide?.symbol} → ${toSide?.symbol}`}
      </button>
    </div>
  );
}

interface SideCardProps {
  label: string;
  sides: SwapSide[];
  selected: string;
  onSelect: (symbol: string) => void;
  amount: string;
  onAmountChange?: (v: string) => void;
  balance: number;
  balanceSymbol: string;
  readOnly?: boolean;
  showMax?: boolean;
  onMax?: () => void;
}

function SideCard({
  label,
  sides,
  selected,
  onSelect,
  amount,
  onAmountChange,
  balance,
  balanceSymbol,
  readOnly,
  showMax,
  onMax,
}: SideCardProps) {
  const side = sides.find((s) => s.symbol === selected);
  return (
    <div className="rounded-2xl border border-border bg-background/30 p-4">
      <div className="flex items-center justify-between text-xs text-muted">
        <span className="font-semibold uppercase tracking-[0.22em]">{label}</span>
        <span>
          Balance:{" "}
          <span className="font-mono text-foreground">
            {balanceSymbol === "USD"
              ? formatUsdFromCents(Math.round(balance * 100))
              : `${formatTokenAmount(balance, balanceSymbol, 8)}`}
          </span>
        </span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <select
          value={selected}
          onChange={(e) => onSelect(e.target.value)}
          className="rounded-xl border border-border bg-background/40 px-3 py-2 text-sm font-semibold text-foreground focus:border-brand focus:outline-none"
        >
          {sides.map((s) => (
            <option key={s.symbol} value={s.symbol}>
              {s.symbol}
            </option>
          ))}
        </select>
        <div className="flex flex-1 items-center gap-2">
          <input
            type={readOnly ? "text" : "number"}
            value={amount}
            placeholder="0.00"
            min={0}
            step="any"
            readOnly={readOnly}
            onChange={(e) => onAmountChange?.(e.target.value)}
            className="flex-1 bg-transparent text-right text-2xl font-semibold text-foreground outline-none"
          />
          {showMax && (
            <button
              type="button"
              onClick={onMax}
              className="rounded-full border border-border bg-background/40 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted transition hover:border-brand hover:text-foreground"
            >
              Max
            </button>
          )}
        </div>
      </div>
      {side && !side.isUsd && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
          <CoinIcon symbol={side.symbol} iconPath={side.iconPath} size={12} />
          {side.name}
        </p>
      )}
    </div>
  );
}
