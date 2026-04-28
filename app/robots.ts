import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://trusttrade.pro";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/api/",
          "/me",
          "/me/",
          "/wallet",
          "/wallet/",
          "/portfolio",
          "/portfolio/",
          "/referrals",
          "/referrals/",
          "/reset-password",
          "/forgot-password",
          "/verify-email",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
