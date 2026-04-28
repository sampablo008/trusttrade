"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Zap } from "lucide-react";
import CoinIcon from "@/components/ui/CoinIcon";
import AmountInput from "@/components/trade/AmountInput";
import LongShortToggle from "@/components/trade/LongShortToggle";
import PayoutPreview from "@/components/trade/PayoutPreview";
import PeriodSelector from "@/components/trade/PeriodSelector";
import { useTradingShellStore } from "@/stores/trading-shell-store";
import { formatUsdFromCents } from "@/lib/utils/format";
import type { PublicToken, PublicTradePeriod } from "@/types/market";
import type { TradeDirection } from "@/types/trade";
import { fetchJson } from "@/lib/api/client";
import { placeTradeResultSchema } from "@/schemas/trade";

interface OrderTicketProps {
  token: PublicToken;
  periods: PublicTradePeriod[];
  onTradeSuccess?: () => void;
  onTradeError?: (message: string) => void;
}

export default function OrderTicket({
  token,
  periods,
  onTradeSuccess,
  onTradeError,
}: OrderTicketProps) {
  const {
    activeDirection,
    activeStakeCents,
    balance,
    selectedPeriodId,
    setActiveDirection,
    setActiveStakeCents,
    setSelectedPeriodId,
    upsertTrade,
  } = useTradingShellStore();

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const availableCents = balance
    ? Math.max(balance.balanceCents - balance.lockedInTradesCents - balance.lockedBonusCents, 0)
    : 0;

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId && p.isEnabled) ?? null;
  const firstPeriod = periods.find((p) => p.isEnabled) ?? null;
  const activePeriod = selectedPeriod ?? firstPeriod;

  const canPlace =
    activePeriod !== null &&
    activeStakeCents >= (activePeriod?.minAmountCents ?? 0) &&
    activeStakeCents <= Math.min(activePeriod?.maxAmountCents ?? 0, availableCents) &&
    !isPending;

  const handlePlace = () => {
    if (!activePeriod || !canPlace) return;
    setErrorMsg(null);

    startTransition(async () => {
      try {
        const result = await fetchJson(
          "/api/trades",
          placeTradeResultSchema,
          {
            method: "POST",
            body: JSON.stringify({
              amountCents: activeStakeCents,
              direction: activeDirection as TradeDirection,
              periodId: activePeriod.id,
              tokenId: token.id,
            }),
          },
        );
        upsertTrade(result.trade);
        onTradeSuccess?.();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Trade failed.";
        setErrorMsg(message);
        onTradeError?.(message);
      }
    });
  };

  return (
    <div className="sticky top-20 flex flex-col gap-4 overflow-hidden rounded-[28px] border border-border bg-surface-soft p-5 shadow-2xl shadow-black/40">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-linear-to-br from-brand/30 to-brand-soft">
            <CoinIcon symbol={token.symbol} iconPath={token.iconPath} size={20} />
          </div>
          <div className="flex flex-col leading-tight">
            <p className="text-sm font-semibold text-foreground">{token.symbol} / USDT</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Place order</p>
          </div>
        </div>
        <span className="rounded-full border border-border bg-background/40 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
          Binary
        </span>
      </div>

      <LongShortToggle
        value={activeDirection}
        onChange={setActiveDirection}
        disabled={isPending}
      />

      <PeriodSelector
        periods={periods}
        selectedId={activePeriod?.id ?? null}
        onSelect={(p) => setSelectedPeriodId(p.id)}
        disabled={isPending}
      />

      <AmountInput
        valueCents={activeStakeCents}
        onChange={setActiveStakeCents}
        minCents={activePeriod?.minAmountCents ?? 100}
        maxCents={activePeriod?.maxAmountCents ?? 1_000_000}
        availableCents={availableCents}
        disabled={isPending}
      />

      {activePeriod && (
        <PayoutPreview
          stakeCents={activeStakeCents}
          payoutBps={activePeriod.payoutBps}
        />
      )}

      {errorMsg && (
        <div className="flex items-start gap-2 rounded-xl border border-[hsl(var(--color-down))]/30 bg-[hsl(var(--color-down))]/10 px-3 py-2.5 text-xs font-semibold text-[hsl(var(--color-down))]">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <button
        type="button"
        disabled={!canPlace}
        onClick={handlePlace}
        className={[
          "group flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold tracking-wide transition-all",
          "bg-brand text-white shadow-lg shadow-brand/25 hover:brightness-110",
          !canPlace ? "cursor-not-allowed opacity-50" : "",
          isPending ? "animate-pulse" : "",
        ].join(" ")}
      >
        {isPending ? (
          "Placing…"
        ) : (
          <>
            <Zap size={14} className="transition-transform group-hover:scale-110" />
            {activeDirection === "long" ? "Go Long" : "Go Short"}
            <span className="opacity-70">· {formatUsdFromCents(activeStakeCents)}</span>
          </>
        )}
      </button>

      <p className="text-center text-[10px] text-muted">
        By placing a trade you agree to TrustTrade&apos;s market rules. Trades settle automatically at
        expiry.
      </p>
    </div>
  );
}
