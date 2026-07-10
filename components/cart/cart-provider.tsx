"use client";

import * as React from "react";
import type { CartItem, Flavor, PackSize } from "@/lib/types";
import { SITE } from "@/lib/constants";
import { findCoupon, type Coupon } from "@/lib/data/coupons";
import { useStoreSettings } from "@/components/common/settings-provider";

const STORAGE_KEY = "ratalu.cart.v1";

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
  const [items, setItems] = React.useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [coupon, setCoupon] = React.useState<Coupon | null>(null);
  const [couponError, setCouponError] = React.useState<string | null>(null);
  const [hydrated, setHydrated] = React.useState(false);

  // Load persisted cart on mount.
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { items: CartItem[]; coupon?: string };
        if (Array.isArray(parsed.items)) setItems(parsed.items);
        if (parsed.coupon) {
          const c = findCoupon(parsed.coupon);
          if (c) setCoupon(c);
        }
      }
    } catch {
      /* ignore malformed storage */
    }
    setHydrated(true);
  }, []);

  // Persist whenever the cart changes (after hydration to avoid clobbering).
  React.useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ items, coupon: coupon?.code })
    );
  }, [items, coupon, hydrated]);

  const addItem = React.useCallback(
    (flavor: Flavor, pack: PackSize, quantity = 1) => {
      const currentCount = items.reduce((sum, i) => sum + i.quantity, 0);
      if (currentCount + quantity > settings.maxOrderLimit) {
        alert(`Maximum order limit of ${settings.maxOrderLimit} packs per checkout reached. Please adjust your quantity.`);
        return;
      }

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
      setIsOpen(true);
    },
    [items, settings.maxOrderLimit]
  );

  const removeItem = React.useCallback((key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }, []);

  const updateQuantity = React.useCallback((key: string, quantity: number) => {
    const targetItem = items.find((i) => i.key === key);
    if (targetItem) {
      const diff = quantity - targetItem.quantity;
      const currentCount = items.reduce((sum, i) => sum + i.quantity, 0);
      if (currentCount + diff > settings.maxOrderLimit) {
        alert(`Maximum order limit of ${settings.maxOrderLimit} packs per checkout reached. Please adjust your quantity.`);
        return;
      }
    }

    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.key !== key)
        : prev.map((i) => (i.key === key ? { ...i, quantity: Math.min(quantity, 99) } : i))
    );
  }, [items, settings.maxOrderLimit]);

  const clear = React.useCallback(() => {
    setItems([]);
    setCoupon(null);
  }, []);

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
      const found = findCoupon(code);
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
    [items]
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
