import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import { connection } from "next/server";
import WalletControlPanel from "@/components/admin/wallet-control-panel";
import { listAdminWallets } from "@/lib/wallets/admin-service";

export const metadata = { title: "Wallets — Admin" };

export default async function AdminWalletsPage() {
  // Admin pages are auth-gated and per-request; pin to request time so the
  // preview-data fallback (used on placeholder build env) runs at request, not
  // during prerender where Cache Components forbids Date.now()/non-deferred data.
  await connection();
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
