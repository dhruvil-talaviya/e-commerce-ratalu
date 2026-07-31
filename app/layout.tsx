import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Inter, Manrope, Noto_Sans_Devanagari, Noto_Sans_Gujarati, Fraunces } from "next/font/google";
import "./globals.css";
import { SITE } from "@/lib/constants";
import { Providers } from "./providers";
import { StorefrontLayoutWrapper } from "@/components/layout/storefront-layout-wrapper";
import { OrganizationJsonLd, WebsiteJsonLd } from "@/components/seo/json-ld";
import { getPageContent } from "@/lib/cms-server";

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
      { url: "/icon.png?v=5", type: "image/png" },
      { url: "/favicon.png?v=5", type: "image/png" },
      { url: "/logo.png?v=5", type: "image/png" }
    ],
    shortcut: "/icon.png?v=5",
    apple: "/apple-icon.png?v=5",
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

export const viewport: Viewport = {
  themeColor: "#4A1942",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

import Script from "next/script";
import { TrackingScripts } from "@/components/common/tracking-scripts";

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Fetched on the server so Website Builder copy lands in the initial HTML —
  // visible to crawlers, and no flash of fallback text on load.
  const cms = await getPageContent("homepage");

  return (
    <html lang="en" className={`${fraunces.variable} ${plusJakartaSans.variable} ${inter.variable} ${manrope.variable} ${notoSansDevanagari.variable} ${notoSansGujarati.variable}`}>
      <head>
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
