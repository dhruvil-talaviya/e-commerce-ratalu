"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Check, ShoppingBag, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WaferVisual } from "@/components/common/wafer-visual";
import { useCart } from "@/components/cart/cart-provider";
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
  const { addItem } = useCart();
  const { flavors } = useProducts();
  const [added, setAdded] = React.useState(false);

  const isList = view === "list";

  const lines = React.useMemo(
    () =>
      combo.items.map((item) => ({
        ...item,
        flavor: flavors.find((f) => f.id === item.flavorId),
      })),
    [combo.items, flavors]
  );

  const unavailable = lines.some((l) => !l.flavor || l.flavor.inStock === false);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (unavailable) return;
    lines.forEach((line) => {
      if (!line.flavor) return;
      addItem(line.flavor, getPackFor(line.flavor, line.packId), line.quantity);
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  const ratingVal = combo.rating || 4.8;

  return (
    <motion.article
      variants={{
        hidden: { opacity: 0, y: 28 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: index * 0.04 } },
      }}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-purple-200/90 bg-white/90 shadow-[var(--shadow-soft)] backdrop-blur-sm transition-all duration-300 hover:shadow-[var(--shadow-lift)]",
        isList ? "flex-col sm:flex-row" : "flex-col"
      )}
    >
      {/* Visual: artwork linked to /combos/[slug] */}
      <div
        className={cn(
          "relative shrink-0 overflow-hidden bg-gradient-to-br from-purple-50 via-white to-orange-50",
          isList ? "aspect-[4/3] sm:aspect-auto sm:w-56 lg:w-64" : "aspect-[4/3] w-full",
          unavailable && "opacity-50 grayscale"
        )}
      >
        <Link href={`/combos/${combo.slug}`} className="absolute inset-0 flex items-center justify-center p-3 sm:p-5 transition-transform duration-500 group-hover:scale-105">
          {combo.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={combo.image}
              alt={combo.name}
              className="size-full object-cover rounded-xl"
            />
          ) : (
            <div className="flex size-full items-center justify-center gap-1.5 p-2">
              {lines.slice(0, 3).map((line, i) =>
                line.flavor ? (
                  <div key={i} className="size-14 sm:size-20 shrink-0">
                    <WaferVisual flavor={line.flavor} seed={i} />
                  </div>
                ) : null
              )}
            </div>
          )}
        </Link>

        <div className="absolute left-2.5 top-2.5 sm:left-3 sm:top-3 flex flex-col items-start gap-1 z-10 pointer-events-none">
          <Badge variant="primary" size="sm" className="text-[9px] sm:text-xs shadow-xs">
            <Sparkles className="size-3" /> Combo
          </Badge>
          {combo.badge && (
            <Badge variant="gold" size="sm" className="text-[9px] sm:text-xs shadow-xs">
              {combo.badge}
            </Badge>
          )}
        </div>

        {combo.discountPercent > 0 && (
          <span className="absolute right-2.5 top-2.5 sm:right-3 sm:top-3 rounded-full bg-green-600 px-2 py-0.5 text-[9px] sm:text-[10px] font-extrabold text-white shadow-sm z-10 pointer-events-none">
            {combo.discountPercent}% OFF
          </span>
        )}

        {unavailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px] z-10 pointer-events-none">
            <span className="rounded-full bg-red-600 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
              Out of stock
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col justify-between p-3 sm:p-5">
        <div>
          <div className="flex items-start justify-between gap-1.5">
            <Link href={`/combos/${combo.slug}`} className="min-w-0 flex-1 transition-colors hover:text-purple-700">
              <h3 className="line-clamp-1 font-serif text-xs sm:text-lg font-bold text-gray-900 leading-tight">{combo.name}</h3>
            </Link>
            <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md shrink-0">
              <Star className="size-3 fill-amber-400 text-amber-500" />
              <span className="text-[10px] font-extrabold text-amber-900">{ratingVal.toFixed(1)}</span>
            </div>
          </div>

          <p className="mt-1 line-clamp-1 text-[11px] sm:text-xs font-medium text-gray-500">
            {combo.subtitle || `${combo.items.length} Packs Combo Bundle`}
          </p>
        </div>

        {/* Price + add */}
        <div className="mt-3 border-t border-gray-100 pt-2.5">
          <div className="flex items-baseline justify-between gap-1">
            <div className="flex items-baseline gap-1.5">
              <span className="font-serif text-sm sm:text-xl font-bold text-purple-700 whitespace-nowrap">
                {formatINR(combo.comboPrice)}
              </span>
              {combo.originalPrice > combo.comboPrice && (
                <span className="text-[10px] sm:text-xs text-gray-400 line-through whitespace-nowrap">
                  {formatINR(combo.originalPrice)}
                </span>
              )}
            </div>
            {combo.savings > 0 && (
              <span className="text-[9px] sm:text-xs font-bold text-green-700 whitespace-nowrap bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
                Save {formatINR(combo.savings)}
              </span>
            )}
          </div>

          <Button
            onClick={handleAdd}
            disabled={unavailable}
            variant={unavailable ? "outline" : (added ? "accent" : "primary")}
            size="sm"
            className="mt-2 w-full h-8.5 sm:h-10 text-xs font-bold rounded-xl active:scale-95 shadow-xs"
            aria-label={`Add ${combo.name} combo to cart`}
          >
            {added ? (
              <>
                <Check className="size-3.5" /> <span className="truncate">Added Combo</span>
              </>
            ) : (
              <>
                <ShoppingBag className="size-3.5" /> <span className="truncate">Add Combo</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.article>
  );
}
