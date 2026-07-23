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
          "group flex overflow-hidden rounded-3xl border border-[var(--color-border)] bg-white/80 shadow-[var(--shadow-soft)] backdrop-blur-sm transition-shadow duration-300 hover:shadow-[var(--shadow-lift)]",
          isList ? "flex-col sm:flex-row" : "flex-col"
        )}
      >
        {/* Visual */}
        <div
          className={cn(
            "relative shrink-0",
            isList ? "aspect-[4/3] sm:aspect-auto sm:w-56 lg:w-64" : "aspect-[4/3]"
          )}
          style={{
            background: `radial-gradient(130% 130% at 50% 10%, ${flavor.gradient.from}22, transparent 62%)`,
          }}
        >
          <Link href={`/shop/${flavor.slug}`} className="absolute inset-0 flex items-center justify-center p-6">
            <WaferVisual flavor={flavor} seed={index} className={cn("max-h-full transition-transform duration-500 group-hover:scale-105", isOutOfStock && "grayscale opacity-50 blur-[0.5px]")} />
          </Link>

          {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px] z-10">
              <span className="relative flex items-center justify-center px-5 py-2.5 bg-gradient-to-r from-red-650 via-red-500 to-red-700 text-white font-black text-[11px] uppercase tracking-widest rounded-full shadow-[0_0_15px_rgba(239,68,68,0.5)] border border-white/20 select-none overflow-hidden animate-pulse">
                {/* Glossy light effect shimmer */}
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                Out of Stock
              </span>
            </div>
          )}

          {/* Badges */}
          <div className="absolute left-4 top-4 flex flex-col gap-1.5">
            {flavor.bestSeller && (
              <Badge variant="gold" size="sm">★ Best seller</Badge>
            )}
            {flavor.badge && (
              <Badge variant={badgeVariant[flavor.badge] ?? "soft"} size="sm">{flavor.badge}</Badge>
            )}
            {savings > 0 && (
              <Badge variant="orange" size="sm">-{Math.round((savings / (pack.compareAt ?? 1)) * 100)}%</Badge>
            )}
          </div>

          {/* Actions: wishlist + quick view */}
          <div className="absolute right-4 top-4 flex flex-col gap-2">
            <button
              onClick={() => toggle(flavor.id)}
              aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
              aria-pressed={wished}
              className="grid size-9 place-items-center rounded-full bg-white/85 text-charcoal-muted shadow-sm backdrop-blur transition-all hover:scale-110 hover:text-red-500"
            >
              <Heart className={cn("size-4.5 transition-all", wished && "fill-red-500 text-red-500")} />
            </button>
            <button
              onClick={() => setQuickOpen(true)}
              aria-label={`Quick view ${flavor.name}`}
              className="grid size-9 place-items-center rounded-full bg-white/85 text-charcoal-muted shadow-sm backdrop-blur transition-all hover:scale-110 hover:text-purple-700 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
            >
              <Eye className="size-4.5" />
            </button>
          </div>

          {/* Hover Quick View bar (desktop) */}
          {!isOutOfStock && (
            <button
              onClick={() => setQuickOpen(true)}
              className="absolute inset-x-4 bottom-4 hidden items-center justify-center gap-2 rounded-full bg-charcoal/85 py-2.5 text-sm font-medium text-cream backdrop-blur transition-all duration-300 hover:bg-charcoal sm:flex sm:translate-y-3 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100"
            >
              <Eye className="size-4" /> Quick view
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col p-6">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/shop/${flavor.slug}`} className="min-w-0 transition-colors hover:text-purple-700">
              <h3 className="truncate font-serif text-2xl font-semibold text-charcoal">{flavor.name}</h3>
            </Link>
            <HeatMeter level={flavor.heat} showLabel={false} className="mt-1.5 shrink-0" />
          </div>
          <p className="mt-1 text-sm text-charcoal-soft">{flavor.tagline}</p>
          <p className={cn("mt-3 text-sm leading-relaxed text-charcoal-muted", isList ? "line-clamp-2 sm:line-clamp-3" : "line-clamp-2")}>
            {flavor.description}
          </p>

          {/* Pack selector */}
          <fieldset className="mt-5">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-charcoal-soft">
              Choose size
            </legend>
            <div className="grid grid-cols-2 xs:grid-cols-4 gap-1.5 sm:gap-2">
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

          {/* Price + savings */}
          <div className="mt-5 flex flex-wrap items-end justify-between gap-2">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-serif text-2xl font-bold text-purple-700 whitespace-nowrap">{formatINR(pack.price)}</span>
              {pack.compareAt && (
                <span className="text-sm text-charcoal-soft line-through whitespace-nowrap">{formatINR(pack.compareAt)}</span>
              )}
            </div>
            {savings > 0 && !isOutOfStock && (
              <Badge variant="soft" size="sm" className="text-green-700 whitespace-nowrap">Save {formatINR(savings)}</Badge>
            )}
          </div>

          {/* Quantity + add */}
          <div className="mt-5 flex items-center gap-3">
            <div className={cn("flex shrink-0 items-center rounded-full border border-[var(--color-border)] bg-white", isOutOfStock && "opacity-40 cursor-not-allowed")}>
              <button disabled={isOutOfStock} onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid size-10 place-items-center rounded-full text-charcoal-muted transition-colors hover:bg-purple-50 hover:text-purple-700 disabled:pointer-events-none" aria-label="Decrease quantity">
                <Minus className="size-4" />
              </button>
              <span className="w-8 text-center font-semibold tabular-nums">{qty}</span>
              <button disabled={isOutOfStock} onClick={() => setQty((q) => Math.min(99, q + 1))} className="grid size-10 place-items-center rounded-full text-charcoal-muted transition-colors hover:bg-purple-50 hover:text-purple-700 disabled:pointer-events-none" aria-label="Increase quantity">
                <Plus className="size-4" />
              </button>
            </div>
            <Button disabled={isOutOfStock} onClick={handleAdd} variant={isOutOfStock ? "outline" : (added ? "accent" : "primary")} size="lg" className="min-w-0 flex-1">
              {isOutOfStock ? (
                <span className="truncate">Out of Stock</span>
              ) : added ? (
                <><Check /> <span className="truncate">Added to cart</span></>
              ) : (
                <><ShoppingBag /> <span className="truncate">Add · {formatINR(pack.price * qty)}</span></>
              )}
            </Button>
          </div>
        </div>
      </motion.article>

      <QuickView flavor={flavor} open={quickOpen} onOpenChange={setQuickOpen} />
    </>
  );
}
