import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import { connection } from "next/server";
import TokenWalletPanel from "@/components/admin/token-wallet-panel";
import { listAdminTokens } from "@/lib/markets/admin-service";
import { listAdminWallets } from "@/lib/wallets/admin-service";

export const metadata = { title: "Token Wallets — Admin" };

export default async function AdminTokensPage() {
  // Admin pages are auth-gated and per-request; pin to request time so the
  // preview-data fallback (used on placeholder build env) runs at request, not
  // during prerender where Cache Components forbids Date.now()/non-deferred data.
  await connection();
  const [wallets, tokens] = await Promise.all([listAdminWallets(), listAdminTokens()]);

  return (
    <>
      <AdminPageHeader
        eyebrow="Deposit setup"
        title="Token wallets"
        description="Set the deposit address and QR code for each coin. These are shown to users during deposit."
      />
      <TokenWalletPanel initialData={wallets} initialTokens={tokens} />
    </>
  );
}
