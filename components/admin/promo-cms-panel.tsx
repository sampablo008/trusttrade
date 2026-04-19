"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Edit3, Eye, EyeOff, Save } from "lucide-react";
import type { PromoSlot } from "@/types/promo";

interface PromoCmsPanelProps {
  initialSlots: PromoSlot[];
}

export default function PromoCmsPanel({ initialSlots }: PromoCmsPanelProps) {
  const [slots, setSlots] = useState(initialSlots);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<PromoSlot>>({});
  const [saving, setSaving] = useState(false);

  const startEdit = (slot: PromoSlot) => {
    setEditing(slot.id);
    setDraft({ title: slot.title, subtitle: slot.subtitle, body: slot.body, ctaLabel: slot.ctaLabel, ctaHref: slot.ctaHref });
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/promo/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const json = await res.json() as { data?: PromoSlot; error?: { message: string } };
      if (!res.ok) throw new Error(json.error?.message ?? "Save failed");
      setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...draft } : s)));
      setEditing(null);
      toast.success("Promo slot saved.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (slot: PromoSlot) => {
    const next = !slot.isEnabled;
    try {
      const res = await fetch(`/api/admin/promo/${slot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: next }),
      });
      if (!res.ok) throw new Error("Toggle failed");
      setSlots((prev) => prev.map((s) => (s.id === slot.id ? { ...s, isEnabled: next } : s)));
      toast.success(`Slot ${next ? "enabled" : "disabled"}.`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {slots.map((slot) => (
        <div
          key={slot.id}
          className={`rounded-[20px] border p-5 transition ${
            slot.isEnabled ? "border-border bg-surface-soft" : "border-border/40 bg-background/20 opacity-60"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-brand/20 bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand">
                  {slot.slug}
                </span>
                <span className="text-xs text-muted">{slot.slotType}</span>
              </div>
              {editing !== slot.id && (
                <p className="mt-2 text-sm font-semibold text-foreground">{slot.title ?? "—"}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => toggleEnabled(slot)}
                className="rounded-full border border-border p-2 text-muted transition hover:border-brand hover:text-foreground"
                title={slot.isEnabled ? "Disable" : "Enable"}
              >
                {slot.isEnabled ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
              {editing === slot.id ? (
                <button
                  type="button"
                  onClick={() => saveEdit(slot.id)}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-background transition hover:opacity-90 disabled:opacity-50"
                >
                  <Save size={12} />
                  {saving ? "Saving…" : "Save"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => startEdit(slot)}
                  className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-brand"
                >
                  <Edit3 size={12} />
                  Edit
                </button>
              )}
            </div>
          </div>

          {editing === slot.id && (
            <div className="mt-4 flex flex-col gap-3">
              {["title", "subtitle", "body", "ctaLabel", "ctaHref"].map((field) => (
                <div key={field} className="flex flex-col gap-1">
                  <label className="text-xs font-semibold capitalize text-muted">{field}</label>
                  {field === "body" ? (
                    <textarea
                      rows={3}
                      value={(draft[field as keyof typeof draft] as string) ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, [field]: e.target.value || null }))}
                      className="rounded-xl border border-border bg-background/30 px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
                    />
                  ) : (
                    <input
                      value={(draft[field as keyof typeof draft] as string) ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, [field]: e.target.value || null }))}
                      className="rounded-xl border border-border bg-background/30 px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
