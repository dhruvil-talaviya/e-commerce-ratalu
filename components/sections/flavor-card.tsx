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
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-[var(--color-border)] bg-white/90 shadow-[var(--shadow-soft)] backdrop-blur-sm transition-all duration-300 hover:shadow-[var(--shadow-lift)]"
    >
      {/* Visual */}
      <div
        className="relative aspect-[4/3] w-full overflow-hidden shrink-0"
        style={{
          background: `radial-gradient(130% 130% at 50% 15%, ${flavor.gradient.from}22, transparent 60%)`,
        }}
      >
        <Link href={`/shop/${flavor.slug}`} className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105">
          <WaferVisual
            flavor={flavor}
            seed={index}
            className={cn(
              "max-h-full transition-all",
              isOutOfStock && "opacity-50 grayscale blur-[0.5px]"
            )}
          />
        </Link>

        {/* Out-of-stock overlay label */}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px] z-10">
            <span className="rounded-full bg-red-600 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
              Out of stock
            </span>
          </div>
        )}

        {flavor.badge && !isOutOfStock && (
          <div className="absolute left-2.5 top-2.5 sm:left-4 sm:top-4 z-10">
            <Badge variant={badgeVariant[flavor.badge] ?? "soft"} size="sm" className="text-[9px] sm:text-xs">
              {flavor.badge}
            </Badge>
          </div>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            toggle(flavor.id);
          }}
          aria-label={wished ? "Unlike product" : "Like product"}
          aria-pressed={wished}
          className="absolute right-2.5 top-2.5 sm:right-4 sm:top-4 grid size-8 sm:size-9 place-items-center rounded-full bg-white/85 text-charcoal-muted shadow-sm backdrop-blur transition-transform active:scale-95 hover:text-red-500 z-10"
        >
          <Heart className={cn("size-4 transition-colors", wished && "fill-red-500 text-red-500")} />
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col justify-between p-3 sm:p-5 lg:p-6">
        <div>
          <div className="flex items-start justify-between gap-1.5 sm:gap-3">
            <Link href={`/shop/${flavor.slug}`} className="min-w-0 flex-1 transition-colors hover:text-purple-700">
              <h3 className="line-clamp-2 font-serif text-xs sm:text-lg lg:text-xl font-bold text-charcoal leading-tight">{flavor.name}</h3>
              <p className="mt-0.5 hidden text-xs text-charcoal-soft md:block">{flavor.tagline}</p>
            </Link>
            <HeatMeter level={flavor.heat} showLabel={false} className="mt-0.5 shrink-0" />
          </div>

          <p className="mt-2 hidden text-xs leading-relaxed text-charcoal-muted md:line-clamp-2 lg:line-clamp-3">
            {flavor.description}
          </p>

          {/* Ingredients — visible on tablet/desktop */}
          <div className="mt-3 hidden flex-wrap gap-1.5 md:flex">
            {flavor.ingredients.slice(0, 3).map((ing) => (
              <span
                key={ing}
                className="rounded-full bg-cream-100 px-2 py-0.5 text-[10px] font-medium text-charcoal-muted"
              >
                {ing}
              </span>
            ))}
            {flavor.ingredients.length > 3 && (
              <span className="rounded-full bg-cream-100 px-2 py-0.5 text-[10px] font-medium text-charcoal-soft">
                +{flavor.ingredients.length - 3}
              </span>
            )}
          </div>
        </div>

        <div className="mt-3 border-t border-gray-100 pt-2.5">
          <div className="flex items-baseline justify-between gap-1">
            <span className="font-serif text-sm sm:text-lg lg:text-xl font-bold text-purple-700 whitespace-nowrap">{formatINR(pack.price)}</span>
            <span className="text-[10px] text-charcoal-muted">200g pack</span>
          </div>
          <Button
            onClick={handleAdd}
            disabled={isOutOfStock}
            variant={isOutOfStock ? "outline" : added ? "accent" : "primary"}
            size="sm"
            className="mt-2 w-full h-8.5 sm:h-10 text-xs font-bold rounded-xl active:scale-95"
          >
            {isOutOfStock ? (
              "Out of stock"
            ) : added ? (
              <>
                <Check className="size-3.5" /> Added
              </>
            ) : (
              <>
                <Plus className="size-3.5" /> Add
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.article>
  );
}
