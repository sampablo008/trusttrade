export interface PromoSlot {
  id: string;
  slug: string;
  slotType: "text" | "image" | "rich";
  title: string | null;
  subtitle: string | null;
  body: string | null;
  imagePath: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  isEnabled: boolean;
  sortOrder: number;
  updatedAt: string;
}

export interface PromoSlotsResult {
  items: PromoSlot[];
}

export interface UpdatePromoSlotInput {
  title?: string | null;
  subtitle?: string | null;
  body?: string | null;
  imagePath?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  isEnabled?: boolean;
  sortOrder?: number;
}
