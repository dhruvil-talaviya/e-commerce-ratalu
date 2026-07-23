"use client";

import * as React from "react";
import type { CartItem, Flavor, PackSize } from "@/lib/types";
import { SITE } from "@/lib/constants";
import { useStoreSettings } from "@/components/common/settings-provider";
import { useAccount, isAdminSession } from "@/components/account/account-provider";
import { apiFetch } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { useProducts } from "@/components/shop/product-provider";

const STORAGE_KEY = "ratalu.cart.v1";

/** The server's reason, or a plain fallback — never a raw exception. */
const describe = (err: unknown) =>
  err instanceof Error && err.message ? err.message : "Something went wrong. Please try again.";

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
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => void;
  availableCoupons: Coupon[];
}

const CartContext = React.createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useStoreSettings();
  const { isLoggedIn, user } = useAccount();

  /**
   * The admin previewing the storefront is not a shopper.
   *
   * Syncing their cart to the server would call the customer cart endpoints
   * with the admin's token, creating a Cart row keyed to the admin's id — a
   * customer-side shopping record silently attached to the owner's account.
   * Treat them as a guest instead: their cart stays local, and nothing they do
   * while browsing the shop can mutate the admin account.
   */
  const isShopper = isLoggedIn && !isAdminSession(user);
  const { getFlavor } = useProducts();
  const [items, setItems] = React.useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [coupon, setCoupon] = React.useState<Coupon | null>(null);
  const [couponError, setCouponError] = React.useState<string | null>(null);
  const [hydrated, setHydrated] = React.useState(false);

  /**
   * Whose cart is currently in state — a customer id, or null for a guest.
   *
   * Logging out used to clear the token and the user but leave `items` alone.
   * The stale items then fell through to the guest-cart branch, got written to
   * localStorage, and were merged into the NEXT person to sign in on this
   * device. One shopper's basket ended up in a stranger's account. Comparing the
   * cart's owner against the current one is what makes that impossible.
   */
  const ownerId = isShopper ? user?.id ?? null : null;
  const [loadedOwner, setLoadedOwner] = React.useState<string | null | undefined>(undefined);

  // Coupons the CURRENT account may actually redeem (the API filters per account).
  const [availableCoupons, setAvailableCoupons] = React.useState<Coupon[]>([]);

  React.useEffect(() => {
    let cancelled = false;

    apiFetch<Coupon[]>("/coupons")
      .then((coupons) => {
        if (!cancelled) setAvailableCoupons(coupons ?? []);
      })
      .catch(() => {
        if (!cancelled) setAvailableCoupons([]);
      });

    return () => {
      cancelled = true;
    };
    // Refetched on account change: a returning customer must no longer be shown
    // the first-order-only offers a guest sees.
  }, [ownerId]);

  const [combos, setCombos] = React.useState<any[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    apiFetch<any[]>("/combos")
      .then((res) => {
        if (!cancelled) setCombos(res ?? []);
      })
      .catch(() => {
        if (!cancelled) setCombos([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Load the cart that belongs to whoever is using the browser right now.
  React.useEffect(() => {
    const load = async () => {
      const previousOwner = loadedOwner;

      /**
       * A signed-in shopper has left. Their basket goes with them — it is not
       * inherited by the guest session or by the next account to sign in.
       *
       * Guest → signed-in is deliberately NOT a wipe: that's the merge that lets
       * you fill a cart before logging in.
       */
      if (previousOwner != null && previousOwner !== ownerId) {
        setItems([]);
        setCoupon(null);
        setCouponError(null);
        localStorage.removeItem(STORAGE_KEY);
        setLoadedOwner(ownerId);
        return;
      }

      if (isShopper) {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          const localItems: CartItem[] = raw ? JSON.parse(raw).items ?? [] : [];

          const synced = localItems.length
            ? await apiFetch<CartItem[]>("/cart/sync", {
                method: "POST",
                body: {
                  items: localItems.map((i) => ({
                    flavorId: i.flavorId,
                    packId: i.packId,
                    quantity: i.quantity,
                  })),
                },
              })
            : await apiFetch<CartItem[]>("/cart");

          // The guest cart has been absorbed; leaving it behind would re-merge
          // it into the next account too.
          localStorage.removeItem(STORAGE_KEY);
          setItems(synced ?? []);
        } catch (err) {
          console.error("Failed to sync cart with backend:", err);
        }
      } else {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          const parsed = raw ? JSON.parse(raw) : null;
          setItems(Array.isArray(parsed?.items) ? parsed.items : []);
        } catch {
          setItems([]);
        }
      }

      setLoadedOwner(ownerId);
      setHydrated(true);
    };

    load();
  }, [ownerId, isShopper]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Re-apply a coupon the guest had on their cart before the page reloaded.
   *
   * Re-validated rather than trusted: the stored code is just a string in the
   * browser, and it may have expired (or been revoked) since it was applied.
   */
  const rehydratedCoupon = React.useRef(false);
  React.useEffect(() => {
    if (!hydrated || isShopper || coupon || rehydratedCoupon.current || !items.length) return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const storedCode = raw ? JSON.parse(raw).coupon : null;
      if (!storedCode) return;

      rehydratedCoupon.current = true;
      const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

      apiFetch<Coupon>("/coupons/validate", {
        method: "POST",
        body: { code: storedCode, subtotal },
      })
        .then(setCoupon)
        .catch(() => setCoupon(null));
    } catch {
      /* nothing worth recovering */
    }
  }, [hydrated, isShopper, coupon, items]);

  // Persist the guest cart — never before the right cart has loaded, or we'd
  // write the previous account's items back out under the guest key.
  React.useEffect(() => {
    if (!hydrated || isShopper || loadedOwner !== ownerId) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, coupon: coupon?.code }));
  }, [items, coupon, hydrated, isShopper, loadedOwner, ownerId]);

  const addItem = React.useCallback(
    async (flavor: Flavor, pack: PackSize, quantity = 1) => {
      // 1. Per product limit check
      const currentProductQty = items
        .filter((i) => i.flavorId === flavor.id)
        .reduce((sum, i) => sum + i.quantity, 0);

      const productLimit = flavor.maxQtyPerCheckout;
      if (productLimit && currentProductQty + quantity > productLimit) {
        toast.warning("Product limit reached", {
          description: `You can only add up to ${productLimit} packs of ${flavor.name} per checkout.`,
        });
        return;
      }

      // 2. Global limit check
      const currentCount = items.reduce((sum, i) => sum + i.quantity, 0);
      if (currentCount + quantity > settings.maxOrderLimit) {
        toast.warning("Order limit reached", {
          description: `You can add up to ${settings.maxOrderLimit} packs per checkout.`,
        });
        return;
      }

      if (isShopper) {
        try {
          const syncedItems = await apiFetch<CartItem[]>("/cart", {
            method: "POST",
            body: { flavorId: flavor.id, packId: pack.id, quantity }
          });
          setItems(syncedItems);
        } catch (err) {
          // The server enforces the same limits and is the one that decides.
          // Swallowing this left the customer staring at a cart that silently
          // refused to change.
          toast.warning("Couldn't add that", { description: describe(err) });
          return;
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
    [items, settings.maxOrderLimit, isShopper]
  );

  const removeItem = React.useCallback(async (key: string) => {
    const [flavorId, packId] = key.split(":");
    if (isShopper) {
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
  }, [isShopper]);

  const updateQuantity = React.useCallback(async (key: string, quantity: number) => {
    const targetItem = items.find((i) => i.key === key);
    if (targetItem) {
      const diff = quantity - targetItem.quantity;
      const flavor = getFlavor(targetItem.flavorId);

      // 1. Per product limit check
      if (flavor && flavor.maxQtyPerCheckout) {
        const currentProductQty = items
          .filter((i) => i.flavorId === targetItem.flavorId)
          .reduce((sum, i) => sum + i.quantity, 0);

        const limit = flavor.maxQtyPerCheckout;
        if (currentProductQty + diff > limit) {
          toast.warning("Product limit reached", {
            description: `You can only add up to ${limit} packs of ${flavor.name} per checkout.`,
          });
          return;
        }
      }

      // 2. Global limit check
      const currentCount = items.reduce((sum, i) => sum + i.quantity, 0);
      if (currentCount + diff > settings.maxOrderLimit) {
        toast.warning("Order limit reached", {
          description: `You can add up to ${settings.maxOrderLimit} packs per checkout.`,
        });
        return;
      }
    }

    const [flavorId, packId] = key.split(":");
    if (isShopper) {
      try {
        const syncedItems = await apiFetch<CartItem[]>("/cart", {
          method: "PUT",
          body: { flavorId, packId, quantity }
        });
        setItems(syncedItems);
      } catch (err) {
        toast.warning("Couldn't update that", { description: describe(err) });
      }
    } else {
      setItems((prev) =>
        quantity <= 0
          ? prev.filter((i) => i.key !== key)
          : prev.map((i) => (i.key === key ? { ...i, quantity: Math.min(quantity, 99) } : i))
      );
    }
  }, [items, settings.maxOrderLimit, isShopper, getFlavor]);

  const clear = React.useCallback(async () => {
    if (isShopper) {
      try {
        await apiFetch("/cart", { method: "DELETE" });
      } catch (err) {
        console.error("Failed to clear cart on server:", err);
      }
    }
    setItems([]);
    setCoupon(null);
  }, [isShopper]);

  const totals = React.useMemo<CartTotals>(() => {
    const rawSubtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

    // Calculate combo discounts first
    let comboDiscount = 0;
    const pool = { ...Object.fromEntries(items.map(item => [`${item.flavorId}:${item.packId}`, item.quantity])) };
    const sortedCombos = [...combos].sort((a, b) => b.savings - a.savings);

    for (const combo of sortedCombos) {
      let possibleApplications = Infinity;
      for (const reqItem of combo.items) {
        const key = `${reqItem.flavorId}:${reqItem.packId}`;
        const available = pool[key] || 0;
        const needed = reqItem.quantity;
        if (needed <= 0) continue;
        const count = Math.floor(available / needed);
        if (count < possibleApplications) {
          possibleApplications = count;
        }
      }

      if (possibleApplications > 0 && possibleApplications !== Infinity) {
        for (const reqItem of combo.items) {
          const key = `${reqItem.flavorId}:${reqItem.packId}`;
          pool[key] -= reqItem.quantity * possibleApplications;
        }
        comboDiscount += combo.savings * possibleApplications;
      }
    }

    let discount = comboDiscount;
    const subtotalAfterCombos = Math.max(rawSubtotal - comboDiscount, 0);
    if (coupon && subtotalAfterCombos >= (coupon.minSubtotal ?? 0)) {
      const couponSavings =
        coupon.type === "percent"
          ? Math.round((subtotalAfterCombos * coupon.value) / 100)
          : Math.min(coupon.value, subtotalAfterCombos);
      discount += couponSavings;
    }

    const discountRatio = rawSubtotal > 0 ? Math.max(rawSubtotal - discount, 0) / rawSubtotal : 0;

    const gstEnabled = settings.gstEnabled !== false;
    const globalGstRate = settings.taxRate || 5;
    const globalTaxInclusive = settings.taxInclusive !== false;
    const freeShippingThreshold = settings.shippingFreeThreshold || 599;
    const flatShippingFee = settings.shippingFlatRate || 49;

    let totalTaxableBase = 0;
    let totalOriginalGst = 0;

    items.forEach((item) => {
      const flavor = getFlavor(item.flavorId);
      let rate = 0;
      let isInclusive = true;

      if (gstEnabled) {
        if (flavor && flavor.taxOverrideEnabled) {
          rate = flavor.taxRate || 0;
          isInclusive = flavor.taxInclusive !== false;
        } else {
          rate = globalGstRate;
          isInclusive = globalTaxInclusive;
        }
      }

      let baseVal = 0;
      let gstVal = 0;
      const itemOriginalTotal = item.unitPrice * item.quantity;

      if (isInclusive) {
        baseVal = itemOriginalTotal / (1 + rate / 100);
        gstVal = itemOriginalTotal - baseVal;
      } else {
        baseVal = itemOriginalTotal;
        gstVal = itemOriginalTotal * (rate / 100);
      }

      totalTaxableBase += baseVal;
      totalOriginalGst += gstVal;
    });

    const gst = Math.round(totalOriginalGst * discountRatio);
    const postDiscountPrice = Math.max(rawSubtotal - discount, 0);
    const qualifiesFreeShipping = postDiscountPrice >= freeShippingThreshold;
    const shipping = itemCount === 0 ? 0 : (qualifiesFreeShipping ? 0 : flatShippingFee);

    let total = 0;
    let taxedBase = 0;

    const allInclusive = items.every((i) => {
      const flavor = getFlavor(i.flavorId);
      if (gstEnabled) {
        if (flavor && flavor.taxOverrideEnabled) {
          return flavor.taxInclusive !== false;
        }
        return globalTaxInclusive;
      }
      return true;
    });

    if (allInclusive) {
      total = postDiscountPrice + shipping;
      taxedBase = postDiscountPrice - gst;
    } else {
      total = postDiscountPrice + gst + shipping;
      taxedBase = postDiscountPrice;
    }

    // Apply Round Off if enabled in settings
    if (settings.roundOffEnabled !== false) {
      total = Math.round(total);
    }

    const freeShippingRemaining = Math.max(freeShippingThreshold - postDiscountPrice, 0);

    return {
      itemCount,
      subtotal: rawSubtotal,
      discount,
      taxedBase,
      gst: gstEnabled ? gst : 0,
      shipping,
      total,
      freeShippingRemaining,
      qualifiesFreeShipping,
    };
  }, [items, coupon, settings, getFlavor, combos]);

  /**
   * Coupons are validated by the SERVER.
   *
   * This used to match the code against a list held in the browser and check
   * nothing but the minimum spend — so an expired code, a code already used by
   * this account, or a first-order-only code in the hands of a repeat customer
   * all sailed through and showed a discount that checkout would later refuse.
   * The API applies every rule against the signed-in account and is the only
   * thing that can say yes.
   */
  const applyCoupon = React.useCallback(
    async (code: string) => {
      const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

      try {
        const validated = await apiFetch<Coupon>("/coupons/validate", {
          method: "POST",
          body: { code: code.trim(), subtotal },
        });

        setCoupon(validated);
        setCouponError(null);
        toast.success(`${validated.code} applied`, {
          description: validated.description || undefined,
        });
        return true;
      } catch (err) {
        setCoupon(null);
        setCouponError(describe(err));
        return false;
      }
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
    availableCoupons,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = React.useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
