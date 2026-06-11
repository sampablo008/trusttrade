"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { notify } from "@/components/ui/toast";

interface WithdrawalPinFormProps {
  hasPin: boolean;
  onStateChange?: (hasPin: boolean) => void;
}

interface FieldState {
  currentPin: string;
  newPin: string;
  confirmPin: string;
}

const emptyState: FieldState = {
  currentPin: "",
  newPin: "",
  confirmPin: "",
};

export default function WithdrawalPinForm({ hasPin, onStateChange }: WithdrawalPinFormProps) {
  const [form, setForm] = useState<FieldState>(emptyState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (key: keyof FieldState, raw: string) => {
    const value = raw.replace(/\D/g, "").slice(0, 6);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, string> = {
        newPin: form.newPin,
        confirmPin: form.confirmPin,
      };
      if (hasPin) payload.currentPin = form.currentPin;

      const res = await fetch("/api/me/withdrawal-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        data?: { action: "set" | "changed" };
        error?: { message: string };
      };
      if (!res.ok || !json.data) {
        throw new Error(json.error?.message ?? "Could not update PIN.");
      }

      setForm(emptyState);
      notify.success(
        json.data.action === "set" ? "Withdrawal PIN set" : "Withdrawal PIN updated",
        "We emailed a confirmation.",
      );
      onStateChange?.(true);
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      notify.error("Could not update PIN", msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <ShieldCheck size={16} className="text-brand" aria-hidden="true" />
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
          {hasPin ? "Change withdrawal PIN" : "Set withdrawal PIN"}
        </h3>
      </div>

      <p className="text-xs leading-5 text-muted">
        Your 6-digit PIN is required for every withdrawal. Keep it private — never share it
        with anyone, including{" "}
        <span className="font-semibold text-foreground">TrustTrade</span> staff.
      </p>

      <div className="flex flex-col gap-3">
        {hasPin ? (
          <FormField htmlFor="current-pin" label="Current PIN" required>
            <PinInput
              id="current-pin"
              value={form.currentPin}
              onChange={(value) => update("currentPin", value)}
              autoFocus
            />
          </FormField>
        ) : null}
        <FormField htmlFor="new-pin" label="New PIN" required hint="Exactly 6 digits.">
          <PinInput
            id="new-pin"
            value={form.newPin}
            onChange={(value) => update("newPin", value)}
          />
        </FormField>
        <FormField
          htmlFor="confirm-pin"
          label="Confirm new PIN"
          required
          error={error ?? undefined}
        >
          <PinInput
            id="confirm-pin"
            value={form.confirmPin}
            onChange={(value) => update("confirmPin", value)}
          />
        </FormField>
      </div>

      <Button type="submit" loading={submitting} className="self-start">
        {submitting ? "Saving…" : hasPin ? "Update PIN" : "Set PIN"}
      </Button>
    </form>
  );
}

const PinInput = ({
  id,
  value,
  onChange,
  autoFocus,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}) => (
  <Input
    id={id}
    type="password"
    inputMode="numeric"
    autoComplete="off"
    pattern="\d{6}"
    maxLength={6}
    autoFocus={autoFocus}
    required
    value={value}
    onChange={(event) => onChange(event.target.value)}
    className="text-center font-mono text-lg tracking-[0.4em]"
  />
);
