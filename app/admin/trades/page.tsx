import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import { connection } from "next/server";
import TradeAdminPanel from "@/components/admin/trade-admin-panel";
import { listAdminTrades } from "@/lib/admin/trades-service";

export const metadata = { title: "Trade Queue — Admin" };

export default async function AdminTradesPage() {
  // Admin pages are auth-gated and per-request; pin to request time so the
  // preview-data fallback (used on placeholder build env) runs at request, not
  // during prerender where Cache Components forbids Date.now()/non-deferred data.
  await connection();
  const tradesData = await listAdminTrades({ limit: 200, status: "active" });

  return (
    <>
      <AdminPageHeader
        eyebrow="Settlement queue"
        title="Trade queue"
        description="Live decision queue sorted by urgency. Click W / L / V or use keyboard shortcuts. Shift+click for range, Cmd+click for multi-select, then bulk settle. Switch to History for past settled trades."
      />
      <TradeAdminPanel initialTrades={tradesData.items} />
    </>
  );
}
