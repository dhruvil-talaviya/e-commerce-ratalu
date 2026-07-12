"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Minus, Star, ArrowRight, Heart, ShoppingBag, Truck } from "lucide-react";
import { Modal, ModalContent, ModalTitle, ModalDescription } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HeatMeter } from "@/components/common/heat-meter";
import { WaferVisual } from "@/components/common/wafer-visual";
import { useCart } from "@/components/cart/cart-provider";
import { useWishlist } from "@/components/cart/wishlist-provider";
import { toast } from "@/components/ui/toast";
import { PACK_SIZES, DEFAULT_PACK_ID } from "@/lib/data/products";
import { formatINR, cn } from "@/lib/utils";
import type { Flavor } from "@/lib/types";

const RATING = 4.9;

/** Stable, realistic-looking review count derived from the flavour name. */
function reviewCount(flavor: Flavor) {
  return 1200 + ((flavor.name.charCodeAt(0) * 53 + flavor.name.length * 211) % 1900);
}

export function QuickView({
  flavor,
  open,
  onOpenChange,
}: {
  flavor: Flavor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { addItem } = useCart();
  const { has, toggle } = useWishlist();
  const [packId, setPackId] = React.useState(DEFAULT_PACK_ID);
  const [qty, setQty] = React.useState(1);

  const pack = PACK_SIZES.find((p) => p.id === packId)!;
  const wished = has(flavor.id);
  const discount = pack.compareAt ? Math.round((1 - pack.price / pack.compareAt) * 100) : 0;
  const reviews = reviewCount(flavor);

  // Reset selection when the modal (re)opens — render-phase adjustment.
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setPackId(DEFAULT_PACK_ID);
      setQty(1);
    }
  }

  const handleAdd = () => {
    addItem(flavor, pack, qty);
    toast.success(`${flavor.name} added to cart`, {
      description: `${qty} × ${pack.label} · ${formatINR(pack.price * qty)}`,
    });
    onOpenChange(false);
  };

  const toggleWishlist = () => {
    toggle(flavor.id);
    if (!wished) toast.success("Saved to wishlist");
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-2xl overflow-hidden p-0">
        <div className="grid max-h-[88vh] grid-cols-1 overflow-y-auto sm:max-h-none sm:grid-cols-2 sm:overflow-visible">
          {/* Visual */}
          <div
            className="relative flex aspect-[5/4] items-center justify-center p-8 sm:aspect-square"
            style={{
              background: `radial-gradient(130% 130% at 50% 15%, ${flavor.gradient.from}22, transparent 62%)`,
              backgroundColor: "#faf7fb",
            }}
          >
            <WaferVisual flavor={flavor} className="max-h-full" />
            <div className="absolute left-4 top-4 flex flex-col gap-1.5">
              {flavor.bestSeller && (
                <Badge variant="gold" size="sm">★ Best Seller</Badge>
              )}
              {discount > 0 && <Badge variant="orange" size="sm">{discount}% OFF</Badge>}
            </div>
          </div>

          {/* Info */}
          <div className="flex flex-col p-5 sm:p-6">
            {/* Rating (keep the top-right corner clear for the close button) */}
            <div className="flex items-center gap-2 pr-10">
              <span className="flex">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={cn(
                      "size-3.5",
                      i <= Math.round(RATING) ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"
                    )}
                  />
                ))}
              </span>
              <span className="text-sm font-bold text-gray-900">{RATING}</span>
              <span className="text-xs text-gray-400">({reviews.toLocaleString("en-IN")} reviews)</span>
            </div>

            <ModalTitle className="mt-2 text-2xl font-bold leading-tight text-gray-900">
              {flavor.name}
            </ModalTitle>
            <p className="mt-0.5 text-sm font-semibold text-orange-600">{flavor.tagline}</p>

            <ModalDescription className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-gray-500">
              {flavor.description}
            </ModalDescription>

            <div className="mt-3">
              <HeatMeter level={flavor.heat} />
            </div>

            {/* Pack selector */}
            <p className="mt-5 text-xs font-bold uppercase tracking-wider text-gray-400">Select pack size</p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {PACK_SIZES.map((p) => {
                const active = p.id === packId;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPackId(p.id)}
                    aria-pressed={active}
                    className={cn(
                      "flex min-w-0 flex-col items-center rounded-xl border px-1 py-2 text-center transition-all",
                      active
                        ? "border-purple-500 bg-purple-50 text-purple-700 shadow-sm ring-1 ring-purple-500"
                        : "border-gray-200 bg-white text-gray-500 hover:border-purple-200"
                    )}
                  >
                    <span className="text-sm font-bold">{p.label}</span>
                    <span className="mt-0.5 text-[11px] font-medium">{formatINR(p.price)}</span>
                  </button>
                );
              })}
            </div>

            {/* Price + wishlist */}
            <div className="mt-5 flex items-end justify-between gap-3">
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <span className="text-[1.7rem] font-extrabold leading-none text-gray-900">
                  {formatINR(pack.price * qty)}
                </span>
                {pack.compareAt && (
                  <span className="text-base text-gray-400 line-through">{formatINR(pack.compareAt * qty)}</span>
                )}
                {discount > 0 && (
                  <span className="rounded-md bg-green-50 px-1.5 py-0.5 text-xs font-bold text-green-700">
                    Save {formatINR((pack.compareAt! - pack.price) * qty)}
                  </span>
                )}
                <span className="w-full text-xs text-gray-400">Inclusive of all taxes</span>
              </div>
              <button
                onClick={toggleWishlist}
                aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
                aria-pressed={wished}
                className={cn(
                  "grid size-11 shrink-0 place-items-center rounded-full border transition-all hover:scale-105",
                  wished
                    ? "border-red-200 bg-red-50 text-red-500"
                    : "border-gray-200 bg-white text-gray-400 hover:border-red-200 hover:text-red-500"
                )}
              >
                <Heart className={cn("size-5", wished && "fill-current")} />
              </button>
            </div>

            {/* Trust */}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-gray-500">
              <span className="flex items-center gap-1.5 text-green-600">
                <span className="size-2 rounded-full bg-green-500" /> In stock
              </span>
              <span className="flex items-center gap-1.5">
                <Truck className="size-3.5 text-orange-500" /> Free shipping over ₹599
              </span>
            </div>

            {/* Quantity + Add to Cart */}
            <div className="mt-5 flex items-center gap-3">
              <div className="flex shrink-0 items-center rounded-full border border-gray-200 bg-white">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="grid size-9 place-items-center rounded-full text-gray-500 transition-colors hover:bg-gray-50 hover:text-purple-700"
                  aria-label="Decrease quantity"
                >
                  <Minus className="size-4" />
                </button>
                <span className="w-7 text-center text-base font-bold tabular-nums text-gray-900">{qty}</span>
                <button
                  onClick={() => setQty((q) => Math.min(99, q + 1))}
                  className="grid size-9 place-items-center rounded-full text-gray-500 transition-colors hover:bg-gray-50 hover:text-purple-700"
                  aria-label="Increase quantity"
                >
                  <Plus className="size-4" />
                </button>
              </div>
              <Button onClick={handleAdd} size="lg" className="min-w-0 flex-1 px-4 sm:px-5">
                <ShoppingBag className="size-5" />
                <span className="truncate">Add to Cart</span>
              </Button>
            </div>

            <Button
              asChild
              variant="link"
              className="mt-3.5 justify-center sm:justify-start"
              onClick={() => onOpenChange(false)}
            >
              <Link href={`/shop/${flavor.slug}`}>
                View full details <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
