"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowDownToLine,
  CheckCircle,
  Lock,
  Pencil,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import CoinIcon from "@/components/ui/CoinIcon";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { TokenAmountInput } from "@/components/ui/TokenAmountInput";
import { FormField } from "@/components/ui/FormField";
import { CopyButton } from "@/components/ui/CopyButton";
import { formatTokenAmount, formatUsdFromCents } from "@/lib/utils/format";
import type { PublicToken } from "@/types/market";
import type { PrimaryAddress } from "@/types/primary-address";
import type { WalletBalancesResult } from "@/types/wallet-balance";

const NETWORKS = ["TRC20", "ERC20", "BEP20", "BTC"];

interface Props {
  balances: WalletBalancesResult;
  tokens: PublicToken[];
  hasWithdrawalPin: boolean;
  initialPrimaryAddresses: PrimaryAddress[];
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

const norm = (s: string) => s.trim().toUpperCase();

const findPrimary = (
  list: PrimaryAddress[],
  symbol: string,
  network: string,
): PrimaryAddress | null =>
  list.find(
    (item) =>
      norm(item.tokenSymbol) === norm(symbol) &&
      norm(item.network) === norm(network),
  ) ?? null;

const truncateAddress = (addr: string) =>
  addr.length > 16 ? `${addr.slice(0, 8)}…${addr.slice(-8)}` : addr;

export default function WithdrawForm({
  balances,
  tokens,
  hasWithdrawalPin,
  initialPrimaryAddresses,
}: Props) {
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

  const [primaryAddresses, setPrimaryAddresses] = useState<PrimaryAddress[]>(
    initialPrimaryAddresses,
  );
  const [selectedSymbol, setSelectedSymbol] = useState(withdrawable[0]?.symbol ?? "");
  const [network, setNetwork] = useState("TRC20");
  const [amountStr, setAmountStr] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [bindOpen, setBindOpen] = useState(false);
  const [bindMode, setBindMode] = useState<"set" | "change">("set");
  const [bindAddress, setBindAddress] = useState("");
  const [bindPin, setBindPin] = useState("");
  const [bindStatus, setBindStatus] = useState<"idle" | "loading">("idle");
  const [bindError, setBindError] = useState<string | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removePin, setRemovePin] = useState("");
  const [removeStatus, setRemoveStatus] = useState<"idle" | "loading">("idle");
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [withdrawalPin, setWithdrawalPin] = useState("");
  const [submitStatus, setSubmitStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selected = withdrawable.find((t) => t.symbol === selectedSymbol);
  const primary = selected ? findPrimary(primaryAddresses, selected.symbol, network) : null;
  const amount = Number.parseFloat(amountStr);
  const validAmount = Number.isFinite(amount) && amount > 0;
  const minOk = !selected || amount >= selected.minWithdrawal;
  const balanceOk = !!selected && amount <= selected.balance;
  const fee = selected
    ? Number((amount * (selected.withdrawFeeBps / 10000)).toFixed(8))
    : 0;
  const net = Math.max(amount - fee, 0);
  const canReview = !!selected && !!primary && validAmount && minOk && balanceOk;

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
    if (!selected || !primary) return;
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
        destinationAddress: primary.address,
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

  const openBind = (mode: "set" | "change") => {
    setBindMode(mode);
    setBindAddress(mode === "change" && primary ? primary.address : "");
    setBindPin("");
    setBindError(null);
    setBindStatus("idle");
    setBindOpen(true);
  };

  const submitBind = async () => {
    if (!selected) return;
    if (bindAddress.trim().length < 8) {
      setBindError("Address looks too short.");
      return;
    }
    if (!/^\d{6}$/.test(bindPin)) {
      setBindError("Enter your 6-digit withdrawal PIN.");
      return;
    }
    if (bindMode === "change" && primary && bindAddress.trim() === primary.address) {
      setBindError("New address must differ from the current one.");
      return;
    }

    setBindStatus("loading");
    setBindError(null);
    const res = await fetch("/api/me/primary-addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tokenSymbol: selected.symbol,
        network,
        address: bindAddress.trim(),
        withdrawalPin: bindPin,
      }),
    });

    if (res.ok) {
      const json = (await res.json()) as { data: PrimaryAddress };
      setPrimaryAddresses((list) => {
        const without = list.filter(
          (p) =>
            !(
              norm(p.tokenSymbol) === norm(json.data.tokenSymbol) &&
              norm(p.network) === norm(json.data.network)
            ),
        );
        return [...without, json.data];
      });
      setBindOpen(false);
    } else {
      const json = (await res.json()) as { error?: { message?: string } };
      setBindError(json.error?.message ?? "Failed to save address.");
      setBindStatus("idle");
    }
  };

  const openRemove = () => {
    setRemovePin("");
    setRemoveError(null);
    setRemoveStatus("idle");
    setRemoveOpen(true);
  };

  const submitRemove = async () => {
    if (!selected || !primary) return;
    if (!/^\d{6}$/.test(removePin)) {
      setRemoveError("Enter your 6-digit withdrawal PIN.");
      return;
    }
    setRemoveStatus("loading");
    setRemoveError(null);
    const res = await fetch("/api/me/primary-addresses", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tokenSymbol: selected.symbol,
        network,
        withdrawalPin: removePin,
      }),
    });

    if (res.ok) {
      setPrimaryAddresses((list) =>
        list.filter(
          (p) =>
            !(
              norm(p.tokenSymbol) === norm(selected.symbol) &&
              norm(p.network) === norm(network)
            ),
        ),
      );
      setRemoveOpen(false);
    } else {
      const json = (await res.json()) as { error?: { message?: string } };
      setRemoveError(json.error?.message ?? "Failed to remove address.");
      setRemoveStatus("idle");
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

      {/* Primary address */}
      {selected && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
            Primary {selected.symbol} address ({network})
          </label>
          {primary ? (
            <div className="flex flex-col gap-2 rounded-2xl border border-border bg-background/30 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <ShieldCheck size={14} className="shrink-0 text-brand" aria-hidden="true" />
                <span className="truncate font-mono text-sm text-foreground">
                  {primary.address}
                </span>
                <CopyButton value={primary.address} label="Copy primary address" />
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => openBind("change")}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-background/40 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-brand"
                >
                  <Pencil size={12} />
                  Change
                </button>
                <button
                  type="button"
                  onClick={openRemove}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-background/40 px-3 py-1.5 text-xs font-semibold text-down transition hover:border-down"
                >
                  <Trash2 size={12} />
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-border bg-background/20 p-4 text-sm">
              <div className="flex items-start gap-2 text-muted">
                <Lock size={14} className="mt-0.5 shrink-0 text-brand" />
                <p>
                  Bind a primary {selected.symbol} address on {network}. Once bound,
                  withdrawals can only go to this address. Changing it later requires
                  your withdrawal PIN.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openBind("set")}
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-background transition hover:brightness-110"
              >
                <ShieldCheck size={12} />
                Bind primary address
              </button>
            </div>
          )}
        </div>
      )}

      {/* Amount */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
            Amount ({selected?.symbol ?? "TOKEN"})
          </label>
          <button
            type="button"
            onClick={() => selected && setAmountStr(String(selected.balance))}
            disabled={!primary}
            className="rounded-full border border-border bg-background/40 px-3 py-1 text-[11px] font-semibold text-muted transition hover:border-brand hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            Max
          </button>
        </div>
        <TokenAmountInput
          value={amountStr}
          onChange={setAmountStr}
          symbol={selected?.symbol ?? "TOKEN"}
          decimals={selected?.decimals}
          priceCents={selected?.usdPriceCents ?? null}
          disabled={!primary}
          placeholder={`Enter amount in ${selected?.symbol ?? ""}`}
        />
        {validAmount && !minOk && selected && (
          <p className="text-xs text-down">
            Below min withdrawal ({formatTokenAmount(selected.minWithdrawal, selected.symbol, selected.decimals)}).
          </p>
        )}
        {validAmount && !balanceOk && (
          <p className="text-xs text-down">Amount exceeds available balance.</p>
        )}
      </div>

      {/* Net preview */}
      {selected && primary && validAmount && minOk && balanceOk && (
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

      <Button
        type="button"
        fullWidth
        size="lg"
        onClick={() => {
          setWithdrawalPin("");
          setErrorMsg(null);
          setReviewOpen(true);
        }}
        disabled={!canReview || submitStatus === "loading"}
        iconLeft={<ArrowDownToLine size={16} aria-hidden="true" />}
      >
        Review withdrawal
      </Button>

      {reviewOpen && selected && primary && (
        <Modal
          open
          onClose={() => setReviewOpen(false)}
          title="Review withdrawal"
          dismissible={submitStatus !== "loading"}
          footer={
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setReviewOpen(false)}
                disabled={submitStatus === "loading"}
              >
                Edit details
              </Button>
              <Button
                size="sm"
                onClick={submitWithPin}
                loading={submitStatus === "loading"}
              >
                Confirm &amp; submit
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-border bg-background/30 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                You will receive
              </p>
              <p className="mt-1 font-display text-3xl font-bold tabular-nums text-foreground">
                {formatTokenAmount(net, selected.symbol, selected.decimals)}
              </p>
              <p className="text-xs text-muted">
                ≈ {formatUsdFromCents(Math.round(net * selected.usdPriceCents))} on {network}
              </p>
            </div>

            <dl className="flex flex-col gap-2 text-sm">
              <Row label="Token" value={selected.symbol} />
              <Row label="Network" value={network} />
              <Row label="Destination" value={truncateAddress(primary.address)} mono />
              <Row
                label="Fee"
                value={`${formatTokenAmount(fee, selected.symbol, selected.decimals)} (${(selected.withdrawFeeBps / 100).toFixed(2)}%)`}
              />
              <Row label="ETA" value="1-3 hours" />
            </dl>

            <FormField htmlFor="withdrawalPin" label="Confirm with 6-digit withdrawal PIN" required>
              <Input
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
                className="text-center font-mono text-lg tracking-[0.4em]"
              />
            </FormField>

            {errorMsg && (
              <div className="flex items-center gap-2 rounded-xl border border-down/40 bg-down/10 px-3 py-2">
                <AlertCircle size={14} className="text-down" aria-hidden="true" />
                <p className="text-xs text-down">{errorMsg}</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {bindOpen && selected && (
        <PinModal
          title={bindMode === "set" ? "Bind primary address" : "Change primary address"}
          description={
            bindMode === "set"
              ? `This address will be locked as the only allowed destination for ${selected.symbol} on ${network}.`
              : `Enter the new ${selected.symbol} address for ${network}. Your withdrawal PIN is required.`
          }
          submitLabel={bindMode === "set" ? "Bind & save" : "Change & save"}
          isLoading={bindStatus === "loading"}
          onClose={() => setBindOpen(false)}
          onSubmit={submitBind}
          error={bindError}
        >
          <div className="flex flex-col gap-2">
            <label
              htmlFor="bindAddress"
              className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted"
            >
              {selected.symbol} address ({network})
            </label>
            <input
              id="bindAddress"
              type="text"
              autoFocus
              value={bindAddress}
              onChange={(e) => setBindAddress(e.target.value)}
              placeholder="Paste your wallet address"
              className="rounded-xl border border-border bg-background/40 px-4 py-2.5 font-mono text-sm text-foreground placeholder:text-muted outline-none focus:border-brand"
            />
          </div>
          <PinInput id="bindPin" value={bindPin} onChange={setBindPin} />
        </PinModal>
      )}

      {removeOpen && selected && primary && (
        <PinModal
          title="Remove primary address"
          description={`Remove ${truncateAddress(primary.address)} as the bound primary address for ${selected.symbol} on ${network}? You'll need to bind a new one before withdrawing.`}
          submitLabel="Remove"
          submitVariant="danger"
          isLoading={removeStatus === "loading"}
          onClose={() => setRemoveOpen(false)}
          onSubmit={submitRemove}
          error={removeError}
        >
          <PinInput id="removePin" value={removePin} onChange={setRemovePin} />
        </PinModal>
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

function PinInput({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-background/30 px-4 py-4">
      <label
        htmlFor={id}
        className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted"
      >
        Withdrawal PIN
      </label>
      <input
        id={id}
        type="password"
        inputMode="numeric"
        autoComplete="off"
        pattern="\d{6}"
        maxLength={6}
        value={value}
        onChange={(event) =>
          onChange(event.target.value.replace(/\D/g, "").slice(0, 6))
        }
        className="rounded-xl border border-border bg-background/40 px-4 py-2.5 text-center font-mono text-lg tracking-[0.4em] text-foreground outline-none focus:border-brand"
      />
    </div>
  );
}

function PinModal({
  title,
  description,
  submitLabel,
  submitVariant = "brand",
  isLoading,
  error,
  onClose,
  onSubmit,
  children,
}: {
  title: string;
  description: string;
  submitLabel: string;
  submitVariant?: "brand" | "danger";
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      dismissible={!isLoading}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant={submitVariant === "danger" ? "danger" : "primary"}
            size="sm"
            onClick={onSubmit}
            loading={isLoading}
          >
            {submitLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">{description}</p>
        {children}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-down/40 bg-down/10 px-3 py-2">
            <AlertCircle size={14} className="text-down" aria-hidden="true" />
            <p className="text-xs text-down">{error}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
