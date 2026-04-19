import { Megaphone } from "lucide-react";
import { assertUserApi } from "@/lib/auth/assert-user-api";
import { listPromoSlots } from "@/lib/promo/service";
import PromoCmsPanel from "@/components/admin/promo-cms-panel";

export default async function AdminPromoPage() {
  await assertUserApi();
  const result = await listPromoSlots(false);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3">
        <Megaphone size={22} className="text-brand" />
        <h1 className="font-display text-3xl text-foreground">Promo CMS</h1>
      </div>
      <p className="text-sm text-muted">
        Edit landing page content blocks. Changes take effect immediately — no redeploy needed.
      </p>
      <PromoCmsPanel initialSlots={result.items} />
    </main>
  );
}
