"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Minus, Plus, ShoppingBag, Tag, Trash2, Truck, X, ArrowRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "./cart-provider";
import { useAccount } from "@/components/account/account-provider";
import { formatINR, cn } from "@/lib/utils";
import { SITE } from "@/lib/constants";

export function CartSheet() {
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
  } = useCart();
  const { isLoggedIn } = useAccount();

  const [code, setCode] = React.useState("");

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (applyCoupon(code)) setCode("");
  };

  const handleCheckoutClick = (e: React.MouseEvent) => {
    if (!isLoggedIn) {
      e.preventDefault();
      setOpen(false);
    } else {
      setOpen(false);
    }
  };

  const progress = Math.min(
    100,
    (totals.taxedBase / SITE.freeShippingThreshold) * 100
  );

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent className="p-0">
        <SheetHeader className="flex-row items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-purple-500 text-cream">
            <ShoppingBag className="size-5" />
          </span>
          <div>
            <SheetTitle>Your Cart</SheetTitle>
            <p className="text-sm text-charcoal-muted">
              {totals.itemCount} {totals.itemCount === 1 ? "item" : "items"}
            </p>
          </div>
        </SheetHeader>

        {items.length === 0 ? (
          <EmptyCart onClose={() => setOpen(false)} />
        ) : (
          <>
            {/* Free-shipping progress */}
            <div className="border-b border-[var(--color-border)] px-6 py-4">
              <div className="mb-2 flex items-center gap-2 text-sm text-charcoal">
                <Truck className="size-4 text-orange-500" />
                {totals.qualifiesFreeShipping ? (
                  <span className="font-medium text-green-700">
                    You&apos;ve unlocked free shipping!
                  </span>
                ) : (
                  <span>
                    Add{" "}
                    <span className="font-semibold text-purple-700">
                      {formatINR(totals.freeShippingRemaining)}
                    </span>{" "}
                    more for free shipping
                  </span>
                )}
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-cream-200">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-gold-400"
                  initial={false}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>

            {/* Line items */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <ul className="flex flex-col gap-4">
                <AnimatePresence initial={false}>
                  {items.map((item) => (
                    <motion.li
                      key={item.key}
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      className="flex gap-4"
                    >
                      <div
                        className="size-20 shrink-0 rounded-2xl"
                        style={{
                          background: `radial-gradient(120% 120% at 30% 20%, ${item.gradient.from}, ${item.gradient.to})`,
                        }}
                      />
                      <div className="flex flex-1 flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-serif text-base font-semibold leading-tight text-charcoal">
                              {item.flavorName}
                            </p>
                            <p className="text-xs text-charcoal-muted">{item.packLabel} pack</p>
                          </div>
                          <button
                            onClick={() => removeItem(item.key)}
                            className="text-charcoal-soft transition-colors hover:text-red-500"
                            aria-label={`Remove ${item.flavorName}`}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                        <div className="mt-auto flex items-center justify-between pt-2">
                          <QtyStepper
                            value={item.quantity}
                            onDec={() => updateQuantity(item.key, item.quantity - 1)}
                            onInc={() => updateQuantity(item.key, item.quantity + 1)}
                          />
                          <span className="font-semibold text-charcoal">
                            {formatINR(item.unitPrice * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </div>

            {/* Summary */}
            <div className="border-t border-[var(--color-border)] bg-white/60 px-6 py-5">
              {/* Coupon */}
              {coupon ? (
                <div className="mb-4 flex items-center justify-between rounded-2xl border border-green-200 bg-green-50 px-4 py-2.5">
                  <span className="flex items-center gap-2 text-sm font-medium text-green-800">
                    <Tag className="size-4" /> {coupon.code} applied
                  </span>
                  <button
                    onClick={removeCoupon}
                    className="text-green-700 hover:text-green-900"
                    aria-label="Remove coupon"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApply} className="mb-4 flex gap-2">
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Coupon code"
                    className="h-11"
                    aria-label="Coupon code"
                  />
                  <Button type="submit" variant="outline" size="md" className="shrink-0">
                    Apply
                  </Button>
                </form>
              )}
              {couponError && (
                <p className="-mt-2 mb-3 text-xs text-red-500">{couponError}</p>
              )}

              <dl className="flex flex-col gap-2 text-sm">
                <Row label="Subtotal" value={formatINR(totals.subtotal)} />
                {totals.discount > 0 && (
                  <Row
                    label="Discount"
                    value={`− ${formatINR(totals.discount)}`}
                    className="text-green-700"
                  />
                )}
                <Row label={`GST (${Math.round(SITE.gstRate * 100)}%)`} value={formatINR(totals.gst)} />
                <Row
                  label="Shipping"
                  value={totals.shipping === 0 ? "Free" : formatINR(totals.shipping)}
                  className={totals.shipping === 0 ? "text-green-700" : undefined}
                />
                <div className="my-1 h-px bg-[var(--color-border)]" />
                <div className="flex items-center justify-between">
                  <dt className="font-serif text-lg font-semibold text-charcoal">Total</dt>
                  <dd className="font-serif text-xl font-bold text-purple-700">
                    {formatINR(totals.total)}
                  </dd>
                </div>
              </dl>

              <p className="mt-2 text-xs text-charcoal-soft">
                Estimated delivery in 2–6 business days.
              </p>

              <Button asChild size="lg" className="mt-4 w-full" onClick={handleCheckoutClick}>
                <Link href="/checkout">
                  Checkout · {formatINR(totals.total)} <ArrowRight />
                </Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Row({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between text-charcoal-muted", className)}>
      <dt>{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
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
    <div className="flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-white p-1">
      <button
        onClick={onDec}
        className="grid size-7 place-items-center rounded-full text-charcoal-muted transition-colors hover:bg-purple-50 hover:text-purple-700"
        aria-label="Decrease quantity"
      >
        <Minus className="size-3.5" />
      </button>
      <span className="w-6 text-center text-sm font-semibold tabular-nums">{value}</span>
      <button
        onClick={onInc}
        className="grid size-7 place-items-center rounded-full text-charcoal-muted transition-colors hover:bg-purple-50 hover:text-purple-700"
        aria-label="Increase quantity"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

function EmptyCart({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
      <span className="grid size-20 place-items-center rounded-full bg-purple-50 text-purple-300">
        <ShoppingBag className="size-9" />
      </span>
      <div>
        <p className="font-serif text-xl font-semibold text-charcoal">Your cart is empty</p>
        <p className="mt-1 text-sm text-charcoal-muted">
          Add a pack or two of irresistible crunch.
        </p>
      </div>
      <Button asChild size="lg" onClick={onClose}>
        <Link href="/shop">Browse flavours</Link>
      </Button>
    </div>
  );
}
