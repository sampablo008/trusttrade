import TrustProShell from "@/components/home/trustpro-shell";
import { listMarketTokens } from "@/lib/markets/service";

export default async function Home() {
  const marketData = await listMarketTokens();

  return (
    <TrustProShell
      marketSnapshots={marketData.items.map((token) => ({
        dayChangePercent: token.dayChangePercent,
        name: token.name,
        priceCents: token.priceCents,
        shadowOffsetPercent: token.shadowOffsetPercent,
        symbol: token.symbol,
        volumeLabel: token.volumeLabel,
      }))}
    />
  );
}
