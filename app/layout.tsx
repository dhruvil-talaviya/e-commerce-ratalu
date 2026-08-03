import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Inter, Manrope, Noto_Sans_Devanagari, Noto_Sans_Gujarati, Fraunces } from "next/font/google";
import "./globals.css";
import { SITE } from "@/lib/constants";
import { Providers } from "./providers";
import { StorefrontLayoutWrapper } from "@/components/layout/storefront-layout-wrapper";
import { OrganizationJsonLd, WebsiteJsonLd } from "@/components/seo/json-ld";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
  weight: ["600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
  weight: ["600", "700", "800"],
});

const notoSansDevanagari = Noto_Sans_Devanagari({
  variable: "--font-devanagari",
  subsets: ["devanagari"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const notoSansGujarati = Noto_Sans_Gujarati({
  variable: "--font-gujarati",
  subsets: ["gujarati"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  keywords: [
    "yamora wafers",
    "ratalu wafers",
    "purple yam chips",
    "premium wafers India",
    "kettle cooked chips",
    "peri peri wafers",
    "masala wafers online",
    "gourmet snacks India",
  ],
  creator: SITE.name,
  applicationName: SITE.name,
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
      { url: "/icon.png", type: "image/png" },
    ],
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    creator: "@rataluwafers",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  category: "food",
};

import Script from "next/script";
import { TrackingScripts } from "@/components/common/tracking-scripts";
import { getPageContent, getStoreSettingsServer } from "@/lib/cms-server";

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [cms, settings] = await Promise.all([
    getPageContent("homepage"),
    getStoreSettingsServer(),
  ]);

  const faviconUrl = settings?.storeFavicon?.trim() || settings?.storeLogo?.trim() || "/logo.png";

  return (
    <html lang="en" className={`${fraunces.variable} ${plusJakartaSans.variable} ${inter.variable} ${manrope.variable} ${notoSansDevanagari.variable} ${notoSansGujarati.variable}`}>
      <head>
        <link rel="icon" href={faviconUrl} />
        <link rel="shortcut icon" href={faviconUrl} />
        <link rel="apple-touch-icon" href={faviconUrl} />
        {/* Google Analytics GA4 */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-8RQGBPV32Y"
          strategy="afterInteractive"
        />
        <Script id="google-analytics-ga4" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-8RQGBPV32Y');
          `}
        </Script>
      </head>
      <body className="bg-background text-foreground">
        <OrganizationJsonLd />
        <WebsiteJsonLd />
        <Providers>
          <TrackingScripts />
          <StorefrontLayoutWrapper cms={cms}>{children}</StorefrontLayoutWrapper>
        </Providers>
      </body>
    </html>
  );
}
