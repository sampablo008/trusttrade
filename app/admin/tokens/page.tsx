import { Suspense } from "react";
import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import { connection } from "next/server";
import TokenWalletPanel from "@/components/admin/token-wallet-panel";
import { Skeleton } from "@/components/ui/Skeleton";
import { listAdminTokens } from "@/lib/markets/admin-service";
import { listAdminWallets } from "@/lib/wallets/admin-service";

export const metadata = { title: "Token Wallets — Admin" };

// Live admin data. Must stay in its own Suspense boundary so Cache Components
// streams it fresh per request instead of serving the prerendered static shell
// (which would show empty/stale data for the route's stale-time window).
async function AdminTokensPageData() {
  // Admin pages are auth-gated and per-request; pin to request time so the
  // preview-data fallback (used on placeholder build env) runs at request, not
  // during prerender where Cache Components forbids Date.now()/non-deferred data.
  await connection();
  const [wallets, tokens] = await Promise.all([listAdminWallets(), listAdminTokens()]);

  return <TokenWalletPanel initialData={wallets} initialTokens={tokens} />;
}

export default function AdminTokensPage() {
  return (
    <>
      <AdminPageHeader
        eyebrow="Deposit setup"
        title="Token wallets"
        description="Set the deposit address and QR code for each coin. These are shown to users during deposit."
      />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <AdminTokensPageData />
      </Suspense>
    </>
  );
}
