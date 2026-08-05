"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ShoppingBag, ArrowRight, Sparkles, ChevronUp, Plus, Minus } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { formatINR, cn } from "@/lib/utils";

function FloatingCheckoutBarContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { totals, items, openCart, setOpen } = useCart();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isLoginModalOpen = searchParams?.get("login") === "true";

  // Hide on account page, checkout page, admin console or when login gate is open
  const isHidden =
    !mounted ||
    totals.itemCount === 0 ||
    pathname === "/checkout" ||
    pathname === "/account" ||
    isLoginModalOpen ||
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
        initial={{ y: 80, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 80, opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className="fixed bottom-3 sm:bottom-5 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:w-[440px] z-50 pointer-events-auto"
      >
        <div className="relative group overflow-hidden rounded-full bg-gradient-to-r from-[#2D163F] via-[#5B2C83] to-[#451A67] p-2 text-white shadow-[0_12px_36px_rgba(91,44,131,0.45)] border border-amber-400/30 backdrop-blur-xl">
          {/* Ambient Glow */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-transparent animate-pulse pointer-events-none" />

          <div className="relative flex items-center justify-between gap-2 pl-1.5">
            {/* Left side: Cart Summary & Price */}
            <button
              type="button"
              onClick={openCart}
              className="flex items-center gap-2.5 text-left focus:outline-none min-w-0 flex-1 hover:opacity-95 transition-opacity"
              aria-label="View cart items"
            >
              <motion.div
                key={totals.itemCount}
                initial={{ scale: 0.7 }}
                animate={{ scale: 1 }}
                className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 shadow-inner"
              >
                <ShoppingBag className="size-4 text-amber-300" />
                <span className="absolute -top-1 -right-1 grid min-w-4 h-4 px-1 place-items-center rounded-full bg-[#F4B400] text-purple-950 font-extrabold text-[9px] shadow-sm">
                  {totals.itemCount}
                </span>
              </motion.div>

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm text-amber-300 tracking-tight">
                    {formatINR(Math.max(totals.subtotal - totals.discount, 0))}
                  </span>
                  <span className="text-[10px] text-purple-200/80 font-semibold uppercase tracking-wider">
                    ({totals.itemCount} {totals.itemCount === 1 ? "item" : "items"})
                  </span>
                </div>

                <p className="text-[10px] font-bold text-amber-200/90 truncate flex items-center gap-1">
                  {totals.qualifiesFreeShipping ? (
                    <span className="text-emerald-300 flex items-center gap-1">
                      <Sparkles className="size-2.5 text-amber-300" /> FREE Delivery Unlocked!
                    </span>
                  ) : (
                    <span className="text-amber-200/90">Add {formatINR(totals.freeShippingRemaining)} for Free Delivery</span>
                  )}
                </p>
              </div>
            </button>

            {/* Right side: Direct Checkout Button */}
            <button
              type="button"
              onClick={handleCheckoutClick}
              className="shrink-0 h-9 px-4 rounded-full bg-gradient-to-r from-[#F4B400] to-[#E5A300] hover:from-amber-300 hover:to-amber-400 text-purple-950 font-extrabold text-xs shadow-md shadow-amber-500/25 active:scale-95 transition-all flex items-center gap-1.5 border border-amber-200/60"
            >
              <span>Checkout</span>
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export function FloatingCheckoutBar() {
  return (
    <React.Suspense fallback={null}>
      <FloatingCheckoutBarContent />
    </React.Suspense>
  );
}
