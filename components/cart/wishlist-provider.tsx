"use client";

import * as React from "react";
import { useAccount, isAdminSession } from "@/components/account/account-provider";
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
  const { isLoggedIn, user } = useAccount();

  /** An admin previewing the shop is not a shopper — see CartProvider. */
  const isShopper = isLoggedIn && !isAdminSession(user);
  const [ids, setIds] = React.useState<string[]>([]);
  const [hydrated, setHydrated] = React.useState(false);

  /**
   * Whose wishlist is in state. Same leak the cart had: logging out left the
   * previous customer's saved items in memory, which were then written to the
   * guest key and merged into whoever signed in next on this device.
   */
  const ownerId = isShopper ? user?.id ?? null : null;
  const [loadedOwner, setLoadedOwner] = React.useState<string | null | undefined>(undefined);

  React.useEffect(() => {
    const load = async () => {
      // Someone signed out, or a different account signed in. Nothing carries over.
      if (loadedOwner != null && loadedOwner !== ownerId) {
        setIds([]);
        localStorage.removeItem(STORAGE_KEY);
        setLoadedOwner(ownerId);
        return;
      }

      if (isShopper) {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          const localIds: string[] = raw ? JSON.parse(raw) : [];

          const synced = localIds.length
            ? await apiFetch<string[]>("/wishlist/sync", { method: "POST", body: { ids: localIds } })
            : await apiFetch<string[]>("/wishlist");

          localStorage.removeItem(STORAGE_KEY);
          setIds(synced ?? []);
        } catch (err) {
          console.error("Failed to sync wishlist with backend:", err);
        }
      } else {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          const parsed = raw ? JSON.parse(raw) : null;
          setIds(Array.isArray(parsed) ? parsed : []);
        } catch {
          setIds([]);
        }
      }

      setLoadedOwner(ownerId);
      setHydrated(true);
    };

    load();
  }, [ownerId, isShopper]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist the guest wishlist — only once the right one has loaded.
  React.useEffect(() => {
    if (!hydrated || isShopper || loadedOwner !== ownerId) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, [ids, hydrated, isShopper, loadedOwner, ownerId]);

  const toggle = React.useCallback(async (id: string) => {
    if (isShopper) {
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
  }, [isShopper]);

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
