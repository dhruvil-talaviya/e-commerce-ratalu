"use client";

import * as React from "react";
import { useAccount } from "@/components/account/account-provider";
import { apiFetch } from "@/lib/api";

const STORAGE_KEY = "ratalu.wishlist.v1";

interface WishlistContextValue {
  ids: string[];
  has: (id: string) => boolean;
  toggle: (id: string) => void;
  count: number;
}

const WishlistContext = React.createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAccount();
  const [ids, setIds] = React.useState<string[]>([]);
  const [hydrated, setHydrated] = React.useState(false);

  // Sync / Load wishlist
  React.useEffect(() => {
    const syncWishlist = async () => {
      if (isLoggedIn) {
        try {
          const localData = localStorage.getItem(STORAGE_KEY);
          let localIds: string[] = [];
          if (localData) {
            localIds = JSON.parse(localData);
          }

          let syncedIds: string[] = [];
          if (localIds.length > 0) {
            syncedIds = await apiFetch<string[]>("/wishlist/sync", {
              method: "POST",
              body: { ids: localIds }
            });
            localStorage.removeItem(STORAGE_KEY);
          } else {
            syncedIds = await apiFetch<string[]>("/wishlist");
          }
          setIds(syncedIds);
        } catch (err) {
          console.error("Failed to sync wishlist with backend:", err);
        }
      } else {
        // Load guest wishlist
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) setIds(JSON.parse(raw));
        } catch {
          /* ignore */
        }
      }
      setHydrated(true);
    };

    syncWishlist();
  }, [isLoggedIn]);

  // Persist guest wishlist changes
  React.useEffect(() => {
    if (!hydrated || isLoggedIn) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, [ids, hydrated, isLoggedIn]);

  const toggle = React.useCallback(async (id: string) => {
    if (isLoggedIn) {
      try {
        const syncedIds = await apiFetch<string[]>("/wishlist/toggle", {
          method: "POST",
          body: { flavorId: id }
        });
        setIds(syncedIds);
      } catch (err) {
        console.error("Failed to toggle wishlist item on server:", err);
      }
    } else {
      setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    }
  }, [isLoggedIn]);

  const value: WishlistContextValue = {
    ids,
    has: (id) => ids.includes(id),
    toggle,
    count: ids.length,
  };

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = React.useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within a WishlistProvider");
  return ctx;
}
