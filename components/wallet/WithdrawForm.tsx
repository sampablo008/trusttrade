"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, CheckCircle, ArrowDownToLine } from "lucide-react";
import { formatUsdFromCents } from "@/lib/utils/format";
import type { UserBalance } from "@/types/trade";

const NETWORKS = ["TRC20", "ERC20", "BEP20", "BTC"];
const TOKENS = ["USDT", "BTC", "ETH", "BNB"];
const MIN_WITHDRAW_CENTS = 5_000;

const schema = z.object({
  amountCents: z.number().int().min(MIN_WITHDRAW_CENTS, `Minimum withdrawal is $${MIN_WITHDRAW_CENTS / 100}`),
  tokenSymbol: z.string().min(1),
  network: z.string().min(1),
  destinationAddress: z.string().min(10, "Enter a valid destination address."),
});

type FormData = z.infer<typeof schema>;

interface Props {
  balance: UserBalance;
}

const PRESETS = [50, 100, 250, 500];

export default function WithdrawForm({ balance }: Props) {
  const [submitStatus, setSubmitStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      amountCents: 0,
      tokenSymbol: "USDT",
      network: "TRC20",
      destinationAddress: "",
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const amountCents = watch("amountCents");
  const withdrawable = balance.withdrawableCents;

  const onSubmit = async (data: FormData) => {
    setSubmitStatus("loading");
    setErrorMsg(null);

    const res = await fetch("/api/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      setSubmitStatus("success");
    } else {
      const json = await res.json() as { error?: { message?: string } };
      setErrorMsg(json.error?.message ?? "Withdrawal request failed.");
      setSubmitStatus("error");
    }
  };

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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      {/* Balance breakdown */}
      <div className="rounded-2xl border border-border bg-background/30 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
          Balance breakdown
        </p>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted">Total</span>
            <span className="font-display text-lg text-foreground">
              {formatUsdFromCents(balance.balanceCents)}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted">Locked</span>
            <span className="font-display text-lg text-yellow-400">
              −{formatUsdFromCents(balance.lockedBonusCents + balance.lockedInTradesCents)}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted">Withdrawable</span>
            <span className="font-display text-lg text-up">
              {formatUsdFromCents(withdrawable)}
            </span>
          </div>
        </div>
      </div>

      {/* Amount */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
          Amount (USD)
        </label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              disabled={p * 100 > withdrawable}
              onClick={() => setValue("amountCents", p * 100)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-30 ${
                amountCents === p * 100
                  ? "bg-brand text-background"
                  : "border border-border bg-background/30 text-foreground hover:border-brand"
              }`}
            >
              ${p}
            </button>
          ))}
          <button
            type="button"
            disabled={withdrawable <= 0}
            onClick={() => setValue("amountCents", withdrawable)}
            className="rounded-full border border-border bg-background/30 px-4 py-2 text-sm font-semibold text-foreground transition hover:border-brand disabled:opacity-30"
          >
            Max
          </button>
        </div>
        <input
          type="number"
          min={0}
          step={1}
          placeholder={`Min $${MIN_WITHDRAW_CENTS / 100}`}
          className="mt-1 w-full rounded-xl border border-border bg-background/30 px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-brand focus:outline-none"
          onChange={(e) => setValue("amountCents", Math.round(parseFloat(e.target.value) * 100) || 0)}
        />
        {errors.amountCents && (
          <p className="text-xs text-down">{errors.amountCents.message}</p>
        )}
      </div>

      {/* Token + network row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
            Token
          </label>
          <select
            {...register("tokenSymbol")}
            className="w-full rounded-xl border border-border bg-background/30 px-4 py-3 text-sm text-foreground focus:border-brand focus:outline-none"
          >
            {TOKENS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
            Network
          </label>
          <select
            {...register("network")}
            className="w-full rounded-xl border border-border bg-background/30 px-4 py-3 text-sm text-foreground focus:border-brand focus:outline-none"
          >
            {NETWORKS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Destination address */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
          Destination Address
        </label>
        <input
          type="text"
          {...register("destinationAddress")}
          placeholder="Paste your wallet address"
          className="w-full rounded-xl border border-border bg-background/30 px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted focus:border-brand focus:outline-none"
        />
        {errors.destinationAddress && (
          <p className="text-xs text-down">{errors.destinationAddress.message}</p>
        )}
      </div>

      {withdrawable < MIN_WITHDRAW_CENTS && (
        <div className="flex items-center gap-2 rounded-xl border border-yellow-400/40 bg-yellow-400/10 px-4 py-3">
          <AlertCircle size={16} className="text-yellow-400" />
          <p className="text-sm text-yellow-400">
            Minimum withdrawal is ${MIN_WITHDRAW_CENTS / 100}. You need{" "}
            {formatUsdFromCents(MIN_WITHDRAW_CENTS - withdrawable)} more withdrawable balance.
          </p>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-down/40 bg-down/10 px-4 py-3">
          <AlertCircle size={16} className="text-down" />
          <p className="text-sm text-down">{errorMsg}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={submitStatus === "loading" || withdrawable < MIN_WITHDRAW_CENTS}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-4 text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-40"
      >
        <ArrowDownToLine size={16} />
        {submitStatus === "loading" ? "Submitting…" : "Request Withdrawal"}
      </button>
    </form>
  );
}
