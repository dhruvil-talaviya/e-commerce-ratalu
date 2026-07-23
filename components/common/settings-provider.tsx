"use client";

import * as React from "react";
import { apiFetch } from "@/lib/api";
import { useLiveRefresh } from "@/lib/hooks/use-live-refresh";

export interface StoreSettings {
  // Maintenance Mode — admin-controlled storefront kill switch
  maintenanceMode: boolean;
  maintenanceTitle: string;
  maintenanceMessage: string;
  maintenanceEndsAt: string | null;

  // Store Info
  storeName: string;
  storeLogo: string;
  storeLogoDark: string;
  storeFavicon: string;
  storeTagline: string;
  storeDescription: string;

  // Business Address
  businessAddress: string;
  businessCity: string;
  businessState: string;
  businessPincode: string;

  // GST / Tax
  gstNumber: string;
  gstEnabled: boolean;
  taxRate: number;
  companyRegistration: string;
  businessName: string;
  panNumber: string;
  gstSlabs: number[];
  defaultHsnCode: string;
  invoicePrefix: string;
  invoiceStartNumber: number;
  financialYear: string;
  reverseChargeEnabled: boolean;
  compositionSchemeEnabled: boolean;
  roundOffEnabled: boolean;
  taxInclusive: boolean;

  // Email & Phone Channels
  supportEmail: string;
  salesEmail: string;
  customerCareNumber: string;
  businessWorkingHours: string;
  timeZone: string;
  currency: string;
  language: string;

  // Shipping
  shippingFreeThreshold: number;
  shippingFlatRate: number;

  // Payment
  codEnabled: boolean;
  razorpayEnabled: boolean;
  upiEnabled: boolean;
  razorpayKeyId: string;

  // Announcement Bar
  announcementText: string;
  announcementEnabled: boolean;
  announcementBgColor: string;
  announcementTextColor: string;

  // Welcome Offer Popup

  // Footer
  footerTagline: string;
  footerCopyright: string;

  // SEO & Head Integrations
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  ogImage: string;
  googleAnalyticsId: string;
  googleTagManagerId: string;
  facebookPixelId: string;
  metaVerification: string;
  googleSearchConsoleVerification: string;
  robotsTxt: string;
  sitemapXml: string;

  // Order Limits
  maxOrderLimit: number;

  // About Us
  aboutTitle: string;
  aboutDescription: string;

  // Our Story Page Content
  ourStoryTitle: string;
  ourStoryDescription: string;
  ourStoryMainText: string;

  // Why Choose Us Page Content
  whyUsTitle: string;
  whyUsDescription: string;

  // Contact Us Page Content
  contactTitle: string;
  contactDescription: string;
  contactSupportHours: string;

  // Contact
  contactMapEmbedUrl: string;
  contactWhatsapp: string;
  contactInstagram: string;
  contactFacebook: string;
  contactTwitter: string;

  // WhatsApp Business Integration
  whatsappEnabled: boolean;
  whatsappCountryCode: string;
  whatsappNumber: string;
  whatsappButtonText: string;
  whatsappButtonPosition: "bottom-right" | "bottom-left";
  whatsappShowOnDesktop: boolean;
  whatsappShowOnMobile: boolean;

  // Dynamic template overrides
  defaultGreetingMessage: string;
  defaultSupportMessage: string;
  defaultOrderInquiryMessage: string;
  defaultProductInquiryMessage: string;
  defaultBulkOrderMessage: string;
  defaultRefundMessage: string;
  defaultComplaintMessage: string;

  // Video Library Management
  homepageHeroVideo: string;
  ourStoryVideo: string;
  whyUsVideo: string;
  manufacturingProcessVideo: string;
  customerTestimonialsVideo: string;
  brandStoryVideo: string;
  autoplayVideo: boolean;
  muteVideo: boolean;
  loopVideo: boolean;

  // Notifications
  notifyOrderPlaced: boolean;
  notifyOrderShipped: boolean;
  notifyOrderDelivered: boolean;
  notifyLowStock: boolean;
  lowStockThreshold: number;
}

