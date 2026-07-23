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
        "group relative flex overflow-hidden rounded-3xl border border-purple-200 bg-white/70 shadow-[var(--shadow-soft)] backdrop-blur-sm transition-all hover:shadow-[var(--shadow-lift)]",
        isList ? "flex-row items-stretch" : "flex-col"
      )}
    >
      {/* Visual: the combo's own artwork, else the packs it contains */}
      <div
        className={cn(
          "relative shrink-0 overflow-hidden bg-gradient-to-br from-purple-50 to-orange-50",
          isList ? "w-36 sm:w-44" : "aspect-[4/3] w-full",
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
          <div className="flex size-full items-center justify-center gap-1 p-3">
            {lines.slice(0, 3).map((line, i) =>
              line.flavor ? (
                <div key={i} className="size-16 shrink-0 sm:size-20">
                  <WaferVisual flavor={line.flavor} seed={i} />
                </div>
              ) : null
            )}
          </div>
        )}

        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          <Badge variant="primary" size="sm">
            <Sparkles className="size-3" /> Combo
          </Badge>
          {combo.badge && (
            <Badge variant="gold" size="sm">
              {combo.badge}
            </Badge>
          )}
        </div>

        {combo.discountPercent > 0 && (
          <span className="absolute right-3 top-3 rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
            {combo.discountPercent}% off
          </span>
        )}

        {unavailable && (
          <span className="absolute inset-x-0 bottom-0 bg-charcoal/80 py-1.5 text-center text-[11px] font-bold uppercase tracking-wider text-cream">
            Out of stock
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex min-w-0 flex-1 flex-col p-5">
        <h3 className="font-serif text-lg font-bold text-charcoal">{combo.name}</h3>
        {combo.description && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-charcoal-muted">
            {combo.description}
          </p>
        )}

        {/* What's inside */}
        <ul className="mt-3 flex flex-col gap-1">
          {lines.map((line, i) => (
            <li key={i} className="flex items-center gap-1.5 text-xs text-charcoal-muted">
              <Check className="size-3 shrink-0 text-green-600" />
              <span className="truncate">
                {line.quantity}× {line.flavorName} · {line.packLabel}
              </span>
            </li>
          ))}
        </ul>

        {/* Price + add */}
        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-4">
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-xl font-bold text-purple-700">
                {formatINR(combo.comboPrice)}
              </span>
              {combo.originalPrice > combo.comboPrice && (
                <span className="text-sm text-charcoal-soft line-through">
                  {formatINR(combo.originalPrice)}
                </span>
              )}
            </div>
            {combo.savings > 0 && (
              <p className="text-[11px] font-bold text-green-600">
                You save {formatINR(combo.savings)}
              </p>
            )}
          </div>

          <Button
            onClick={handleAdd}
            disabled={unavailable}
            size="sm"
            className="shrink-0"
            aria-label={`Add ${combo.name} combo to cart`}
          >
            {added ? (
              <>
                <Check className="size-4" /> Added
              </>
            ) : (
              <>
                <ShoppingBag className="size-4" /> Add combo
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.article>
  );
}
