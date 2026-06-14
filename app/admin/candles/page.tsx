import { Suspense } from "react";
import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import { connection } from "next/server";
import CandleControllerPanel from "@/components/admin/candle-controller-panel";
import { Skeleton } from "@/components/ui/Skeleton";
import { listAdminTokens } from "@/lib/markets/admin-service";

export const metadata = { title: "Price Engine — Admin" };

// Live admin data. Must stay in its own Suspense boundary so Cache Components
// streams it fresh per request instead of serving the prerendered static shell
// (which would show empty/stale data for the route's stale-time window).
async function AdminCandlesPageData() {
  // Admin pages are auth-gated and per-request; pin to request time so the
  // preview-data fallback (used on placeholder build env) runs at request, not
  // during prerender where Cache Components forbids Date.now()/non-deferred data.
  await connection();
  const tokens = await listAdminTokens();

  return <CandleControllerPanel initialTokens={tokens} />;
}

export default function AdminCandlesPage() {
  return (
    <>
      <AdminPageHeader
        eyebrow="Chart price engine"
        title="Price engine"
        description="Freeze tokens, set drift bias, hard-set any price, import CSV replay, or pull live historical candles from Binance with one click."
      />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <AdminCandlesPageData />
      </Suspense>
    </>
  );
}
