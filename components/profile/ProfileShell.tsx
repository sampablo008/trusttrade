"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, User, Mail, AtSign, Wallet, TrendingUp, Lock } from "lucide-react";
import { formatUsdFromCents } from "@/lib/utils/format";
import type { UserProfile } from "@/types/trade";

interface ProfileShellProps {
  profile: UserProfile;
  avatarUrl: string | null;
}

export default function ProfileShell({ profile, avatarUrl }: ProfileShellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [previewUrl, setPreviewUrl] = useState<string | null>(avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);
    setFeedback(null);

    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload/avatar", { method: "POST", body: form });
      const json = await res.json() as { data?: { path: string }; error?: { message: string } };
      if (!res.ok || !json.data) throw new Error(json.error?.message ?? "Upload failed");

      await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarPath: json.data.path }),
      });

      setFeedback({ ok: true, msg: "Avatar updated." });
    } catch (err) {
      setFeedback({ ok: false, msg: (err as Error).message });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveName = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: displayName.trim() || null }),
      });
      if (!res.ok) throw new Error("Save failed");
      setFeedback({ ok: true, msg: "Name saved." });
      startTransition(() => router.refresh());
    } catch {
      setFeedback({ ok: false, msg: "Could not save display name." });
    } finally {
      setSaving(false);
    }
  };

  const withdrawable = Math.max(
    profile.balanceCents - profile.lockedInTradesCents - profile.lockedBonusCents,
    0,
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl text-foreground">My Profile</h1>

      {/* Avatar + identity */}
      <section className="rounded-[28px] border border-border bg-surface-soft p-6 sm:p-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <div className="relative">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="group relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-background transition hover:border-brand"
              aria-label="Change avatar"
            >
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <User size={40} className="text-muted" />
              )}
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60 opacity-0 transition group-hover:opacity-100">
                <Camera size={20} className="text-brand" />
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          <div className="flex flex-1 flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                Display name
              </label>
              <div className="flex gap-2">
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                  maxLength={40}
                  className="flex-1 rounded-xl border border-border bg-background/30 px-4 py-2.5 text-sm text-foreground placeholder-muted outline-none focus:border-brand"
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  disabled={saving || isPending}
                  className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 text-sm text-muted">
                <AtSign size={15} className="shrink-0 text-brand" />
                <span className="font-semibold text-foreground">{profile.username}</span>
                <span className="text-xs text-muted">(username · cannot change)</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted">
                <Mail size={15} className="shrink-0 text-brand" />
                <span>{profile.email}</span>
              </div>
            </div>
          </div>
        </div>

        {uploading && (
          <p className="mt-4 text-xs text-muted">Uploading avatar…</p>
        )}
        {feedback && (
          <p className={`mt-4 text-xs font-semibold ${feedback.ok ? "text-up" : "text-down"}`}>
            {feedback.msg}
          </p>
        )}
      </section>

      {/* Balance summary */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5 rounded-[24px] border border-border bg-surface-soft p-5">
          <div className="flex items-center gap-2">
            <Wallet size={15} className="text-brand" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              Total balance
            </span>
          </div>
          <span className="font-display text-2xl text-foreground">
            {formatUsdFromCents(profile.balanceCents)}
          </span>
        </div>

        <div className="flex flex-col gap-1.5 rounded-[24px] border border-border bg-surface-soft p-5">
          <div className="flex items-center gap-2">
            <Lock size={15} className="text-yellow-400" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              Locked
            </span>
          </div>
          <span className="font-display text-2xl text-yellow-400">
            {formatUsdFromCents(profile.lockedInTradesCents + profile.lockedBonusCents)}
          </span>
        </div>

        <div className="flex flex-col gap-1.5 rounded-[24px] border border-border bg-surface-soft p-5">
          <div className="flex items-center gap-2">
            <TrendingUp size={15} className="text-up" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              Withdrawable
            </span>
          </div>
          <span className="font-display text-2xl text-up">
            {formatUsdFromCents(withdrawable)}
          </span>
        </div>
      </section>
    </main>
  );
}
