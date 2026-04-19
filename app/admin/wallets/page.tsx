import { assertAdmin } from "@/lib/auth/assertAdmin";
import { listAdminWallets } from "@/lib/wallets/admin-service";
import WalletControlPanel from "@/components/admin/wallet-control-panel";

export default async function AdminWalletsPage() {
  await assertAdmin();

  const wallets = await listAdminWallets();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <WalletControlPanel initialData={wallets} />
    </main>
  );
}
