import { Metadata } from "next";
import LandingShell from "@/components/home/landing-shell";
import { listPromoSlots } from "@/lib/promo/service";
import { listMarketTokens } from "@/lib/markets/service";

export const metadata: Metadata = {
  title: "TrustTrade — Crypto Trading Platform",
  description:
    "Trade crypto long or short with live charts, instant payouts up to 85%, and a 5-level referral program. Join by invitation.",
  openGraph: {
    title: "TrustTrade — Crypto Trading Platform",
    description: "Trade crypto. Win big. Live charts, 85% payouts, 5-level referrals.",
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
