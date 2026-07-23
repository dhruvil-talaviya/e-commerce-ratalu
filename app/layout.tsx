import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Inter, Manrope, Noto_Sans_Devanagari, Noto_Sans_Gujarati } from "next/font/google";
import "./globals.css";
import { SITE } from "@/lib/constants";
import { Providers } from "./providers";
import { StorefrontLayoutWrapper } from "@/components/layout/storefront-layout-wrapper";
import { OrganizationJsonLd, WebsiteJsonLd } from "@/components/seo/json-ld";
import { getPageContent } from "@/lib/cms-server";

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
  description: SITE.description,
  keywords: [
    "ratalu wafers",
    "purple yam chips",
    "premium wafers India",
    "kettle cooked chips",
    "peri peri wafers",
    "masala wafers online",
    "gourmet snacks India",
  ],
  authors: [{ name: SITE.name }],
  creator: SITE.name,
  applicationName: SITE.name,
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
  themeColor: "#5B2C83",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

import { TrackingScripts } from "@/components/common/tracking-scripts";

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Fetched on the server so Website Builder copy lands in the initial HTML —
  // visible to crawlers, and no flash of fallback text on load.
  const cms = await getPageContent("homepage");

  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${inter.variable} ${manrope.variable} ${notoSansDevanagari.variable} ${notoSansGujarati.variable}`}>
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
