import { Metadata } from "next";
import LandingShell from "@/components/home/landing-shell";
import { listPromoSlots } from "@/lib/promo/service";
import { listMarketTokens } from "@/lib/markets/service";

export const metadata: Metadata = {
  title: "TrustTrade — Trade BTC, ETH, SOL & top crypto in seconds",
  description:
    "Pick Bitcoin, Ethereum, Solana, BNB, XRP, Dogecoin or any major pair. Long or short. Win up to 85% per trade — paid instantly in USDT. Live Binance-grade charts, 24/7.",
  openGraph: {
    title: "TrustTrade — Trade BTC, ETH, SOL & top crypto in seconds",
    description:
      "Trade BTC, ETH, SOL, BNB, XRP, DOGE and more. Long or short on 30s–1d windows. Up to 85% payout, settled instantly in USDT.",
    type: "website",
  },
};

export default async function Home() {
  const [promoResult, marketData] = await Promise.all([
    listPromoSlots(true),
    listMarketTokens(),
  ]);

  return (
    <LandingShell
      slots={promoResult.items}
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
