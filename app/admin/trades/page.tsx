import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import TradeQueue from "@/components/admin/trade-queue";
import { listAdminTrades } from "@/lib/admin/trades-service";

export const metadata = { title: "Trade Queue — Admin" };

export default async function AdminTradesPage() {
  const tradesData = await listAdminTrades({ limit: 200, status: "active" });

  return (
    <>
      <AdminPageHeader
        eyebrow="Settlement queue"
        title="Trade queue"
        description="Live decision queue sorted by urgency. Click W / L / V or use keyboard shortcuts. Shift+click for range, Cmd+click for multi-select, then bulk settle."
      />
      <TradeQueue initialTrades={tradesData.items} />
    </>
  );
}
