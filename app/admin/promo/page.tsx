import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import PromoCmsPanel from "@/components/admin/promo-cms-panel";
import { listPromoSlots } from "@/lib/promo/service";

export const metadata = { title: "Promo CMS — Admin" };

export default async function AdminPromoPage() {
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