interface SettingsContextValue {
  settings: StoreSettings;
  hydrated: boolean;
  updateSettings: (updated: Partial<StoreSettings>) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = React.createContext<SettingsContextValue | null>(null);

const DEFAULT_SETTINGS: StoreSettings = {
  maintenanceMode: false,
  maintenanceTitle: "We'll be right back",
  maintenanceMessage:
    "We're doing a little kitchen upkeep. The store will be open again shortly — thanks for your patience!",
  maintenanceEndsAt: null,
  storeName: "Ratalu Wafers",
  storeLogo: "",
  storeLogoDark: "",
  storeFavicon: "",
  storeTagline: "India's finest purple yam wafers",
  storeDescription: "Handcrafted purple yam wafers in 6 bold flavours. No artificial preservatives.",
  businessAddress: "14 Marine Drive, Nariman Point, Mumbai, Maharashtra 400021",
  businessCity: "Mumbai",
  businessState: "Maharashtra",
  businessPincode: "400021",
  gstNumber: "",
  gstEnabled: true,
  taxRate: 5,
  companyRegistration: "",
  businessName: "Ratalu Wafers Private Limited",
  panNumber: "",
  gstSlabs: [0, 3, 5, 12, 18, 28],
  defaultHsnCode: "1905",
  invoicePrefix: "INV-",
  invoiceStartNumber: 1,
  financialYear: "2026-27",
  reverseChargeEnabled: false,
  compositionSchemeEnabled: false,
  roundOffEnabled: true,
  taxInclusive: true,
  supportEmail: "support@rataluwafers.com",
  salesEmail: "sales@rataluwafers.com",
  customerCareNumber: "+91 98250 22222",
  businessWorkingHours: "9 AM - 6 PM IST, Mon - Sat",
  timeZone: "Asia/Kolkata",
  currency: "INR",
  language: "en",
  shippingFreeThreshold: 599,
  shippingFlatRate: 49,
  codEnabled: true,
  razorpayEnabled: true,
  upiEnabled: true,
  razorpayKeyId: "",
  announcementText: "Free shipping on orders above ₹599!",
  announcementEnabled: true,
  announcementBgColor: "#7c3aed",
  announcementTextColor: "#ffffff",
  footerTagline: "Small batch. Natural ingredients. Guilt-free crunch.",
  footerCopyright: "© 2026 Ratalu Wafers. All rights reserved.",
  seoTitle: "Ratalu Wafers — India's Finest Purple Yam Snacks",
  seoDescription: "Handcrafted purple yam wafers in 6 bold flavours. No artificial preservatives. Free shipping above ₹599.",
  seoKeywords: "ratalu wafers, purple yam chips, indian snacks, healthy chips",
  ogImage: "",
  googleAnalyticsId: "",
  googleTagManagerId: "",
  facebookPixelId: "",
  metaVerification: "",
  googleSearchConsoleVerification: "",
  robotsTxt: "User-agent: *\nAllow: /\nSitemap: https://rataluwafers.com/sitemap.xml",
  sitemapXml: "",
  maxOrderLimit: 10,
  aboutTitle: "Our Story",
  aboutDescription: "",
  ourStoryTitle: "A Humble Yam, Reimagined",
  ourStoryDescription: "Born in Gujarat, kettle-cooked in small batches, and seasoned with local pride.",
  ourStoryMainText: "Ratalu — the purple yam — has been a monsoon favourite in Gujarati kitchens for generations. We grew up on it. So we set out to do one thing exceptionally well: turn this humble root into the crispiest, most flavourful wafer you've ever tasted.\n\nNo shortcuts. No factory line churning out millions. Just carefully chosen yam, thin-sliced, kettle-cooked in small batches, and seasoned by hand with spices we'd proudly serve our own family.",
  whyUsTitle: "Why Choose Ratalu Chips",
  whyUsDescription: "Crafting the ultimate guilt-free gourmet snack. Sourced responsibly, cooked traditionally, seasoned by hand.",
  contactTitle: "We'd love to hear from you",
  contactDescription: "Questions about an order, wholesale, or just want to tell us your favourite flavour? Drop us a line.",
  contactSupportHours: "Mon–Sat, 9 AM – 7 PM IST",
  contactMapEmbedUrl: "",
  contactWhatsapp: "",
  contactInstagram: "",
  contactFacebook: "",
  contactTwitter: "",
  whatsappEnabled: true,
  whatsappCountryCode: "91",
  whatsappNumber: "9825000000",
  whatsappButtonText: "Chat with us",
  whatsappButtonPosition: "bottom-right",
  whatsappShowOnDesktop: true,
  whatsappShowOnMobile: true,
  defaultGreetingMessage: "Hello, I need assistance regarding your products.",
  defaultSupportMessage: "Hello, I need assistance regarding your products.",
  defaultOrderInquiryMessage: "Hello, I would like to know the status of my order #{Order Number}.",
  defaultProductInquiryMessage: "Hello, I am interested in the product: {Product Name}. Please provide more details.",
  defaultBulkOrderMessage: "Hello, I would like to place a wholesale order. Please contact me.",
  defaultRefundMessage: "Hello, I need assistance regarding my refund request for order #{Order Number}.",
  defaultComplaintMessage: "Hello, I want to log a complaint.",
  homepageHeroVideo: "",
  ourStoryVideo: "",
  whyUsVideo: "",
  manufacturingProcessVideo: "",
  customerTestimonialsVideo: "",
  brandStoryVideo: "",
  autoplayVideo: true,
  muteVideo: true,
  loopVideo: true,
  notifyOrderPlaced: true,
  notifyOrderShipped: true,
  notifyOrderDelivered: true,
  notifyLowStock: true,
  lowStockThreshold: 10,
};

export function StoreSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = React.useState<StoreSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = React.useState(false);

