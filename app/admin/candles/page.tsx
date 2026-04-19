import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import CandleControllerPanel from "@/components/admin/candle-controller-panel";
import { listAdminTokens } from "@/lib/markets/admin-service";

export const metadata = { title: "Price Engine — Admin" };

export default async function AdminCandlesPage() {
  const tokens = await listAdminTokens();

  return (
    <>
      <AdminPageHeader
        eyebrow="Chart price engine"
        title="Price engine"
        description="Freeze tokens, set drift bias, hard-set any price, import CSV replay, or pull live historical candles from Binance with one click."
      />
      <CandleControllerPanel initialTokens={tokens} />
    </>
  );
}
