"use client";

import { useState, useTransition } from "react";
import AmountInput from "@/components/trade/AmountInput";
import LongShortToggle from "@/components/trade/LongShortToggle";
import PayoutPreview from "@/components/trade/PayoutPreview";
import PeriodSelector from "@/components/trade/PeriodSelector";
import { useTradingShellStore } from "@/stores/trading-shell-store";
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
    <div className="flex flex-col gap-4 rounded-[28px] border border-border bg-surface-soft p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">{token.symbol} / USDT</p>
        <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold text-muted">
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
          direction={activeDirection}
        />
      )}

      {errorMsg && (
        <p className="rounded-xl bg-[hsl(var(--color-down))]/10 px-3 py-2 text-xs font-semibold text-[hsl(var(--color-down))]">
          {errorMsg}
        </p>
      )}

      <button
        type="button"
        disabled={!canPlace}
        onClick={handlePlace}
        className={[
          "w-full rounded-2xl py-3.5 text-sm font-bold tracking-wide transition-all",
          !canPlace
            ? "cursor-not-allowed border border-border text-muted opacity-50"
            : activeDirection === "long"
            ? "bg-[hsl(var(--color-up))] text-black hover:opacity-90"
            : "bg-[hsl(var(--color-down))] text-white hover:opacity-90",
          isPending ? "animate-pulse" : "",
        ].join(" ")}
      >
        {isPending ? "Placing…" : `${activeDirection === "long" ? "▲ Long" : "▼ Short"} — Place Trade`}
      </button>
    </div>
  );
}
