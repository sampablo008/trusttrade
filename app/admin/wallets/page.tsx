import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import WalletControlPanel from "@/components/admin/wallet-control-panel";
import { listAdminWallets } from "@/lib/wallets/admin-service";

export const metadata = { title: "Wallets — Admin" };

export default async function AdminWalletsPage() {
  const wallets = await listAdminWallets();

  return (
    <>
      <AdminPageHeader
        eyebrow="Deposit wallet ops"
        title="Wallets"
        description="Manage deposit addresses per token and network. Address edits require last-8-char confirmation to prevent accidental misroutes."
      />
      <WalletControlPanel initialData={wallets} />
    </>
  );
}
