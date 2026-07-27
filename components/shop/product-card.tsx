"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Plus, Minus, Heart, Star, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HeatMeter } from "@/components/common/heat-meter";
import { WaferVisual } from "@/components/common/wafer-visual";
import { useCart } from "@/components/cart/cart-provider";
import { useWishlist } from "@/components/cart/wishlist-provider";
import { QuickView } from "./quick-view";
import { getPacks, getPackFor, DEFAULT_PACK_ID } from "@/lib/data/products";
import { formatINR, cn } from "@/lib/utils";
import type { Flavor } from "@/lib/types";

const badgeVariant: Record<string, "gold" | "orange" | "primary"> = {
  Signature: "primary",
  New: "gold",
  Hot: "orange",
};

export function ProductCard({
  flavor,
  index = 0,
  view = "grid",
}: {
  flavor: Flavor;
  index?: number;
  view?: "grid" | "list";
}) {
  const { addItem, items, updateQuantity, removeItem } = useCart();
  const { has, toggle } = useWishlist();
  const [packId, setPackId] = React.useState(DEFAULT_PACK_ID);
  const [quickOpen, setQuickOpen] = React.useState(false);

  const pack = getPackFor(flavor, packId);
  const wished = has(flavor.id);
  const savings = pack.compareAt ? pack.compareAt - pack.price : 0;
  const isList = view === "list";
  const isOutOfStock = flavor.inStock === false;

  const itemKey = `${flavor.id}-${pack.id}`;
  const cartItem = items.find((i) => i.key === itemKey || (i.flavorId === flavor.id && i.packId === pack.id));
  const cartQty = cartItem ? cartItem.quantity : 0;

  const handleAdd = () => {
    if (isOutOfStock) return;
    addItem(flavor, pack, 1);
  };

  const handleDec = () => {
    if (!cartItem) return;
    if (cartItem.quantity <= 1) {
      removeItem(cartItem.key);
    } else {
      updateQuantity(cartItem.key, cartItem.quantity - 1);
    }
  };

  const handleInc = () => {
    if (!cartItem) {
      addItem(flavor, pack, 1);
    } else {
      updateQuantity(cartItem.key, cartItem.quantity + 1);
    }
  };

  return (
    <>
      <motion.article
        variants={{
          hidden: { opacity: 0, y: 28 },
          visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: index * 0.03 },
          },
        }}
        className={cn(
          "group relative flex h-full flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-[#e8d9eb] bg-white shadow-[var(--shadow-soft)] transition-all duration-300 hover:shadow-[var(--shadow-lift)] hover:border-[#5B2C83]/30",
          isList ? "flex-col sm:flex-row" : "flex-col"
        )}
      >
        {/* Visual Artwork */}
        <div
          className={cn(
            "relative shrink-0 overflow-hidden bg-[#FFF8EC]",
            isList ? "aspect-[4/3] sm:aspect-auto sm:w-56 lg:w-64" : "aspect-[4/3] w-full"
          )}
          style={{
            background: `radial-gradient(130% 130% at 50% 10%, ${flavor.gradient.from}22, #FFF8EC 62%)`,
          }}
        >
          <Link href={`/shop/${flavor.slug}`} className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 transition-transform duration-500 group-hover:scale-105">
            <WaferVisual flavor={flavor} seed={index} className={cn("max-h-full transition-transform duration-500", isOutOfStock && "grayscale opacity-50 blur-[0.5px]")} />
          </Link>

          {isOutOfStock ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px] z-10">
              <span className="relative flex items-center justify-center px-4 py-2 bg-[#dc2626] text-white font-black text-[10px] sm:text-[11px] uppercase tracking-widest rounded-full shadow-md select-none">
                Out of Stock
              </span>
            </div>
          ) : (
            <div className="absolute left-2.5 top-2.5 sm:left-4 sm:top-4 z-10">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#4CAF50] px-2.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                <Leaf className="size-3" /> Fresh Stock
              </span>
            </div>
          )}

          {/* Badges */}
          <div className="absolute left-2.5 bottom-2.5 sm:left-4 sm:bottom-4 flex flex-col gap-1 z-10">
            {flavor.bestSeller && (
              <Badge variant="gold" size="sm" className="bg-[#F4B400] text-[#2D2D2D] font-bold text-[9px] sm:text-xs shadow-xs">★ Best seller</Badge>
            )}
            {flavor.badge && (
              <Badge variant={badgeVariant[flavor.badge] ?? "soft"} size="sm" className="text-[9px] sm:text-xs">{flavor.badge}</Badge>
            )}
          </div>

          {/* Wishlist Button with Likes */}
          {(() => {
            const baseLikes = flavor.likesCount || 0;
            // eslint-disable-next-line react-hooks/rules-of-hooks
            const initiallyWished = React.useRef(wished).current;
            const currentLikes = Math.max(0, baseLikes + (wished ? (initiallyWished ? 0 : 1) : (initiallyWished ? -1 : 0)));

            return (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(flavor.id);
                }}
                aria-label={wished ? "Unlike product" : "Like product"}
                aria-pressed={wished}
                className="absolute right-2.5 top-2.5 sm:right-4 sm:top-4 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[#555555] shadow-xs backdrop-blur transition-all active:scale-95 hover:text-red-500 z-10 border border-[#e8d9eb]"
              >
                <Heart className={cn("size-3.5 sm:size-4 transition-colors", wished && "fill-red-500 text-red-500")} />
                {currentLikes > 0 && (
                  <span className={cn("text-[11px] font-extrabold leading-none", wished ? "text-red-600" : "text-[#2D2D2D]")}>
                    {currentLikes}
                  </span>
                )}
              </button>
            );
          })()}
        </div>

        {/* Body Content */}
        <div className="flex flex-1 flex-col justify-between p-4 sm:p-5 lg:p-6 bg-white">
          <div>
            <div className="flex items-start justify-between gap-1.5">
              <Link href={`/shop/${flavor.slug}`} className="min-w-0 flex-1 transition-colors hover:text-[#7B3FA0]">
                <h3 className="line-clamp-2 font-serif text-sm font-bold leading-tight text-[#5B2C83] sm:text-lg lg:text-2xl">{flavor.name}</h3>
              </Link>
              <HeatMeter level={flavor.heat} showLabel={false} className="mt-0.5 shrink-0" />
            </div>

            {/* Rating Stars */}
            <div className="mt-1.5 flex items-center gap-1 text-[#F4B400] text-xs font-bold">
              <Star className="size-3.5 fill-[#F4B400] text-[#F4B400]" />
              <span>4.9</span>
              <span className="text-[11px] text-[#777777] font-normal">(120+ reviews)</span>
            </div>

            {/* Mobile pack selector chips */}
            <div className="mt-2.5 flex items-center gap-1 overflow-x-auto no-scrollbar md:hidden">
              {getPacks(flavor).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={isOutOfStock}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPackId(p.id);
                  }}
                  aria-pressed={p.id === packId}
                  className={cn(
                    "rounded-lg px-2 py-0.5 text-[10px] font-bold border transition-all shrink-0",
                    p.id === packId
                      ? "border-[#5B2C83] bg-[#5B2C83] text-white shadow-xs"
                      : "border-[#e8d9eb] bg-white text-[#555555] hover:border-[#5B2C83]",
                    isOutOfStock && "opacity-40 cursor-not-allowed"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <p className="mt-1 hidden text-sm text-[#777777] md:block">{flavor.tagline}</p>
            <p className={cn("mt-2.5 hidden text-sm leading-relaxed text-[#555555] md:block", isList ? "line-clamp-2 sm:line-clamp-3" : "line-clamp-2")}>
              {flavor.description}
            </p>

            {/* Pack selector — visible on tablet/desktop */}
            <fieldset className="mt-4 hidden md:block">
              <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-[#777777]">
                Select Pack Size
              </legend>
              <div className="grid grid-cols-4 gap-2">
                {getPacks(flavor).map((p) => (
                  <button
                    key={p.id}
                    disabled={isOutOfStock}
                    onClick={() => setPackId(p.id)}
                    aria-pressed={p.id === packId}
                    className={cn(
                      "min-w-0 rounded-xl border px-2 py-2 text-center transition-all",
                      p.id === packId
                        ? "border-[#5B2C83] bg-[#f5ebfc] text-[#5B2C83] font-bold shadow-xs"
                        : "border-[#e8d9eb] bg-white text-[#555555] hover:border-[#5B2C83]/40",
                      isOutOfStock && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    <span className="block text-xs font-bold">{p.label}</span>
                    <span className="block text-[10px] text-[#F4B400] font-extrabold">{formatINR(p.price)}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          {/* Price & Add to Cart Action */}
          <div className="mt-4 border-t border-[#e8d9eb] pt-3">
            <div className="flex items-baseline justify-between gap-1">
              <div className="flex items-baseline gap-1.5">
                <span className="font-serif text-base sm:text-2xl lg:text-3xl font-extrabold text-[#F4B400] whitespace-nowrap">{formatINR(pack.price)}</span>
                {pack.compareAt && (
                  <span className="text-xs sm:text-sm text-[#777777] line-through whitespace-nowrap">{formatINR(pack.compareAt)}</span>
                )}
              </div>
              {savings > 0 && !isOutOfStock && (
                <span className="rounded-full bg-[#4CAF50]/15 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-[#4CAF50] whitespace-nowrap">
                  Save {formatINR(savings)}
                </span>
              )}
            </div>

            {cartQty > 0 ? (
              <div className="mt-3 flex h-10 sm:h-12 w-full items-center justify-between rounded-xl border border-[#5B2C83] bg-[#f5ebfc] px-3 font-bold text-[#5B2C83] shadow-xs">
                <button
                  type="button"
                  onClick={handleDec}
                  className="grid size-7 place-items-center rounded-lg bg-white text-[#5B2C83] shadow-xs hover:bg-[#5B2C83] hover:text-white transition-all active:scale-90"
                  aria-label="Decrease quantity"
                >
                  <Minus className="size-3.5" />
                </button>
                <span className="text-sm font-extrabold text-[#5B2C83] font-mono">{cartQty}</span>
                <button
                  type="button"
                  onClick={handleInc}
                  className="grid size-7 place-items-center rounded-lg bg-[#5B2C83] text-white shadow-xs hover:bg-[#F4B400] hover:text-[#2D2D2D] transition-all active:scale-90"
                  aria-label="Increase quantity"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
            ) : (
              <Button
                disabled={isOutOfStock}
                onClick={handleAdd}
                variant={isOutOfStock ? "outline" : "primary"}
                size="sm"
                className="mt-3 w-full h-10 sm:h-12 text-xs sm:text-sm font-bold rounded-xl active:scale-95 shadow-xs"
              >
                {isOutOfStock ? (
                  <span className="truncate">Out of Stock</span>
                ) : (
                  <><Plus className="size-4 mr-1" /> <span className="truncate">Add to Cart</span></>
                )}
              </Button>
            )}
          </div>
        </div>
      </motion.article>

      <QuickView flavor={flavor} open={quickOpen} onOpenChange={setQuickOpen} />
    </>
  );
}
