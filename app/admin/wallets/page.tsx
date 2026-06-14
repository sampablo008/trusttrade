import { Suspense } from "react";
import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import { connection } from "next/server";
import WalletControlPanel from "@/components/admin/wallet-control-panel";
import { Skeleton } from "@/components/ui/Skeleton";
import { listAdminWallets } from "@/lib/wallets/admin-service";

export const metadata = { title: "Wallets — Admin" };

// Live admin data. Must stay in its own Suspense boundary so Cache Components
// streams it fresh per request instead of serving the prerendered static shell
// (which would show empty/stale data for the route's stale-time window).
async function AdminWalletsPageData() {
  // Admin pages are auth-gated and per-request; pin to request time so the
  // preview-data fallback (used on placeholder build env) runs at request, not
  // during prerender where Cache Components forbids Date.now()/non-deferred data.
  await connection();
  const wallets = await listAdminWallets();

  return <WalletControlPanel initialData={wallets} />;
}

export default function AdminWalletsPage() {
  return (
    <>
      <AdminPageHeader
        eyebrow="Deposit wallet ops"
        title="Wallets"
        description="Manage deposit addresses per token and network. Address edits require last-8-char confirmation to prevent accidental misroutes."
      />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <AdminWalletsPageData />
      </Suspense>
    </>
  );
}
