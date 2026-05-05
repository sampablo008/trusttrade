"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import GiftBoxBurst from "@/components/welcome/GiftBoxBurst";
import { formatUsdtFromCents } from "@/lib/utils/format";

interface Props {
  amountCents: number;
  displayName: string | null;
}

export default function WelcomeClaim({ amountCents, displayName }: Props) {
  const router = useRouter();
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);

  const handleClaim = async () => {
    setClaiming(true);
    setError(null);
    try {
      const res = await fetch("/api/bonus/signup/claim", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Couldn't claim your bonus.");
      }
      setClaimed(true);
      toast.success(`${formatUsdtFromCents(amountCents)} added to your wallet`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Claim failed.";
      setError(message);
      throw err;
    } finally {
      setClaiming(false);
    }
  };

  const greeting = displayName ? `Welcome, ${displayName}` : "Welcome aboard";

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center overflow-hidden px-6 py-12 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-brand/15 via-transparent to-transparent"
      />

      <p className="text-xs font-semibold uppercase tracking-[0.32em] text-brand">
        {greeting}
      </p>
      <h1 className="mt-3 font-display text-4xl leading-[1.05] tracking-tight text-foreground sm:text-6xl">
        Your welcome gift
        <br />
        is waiting.
      </h1>
      <p className="mt-4 max-w-md text-sm leading-7 text-muted">
        Tap the box to claim your{" "}
        <span className="font-semibold text-foreground">
          {formatUsdtFromCents(amountCents)}
        </span>{" "}
        signup bonus. Once claimed, it lands in your USDT balance and you're ready to trade.
      </p>

      <div className="mt-10">
        <GiftBoxBurst
          amountLabel={formatUsdtFromCents(amountCents)}
          onClaim={handleClaim}
          claiming={claiming}
          errorMessage={error}
        />
      </div>

      {claimed && (
        <div className="mt-10 flex w-full max-w-sm flex-col gap-3">
          <button
            type="button"
            onClick={() => router.push("/trade/BTC")}
            className="inline-flex w-full items-center justify-center rounded-full bg-brand px-6 py-4 text-sm font-semibold text-background shadow-lg shadow-brand/30 transition hover:opacity-90"
          >
            Start trading
          </button>
          <button
            type="button"
            onClick={() => router.push("/wallet")}
            className="inline-flex w-full items-center justify-center rounded-full border border-border bg-surface/60 px-6 py-4 text-sm font-semibold text-foreground transition hover:border-brand/60"
          >
            View my wallet
          </button>
        </div>
      )}
    </div>
  );
}
