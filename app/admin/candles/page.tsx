import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import { connection } from "next/server";
import CandleControllerPanel from "@/components/admin/candle-controller-panel";
import { listAdminTokens } from "@/lib/markets/admin-service";

export const metadata = { title: "Price Engine — Admin" };

export default async function AdminCandlesPage() {
  // Admin pages are auth-gated and per-request; pin to request time so the
  // preview-data fallback (used on placeholder build env) runs at request, not
  // during prerender where Cache Components forbids Date.now()/non-deferred data.
  await connection();
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
