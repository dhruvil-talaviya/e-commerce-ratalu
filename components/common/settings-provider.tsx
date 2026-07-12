"use client";

import * as React from "react";
import { apiFetch } from "@/lib/api";

export interface StoreSettings {
  announcementText: string;
  announcementEnabled: boolean;
  footerEmail: string;
  footerPhone: string;
  footerAddress: string;
  maxOrderLimit: number;
  welcomeOfferTitle: string;
  welcomeOfferDesc: string;
  welcomeOfferCoupon: string;
  welcomeOfferDiscount: string;
}

interface SettingsContextValue {
  settings: StoreSettings;
  hydrated: boolean;
  updateSettings: (updated: Partial<StoreSettings>) => Promise<void>;
}

const SettingsContext = React.createContext<SettingsContextValue | null>(null);

const DEFAULT_SETTINGS: StoreSettings = {
  announcementText: "Free shipping on orders above ₹599!",
  announcementEnabled: true,
  footerEmail: "hello@ratalu.com",
  footerPhone: "+91 98250 11111",
  footerAddress: "14 Marine Drive, Nariman Point, Mumbai, Maharashtra 400021",
  maxOrderLimit: 10,
  welcomeOfferTitle: "Get 10% OFF on your first order!",
  welcomeOfferDesc: "Join thousands of happy snackers who love our natural, perfectly crispy purple yam wafers.",
  welcomeOfferCoupon: "WELCOME10",
  welcomeOfferDiscount: "10% OFF",
};

export function StoreSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = React.useState<StoreSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = React.useState(false);

  const fetchSettings = React.useCallback(async () => {
    try {
      const data = await apiFetch<StoreSettings>("/admin/settings");
      if (data) {
        setSettings({ ...DEFAULT_SETTINGS, ...data });
      }
    } catch (err) {
      console.error("Failed to load store settings from server:", err);
    } finally {
      setHydrated(true);
    }
  }, []);

  // Fetch settings on mount
  React.useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = React.useCallback(async (updated: Partial<StoreSettings>) => {
    try {
      const res = await apiFetch<StoreSettings>("/admin/settings", {
        method: "PUT",
        body: updated
      });
      setSettings(res);
    } catch (err) {
      console.error("Failed to update store settings:", err);
    }
  }, []);

  const value = React.useMemo(
    () => ({
      settings,
      hydrated,
      updateSettings,
    }),
    [settings, hydrated, updateSettings]
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
