import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import TokenControlPanel from "@/components/admin/token-control-panel";
import { listAdminTokens } from "@/lib/markets/admin-service";

export const metadata = { title: "Tokens — Admin" };

export default async function AdminTokensPage() {
  const tokenData = await listAdminTokens();

  return (
    <>
      <AdminPageHeader
        eyebrow="Market control"
        title="Tokens"
        description="Manage tradable pairs, feed source, scale, offset, volatility, and visibility from one operator panel."
      />
      <TokenControlPanel initialData={tokenData} />
    </>
  );
}
