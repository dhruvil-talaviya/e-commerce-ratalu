"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Plus, Minus, Check, Heart, ShoppingBag, Eye } from "lucide-react";
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
  const { addItem } = useCart();
  const { has, toggle } = useWishlist();
  const [packId, setPackId] = React.useState(DEFAULT_PACK_ID);
  const [qty, setQty] = React.useState(1);
  const [added, setAdded] = React.useState(false);
  const [quickOpen, setQuickOpen] = React.useState(false);

  const pack = getPackFor(flavor, packId);
  const wished = has(flavor.id);
  const savings = pack.compareAt ? pack.compareAt - pack.price : 0;
  const isList = view === "list";
  const isOutOfStock = flavor.inStock === false;

  const handleAdd = () => {
    if (isOutOfStock) return;
    addItem(flavor, pack, qty);
    setAdded(true);
    setQty(1);
    setTimeout(() => setAdded(false), 1600);
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
          "group relative flex h-full flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-[var(--color-border)] bg-white/90 shadow-[var(--shadow-soft)] backdrop-blur-sm transition-all duration-300 hover:shadow-[var(--shadow-lift)]",
          isList ? "flex-col sm:flex-row" : "flex-col"
        )}
      >
        {/* Visual */}
        <div
          className={cn(
            "relative shrink-0 overflow-hidden",
            isList ? "aspect-[4/3] sm:aspect-auto sm:w-56 lg:w-64" : "aspect-[4/3] w-full"
          )}
          style={{
            background: `radial-gradient(130% 130% at 50% 10%, ${flavor.gradient.from}22, transparent 62%)`,
          }}
        >
          <Link href={`/shop/${flavor.slug}`} className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 transition-transform duration-500 group-hover:scale-105">
            <WaferVisual flavor={flavor} seed={index} className={cn("max-h-full transition-transform duration-500", isOutOfStock && "grayscale opacity-50 blur-[0.5px]")} />
          </Link>

          {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px] z-10">
              <span className="relative flex items-center justify-center px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white font-black text-[10px] sm:text-[11px] uppercase tracking-widest rounded-full shadow-md border border-white/20 select-none">
                Out of Stock
              </span>
            </div>
          )}

          {/* Badges */}
          <div className="absolute left-2.5 top-2.5 sm:left-4 sm:top-4 flex flex-col gap-1 z-10">
            {flavor.bestSeller && (
              <Badge variant="gold" size="sm" className="text-[9px] sm:text-xs">★ Best seller</Badge>
            )}
            {flavor.badge && (
              <Badge variant={badgeVariant[flavor.badge] ?? "soft"} size="sm" className="text-[9px] sm:text-xs">{flavor.badge}</Badge>
            )}
          </div>

          {/* Wishlist / Likes Button with Live Count */}
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
                className="absolute right-2.5 top-2.5 sm:right-4 sm:top-4 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-charcoal-muted shadow-sm backdrop-blur transition-all active:scale-95 hover:text-red-500 z-10 border border-gray-100/80"
              >
                <Heart className={cn("size-3.5 sm:size-4 transition-colors", wished && "fill-red-500 text-red-500")} />
                {currentLikes > 0 && (
                  <span className={cn("text-[11px] font-extrabold leading-none", wished ? "text-red-600" : "text-gray-700")}>
                    {currentLikes}
                  </span>
                )}
              </button>
            );
          })()}
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col justify-between p-3 sm:p-5 lg:p-6">
          <div>
            <div className="flex items-start justify-between gap-1.5">
              <Link href={`/shop/${flavor.slug}`} className="min-w-0 flex-1 transition-colors hover:text-purple-700">
                <h3 className="line-clamp-2 font-serif text-xs font-bold leading-tight text-charcoal sm:text-lg lg:text-2xl">{flavor.name}</h3>
              </Link>
              <HeatMeter level={flavor.heat} showLabel={false} className="mt-0.5 shrink-0" />
            </div>

            {/* Mobile pack selector chips */}
            <div className="mt-2 flex items-center gap-1 overflow-x-auto no-scrollbar md:hidden">
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
                    "rounded-md px-1.5 py-0.5 text-[9px] font-bold border transition-all shrink-0",
                    p.id === packId
                      ? "border-purple-600 bg-purple-600 text-white shadow-xs"
                      : "border-gray-200 bg-white text-gray-700 hover:border-purple-300",
                    isOutOfStock && "opacity-40 cursor-not-allowed"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <p className="mt-1 hidden text-sm text-charcoal-soft md:block">{flavor.tagline}</p>
            <p className={cn("mt-3 hidden text-sm leading-relaxed text-charcoal-muted md:block", isList ? "line-clamp-2 sm:line-clamp-3" : "line-clamp-2")}>
              {flavor.description}
            </p>

            {/* Pack selector — visible on tablet/desktop */}
            <fieldset className="mt-4 hidden md:block">
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-charcoal-soft">
                Choose size
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
                        ? "border-purple-500 bg-purple-50 text-purple-700 shadow-sm"
                        : "border-[var(--color-border)] bg-white text-charcoal-muted hover:border-purple-200",
                      isOutOfStock && "opacity-40 cursor-not-allowed hover:border-[var(--color-border)]"
                    )}
                  >
                    <span className="block text-sm font-semibold">{p.label}</span>
                    <span className="block text-[10px]">{formatINR(p.price)}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          {/* Bottom pinned price & Add button area */}
          <div className="mt-3 border-t border-gray-100 pt-2.5">
            <div className="flex items-baseline justify-between gap-1">
              <div className="flex items-baseline gap-1">
                <span className="font-serif text-sm sm:text-xl lg:text-2xl font-bold text-purple-700 whitespace-nowrap">{formatINR(pack.price)}</span>
                {pack.compareAt && (
                  <span className="text-[10px] sm:text-xs text-charcoal-soft line-through whitespace-nowrap">{formatINR(pack.compareAt)}</span>
                )}
              </div>
              {savings > 0 && !isOutOfStock && (
                <Badge variant="soft" size="sm" className="text-[9px] sm:text-xs text-green-700 whitespace-nowrap px-1 py-0.2">Save {formatINR(savings)}</Badge>
              )}
            </div>

            <Button
              disabled={isOutOfStock}
              onClick={handleAdd}
              variant={isOutOfStock ? "outline" : (added ? "accent" : "primary")}
              size="sm"
              className="mt-2 w-full h-8.5 sm:h-11 text-xs sm:text-sm font-bold rounded-xl active:scale-95"
            >
              {isOutOfStock ? (
                <span className="truncate">Out of Stock</span>
              ) : added ? (
                <><Check className="size-3.5 sm:size-4" /> <span className="truncate">Added</span></>
              ) : (
                <><Plus className="size-3.5 sm:size-4" /> <span className="truncate">Add</span></>
              )}
            </Button>
          </div>
        </div>
      </motion.article>

      <QuickView flavor={flavor} open={quickOpen} onOpenChange={setQuickOpen} />
    </>
  );
}
