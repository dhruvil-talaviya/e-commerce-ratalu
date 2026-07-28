"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Plus, Minus, Check, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HeatMeter } from "@/components/common/heat-meter";
import { WaferVisual } from "@/components/common/wafer-visual";
import { useCart } from "@/components/cart/cart-provider";
import { useWishlist } from "@/components/cart/wishlist-provider";
import { getPacks, getPackFor, DEFAULT_PACK_ID } from "@/lib/data/products";
import { formatINR, cn } from "@/lib/utils";
import type { Flavor } from "@/lib/types";

const badgeVariant: Record<string, "gold" | "orange" | "primary"> = {
  Signature: "primary",
  New: "gold",
  Hot: "orange",
};

export function FlavorCard({ flavor, index = 0 }: { flavor: Flavor; index?: number }) {
  const { addItem, items, updateQuantity, removeItem } = useCart();
  const { has, toggle } = useWishlist();
  const [packId, setPackId] = React.useState(DEFAULT_PACK_ID);
  
  const pack = getPackFor(flavor, packId);
  const wished = has(flavor.id);
  const isOutOfStock = flavor.inStock === false;

  const itemKey = `${flavor.id}:${pack.id}`;
  const cartItem = items.find(
    (i) =>
      i.key === itemKey ||
      i.key === `${flavor.id}-${pack.id}` ||
      (String(i.flavorId || "").toLowerCase() === String(flavor.id || "").toLowerCase() &&
        String(i.packId || "").toLowerCase() === String(pack.id || "").toLowerCase())
  );
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
    <motion.article
      variants={{
        hidden: { opacity: 0, y: 30 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: index * 0.04 },
        },
      }}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-[#E8DED4] bg-[#F5EDE3]/90 shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-[#B76DAE] hover:ring-2 hover:ring-[#B76DAE]/40 hover:shadow-lg"
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
            <span className="rounded-full bg-[#C75B12] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
              Out of stock
            </span>
          </div>
        )}

        {flavor.badge && !isOutOfStock && (
          <div className="absolute left-2.5 top-2.5 sm:left-4 sm:top-4 z-10">
            <Badge variant={badgeVariant[flavor.badge] ?? "soft"} size="sm" className="text-[9px] sm:text-xs bg-[#B76DAE] text-white">
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
          className="absolute right-2.5 top-2.5 sm:right-4 sm:top-4 grid size-8 sm:size-9 place-items-center rounded-full bg-white/90 text-[#4A1942] shadow-sm backdrop-blur transition-transform active:scale-95 hover:text-red-500 z-10"
        >
          <Heart className={cn("size-4 transition-colors", wished && "fill-red-500 text-red-500")} />
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col justify-between p-3 sm:p-5 lg:p-6">
        <div>
          <div className="flex items-start justify-between gap-1.5 sm:gap-3">
            <Link href={`/shop/${flavor.slug}`} className="min-w-0 flex-1 transition-colors hover:text-[#6B2D5B]">
              <h3 className="line-clamp-2 font-serif text-xs sm:text-lg lg:text-xl font-bold text-[#4A1942] leading-tight">{flavor.name}</h3>
              <p className="mt-0.5 hidden text-xs text-[#8A7B70] md:block">{flavor.tagline}</p>
            </Link>
            <HeatMeter level={flavor.heat} showLabel={false} className="mt-0.5 shrink-0" />
          </div>

          <p className="mt-2 hidden text-xs leading-relaxed text-[#3D2B1F] md:line-clamp-2 lg:line-clamp-3">
            {flavor.description}
          </p>

          {/* Pack Size Selector Chips */}
          <div className="mt-2.5 flex items-center justify-between gap-1 border-t border-[#E8DED4]/60 pt-2">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
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
                      ? "border-[#4A1942] bg-[#4A1942] text-white shadow-xs"
                      : "border-[#E8DED4] bg-white text-[#3D2B1F] hover:border-[#4A1942]/50",
                    isOutOfStock && "opacity-40 cursor-not-allowed"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <Link href={`/shop/${flavor.slug}`} className="text-[10px] font-bold text-[#8E4585] hover:underline shrink-0 flex items-center gap-0.5">
              All sizes &rarr;
            </Link>
          </div>
        </div>

        <div className="mt-3 border-t border-[#E8DED4] pt-2.5">
          <div className="flex items-baseline justify-between gap-1">
            <div className="flex items-baseline gap-1.5">
              <span className="font-serif text-sm sm:text-lg lg:text-xl font-bold text-[#D4A017] whitespace-nowrap">{formatINR(pack.price)}</span>
              {pack.compareAt && (
                <span className="text-xs text-[#8A7B70] line-through whitespace-nowrap">{formatINR(pack.compareAt)}</span>
              )}
            </div>
            <span className="text-[10px] text-[#8A7B70] font-medium">{pack.label} pack</span>
          </div>

          {cartQty > 0 ? (
            <div className="mt-2 flex h-8.5 sm:h-10 w-full items-center justify-between rounded-xl border border-[#4A1942] bg-[#E8C8E4]/40 px-2.5 font-bold text-[#4A1942] shadow-xs">
              <button
                type="button"
                onClick={handleDec}
                className="grid size-6.5 place-items-center rounded-lg bg-white text-[#4A1942] shadow-xs hover:bg-[#4A1942] hover:text-white transition-all active:scale-90"
                aria-label="Decrease quantity"
              >
                <Minus className="size-3.5" />
              </button>
              <span className="text-xs sm:text-sm font-extrabold text-[#4A1942] font-mono">{cartQty} in cart</span>
              <button
                type="button"
                onClick={handleInc}
                className="grid size-6.5 place-items-center rounded-lg bg-[#4A1942] text-white shadow-xs hover:bg-[#E8B923] hover:text-[#1A0F0A] transition-all active:scale-90"
                aria-label="Increase quantity"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
          ) : (
            <Button
              onClick={handleAdd}
              disabled={isOutOfStock}
              className={cn(
                "mt-2 w-full h-8.5 sm:h-10 text-xs font-bold rounded-xl active:scale-95 transition-all",
                isOutOfStock
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-[#D4A017] text-[#1A0F0A] hover:bg-[#E8B923] shadow-md"
              )}
            >
              {isOutOfStock ? (
                "Out of stock"
              ) : (
                <>
                  <Plus className="size-3.5 mr-1" /> Add to Cart
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </motion.article>
  );
}
