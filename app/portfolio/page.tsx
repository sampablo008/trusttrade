import { Metadata } from "next";
import AppShell from "@/components/layout/AppShell";
import PortfolioShell from "@/components/portfolio/PortfolioShell";
import { assertUserApi } from "@/lib/auth/assert-user-api";
import { listSettledTrades } from "@/lib/trades/service";

export const metadata: Metadata = {
  title: "Portfolio | TrustPro",
  description: "Your complete trade history with filters and CSV export.",
};

const PAGE_SIZE = 20;

export default async function PortfolioPage() {
  const { userId } = await assertUserApi();
  const result = await listSettledTrades(userId, PAGE_SIZE, 0);

  return (
    <AppShell>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <PortfolioShell
          initialItems={result.items}
          initialTotal={result.total}
          pageSize={PAGE_SIZE}
        />
      </main>
    </AppShell>
  );
}
