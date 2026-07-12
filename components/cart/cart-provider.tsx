"use client";

import * as React from "react";
import type { CartItem, Flavor, PackSize } from "@/lib/types";
import { SITE } from "@/lib/constants";
import { useStoreSettings } from "@/components/common/settings-provider";
import { useAccount } from "@/components/account/account-provider";
import { apiFetch } from "@/lib/api";
import { toast } from "@/components/ui/toast";

const STORAGE_KEY = "ratalu.cart.v1";

export interface Coupon {
  code: string;
  type: "percent" | "flat";
  value: number;
  minSubtotal?: number;
  description: string;
}

interface CartTotals {
  itemCount: number;
  subtotal: number;
  discount: number;
  taxedBase: number;
  gst: number;
  shipping: number;
  total: number;
  freeShippingRemaining: number;
  qualifiesFreeShipping: boolean;
}

interface CartContextValue {
  items: CartItem[];
  isOpen: boolean;
  coupon: Coupon | null;
  couponError: string | null;
  totals: CartTotals;
  openCart: () => void;
  closeCart: () => void;
  setOpen: (open: boolean) => void;
  addItem: (flavor: Flavor, pack: PackSize, quantity?: number) => void;
  removeItem: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  clear: () => void;
  applyCoupon: (code: string) => boolean;
  removeCoupon: () => void;
}

