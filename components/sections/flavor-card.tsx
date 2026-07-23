"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Plus, Check, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HeatMeter } from "@/components/common/heat-meter";
import { WaferVisual } from "@/components/common/wafer-visual";
import { useCart } from "@/components/cart/cart-provider";
import { useWishlist } from "@/components/cart/wishlist-provider";
import { getPack, DEFAULT_PACK_ID } from "@/lib/data/products";
import { formatINR, cn } from "@/lib/utils";
import type { Flavor } from "@/lib/types";

const badgeVariant: Record<string, "gold" | "orange" | "primary"> = {
  Signature: "primary",
  New: "gold",
  Hot: "orange",
};

export function FlavorCard({ flavor, index = 0 }: { flavor: Flavor; index?: number }) {
  const { addItem } = useCart();
  const { has, toggle } = useWishlist();
  const [added, setAdded] = React.useState(false);
  const pack = getPack(DEFAULT_PACK_ID)!;
  const wished = has(flavor.id);

  // Out of stock is a simple availability flag — no quantities. When off, the
  // card is dimmed and the buy button is disabled, so it can't be added to cart.
  const isOutOfStock = flavor.inStock === false;

  const handleAdd = () => {
    if (isOutOfStock) return;
    addItem(flavor, pack, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <motion.article
      variants={{
        hidden: { opacity: 0, y: 30 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: index * 0.04 },
        },
      }}
      whileHover={{ y: -6 }}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-[var(--color-border)] bg-white/80 shadow-[var(--shadow-soft)] backdrop-blur-sm transition-shadow duration-300 hover:shadow-[var(--shadow-lift)]"
    >
      {/* Visual */}
      <div
        className="relative aspect-[5/4] overflow-hidden"
        style={{
          background: `radial-gradient(130% 130% at 50% 15%, ${flavor.gradient.from}22, transparent 60%)`,
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center p-6 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105">
          <WaferVisual
            flavor={flavor}
            seed={index}
            className={cn(
              "max-h-full transition-all",
              isOutOfStock && "opacity-50 grayscale blur-[0.5px]"
            )}
          />
        </div>

        {/* Out-of-stock overlay label */}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/30 backdrop-blur-[1px]">
            <span className="rounded-full bg-charcoal/85 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm">
              Out of stock
            </span>
          </div>
        )}

        {flavor.badge && !isOutOfStock && (
          <div className="absolute left-4 top-4">
            <Badge variant={badgeVariant[flavor.badge] ?? "soft"} size="md">
              {flavor.badge}
            </Badge>
          </div>
        )}

        <button
          onClick={() => toggle(flavor.id)}
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={wished}
          className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-white/80 text-charcoal-muted shadow-sm backdrop-blur transition-all hover:scale-110 hover:text-red-500"
        >
          <Heart className={cn("size-4.5 transition-all", wished && "fill-red-500 text-red-500")} />
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-serif text-xl font-semibold text-charcoal">{flavor.name}</h3>
            <p className="text-sm text-charcoal-soft">{flavor.tagline}</p>
          </div>
          <HeatMeter level={flavor.heat} showLabel={false} className="mt-1 shrink-0" />
        </div>

        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-charcoal-muted">
          {flavor.description}
        </p>

        {/* Ingredients */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {flavor.ingredients.slice(0, 3).map((ing) => (
            <span
              key={ing}
              className="rounded-full bg-cream-100 px-2.5 py-1 text-[11px] font-medium text-charcoal-muted"
            >
              {ing}
            </span>
          ))}
          {flavor.ingredients.length > 3 && (
            <span className="rounded-full bg-cream-100 px-2.5 py-1 text-[11px] font-medium text-charcoal-soft">
              +{flavor.ingredients.length - 3} more
            </span>
          )}
        </div>

        {/*
          Pinned to the bottom with mt-auto so the price and Add-to-Cart line up
          across every card. Cards vary in height above this — a 1-line vs
          3-line description, one row of ingredient chips vs two — which used to
          leave each card's button floating at a different height.
        */}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-y-3 gap-x-2 border-t border-[var(--color-border)] pt-5">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-charcoal-soft">200g pack</p>
            <p className="font-serif text-xl font-bold text-purple-700 whitespace-nowrap">{formatINR(pack.price)}</p>
          </div>
          <Button
            onClick={handleAdd}
            disabled={isOutOfStock}
            variant={isOutOfStock ? "outline" : added ? "accent" : "primary"}
            className="min-w-32 flex-1 xs:flex-none"
          >
            {isOutOfStock ? (
              "Out of stock"
            ) : added ? (
              <>
                <Check /> Added
              </>
            ) : (
              <>
                <Plus /> Add to Cart
              </>
            )}
          </Button>
        </div>

        <Link
          href="/shop"
          className="mt-3 text-center text-xs font-medium text-charcoal-soft underline-offset-4 transition-colors hover:text-purple-600 hover:underline"
        >
          Choose a different size →
        </Link>
      </div>
    </motion.article>
  );
}