  const fetchSettings = React.useCallback(async () => {
    try {
      const data = await apiFetch<StoreSettings>("/admin/settings");
      if (data) {
        const sanitize = (url: string) => {
          if (!url) return "";
          const trimmed = url.trim();
          if (trimmed.includes("res-console.cloudinary.com")) {
            try {
              const parts = trimmed.split("/");
              const cloudName = parts[3];
              const isVideo = trimmed.includes("/video/");
              const v1Index = parts.lastIndexOf("v1");
              if (v1Index !== -1 && parts[v1Index + 1]) {
                const base64Segment = parts[v1Index + 1];
                const decode = (str: string) => {
                  if (typeof window !== "undefined" && typeof window.atob === "function") {
                    return window.atob(str);
                  }
                  return Buffer.from(str, "base64").toString("utf-8");
                };
                const publicId = decode(base64Segment);
                if (publicId) {
                  const type = isVideo ? "video" : "image";
                  const ext = isVideo ? "mp4" : "jpg";
                  return `https://res.cloudinary.com/${cloudName}/${type}/upload/${publicId}.${ext}`;
                }
              }
            } catch (e) {
              console.error("Failed to parse Cloudinary Console URL:", e);
            }
          }
          return trimmed;
        };

        if (data.homepageHeroVideo) data.homepageHeroVideo = sanitize(data.homepageHeroVideo);
        if (data.ourStoryVideo) data.ourStoryVideo = sanitize(data.ourStoryVideo);
        if (data.whyUsVideo) data.whyUsVideo = sanitize(data.whyUsVideo);
        if (data.manufacturingProcessVideo) data.manufacturingProcessVideo = sanitize(data.manufacturingProcessVideo);
        if (data.customerTestimonialsVideo) data.customerTestimonialsVideo = sanitize(data.customerTestimonialsVideo);
        if (data.brandStoryVideo) data.brandStoryVideo = sanitize(data.brandStoryVideo);

        setSettings({ ...DEFAULT_SETTINGS, ...data });
      }
    } catch (err) {
      console.error("Failed to load store settings from server:", err);
    } finally {
      setHydrated(true);
    }
  }, []);

  React.useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useLiveRefresh(fetchSettings, { minIntervalMs: 2000 });

  const updateSettings = React.useCallback(async (updated: Partial<StoreSettings>) => {
    try {
      const res = await apiFetch<StoreSettings>("/admin/settings", {
        method: "PUT",
        body: updated
      });
      setSettings(prev => ({ ...prev, ...res }));
    } catch (err) {
      console.error("Failed to update store settings:", err);
      throw err;
    }
  }, []);

  const value = React.useMemo(
    () => ({
      settings,
      hydrated,
      updateSettings,
      refreshSettings: fetchSettings,
    }),
    [settings, hydrated, updateSettings, fetchSettings]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useStoreSettings() {
  const context = React.useContext(SettingsContext);
  if (!context) {
    throw new Error("useStoreSettings must be used within a StoreSettingsProvider");
  }
  return context;
}
