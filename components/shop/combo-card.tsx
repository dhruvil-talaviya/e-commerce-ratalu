"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Check, ShoppingBag, Sparkles, Star, PackageCheck, Minus, Plus, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WaferVisual } from "@/components/common/wafer-visual";
import { useCart } from "@/components/cart/cart-provider";
import { useWishlist } from "@/components/cart/wishlist-provider";
import { useProducts } from "@/components/shop/product-provider";
import { getPackFor } from "@/lib/data/products";
import { formatINR, cn } from "@/lib/utils";
import type { ShopCombo } from "@/lib/types";

export function ComboCard({
  combo,
  index = 0,
  view = "grid",
}: {
  combo: ShopCombo;
  index?: number;
  view?: "grid" | "list";
}) {
  const { addCombo, items, updateQuantity, removeItem } = useCart();
  const { has, toggle } = useWishlist();
  const { flavors } = useProducts();

  const isLiked = has(combo.slug) || has(String(combo._id || "")) || has(String((combo as any).id || ""));

  const isList = view === "list";

  const lines = React.useMemo(
    () =>
      combo.items.map((item) => ({
        ...item,
        flavor: flavors.find(
          (f) =>
            f.id === item.flavorId ||
            f.slug === item.flavorId ||
            String(f._id) === String(item.flavorId)
        ),
      })),
    [combo.items, flavors]
  );

  const unavailable = lines.some((l) => l.flavor && l.flavor.inStock === false);

  const rawId = combo._id || (combo as any).id || combo.slug;
  const comboFlavorId = `combo-${rawId}`;
  const cartItem = items.find(
    (i) =>
      i.flavorId === comboFlavorId ||
      i.comboId === combo._id ||
      i.key === `${comboFlavorId}:combo-pack` ||
      (i.isCombo && (i.key?.includes(String(combo.slug)) || i.flavorName === combo.name))
  );
  const cartQty = cartItem ? cartItem.quantity : 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (unavailable) return;
    addCombo(combo, 1);
  };

  const handleDec = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!cartItem) return;
    if (cartItem.quantity <= 1) {
      removeItem(cartItem.key);
    } else {
      updateQuantity(cartItem.key, cartItem.quantity - 1);
    }
  };

  const handleInc = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!cartItem) {
      addCombo(combo, 1);
    } else {
      updateQuantity(cartItem.key, cartItem.quantity + 1);
    }
  };

  const ratingVal = combo.rating || 4.8;
  const totalPacks = combo.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <motion.article
      variants={{
        hidden: { opacity: 0, y: 24 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4, delay: index * 0.04 } },
      }}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-xl sm:rounded-3xl border border-[#E8DED4] bg-white shadow-xs transition-all duration-300 hover:shadow-md hover:border-[#B76DAE] w-full",
        isList ? "flex-col sm:flex-row" : "flex-col"
      )}
    >
      {/* Artwork Header on Light Surface Background */}
      <div
        className={cn(
          "relative shrink-0 overflow-hidden bg-gradient-to-br from-[#F5EDE3] via-[#FDF8F0] to-[#E8C8E4]/30 rounded-t-xl sm:rounded-t-3xl min-h-[110px] sm:min-h-[190px]",
          isList ? "aspect-[16/10] sm:aspect-auto sm:w-56 lg:w-64" : "aspect-[4/3] w-full",
          unavailable && "opacity-50 grayscale"
        )}
      >
        <Link
          href={`/combos/${combo.slug}`}
          scroll={false}
          className="absolute inset-0 flex items-center justify-center p-1.5 sm:p-4 transition-transform duration-500 group-hover:scale-105"
        >
          {combo.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={combo.image}
              alt={combo.name}
              className="size-full object-cover rounded-lg sm:rounded-2xl shadow-xs"
              loading="lazy"
            />
          ) : (
            <div className="flex size-full items-center justify-center gap-1 p-1">
              {lines.slice(0, 3).map((line, i) =>
                line.flavor ? (
                  <div key={i} className="size-10 sm:size-22 shrink-0 drop-shadow-sm">
                    <WaferVisual flavor={line.flavor} seed={i} />
                  </div>
                ) : null
              )}
            </div>
          )}
        </Link>

        {/* Header Overlay Badges */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-1 p-1.5 sm:p-3 z-10 pointer-events-none bg-gradient-to-b from-black/60 via-black/25 to-transparent">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="inline-flex items-center gap-0.5 rounded bg-[#4A1942]/90 px-1.5 py-0.5 text-[9px] sm:text-xs font-bold text-white shadow-xs backdrop-blur-sm">
              <Sparkles className="size-2.5 sm:size-3 text-[#E8B923]" /> Combo
            </span>
            {combo.badge && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-lg bg-[#C75B12]/90 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-white shadow-xs backdrop-blur-sm">
                ★ {combo.badge}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 pointer-events-auto">
            {combo.discountPercent > 0 && (
              <span className="rounded-full bg-[#D4A017] px-2 py-0.5 text-[9px] sm:text-xs font-extrabold text-[#1A0F0A] shadow-xs">
                {combo.discountPercent}% OFF
              </span>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggle(combo.slug);
              }}
              className={cn(
                "grid size-7 sm:size-8 place-items-center rounded-full bg-white/90 backdrop-blur-sm shadow-md transition-all hover:scale-110 active:scale-95 cursor-pointer",
                isLiked ? "text-red-500 bg-red-50" : "text-gray-600 hover:text-red-500"
              )}
              aria-label={isLiked ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart className={cn("size-3.5 sm:size-4", isLiked && "fill-current")} />
            </button>
          </div>
        </div>

        {unavailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px] z-10 pointer-events-none">
            <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-[9px] sm:text-xs font-bold uppercase tracking-wider text-white shadow-sm">
              Out of stock
            </span>
          </div>
        )}
      </div>

      {/* Card Content Body */}
      <div className="flex flex-1 flex-col justify-between p-2.5 sm:p-5">
        <div className="space-y-1.5">
          <div className="flex items-start justify-between gap-1">
            <Link href={`/combos/${combo.slug}`} scroll={false} className="min-w-0 flex-1 transition-colors hover:text-[#6B2D5B]">
              <h3 className="line-clamp-1 font-serif text-xs sm:text-lg font-bold text-[#4A1942] leading-snug">{combo.name}</h3>
            </Link>
            <div className="flex items-center gap-0.5 bg-amber-50 border border-amber-200/80 px-1 py-0.5 rounded shrink-0">
              <Star className="size-2.5 sm:size-3 fill-amber-400 text-amber-500" />
              <span className="text-[9px] sm:text-xs font-extrabold text-amber-900">{ratingVal.toFixed(1)}</span>
            </div>
          </div>

          <p className="line-clamp-1 text-[10px] sm:text-xs font-semibold text-purple-700">
            {combo.subtitle || `${totalPacks} Packs Bundle`}
          </p>

          {/* Included Packs Section */}
          <div className="pt-0.5">
            <div className="flex flex-wrap gap-0.5 sm:gap-1">
              {lines.slice(0, 2).map((line, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-0.5 rounded border border-purple-100 bg-purple-50/70 px-1.5 py-0.5 text-[9px] sm:text-[11px] font-bold text-purple-900"
                >
                  {line.quantity}x {line.flavorName || line.flavor?.name || "Flavor"}
                </span>
              ))}
              {lines.length > 2 && (
                <span className="text-[9px] font-bold text-gray-400 self-center">+{lines.length - 2} more</span>
              )}
            </div>
          </div>
        </div>

        {/* Price & Action Button */}
        <div className="mt-2.5 border-t border-gray-100 pt-2">
          <div className="flex items-baseline justify-between gap-1 flex-wrap">
            <div className="flex items-baseline gap-1">
              <span className="font-serif text-sm sm:text-xl font-bold text-purple-700 whitespace-nowrap">
                {formatINR(combo.comboPrice)}
              </span>
              {combo.originalPrice > combo.comboPrice && (
                <span className="text-[9px] sm:text-xs text-gray-400 line-through whitespace-nowrap">
                  {formatINR(combo.originalPrice)}
                </span>
              )}
            </div>
            {combo.savings > 0 && (
              <span className="text-[8px] sm:text-xs font-bold text-emerald-700 whitespace-nowrap bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200/80">
                Save {formatINR(combo.savings)}
              </span>
            )}
          </div>

          {cartQty > 0 ? (
            <div className="mt-2 flex h-8 sm:h-10 w-full items-center justify-between rounded-lg sm:rounded-xl border border-purple-300 bg-purple-50/80 px-2 font-bold text-purple-900 shadow-xs">
              <button
                type="button"
                onClick={handleDec}
                className="grid size-6 sm:size-7 place-items-center rounded bg-white text-purple-700 shadow-xs hover:bg-purple-100 transition-all active:scale-90"
                aria-label="Decrease combo quantity"
              >
                <Minus className="size-3 sm:size-3.5" />
              </button>
              <span className="text-xs sm:text-sm font-extrabold text-purple-950 font-mono">
                {cartQty} in cart
              </span>
              <button
                type="button"
                onClick={handleInc}
                className="grid size-6 sm:size-7 place-items-center rounded bg-purple-700 text-white shadow-xs hover:bg-purple-800 transition-all active:scale-90"
                aria-label="Increase combo quantity"
              >
                <Plus className="size-3 sm:size-3.5" />
              </button>
            </div>
          ) : (
            <Button
              onClick={handleAdd}
              disabled={unavailable}
              variant={unavailable ? "outline" : "primary"}
              size="sm"
              className="mt-2 w-full h-8 sm:h-10 text-[11px] sm:text-sm font-bold rounded-lg sm:rounded-xl active:scale-95 shadow-xs"
              aria-label={`Add ${combo.name} combo to cart`}
            >
              {unavailable ? (
                <span className="truncate">Out of Stock</span>
              ) : (
                <><ShoppingBag className="size-3 mr-1" /> <span className="truncate">Add Combo</span></>
              )}
            </Button>
          )}
        </div>
      </div>
    </motion.article>
  );
}
