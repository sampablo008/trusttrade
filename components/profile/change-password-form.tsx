"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { notify } from "@/components/ui/toast";

interface FieldState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const emptyState: FieldState = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export default function ChangePasswordForm() {
  const [form, setForm] = useState<FieldState>(emptyState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (key: keyof FieldState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = (await res.json()) as {
        data?: { changedAt: string };
        error?: { message: string };
      };
      if (!res.ok || !json.data) {
        throw new Error(json.error?.message ?? "Could not change password.");
      }
      setForm(emptyState);
      notify.success("Password updated", "We emailed a confirmation.");
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      notify.error("Could not change password", msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <KeyRound size={16} className="text-brand" aria-hidden="true" />
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
          Change password
        </h3>
      </div>

      <div className="flex flex-col gap-3">
        <FormField htmlFor="current-password" label="Current password" required>
          <PasswordInput
            id="current-password"
            required
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={(e) => update("currentPassword", e.target.value)}
          />
        </FormField>
        <FormField
          htmlFor="new-password"
          label="New password"
          required
          hint="At least 8 characters, one uppercase, one number."
        >
          <PasswordInput
            id="new-password"
            required
            autoComplete="new-password"
            value={form.newPassword}
            onChange={(e) => update("newPassword", e.target.value)}
          />
        </FormField>
        <FormField
          htmlFor="confirm-password"
          label="Confirm new password"
          required
          error={error ?? undefined}
        >
          <PasswordInput
            id="confirm-password"
            required
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(e) => update("confirmPassword", e.target.value)}
          />
        </FormField>
      </div>

      <Button type="submit" loading={submitting} className="self-start">
        {submitting ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
