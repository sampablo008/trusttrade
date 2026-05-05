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
  usdPriceCents: number;
  swapFeeBps: number;
  minSwap: number;
}

interface Props {
  tokens: PublicToken[];
  balances: WalletBalancesResult;
}

type EditingSide = "from" | "to";

const buildSides = (tokens: PublicToken[]): SwapSide[] =>
  tokens.map((t) => ({
    symbol: t.symbol,
    name: t.name,
    iconPath: t.iconPath,
    decimals: t.decimals,
    usdPriceCents: t.priceCents,
    swapFeeBps: t.swapFeeBps,
    minSwap: t.minSwap,
  }));

const balanceFor = (
  side: SwapSide,
  balances: WalletBalancesResult,
): number =>
  balances.tokens.find((x) => x.symbol === side.symbol)?.balance ?? 0;

const formatMinSwap = (side: SwapSide): string =>
  formatTokenAmount(side.minSwap, side.symbol, Math.min(side.decimals, 8));

export default function SwapForm({ tokens, balances }: Props) {
  const sides = useMemo(() => buildSides(tokens), [tokens]);
  const [fromSymbol, setFromSymbol] = useState(
    balances.tokens[0]?.symbol ?? sides[0]?.symbol ?? "",
  );
  const [toSymbol, setToSymbol] = useState(
    sides.find((s) => s.symbol !== (balances.tokens[0]?.symbol ?? sides[0]?.symbol))?.symbol ??
      sides[1]?.symbol ??
      sides[0]?.symbol ??
      "",
  );
  const [fromAmountStr, setFromAmountStr] = useState("");
  const [toAmountStr, setToAmountStr] = useState("");
  const [editing, setEditing] = useState<EditingSide>("from");
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SwapQuote | null>(null);

  const fromSide = sides.find((s) => s.symbol === fromSymbol) ?? sides[0];
  const toSide = sides.find((s) => s.symbol === toSymbol) ?? sides[0];
  const inputStr = editing === "from" ? fromAmountStr : toAmountStr;
  const inputAmount = Number.parseFloat(inputStr);
  const validInput = Number.isFinite(inputAmount) && inputAmount > 0;
  const fromBalance = fromSide ? balanceFor(fromSide, balances) : 0;
  const sameSide = fromSymbol === toSymbol;
  const fromAmountNum = quote?.fromAmount ?? (editing === "from" ? inputAmount : NaN);
  const sufficient = Number.isFinite(fromAmountNum) && fromAmountNum > 0 && fromAmountNum <= fromBalance;
  const belowMin =
    fromSide && fromSide.minSwap > 0 && Number.isFinite(fromAmountNum) && fromAmountNum < fromSide.minSwap;

  useEffect(() => {
    if (!validInput || sameSide) {
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
          body: JSON.stringify(
            editing === "from"
              ? { fromSymbol, toSymbol, fromAmount: inputAmount }
              : { fromSymbol, toSymbol, toAmount: inputAmount },
          ),
        });
        const json = (await res.json()) as
          | { data: SwapQuote }
          | { error: { message: string } };
        if (cancelled) return;
        if ("data" in json) {
          setQuote(json.data);
          if (editing === "from") {
            const dp = Math.min(toSide?.decimals ?? 8, 8);
            setToAmountStr(Number(json.data.toAmount.toFixed(dp)).toString());
          } else {
            const dp = Math.min(fromSide?.decimals ?? 8, 8);
            setFromAmountStr(Number(json.data.fromAmount.toFixed(dp)).toString());
          }
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
  }, [fromSymbol, toSymbol, inputAmount, validInput, sameSide, editing, fromSide?.decimals, toSide?.decimals]);

  const flip = () => {
    const prevFrom = fromSymbol;
    const prevFromStr = fromAmountStr;
    setFromSymbol(toSymbol);
    setToSymbol(prevFrom);
    setFromAmountStr(toAmountStr);
    setToAmountStr(prevFromStr);
    setEditing(editing === "from" ? "to" : "from");
    setQuote(null);
  };

  const handleMax = () => {
    if (!fromSide) return;
    const decimals = Math.min(fromSide.decimals, 8);
    setFromAmountStr(Number(fromBalance.toFixed(decimals)).toString());
    setEditing("from");
  };

  const submit = async () => {
    if (!quote || !sufficient || belowMin) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/swaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromSymbol, toSymbol, fromAmount: quote.fromAmount }),
      });
      const json = (await res.json()) as
        | { data: unknown }
        | { error: { message: string } };
      if ("data" in json) {
        setSuccess(quote);
        setFromAmountStr("");
        setToAmountStr("");
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

  const canSubmit = !!quote && sufficient && !belowMin && !sameSide && !quoting;

  return (
    <div className="flex flex-col gap-4">
      <SideCard
        label="You pay"
        sides={sides}
        selected={fromSymbol}
        onSelect={(s) => {
          if (s === toSymbol) setToSymbol(fromSymbol);
          setFromSymbol(s);
        }}
        amount={fromAmountStr}
        onAmountChange={(v) => {
          setFromAmountStr(v);
          setEditing("from");
        }}
        balance={fromBalance}
        balanceSymbol={fromSide?.symbol ?? ""}
        usdPriceCents={fromSide?.usdPriceCents ?? 0}
        showMax
        onMax={handleMax}
        helper={
          fromSide && fromSide.minSwap > 0
            ? `Min: ${formatMinSwap(fromSide)}`
            : undefined
        }
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

      <SideCard
        label="You receive"
        sides={sides}
        selected={toSymbol}
        onSelect={(s) => {
          if (s === fromSymbol) setFromSymbol(toSymbol);
          setToSymbol(s);
        }}
        amount={toAmountStr}
        onAmountChange={(v) => {
          setToAmountStr(v);
          setEditing("to");
        }}
        balance={toSide ? balanceFor(toSide, balances) : 0}
        balanceSymbol={toSide?.symbol ?? ""}
        usdPriceCents={toSide?.usdPriceCents ?? 0}
      />

      <div className="rounded-2xl border border-border bg-background/30 p-4 text-sm">
        {sameSide ? (
          <p className="text-muted">Pick two different sides.</p>
        ) : !validInput ? (
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
              <dt>You pay</dt>
              <dd className="font-mono font-semibold text-foreground">
                {formatTokenAmount(quote.fromAmount, quote.fromSymbol, 8)}
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
                {formatUsdFromCents(Math.round(quote.fromAmount * quote.fromUsdPriceCents))}
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
        disabled={!canSubmit || submitting}
        className="rounded-2xl bg-brand px-6 py-4 text-sm font-semibold text-background shadow-lg shadow-brand/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
      >
        {submitting
          ? "Swapping…"
          : sameSide
            ? "Pick two different sides"
            : !validInput
              ? "Enter amount"
              : quoting
                ? "Fetching live rate…"
                : !quote
                  ? "Waiting for quote…"
                  : belowMin
                    ? `Below min ${formatMinSwap(fromSide!)}`
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
  usdPriceCents: number;
  showMax?: boolean;
  onMax?: () => void;
  helper?: string;
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
  usdPriceCents,
  showMax,
  onMax,
  helper,
}: SideCardProps) {
  const side = sides.find((s) => s.symbol === selected);
  const parsedAmount = Number.parseFloat(amount);
  const usdValueCents =
    Number.isFinite(parsedAmount) && parsedAmount > 0
      ? Math.round(parsedAmount * usdPriceCents)
      : null;
  return (
    <div className="rounded-2xl border border-border bg-background/30 p-4">
      <div className="flex items-center justify-between text-xs text-muted">
        <span className="font-semibold uppercase tracking-[0.22em]">{label}</span>
        <span>
          Balance:{" "}
          <span className="font-mono text-foreground">
            {formatTokenAmount(balance, balanceSymbol, 8)}
          </span>
        </span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <select
          value={selected}
          onChange={(e) => onSelect(e.target.value)}
          className="shrink-0 rounded-xl border border-border bg-background/40 px-3 py-2 text-sm font-semibold text-foreground focus:border-brand focus:outline-none"
        >
          {sides.map((s) => (
            <option key={s.symbol} value={s.symbol}>
              {s.symbol}
            </option>
          ))}
        </select>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <input
            type="number"
            value={amount}
            placeholder="0.00"
            min={0}
            step="any"
            inputMode="decimal"
            size={1}
            onChange={(e) => onAmountChange?.(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-right text-2xl font-semibold text-foreground outline-none"
          />
          {showMax && (
            <button
              type="button"
              onClick={onMax}
              className="shrink-0 rounded-full border border-border bg-background/40 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted transition hover:border-brand hover:text-foreground"
            >
              Max
            </button>
          )}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted">
        {side ? (
          <p className="flex items-center gap-1.5">
            <CoinIcon symbol={side.symbol} iconPath={side.iconPath} size={12} />
            {side.name}
          </p>
        ) : <span />}
        <span className="font-mono text-muted">
          {usdValueCents !== null
            ? `≈ ${formatUsdFromCents(usdValueCents)}`
            : helper ?? ""}
        </span>
      </div>
    </div>
  );
}
