"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, Check, ChevronDown, Zap } from "lucide-react";
import CoinIcon from "@/components/ui/CoinIcon";
import AmountInput from "@/components/trade/AmountInput";
import LongShortToggle from "@/components/trade/LongShortToggle";
import PayoutPreview from "@/components/trade/PayoutPreview";
import PeriodSelector from "@/components/trade/PeriodSelector";
import { useTradingShellStore } from "@/stores/trading-shell-store";
import { formatTokenAmount, formatUsdFromCents } from "@/lib/utils/format";
import type { TopCoin } from "@/lib/markets/top-coins";
import type { PublicToken, PublicTradePeriod } from "@/types/market";
import type { TradeDirection } from "@/types/trade";
import { fetchJson } from "@/lib/api/client";
import { placeTradeResultSchema } from "@/schemas/trade";

interface OrderTicketProps {
  token: PublicToken;
  periods: PublicTradePeriod[];
  tokenFreeBalance: number;
  tokenUsdPriceCents: number;
  coins?: TopCoin[];
  iconPaths?: Record<string, string | null | undefined>;
  onTradeSuccess?: () => void;
  onTradeError?: (message: string) => void;
}

export default function OrderTicket({
  token,
  periods,
  tokenFreeBalance,
  tokenUsdPriceCents,
  coins,
  iconPaths = {},
  onTradeSuccess,
  onTradeError,
}: OrderTicketProps) {
  const router = useRouter();
  const [tokenMenuOpen, setTokenMenuOpen] = useState(false);

  const selectableCoins =
    coins?.filter((c) => c.symbol !== "USDT" && c.symbol !== "USDC") ?? [];
  const canSwitchToken = selectableCoins.length > 0;

  const handleSelectToken = (symbol: string) => {
    setTokenMenuOpen(false);
    if (symbol === token.symbol) return;
    if ("startViewTransition" in document) {
      (document as Document & { startViewTransition: (cb: () => void) => void })
        .startViewTransition(() => { router.push(`/trade/${symbol}`); });
    } else {
      router.push(`/trade/${symbol}`);
    }
  };

  const {
    activeDirection,
    activeStakeCents,
    selectedPeriodId,
    setActiveDirection,
    setActiveStakeCents,
    setSelectedPeriodId,
    upsertTrade,
  } = useTradingShellStore();

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const priceAvailable = tokenUsdPriceCents > 0;
  const availableCents =
    priceAvailable ? Math.floor(tokenFreeBalance * tokenUsdPriceCents) : 0;
  const stakeTokenAmount =
    priceAvailable ? activeStakeCents / tokenUsdPriceCents : 0;

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId && p.isEnabled) ?? null;
  const firstPeriod = periods.find((p) => p.isEnabled) ?? null;
  const activePeriod = selectedPeriod ?? firstPeriod;

  const canPlace =
    priceAvailable &&
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
        // Reveal the actual sampled payout to the user (range pre-trade → fixed post-trade).
        const sampledPercent = ((result.trade.payoutBps / 10_000) * 100 - 100).toFixed(0);
        toast.success(`Trade placed · ${sampledPercent}% payout locked`, {
          description: `${token.symbol} ${activeDirection === "long" ? "Long" : "Short"} · ${formatUsdFromCents(activeStakeCents)}`,
          id: result.trade.id,
        });
        onTradeSuccess?.();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Trade failed.";
        setErrorMsg(message);
        onTradeError?.(message);
      }
    });
  };

  return (
    <div className="flex min-h-full flex-col gap-4 rounded-2xl border border-border bg-surface-soft p-5 shadow-2xl shadow-black/40">
      {/* Header */}
      <div className="relative flex items-center justify-between border-b border-border/60 pb-4">
        <button
          type="button"
          onClick={() => canSwitchToken && setTokenMenuOpen((v) => !v)}
          disabled={!canSwitchToken || isPending}
          aria-haspopup="listbox"
          aria-expanded={tokenMenuOpen}
          className={[
            "-ml-1.5 flex items-center gap-2 rounded-xl px-1.5 py-1 text-left transition focus-ring",
            canSwitchToken
              ? "hover:bg-background/40"
              : "cursor-default",
          ].join(" ")}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-linear-to-br from-brand/30 to-brand-soft">
            <CoinIcon symbol={token.symbol} iconPath={token.iconPath} size={20} />
          </div>
          <div className="flex flex-col leading-tight">
            <p className="flex items-center gap-1 text-sm font-semibold text-foreground">
              {token.symbol} / USDT
              {canSwitchToken && (
                <ChevronDown
                  size={14}
                  className={[
                    "text-muted transition-transform",
                    tokenMenuOpen ? "rotate-180" : "",
                  ].join(" ")}
                />
              )}
            </p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Place order</p>
          </div>
        </button>
        <span className="rounded-full border border-border bg-background/40 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
          Binary
        </span>

        {tokenMenuOpen && (
          <>
            <button
              type="button"
              aria-label="Close token menu"
              onClick={() => setTokenMenuOpen(false)}
              className="fixed inset-0 z-30 cursor-default"
            />
            <div
              role="listbox"
              className="absolute left-0 top-14 z-40 max-h-72 w-60 overflow-y-auto rounded-2xl border border-border bg-surface shadow-2xl"
            >
              <div className="flex flex-col py-1.5">
                {selectableCoins.map((coin) => {
                  const active = coin.symbol === token.symbol;
                  return (
                    <button
                      key={coin.symbol}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => handleSelectToken(coin.symbol)}
                      className={[
                        "flex items-center gap-2.5 px-3 py-2 text-left text-sm transition",
                        active
                          ? "bg-brand/10 text-foreground"
                          : "text-foreground hover:bg-background/50",
                      ].join(" ")}
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-linear-to-br from-brand/30 to-brand-soft">
                        <CoinIcon
                          symbol={coin.symbol}
                          iconPath={iconPaths[coin.symbol]}
                          size={18}
                        />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col leading-tight">
                        <span className="font-semibold">{coin.symbol} / USDT</span>
                        <span className="truncate text-[11px] text-muted">{coin.name}</span>
                      </div>
                      {active && <Check size={14} className="text-brand" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {!priceAvailable && (
        <div className="flex items-start gap-2 rounded-xl border border-[hsl(var(--color-down))]/30 bg-[hsl(var(--color-down))]/10 px-3 py-2.5 text-xs font-semibold text-[hsl(var(--color-down))]">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>Price feed unavailable for {token.symbol} — try again shortly.</span>
        </div>
      )}

      <LongShortToggle
        value={activeDirection}
        onChange={setActiveDirection}
        disabled={isPending || !priceAvailable}
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
        tokenSymbol={token.symbol}
        tokenDecimals={token.decimals}
        tokenFreeBalance={tokenFreeBalance}
        disabled={isPending}
      />

      {activePeriod && (
        <PayoutPreview
          stakeCents={activeStakeCents}
          payoutBps={activePeriod.payoutBps}
          payoutMinBps={activePeriod.payoutMinBps}
          payoutMaxBps={activePeriod.payoutMaxBps}
        />
      )}

      {activeStakeCents > 0 && (
        <div className="rounded-xl border border-border/60 bg-background/30 px-3 py-2 text-[11px] text-muted">
          Locks{" "}
          <span className="font-mono font-semibold text-foreground">
            {formatTokenAmount(stakeTokenAmount, token.symbol, token.decimals)}
          </span>{" "}
          <span className="text-muted/80">
            (≈ {formatUsdFromCents(activeStakeCents)})
          </span>{" "}
          from your {token.symbol} balance · payout returns to {token.symbol}
        </div>
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
          "group mt-auto flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold tracking-wide transition-all focus-ring",
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
