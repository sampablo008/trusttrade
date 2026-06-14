import { Suspense } from "react";
import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import { connection } from "next/server";
import TradeAdminPanel from "@/components/admin/trade-admin-panel";
import { Skeleton } from "@/components/ui/Skeleton";
import { listAdminTrades } from "@/lib/admin/trades-service";

export const metadata = { title: "Trade Queue — Admin" };

// Live admin data. Must stay in its own Suspense boundary so Cache Components
// streams it fresh per request instead of serving the prerendered static shell
// (which would show empty/stale data for the route's stale-time window).
async function AdminTradesPageData() {
  // Admin pages are auth-gated and per-request; pin to request time so the
  // preview-data fallback (used on placeholder build env) runs at request, not
  // during prerender where Cache Components forbids Date.now()/non-deferred data.
  await connection();
  const tradesData = await listAdminTrades({ limit: 200, status: "active" });

  return <TradeAdminPanel initialTrades={tradesData.items} />;
}

export default function AdminTradesPage() {
  return (
    <>
      <AdminPageHeader
        eyebrow="Settlement queue"
        title="Trade queue"
        description="Live decision queue sorted by urgency. Click W / L / V or use keyboard shortcuts. Shift+click for range, Cmd+click for multi-select, then bulk settle. Switch to History for past settled trades."
      />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <AdminTradesPageData />
      </Suspense>
    </>
  );
}
