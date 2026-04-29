import type { Metadata, Viewport } from "next";
import { Manrope, Syne } from "next/font/google";
import { Toaster } from "sonner";
import QueryProvider from "@/components/providers/QueryProvider";
import CookieBanner from "@/components/ui/CookieBanner";
import { siteConfig, siteMetadata, siteViewport } from "@/lib/config/site";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
});

export const metadata: Metadata = siteMetadata;
export const viewport: Viewport = siteViewport;

const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteConfig.name,
  url: siteConfig.url,
  logo: `${siteConfig.url}/icon-512.png`,
  sameAs: [] as string[],
};

const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteConfig.name,
  url: siteConfig.url,
  description: siteConfig.description,
  inLanguage: "en-US",
  potentialAction: {
    "@type": "SearchAction",
    target: `${siteConfig.url}/trade?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

const productLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: `${siteConfig.name} — Crypto Trading Platform`,
  description: siteConfig.description,
  brand: { "@type": "Brand", name: siteConfig.name },
  url: siteConfig.url,
  image: `${siteConfig.url}/icon-512.png`,
  category: "Finance / Cryptocurrency Trading",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${syne.variable} h-full`}
      data-scroll-behavior="smooth"
    >
      <body
        className="min-h-full bg-background text-foreground antialiased"
        suppressHydrationWarning
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }}
        />
        <QueryProvider>
          {children}
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              style: {
                background: "var(--color-surface-soft)",
                border: "1px solid var(--color-border)",
                color: "var(--color-foreground)",
              },
            }}
          />
          <CookieBanner />
        </QueryProvider>
      </body>
    </html>
  );
}
