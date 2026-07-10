"use client";

import * as React from "react";

export interface StoreSettings {
  announcementText: string;
  announcementEnabled: boolean;
  footerEmail: string;
  footerPhone: string;
  footerAddress: string;
  maxOrderLimit: number;
}

interface SettingsContextValue {
  settings: StoreSettings;
  hydrated: boolean;
  updateSettings: (updated: Partial<StoreSettings>) => void;
}

const SettingsContext = React.createContext<SettingsContextValue | null>(null);

const STORAGE_KEY = "ratalu.settings.v2";

const DEFAULT_SETTINGS: StoreSettings = {
  announcementText: "Free shipping on orders above ₹499!",
  announcementEnabled: true,
  footerEmail: "hello@ratalu.com",
  footerPhone: "+91 98250 11111",
  footerAddress: "14 Marine Drive, Nariman Point, Mumbai, Maharashtra 400021",
  maxOrderLimit: 10,
};

export function StoreSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = React.useState<StoreSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = React.useState(false);

  // Load from local storage
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          setTimeout(() => setSettings({ ...DEFAULT_SETTINGS, ...parsed }), 0);
        }
      }
    } catch {
      // Ignore corrupt storage
    }
    setTimeout(() => setHydrated(true), 0);
  }, []);

  // Save to local storage
  React.useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings, hydrated]);

  const updateSettings = React.useCallback((updated: Partial<StoreSettings>) => {
    setSettings((prev) => ({ ...prev, ...updated }));
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
