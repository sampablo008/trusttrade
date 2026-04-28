import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TrustTrade — Crypto Trading Platform",
    short_name: "TrustTrade",
    description:
      "Trade crypto long or short — live charts, instant payouts up to 85%, and a 5-level referral program. Join by invitation.",
    start_url: "/trade",
    scope: "/",
    id: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: "#04070e",
    theme_color: "#3d9cff",
    orientation: "portrait-primary",
    lang: "en-US",
    dir: "ltr",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    categories: ["finance"],
  };
}
