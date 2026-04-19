import { assertAdmin } from "@/lib/auth/assertAdmin";
import { listAdminTokens } from "@/lib/markets/admin-service";
import CandleControllerPanel from "@/components/admin/candle-controller-panel";

export default async function AdminCandlesPage() {
  await assertAdmin();

  const tokens = await listAdminTokens();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <CandleControllerPanel initialTokens={tokens} />
    </main>
  );
}
