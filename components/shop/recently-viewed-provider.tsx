"use client";

import * as React from "react";

const STORAGE_KEY = "ratalu.recentlyViewed.v1";
const MAX = 8;

interface RecentlyViewedValue {
  ids: string[];
  record: (id: string) => void;
  clear: () => void;
}

const Ctx = React.createContext<RecentlyViewedValue | null>(null);

export function RecentlyViewedProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = React.useState<string[]>([]);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setIds(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, [ids, hydrated]);

  const record = React.useCallback((id: string) => {
    setIds((prev) => [id, ...prev.filter((x) => x !== id)].slice(0, MAX));
  }, []);

  const clear = React.useCallback(() => setIds([]), []);

  return <Ctx.Provider value={{ ids, record, clear }}>{children}</Ctx.Provider>;
}

export function useRecentlyViewed() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useRecentlyViewed must be used within a RecentlyViewedProvider");
  return ctx;
}
