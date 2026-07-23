"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Check, ShoppingBag, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WaferVisual } from "@/components/common/wafer-visual";
import { useCart } from "@/components/cart/cart-provider";
import { useProducts } from "@/components/shop/product-provider";
import { getPackFor } from "@/lib/data/products";
import { formatINR, cn } from "@/lib/utils";

export interface ShopCombo {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  badge?: string;
  comboPrice: number;
  originalPrice: number;
  savings: number;
  discountPercent: number;
  items: {
    flavorId: string;
    flavorName: string;
    packId: string;
    packLabel: string;
    quantity: number;
  }[];
}

/**
 * A combo on the shop grid, sitting alongside the single flavours.
 *
 * "Adding a combo" simply adds its constituent packs to the cart — the bundle
 * discount is then detected from the cart contents by the same rule the server
 * charges on (see getComboDiscounts). That keeps one source of truth: there is
 * no separate combo line item that could drift from what the customer pays.
 */
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

  // Resolve each line against the live catalogue — a combo naming a flavour
  // that was since deleted or sold out must not be addable.
  const lines = React.useMemo(
    () =>
      combo.items.map((item) => ({
        ...item,
        flavor: flavors.find((f) => f.id === item.flavorId),
      })),
    [combo.items, flavors]
  );

  const unavailable = lines.some((l) => !l.flavor || l.flavor.inStock === false);

  const handleAdd = () => {
    if (unavailable) return;
    lines.forEach((line) => {
      if (!line.flavor) return;
      addItem(line.flavor, getPackFor(line.flavor, line.packId), line.quantity);
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

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
      {/* Visual: artwork or constituent wafer visuals */}
      <div
        className={cn(
          "relative shrink-0 overflow-hidden bg-gradient-to-br from-purple-50 to-orange-50",
          isList ? "aspect-[4/3] sm:aspect-auto sm:w-56 lg:w-64" : "aspect-[4/3] w-full",
          unavailable && "opacity-50 grayscale"
        )}
      >
        {combo.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={combo.image}
            alt={combo.name}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center gap-1 p-2 sm:p-3">
            {lines.slice(0, 3).map((line, i) =>
              line.flavor ? (
                <div key={i} className="size-12 sm:size-20 shrink-0">
                  <WaferVisual flavor={line.flavor} seed={i} />
                </div>
              ) : null
            )}
          </div>
        )}

        <div className="absolute left-2.5 top-2.5 sm:left-3 sm:top-3 flex flex-col items-start gap-1 z-10">
          <Badge variant="primary" size="sm" className="text-[9px] sm:text-xs">
            <Sparkles className="size-3" /> Combo
          </Badge>
          {combo.badge && (
            <Badge variant="gold" size="sm" className="text-[9px] sm:text-xs">
              {combo.badge}
            </Badge>
          )}
        </div>

        {combo.discountPercent > 0 && (
          <span className="absolute right-2.5 top-2.5 sm:right-3 sm:top-3 rounded-full bg-green-600 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-white shadow-sm z-10">
            {combo.discountPercent}% off
          </span>
        )}

        {unavailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px] z-10">
            <span className="rounded-full bg-red-600 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
              Out of stock
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col justify-between p-3 sm:p-5">
        <div>
          <h3 className="font-serif text-xs sm:text-lg font-bold text-charcoal leading-tight">{combo.name}</h3>
          {combo.description && (
            <p className="mt-1 line-clamp-2 text-[11px] sm:text-xs leading-snug text-charcoal-muted">
              {combo.description}
            </p>
          )}

          {/* What's inside */}
          <ul className="mt-2.5 flex flex-col gap-1 border-t border-purple-100/60 pt-2">
            {lines.map((line, i) => (
              <li key={i} className="flex items-center gap-1 text-[10px] sm:text-xs text-charcoal-muted">
                <Check className="size-3 shrink-0 text-green-600" />
                <span className="truncate">
                  {line.quantity}× {line.flavorName}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Price + add */}
        <div className="mt-3 border-t border-gray-100 pt-2.5">
          <div className="flex items-baseline justify-between gap-1">
            <div className="flex items-baseline gap-1.5">
              <span className="font-serif text-sm sm:text-xl font-bold text-purple-700 whitespace-nowrap">
                {formatINR(combo.comboPrice)}
              </span>
              {combo.originalPrice > combo.comboPrice && (
                <span className="text-[10px] sm:text-xs text-charcoal-soft line-through whitespace-nowrap">
                  {formatINR(combo.originalPrice)}
                </span>
              )}
            </div>
            {combo.savings > 0 && (
              <span className="text-[9px] sm:text-xs font-bold text-green-700 whitespace-nowrap">
                Save {formatINR(combo.savings)}
              </span>
            )}
          </div>

          <Button
            onClick={handleAdd}
            disabled={unavailable}
            variant={unavailable ? "outline" : (added ? "accent" : "primary")}
            size="sm"
            className="mt-2 w-full h-8.5 sm:h-10 text-xs font-bold rounded-xl active:scale-95"
            aria-label={`Add ${combo.name} combo to cart`}
          >
            {added ? (
              <>
                <Check className="size-3.5" /> <span className="truncate">Added</span>
              </>
            ) : (
              <>
                <ShoppingBag className="size-3.5" /> <span className="truncate">Add combo</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.article>
  );
}
