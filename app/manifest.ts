import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TrustPro",
    short_name: "TrustPro",
    description: "Trade crypto long or short — live charts, instant payouts, 5-level referrals.",
    start_url: "/trade",
    display: "standalone",
    background_color: "#03060f",
    theme_color: "#3375ff",
    orientation: "portrait-primary",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    categories: ["finance"],
  };
}