const CartContext = React.createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useStoreSettings();
  const { isLoggedIn } = useAccount();
  const [items, setItems] = React.useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [coupon, setCoupon] = React.useState<Coupon | null>(null);
  const [couponError, setCouponError] = React.useState<string | null>(null);
  const [hydrated, setHydrated] = React.useState(false);
  
  // Database-loaded active coupons
  const [availableCoupons, setAvailableCoupons] = React.useState<Coupon[]>([]);

  // Fetch active coupons on mount
  React.useEffect(() => {
    const loadCoupons = async () => {
      try {
        const coupons = await apiFetch<Coupon[]>("/coupons");
        setAvailableCoupons(coupons);
      } catch (err) {
        console.error("Failed to load coupons from database:", err);
      }
    };
    loadCoupons();
  }, []);

  // Fetch / Sync cart from server when login status changes
  React.useEffect(() => {
    const syncWithServer = async () => {
      if (isLoggedIn) {
        try {
          // If we have local guest items, sync/merge them on login
          const localData = localStorage.getItem(STORAGE_KEY);
          let localItems: CartItem[] = [];
          if (localData) {
            const parsed = JSON.parse(localData);
            if (Array.isArray(parsed.items)) localItems = parsed.items;
          }

          let syncedItems: CartItem[] = [];
          if (localItems.length > 0) {
            syncedItems = await apiFetch<CartItem[]>("/cart/sync", {
              method: "POST",
              body: {
                items: localItems.map(i => ({
                  flavorId: i.flavorId,
                  packId: i.packId,
                  quantity: i.quantity
                }))
              }
            });
            // Clear local guest cart storage after merge
            localStorage.removeItem(STORAGE_KEY);
          } else {
            syncedItems = await apiFetch<CartItem[]>("/cart");
          }

          setItems(syncedItems);
        } catch (err) {
          console.error("Failed to sync cart with backend:", err);
        }
      } else {
        // Load guest cart from local storage on mount/logout
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed.items)) setItems(parsed.items);
            if (parsed.coupon) {
              // Wait until availableCoupons is loaded
              const c = availableCoupons.find(x => x.code === parsed.coupon);
              if (c) setCoupon(c);
            }
          }
        } catch {
          /* ignore */
        }
      }
      setHydrated(true);
    };

    syncWithServer();
  }, [isLoggedIn, availableCoupons]);

  // Persist guest cart locally (only when not logged in)
  React.useEffect(() => {
    if (!hydrated || isLoggedIn) return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ items, coupon: coupon?.code })
    );
  }, [items, coupon, hydrated, isLoggedIn]);

  const addItem = React.useCallback(
    async (flavor: Flavor, pack: PackSize, quantity = 1) => {
      const currentCount = items.reduce((sum, i) => sum + i.quantity, 0);
      if (currentCount + quantity > settings.maxOrderLimit) {
        toast.warning("Order limit reached", {
          description: `You can add up to ${settings.maxOrderLimit} packs per checkout.`,
        });
        return;
      }

      if (isLoggedIn) {
        try {
          const syncedItems = await apiFetch<CartItem[]>("/cart", {
            method: "POST",
            body: { flavorId: flavor.id, packId: pack.id, quantity }
          });
          setItems(syncedItems);
        } catch (err) {
          console.error("Failed to add cart item on server:", err);
        }
      } else {
        const key = `${flavor.id}:${pack.id}`;
        setItems((prev) => {
          const existing = prev.find((i) => i.key === key);
          if (existing) {
            return prev.map((i) =>
              i.key === key ? { ...i, quantity: Math.min(i.quantity + quantity, 99) } : i
            );
          }
          return [
            ...prev,
            {
              key,
              flavorId: flavor.id,
              flavorName: flavor.name,
              packId: pack.id,
              packLabel: pack.label,
              grams: pack.grams,
              unitPrice: pack.price,
              quantity,
              gradient: flavor.gradient,
            },
          ];
        });
      }
      setIsOpen(true);
    },
    [items, settings.maxOrderLimit, isLoggedIn]
  );

  const removeItem = React.useCallback(async (key: string) => {
    const [flavorId, packId] = key.split(":");
    if (isLoggedIn) {
      try {
        const syncedItems = await apiFetch<CartItem[]>(`/cart/${flavorId}/${packId}`, {
          method: "DELETE"
        });
        setItems(syncedItems);
      } catch (err) {
        console.error("Failed to remove cart item from server:", err);
      }
    } else {
      setItems((prev) => prev.filter((i) => i.key !== key));
    }
  }, [isLoggedIn]);

  const updateQuantity = React.useCallback(async (key: string, quantity: number) => {
    const targetItem = items.find((i) => i.key === key);
    if (targetItem) {
      const diff = quantity - targetItem.quantity;
      const currentCount = items.reduce((sum, i) => sum + i.quantity, 0);
      if (currentCount + diff > settings.maxOrderLimit) {
        toast.warning("Order limit reached", {
          description: `You can add up to ${settings.maxOrderLimit} packs per checkout.`,
        });
        return;
      }
    }

    const [flavorId, packId] = key.split(":");
    if (isLoggedIn) {
      try {
        const syncedItems = await apiFetch<CartItem[]>("/cart", {
          method: "PUT",
          body: { flavorId, packId, quantity }
        });
        setItems(syncedItems);
      } catch (err) {
        console.error("Failed to update cart quantity on server:", err);
      }
    } else {
      setItems((prev) =>
        quantity <= 0
          ? prev.filter((i) => i.key !== key)
          : prev.map((i) => (i.key === key ? { ...i, quantity: Math.min(quantity, 99) } : i))
      );
    }
  }, [items, settings.maxOrderLimit, isLoggedIn]);

  const clear = React.useCallback(async () => {
    if (isLoggedIn) {
      try {
        await apiFetch("/cart", { method: "DELETE" });
      } catch (err) {
        console.error("Failed to clear cart on server:", err);
      }
    }
    setItems([]);
    setCoupon(null);
  }, [isLoggedIn]);

  const totals = React.useMemo<CartTotals>(() => {
    const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

    let discount = 0;
    if (coupon && subtotal >= (coupon.minSubtotal ?? 0)) {
      discount =
        coupon.type === "percent"
          ? Math.round((subtotal * coupon.value) / 100)
          : Math.min(coupon.value, subtotal);
    }

    const taxedBase = Math.max(subtotal - discount, 0);
    const gst = Math.round(taxedBase * SITE.gstRate);
    const qualifiesFreeShipping = taxedBase >= SITE.freeShippingThreshold;
    const shipping = itemCount === 0 || qualifiesFreeShipping ? 0 : SITE.flatShippingFee;
    const total = taxedBase + gst + shipping;
    const freeShippingRemaining = Math.max(SITE.freeShippingThreshold - taxedBase, 0);

    return {
      itemCount,
      subtotal,
      discount,
      taxedBase,
      gst,
      shipping,
      total,
      freeShippingRemaining,
      qualifiesFreeShipping,
    };
  }, [items, coupon]);

  const applyCoupon = React.useCallback(
    (code: string) => {
      const found = availableCoupons.find((c) => c.code.toLowerCase() === code.trim().toLowerCase());
      if (!found) {
        setCouponError("That code isn't valid.");
        return false;
      }
      const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
      if (found.minSubtotal && subtotal < found.minSubtotal) {
        setCouponError(
          `Spend ₹${found.minSubtotal} to use ${found.code}.`
        );
        return false;
      }
      setCoupon(found);
      setCouponError(null);
      return true;
    },
    [items, availableCoupons]
  );

  const removeCoupon = React.useCallback(() => {
    setCoupon(null);
    setCouponError(null);
  }, []);

  const value: CartContextValue = {
    items,
    isOpen,
    coupon,
    couponError,
    totals,
    openCart: () => setIsOpen(true),
    closeCart: () => setIsOpen(false),
    setOpen: setIsOpen,
    addItem,
    removeItem,
    updateQuantity,
    clear,
    applyCoupon,
    removeCoupon,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = React.useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
