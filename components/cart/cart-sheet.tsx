"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Minus, Plus, ShoppingBag, Tag, Ticket, Trash2, Truck, ArrowRight, Loader2, ShieldCheck, ChevronRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStoreSettings } from "@/components/common/settings-provider";
import { useCart } from "./cart-provider";
import { formatINR, cn } from "@/lib/utils";
import { SITE } from "@/lib/constants";

export function CartSheet() {
  const { settings } = useStoreSettings();
  const {
    items,
    isOpen,
    setOpen,
    totals,
    coupon,
    couponError,
    updateQuantity,
    removeItem,
    applyCoupon,
    removeCoupon,
    availableCoupons,
  } = useCart();
  const router = useRouter();

  const [code, setCode] = React.useState("");
  const [checkingOut, setCheckingOut] = React.useState(false);
  const [showCoupons, setShowCoupons] = React.useState(true);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await applyCoupon(code)) setCode("");
  };

  const handleCheckoutClick = async () => {
    if (checkingOut) return;
    setCheckingOut(true);
    await new Promise((r) => setTimeout(r, 600));
    setOpen(false);
    setCheckingOut(false);
    router.push("/checkout");
  };

  const progress = Math.min(
    100,
    (totals.taxedBase / SITE.freeShippingThreshold) * 100
  );

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent side="right" className="flex flex-col p-0 overflow-hidden bg-gray-50/80">
        {/* Header */}
        <SheetHeader className="flex-row items-center justify-between border-b border-gray-200 bg-white px-5 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-purple-600 text-white font-bold shadow-sm">
              <ShoppingBag className="size-4.5" />
            </span>
            <div>
              <SheetTitle className="text-lg font-bold text-gray-900 leading-none">
                My Cart
              </SheetTitle>
              <p className="mt-1 text-xs text-gray-500 font-medium">
                {totals.itemCount} {totals.itemCount === 1 ? "item" : "items"}
              </p>
            </div>
          </div>
        </SheetHeader>

        {items.length === 0 ? (
          <EmptyCart onClose={() => setOpen(false)} />
        ) : (
          <>
            {/* Free Shipping Progress Bar */}
            <div className="border-b border-orange-100 bg-orange-50/60 px-5 py-3 shrink-0">
              <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-gray-800">
                <span className="flex items-center gap-1.5">
                  <Truck className="size-4 text-orange-600" />
                  {totals.qualifiesFreeShipping ? (
                    <span className="font-bold text-green-700">Unlocked FREE Shipping!</span>
                  ) : (
                    <span>
                      Add <span className="font-bold text-purple-700">{formatINR(totals.freeShippingRemaining)}</span> for FREE shipping
                    </span>
                  )}
                </span>
                <span className="text-[11px] font-bold text-orange-700">{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-orange-200/60">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
                  initial={false}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>

            {/* SINGLE SCROLLABLE BODY (Line items + Offers + Bill Details) */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar">
              
              {/* 1. Line items list */}
              <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-xs">
                <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Items ({totals.itemCount})</span>
                </div>
                <ul className="divide-y divide-gray-100">
                  <AnimatePresence initial={false}>
                    {items.map((item) => (
                      <motion.li
                        key={item.key}
                        layout
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            className="size-14 shrink-0 rounded-xl shadow-xs"
                            style={{
                              background: `radial-gradient(120% 120% at 30% 20%, ${item.gradient.from}, ${item.gradient.to})`,
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-serif text-sm font-bold text-gray-900 leading-snug truncate">
                              {item.flavorName}
                            </p>
                            <p className="text-[11px] font-medium text-gray-500">{item.packLabel} pack</p>
                            <p className="mt-1 font-bold text-xs text-purple-700">
                              {formatINR(item.unitPrice * item.quantity)}
                            </p>
                          </div>
                        </div>

                        {/* Stepper + Delete */}
                        <div className="flex items-center gap-2 shrink-0">
                          <QtyStepper
                            value={item.quantity}
                            onDec={() => updateQuantity(item.key, item.quantity - 1)}
                            onInc={() => updateQuantity(item.key, item.quantity + 1)}
                          />
                          <button
                            onClick={() => removeItem(item.key)}
                            className="grid size-8 place-items-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            aria-label={`Remove ${item.flavorName}`}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </div>

              {/* 2. Coupons & Offers section */}
              <div className="rounded-2xl border border-purple-200/80 bg-white p-3.5 shadow-xs">
                {coupon ? (
                  <div className="flex items-center justify-between rounded-xl border border-green-300 bg-green-50 px-3.5 py-2.5">
                    <span className="flex items-center gap-2 text-xs font-bold text-green-800">
                      <Tag className="size-4 text-green-600" /> {coupon.code} applied!
                    </span>
                    <button
                      onClick={removeCoupon}
                      className="text-xs font-bold text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <form onSubmit={handleApply} className="flex gap-2">
                      <Input
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="Enter coupon code"
                        className="h-10 text-xs border-gray-200 font-mono uppercase tracking-wider"
                      />
                      <Button type="submit" variant="outline" size="sm" className="h-10 shrink-0 font-bold border-purple-300 text-purple-700">
                        Apply
                      </Button>
                    </form>

                    {!coupon && availableCoupons.length > 0 && (
                      <div className="mt-3 border-t border-gray-100 pt-3">
                        <button
                          type="button"
                          onClick={() => setShowCoupons(!showCoupons)}
                          className="flex w-full items-center justify-between text-xs font-bold text-gray-700"
                        >
                          <span className="flex items-center gap-1.5">
                            <Ticket className="size-3.5 text-purple-600" />
                            Available Coupons ({availableCoupons.length})
                          </span>
                          <span className="text-[10px] text-purple-700 font-semibold flex items-center">
                            {showCoupons ? "Hide" : "View all"} <ChevronRight className={cn("size-3 transition-transform", showCoupons && "rotate-90")} />
                          </span>
                        </button>

                        {showCoupons && (
                          <div className="mt-2.5 space-y-2">
                            {availableCoupons.map((c) => {
                              const minReq = c.minSubtotal ?? 0;
                              const isEligible = totals.subtotal >= minReq;
                              const remaining = minReq - totals.subtotal;
                              const estSavings = c.type === "percent"
                                ? Math.round((totals.subtotal * c.value) / 100)
                                : c.value;

                              return (
                                <div
                                  key={c.code}
                                  className={cn(
                                    "flex flex-col gap-1.5 rounded-xl border p-2.5 transition-all",
                                    isEligible
                                      ? "border-purple-200 bg-purple-50/50"
                                      : "border-gray-200 bg-gray-50/60 opacity-75"
                                  )}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-mono text-xs font-bold uppercase text-purple-900">
                                          {c.code}
                                        </span>
                                        {isEligible && estSavings > 0 && (
                                          <span className="rounded bg-green-100 px-1 py-0.2 text-[9px] font-extrabold text-green-800">
                                            SAVE {formatINR(estSavings)}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-gray-500 truncate">{c.description}</p>
                                    </div>
                                    <button
                                      type="button"
                                      disabled={!isEligible}
                                      onClick={() => {
                                        if (isEligible) {
                                          void applyCoupon(c.code);
                                          setCode("");
                                        }
                                      }}
                                      className={cn(
                                        "rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all",
                                        isEligible
                                          ? "bg-purple-600 text-white hover:bg-purple-700 shadow-xs cursor-pointer"
                                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                      )}
                                    >
                                      {isEligible ? "Apply" : "Locked"}
                                    </button>
                                  </div>
                                  {!isEligible && remaining > 0 && (
                                    <p className="text-[10px] text-gray-500 font-medium border-t border-gray-200/50 pt-1">
                                      Add <span className="font-bold text-purple-700">{formatINR(remaining)}</span> more to unlock
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
                {couponError && <p className="mt-2 text-xs text-red-500 font-medium">{couponError}</p>}
              </div>

              {/* 3. Bill Details Card (Blinkit / Swiggy style) */}
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-900 border-b border-gray-100 pb-2">
                  Bill Details
                </p>
                <dl className="space-y-2 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <dt>Item Total (Subtotal)</dt>
                    <dd className="font-medium text-gray-900">{formatINR(totals.subtotal)}</dd>
                  </div>
                  {totals.discount > 0 && (
                    <div className="flex justify-between text-green-700 font-medium">
                      <dt>Coupon Discount</dt>
                      <dd>− {formatINR(totals.discount)}</dd>
                    </div>
                  )}
                  {settings.gstEnabled !== false && (
                    <div className="flex justify-between text-gray-600">
                      <dt>GST ({settings.taxRate || 5}%)</dt>
                      <dd className="font-medium text-gray-900">{formatINR(totals.gst)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <dt>Delivery Partner Fee</dt>
                    <dd className={totals.shipping === 0 ? "font-bold text-green-700 uppercase" : "font-medium text-gray-900"}>
                      {totals.shipping === 0 ? "FREE" : formatINR(totals.shipping)}
                    </dd>
                  </div>
                  <div className="my-2 h-px bg-gray-100" />
                  <div className="flex justify-between text-sm font-bold text-gray-900">
                    <dt>To Pay</dt>
                    <dd className="text-purple-700 font-extrabold text-base">{formatINR(totals.total)}</dd>
                  </div>
                </dl>
              </div>

              {/* Safety guarantee badge */}
              <div className="flex items-center justify-center gap-2 py-1 text-[11px] font-semibold text-gray-400">
                <ShieldCheck className="size-4 text-green-600" />
                <span>100% Safe Payments & Freshness Guarantee</span>
              </div>
            </div>

            {/* STICKY BOTTOM CHECKOUT BAR (Blinkit / Swiggy Instamart style) */}
            <div className="border-t border-gray-200 bg-white p-4 shadow-lg shrink-0">
              <Button
                size="lg"
                className="w-full h-12 text-sm font-bold rounded-2xl bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-200 flex items-center justify-between px-5"
                onClick={handleCheckoutClick}
                disabled={checkingOut}
              >
                <div className="flex flex-col items-start text-left">
                  <span className="text-xs opacity-90">To Pay</span>
                  <span className="font-extrabold text-base leading-none">{formatINR(totals.total)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {checkingOut ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>Proceed to Checkout</span>
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </div>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function QtyStepper({
  value,
  onDec,
  onInc,
}: {
  value: number;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50/50 p-0.5">
      <button
        onClick={onDec}
        className="grid size-6 place-items-center rounded-md bg-white text-purple-700 shadow-xs hover:bg-purple-100 transition-colors"
        aria-label="Decrease quantity"
      >
        <Minus className="size-3" />
      </button>
      <span className="w-5 text-center text-xs font-extrabold text-purple-900 tabular-nums">{value}</span>
      <button
        onClick={onInc}
        className="grid size-6 place-items-center rounded-md bg-white text-purple-700 shadow-xs hover:bg-purple-100 transition-colors"
        aria-label="Increase quantity"
      >
        <Plus className="size-3" />
      </button>
    </div>
  );
}

function EmptyCart({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
      <span className="grid size-20 place-items-center rounded-full bg-purple-50 text-purple-600">
        <ShoppingBag className="size-9" />
      </span>
      <div>
        <p className="font-serif text-xl font-bold text-gray-900">Your cart is empty</p>
        <p className="mt-1 text-xs text-gray-500">
          Add a pack or two of delicious crunchy wafers.
        </p>
      </div>
      <Button asChild size="lg" onClick={onClose} className="rounded-2xl">
        <Link href="/shop">Browse flavours</Link>
      </Button>
    </div>
  );
}
