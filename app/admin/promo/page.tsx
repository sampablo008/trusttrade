import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import { connection } from "next/server";
import PromoCmsPanel from "@/components/admin/promo-cms-panel";
import { listPromoSlots } from "@/lib/promo/service";

export const metadata = { title: "Promo CMS — Admin" };

export default async function AdminPromoPage() {
  // Admin pages are auth-gated and per-request; pin to request time so the
  // preview-data fallback (used on placeholder build env) runs at request, not
  // during prerender where Cache Components forbids Date.now()/non-deferred data.
  await connection();
  const result = await listPromoSlots(false);

  return (
    <>
      <AdminPageHeader
        eyebrow="Landing CMS"
        title="Promo CMS"
        description="Edit landing page hero, trust badges, and feature cards — no redeploy required. Toggle slots on/off and update copy instantly."
      />
      <PromoCmsPanel initialSlots={result.items} />
    </>
  );
}
