"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Plus, Minus, Check, Heart, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HeatMeter } from "@/components/common/heat-meter";
import { WaferVisual } from "@/components/common/wafer-visual";
import { useCart } from "@/components/cart/cart-provider";
import { useWishlist } from "@/components/cart/wishlist-provider";
import { PACK_SIZES, DEFAULT_PACK_ID } from "@/lib/data/products";
import { formatINR, cn } from "@/lib/utils";
import type { Flavor } from "@/lib/types";

const badgeVariant: Record<string, "gold" | "orange" | "primary"> = {
  Signature: "primary",
  New: "gold",
  Hot: "orange",
};

export function ProductCard({ flavor, index = 0 }: { flavor: Flavor; index?: number }) {
  const { addItem } = useCart();
  const { has, toggle } = useWishlist();
  const [packId, setPackId] = React.useState(DEFAULT_PACK_ID);
  const [qty, setQty] = React.useState(1);
  const [added, setAdded] = React.useState(false);

  const pack = PACK_SIZES.find((p) => p.id === packId)!;
  const wished = has(flavor.id);
  const savings = pack.compareAt ? pack.compareAt - pack.price : 0;

  const handleAdd = () => {
    addItem(flavor, pack, qty);
    setAdded(true);
    setQty(1);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <motion.article
      variants={{
        hidden: { opacity: 0, y: 28 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: index * 0.03 },
        },
      }}
      className="flex flex-col overflow-hidden rounded-3xl border border-[var(--color-border)] bg-white/80 shadow-[var(--shadow-soft)] backdrop-blur-sm"
    >
      {/* Visual */}
      <div
        className="relative aspect-[4/3]"
        style={{
          background: `radial-gradient(130% 130% at 50% 10%, ${flavor.gradient.from}22, transparent 62%)`,
        }}
      >
        <Link href={`/shop/${flavor.slug}`} className="absolute inset-0 flex items-center justify-center p-6">
          <WaferVisual flavor={flavor} seed={index} className="max-h-full transition-transform duration-500 hover:scale-105" />
        </Link>
        <div className="absolute left-4 top-4 flex flex-col gap-1.5">
          {flavor.bestSeller && (
            <Badge variant="gold" size="sm">
              ★ Best seller
            </Badge>
          )}
          {flavor.badge && (
            <Badge variant={badgeVariant[flavor.badge] ?? "soft"} size="sm">
              {flavor.badge}
            </Badge>
          )}
        </div>
        <button
          onClick={() => toggle(flavor.id)}
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={wished}
          className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-white/85 text-charcoal-muted shadow-sm backdrop-blur transition-all hover:scale-110 hover:text-red-500"
        >
          <Heart className={cn("size-4.5 transition-all", wished && "fill-red-500 text-red-500")} />
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/shop/${flavor.slug}`} className="hover:text-purple-700 transition-colors">
            <h3 className="font-serif text-2xl font-semibold text-charcoal">{flavor.name}</h3>
          </Link>
          <HeatMeter level={flavor.heat} showLabel={false} className="mt-1.5 shrink-0" />
        </div>
        <p className="mt-1 text-sm text-charcoal-soft">{flavor.tagline}</p>
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-charcoal-muted">
          {flavor.description}
        </p>

        {/* Pack selector */}
        <fieldset className="mt-5">
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-charcoal-soft">
            Choose size
          </legend>
          <div className="grid grid-cols-4 gap-2">
            {PACK_SIZES.map((p) => (
              <button
                key={p.id}
                onClick={() => setPackId(p.id)}
                aria-pressed={p.id === packId}
                className={cn(
                  "rounded-xl border px-2 py-2 text-center transition-all",
                  p.id === packId
                    ? "border-purple-500 bg-purple-50 text-purple-700 shadow-sm"
                    : "border-[var(--color-border)] bg-white text-charcoal-muted hover:border-purple-200"
                )}
              >
                <span className="block text-sm font-semibold">{p.label}</span>
                <span className="block text-[10px]">{formatINR(p.price)}</span>
              </button>
            ))}
          </div>
        </fieldset>

        {/* Price + savings */}
        <div className="mt-5 flex items-end justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-2xl font-bold text-purple-700">
              {formatINR(pack.price)}
            </span>
            {pack.compareAt && (
              <span className="text-sm text-charcoal-soft line-through">
                {formatINR(pack.compareAt)}
              </span>
            )}
          </div>
          {savings > 0 && (
            <Badge variant="soft" size="sm" className="text-green-700">
              Save {formatINR(savings)}
            </Badge>
          )}
        </div>

        {/* Quantity + add */}
        <div className="mt-5 flex items-center gap-3">
          <div className="flex items-center rounded-full border border-[var(--color-border)] bg-white">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="grid size-10 place-items-center rounded-full text-charcoal-muted transition-colors hover:bg-purple-50 hover:text-purple-700"
              aria-label="Decrease quantity"
            >
              <Minus className="size-4" />
            </button>
            <span className="w-8 text-center font-semibold tabular-nums">{qty}</span>
            <button
              onClick={() => setQty((q) => Math.min(99, q + 1))}
              className="grid size-10 place-items-center rounded-full text-charcoal-muted transition-colors hover:bg-purple-50 hover:text-purple-700"
              aria-label="Increase quantity"
            >
              <Plus className="size-4" />
            </button>
          </div>
          <Button
            onClick={handleAdd}
            variant={added ? "accent" : "primary"}
            size="lg"
            className="flex-1"
          >
            {added ? (
              <>
                <Check /> Added to cart
              </>
            ) : (
              <>
                <ShoppingBag /> Add · {formatINR(pack.price * qty)}
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.article>
  );
}
