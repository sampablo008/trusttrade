import { Metadata } from "next";
import { assertUserApi } from "@/lib/auth/assert-user-api";
import { listSettledTrades } from "@/lib/trades/service";
import PortfolioShell from "@/components/portfolio/PortfolioShell";

export const metadata: Metadata = {
  title: "Portfolio | TrustPro",
  description: "Your complete trade history with filters and CSV export.",
};

const PAGE_SIZE = 20;

export default async function PortfolioPage() {
  const { userId } = await assertUserApi();
  const result = await listSettledTrades(userId, PAGE_SIZE, 0);

  return (
    <PortfolioShell
      initialItems={result.items}
      initialTotal={result.total}
      pageSize={PAGE_SIZE}
    />
  );
}
