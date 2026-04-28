import type { Metadata, Viewport } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://trusttrade.pro";

export const siteConfig = {
  name: "TrustTrade",
  url: BASE_URL,
  title: "TrustTrade — Crypto Trading Platform",
  shortDescription:
    "Trade crypto long or short with live charts, instant payouts up to 85%, and a 5-level referral program.",
  description:
    "TrustTrade is an invitation-only crypto trading platform. Trade BTC, ETH, SOL and 50+ markets long or short with live charts, instant payouts up to 85%, and a 5-level referral program.",
  ogTitle: "TrustTrade — Trade Crypto. Win Big.",
  ogDescription:
    "Binary crypto trading with live charts, up to 85% payouts, and 5-level referral commissions. Join by invitation.",
  twitterTitle: "TrustTrade — Crypto Trading",
  twitterDescription:
    "Trade BTC, ETH, SOL and 50+ markets. Win up to 85%. Join by invitation.",
  twitterHandle: "@trusttrade",
  locale: "en_US",
  themeColor: "#3d9cff",
  backgroundColor: "#04070e",
} as const;

export const siteMetadata: Metadata = {
  applicationName: siteConfig.name,
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    "crypto trading",
    "binary crypto trading",
    "BTC trading",
    "ETH trading",
    "SOL trading",
    "crypto platform",
    "live charts",
    "crypto referral program",
    "instant crypto payouts",
    "long short crypto",
    "TrustTrade",
  ],
  authors: [{ name: siteConfig.name, url: BASE_URL }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  metadataBase: new URL(BASE_URL),
  alternates: {
    canonical: "/",
    languages: {
      "en-US": "/",
      "x-default": "/",
    },
  },
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    title: siteConfig.ogTitle,
    description: siteConfig.ogDescription,
    url: BASE_URL,
    locale: siteConfig.locale,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.twitterTitle,
    description: siteConfig.twitterDescription,
    creator: siteConfig.twitterHandle,
    site: siteConfig.twitterHandle,
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: siteConfig.name,
  },
  formatDetection: { telephone: false, email: false, address: false },
  category: "finance",
  referrer: "origin-when-cross-origin",
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION,
    other: process.env.NEXT_PUBLIC_BING_VERIFICATION
      ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_VERIFICATION }
      : undefined,
  },
};

export const siteViewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: siteConfig.themeColor },
    { media: "(prefers-color-scheme: dark)", color: siteConfig.backgroundColor },
  ],
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};
