import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://trustpro.trade";

export const siteMetadata: Metadata = {
  applicationName: "TrustPro",
  title: {
    default: "TrustPro — Crypto Trading Platform",
    template: "%s | TrustPro",
  },
  description:
    "Trade crypto long or short with live charts, instant payouts up to 85%, and a 5-level referral program. Join by invitation.",
  keywords: [
    "crypto trading",
    "binary trading",
    "BTC ETH trading",
    "crypto platform",
    "referral program",
    "TrustPro",
  ],
  authors: [{ name: "TrustPro" }],
  creator: "TrustPro",
  metadataBase: new URL(BASE_URL),
  openGraph: {
    type: "website",
    siteName: "TrustPro",
    title: "TrustPro — Trade Crypto. Win Big.",
    description:
      "Binary crypto trading with live charts, up to 85% payouts, and 5-level referral commissions.",
    url: BASE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "TrustPro — Crypto Trading",
    description: "Trade BTC, ETH and more. Win up to 85%. Join by invitation.",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TrustPro",
  },
  formatDetection: { telephone: false },
};
