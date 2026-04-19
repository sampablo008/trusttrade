import "server-only";
import { ApiClientError } from "@/lib/api/client";
import { getOptionalServerEnv } from "@/lib/env/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PromoSlot, PromoSlotsResult, UpdatePromoSlotInput } from "@/types/promo";

interface PromoRow {
  id: string;
  slug: string;
  slot_type: string;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  image_path: string | null;
  cta_label: string | null;
  cta_href: string | null;
  is_enabled: boolean;
  sort_order: number;
  updated_at: string;
}

const PREVIEW_SLOTS: PromoSlot[] = [
  { id: "promo-1", slug: "hero", slotType: "rich", title: "Trade crypto. Win big.", subtitle: "Binary signals, live charts, instant payouts.", body: null, imagePath: null, ctaLabel: "Start trading", ctaHref: "/signup", isEnabled: true, sortOrder: 0, updatedAt: new Date().toISOString() },
  { id: "promo-2", slug: "badge_security", slotType: "text", title: "Bank-grade security", subtitle: null, body: "Your funds and data are protected by military-grade encryption.", imagePath: null, ctaLabel: null, ctaHref: null, isEnabled: true, sortOrder: 10, updatedAt: new Date().toISOString() },
  { id: "promo-3", slug: "badge_payouts", slotType: "text", title: "Fast payouts", subtitle: null, body: "Withdraw winnings within 24 hours to your crypto wallet.", imagePath: null, ctaLabel: null, ctaHref: null, isEnabled: true, sortOrder: 11, updatedAt: new Date().toISOString() },
  { id: "promo-4", slug: "badge_support", slotType: "text", title: "24/7 support", subtitle: null, body: "Our support team is always ready to help.", imagePath: null, ctaLabel: null, ctaHref: null, isEnabled: true, sortOrder: 12, updatedAt: new Date().toISOString() },
  { id: "promo-5", slug: "feature_charts", slotType: "text", title: "Live charts", subtitle: null, body: "Professional TradingView-grade candle charts — 1s to 1d.", imagePath: null, ctaLabel: null, ctaHref: null, isEnabled: true, sortOrder: 20, updatedAt: new Date().toISOString() },
  { id: "promo-6", slug: "feature_referrals", slotType: "text", title: "5-level referrals", subtitle: null, body: "Earn commissions on every deposit by your recruits — up to 5 levels.", imagePath: null, ctaLabel: null, ctaHref: null, isEnabled: true, sortOrder: 21, updatedAt: new Date().toISOString() },
  { id: "promo-7", slug: "feature_profits", slotType: "text", title: "Up to 85% profit", subtitle: null, body: "Win up to 85% on every correctly predicted trade.", imagePath: null, ctaLabel: null, ctaHref: null, isEnabled: true, sortOrder: 22, updatedAt: new Date().toISOString() },
  { id: "promo-8", slug: "feature_tokens", slotType: "text", title: "Multiple assets", subtitle: null, body: "BTC, ETH, USDT, BNB — all on one platform.", imagePath: null, ctaLabel: null, ctaHref: null, isEnabled: true, sortOrder: 23, updatedAt: new Date().toISOString() },
  { id: "promo-9", slug: "feature_wallet", slotType: "text", title: "Crypto wallet", subtitle: null, body: "Deposit and withdraw with USDT-TRC20, ERC20, BEP20, and BTC.", imagePath: null, ctaLabel: null, ctaHref: null, isEnabled: true, sortOrder: 24, updatedAt: new Date().toISOString() },
  { id: "promo-10", slug: "feature_mobile", slotType: "text", title: "Mobile ready", subtitle: null, body: "Trade from anywhere — fully responsive and PWA-installable.", imagePath: null, ctaLabel: null, ctaHref: null, isEnabled: true, sortOrder: 25, updatedAt: new Date().toISOString() },
];

const mapRow = (r: PromoRow): PromoSlot => ({
  id: r.id,
  slug: r.slug,
  slotType: r.slot_type as PromoSlot["slotType"],
  title: r.title,
  subtitle: r.subtitle,
  body: r.body,
  imagePath: r.image_path,
  ctaLabel: r.cta_label,
  ctaHref: r.cta_href,
  isEnabled: r.is_enabled,
  sortOrder: r.sort_order,
  updatedAt: r.updated_at,
});

export const listPromoSlots = async (enabledOnly = true): Promise<PromoSlotsResult> => {
  if (!getOptionalServerEnv()) {
    const items = enabledOnly ? PREVIEW_SLOTS.filter((s) => s.isEnabled) : PREVIEW_SLOTS;
    return { items };
  }

  const admin = createSupabaseAdminClient();
  let query = admin
    .from("promo_slots")
    .select("id, slug, slot_type, title, subtitle, body, image_path, cta_label, cta_href, is_enabled, sort_order, updated_at")
    .order("sort_order");

  if (enabledOnly) query = query.eq("is_enabled", true);

  const { data, error } = await query;
  if (error) throw new ApiClientError(error.message, 500, "PROMO_FETCH_FAILED", error);
  return { items: (data ?? []).map((r) => mapRow(r as PromoRow)) };
};

export const updatePromoSlot = async (
  id: string,
  input: UpdatePromoSlotInput,
): Promise<PromoSlot> => {
  if (!getOptionalServerEnv()) {
    const slot = PREVIEW_SLOTS.find((s) => s.id === id);
    if (!slot) throw new ApiClientError("Slot not found.", 404, "PROMO_NOT_FOUND");
    return { ...slot, ...input, updatedAt: new Date().toISOString() };
  }

  const admin = createSupabaseAdminClient();
  const updates: Record<string, unknown> = {};
  if (input.title !== undefined) updates.title = input.title;
  if (input.subtitle !== undefined) updates.subtitle = input.subtitle;
  if (input.body !== undefined) updates.body = input.body;
  if (input.imagePath !== undefined) updates.image_path = input.imagePath;
  if (input.ctaLabel !== undefined) updates.cta_label = input.ctaLabel;
  if (input.ctaHref !== undefined) updates.cta_href = input.ctaHref;
  if (input.isEnabled !== undefined) updates.is_enabled = input.isEnabled;
  if (input.sortOrder !== undefined) updates.sort_order = input.sortOrder;

  const { data, error } = await admin
    .from("promo_slots")
    .update(updates)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) throw new ApiClientError(error.message, 500, "PROMO_UPDATE_FAILED", error);
  if (!data) throw new ApiClientError("Slot not found.", 404, "PROMO_NOT_FOUND");
  return mapRow(data as PromoRow);
};
