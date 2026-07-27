"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ShoppingBag, ArrowRight, Sparkles, ChevronUp, Plus, Minus } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { formatINR, cn } from "@/lib/utils";

export function FloatingCheckoutBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { totals, items, openCart, setOpen } = useCart();

  // Hide on checkout page or admin console
  const isHidden =
    totals.itemCount === 0 ||
    pathname === "/checkout" ||
    pathname?.startsWith("/admin");

  if (isHidden) return null;

  const handleCheckoutClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(false);
    router.push("/checkout");
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 70, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 70, opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="fixed bottom-3 sm:bottom-5 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:w-[420px] z-40 pointer-events-auto"
      >
        <div className="relative group overflow-hidden rounded-full bg-gradient-to-r from-[#3B123C] via-[#5B2C83] to-[#6D28D9] p-2 sm:p-2.5 text-white shadow-[0_10px_32px_rgba(91,44,131,0.4)] border border-white/20 backdrop-blur-md">
          {/* Subtle Ambient Pulse Ring */}
          <div className="absolute inset-0 rounded-full border border-purple-300/40 animate-pulse pointer-events-none" />

          <div className="relative flex items-center justify-between gap-2.5 pl-1">
            {/* Left side: Cart Summary & Price (Click opens Cart Drawer for review) */}
            <button
              type="button"
              onClick={openCart}
              className="flex items-center gap-2.5 text-left focus:outline-none min-w-0 flex-1 hover:opacity-90 transition-opacity"
              aria-label="View cart items"
            >
              <div className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15 border border-white/20 text-white shadow-inner">
                <ShoppingBag className="size-4 text-amber-300" />
                <span className="absolute -top-1 -right-1 grid min-w-4 h-4 px-1 place-items-center rounded-full bg-amber-400 text-purple-950 font-extrabold text-[9px] shadow-xs">
                  {totals.itemCount}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5 leading-none">
                  <span className="font-serif text-sm sm:text-base font-extrabold text-white">
                    {formatINR(totals.subtotal - totals.discount)}
                  </span>
                  <span className="text-[10px] text-purple-200 uppercase font-bold">
                    ({totals.itemCount} {totals.itemCount === 1 ? "item" : "items"})
                  </span>
                </div>
                <p className="text-[10px] font-medium text-emerald-300 truncate mt-0.5">
                  {totals.qualifiesFreeShipping ? (
                    <span className="font-bold flex items-center gap-1">
                      <Sparkles className="size-2.5 text-amber-300" /> FREE Delivery
                    </span>
                  ) : (
                    <span>Add {formatINR(totals.freeShippingRemaining)} for Free Delivery</span>
                  )}
                </p>
              </div>
            </button>

            {/* Right side: Direct Checkout Button */}
            <button
              type="button"
              onClick={handleCheckoutClick}
              className="shrink-0 h-9 px-4 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-purple-950 font-extrabold text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-1 border border-amber-300/60"
            >
              <span>Checkout</span>
              <ArrowRight className="size-3.5 animate-pulse" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
