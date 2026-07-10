import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { SITE } from "@/lib/constants";
import { Providers } from "./providers";
import { StorefrontLayoutWrapper } from "@/components/layout/storefront-layout-wrapper";
import { OrganizationJsonLd, WebsiteJsonLd } from "@/components/seo/json-ld";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
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
  themeColor: "#5B2C6F",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <OrganizationJsonLd />
        <WebsiteJsonLd />
        <Providers>
          <StorefrontLayoutWrapper>{children}</StorefrontLayoutWrapper>
        </Providers>
      </body>
    </html>
  );
}
