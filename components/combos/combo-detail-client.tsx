"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  Check,
  ChevronRight,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
  Truck,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WaferVisual } from "@/components/common/wafer-visual";
import { useCart } from "@/components/cart/cart-provider";
import { useProducts } from "@/components/shop/product-provider";
import { ComboCard } from "@/components/shop/combo-card";
import { ProductCard } from "@/components/shop/product-card";
import { getPackFor } from "@/lib/data/products";
import { formatINR, cn } from "@/lib/utils";
import type { ShopCombo } from "@/lib/types";

export function ComboDetailClient({ combo }: { combo: ShopCombo }) {
  const { addCombo } = useCart();
  const { flavors } = useProducts();

  const [selectedImage, setSelectedImage] = React.useState(0);
  const [qty, setQty] = React.useState(1);
  const [added, setAdded] = React.useState(false);

  const lines = React.useMemo(
    () =>
      combo.items.map((item) => ({
        ...item,
        flavor: flavors.find((f) => f.id === item.flavorId || f.slug === item.flavorId),
      })),
    [combo.items, flavors]
  );

  const unavailable = lines.some((l) => !l.flavor || l.flavor.inStock === false);

  const handleAdd = () => {
    if (unavailable) return;
    addCombo(combo, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  const images = React.useMemo(() => {
    if (combo.images && combo.images.length > 0) return combo.images;
    if (combo.image) return [combo.image];
    return [];
  }, [combo]);

  const ratingVal = combo.rating || 4.8;
  const reviewCount = combo.reviewCount || 16;

  return (
    <div className="bg-gray-50/60 pb-16 pt-4 sm:pt-8">
      <div className="container-px mx-auto max-w-7xl">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-xs font-semibold text-gray-500">
          <Link href="/" className="hover:text-purple-700">Home</Link>
          <ChevronRight className="size-3" />
          <Link href="/combos" className="hover:text-purple-700">Combos</Link>
          <ChevronRight className="size-3" />
          <span className="text-gray-900 truncate max-w-[200px]">{combo.name}</span>
        </nav>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Gallery (6 cols) */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-purple-200/80 bg-white p-6 shadow-sm flex items-center justify-center">
              {images.length > 0 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={images[selectedImage]}
                  alt={combo.name}
                  className="size-full object-cover rounded-2xl"
                />
              ) : (
                <div className="flex size-full items-center justify-center gap-3">
                  {lines.slice(0, 3).map((line, i) =>
                    line.flavor ? (
                      <div key={i} className="size-24 sm:size-36 shrink-0">
                        <WaferVisual flavor={line.flavor} seed={i} />
                      </div>
                    ) : null
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Info (6 cols) */}
          <div className="lg:col-span-6 flex flex-col gap-5 rounded-3xl border border-purple-200/80 bg-white p-5 sm:p-8 shadow-sm">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant="primary" size="sm" className="bg-purple-700 text-white font-bold">
                  <Sparkles className="size-3 mr-1" /> Super Value Combo
                </Badge>
                {combo.discountPercent > 0 && (
                  <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-extrabold text-white shadow-xs">
                    {combo.discountPercent}% OFF
                  </span>
                )}
              </div>

              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{combo.name}</h1>
              {combo.subtitle && (
                <p className="text-xs sm:text-sm font-semibold text-purple-700">{combo.subtitle}</p>
              )}

              {/* Rating */}
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                  <Star className="size-3.5 fill-amber-400 text-amber-500" />
                  <span className="text-xs font-bold text-amber-900">{ratingVal.toFixed(1)}</span>
                </div>
                <span className="text-xs text-gray-500 font-medium">({reviewCount} customer reviews)</span>
              </div>
            </div>

            {/* Price Row */}
            <div className="flex items-baseline gap-3 border-y border-gray-100 py-3.5">
              <span className="font-serif text-2xl sm:text-3xl font-bold text-purple-700">
                {formatINR(combo.comboPrice * qty)}
              </span>
              {combo.originalPrice > combo.comboPrice && (
                <span className="text-sm text-gray-400 line-through">
                  {formatINR(combo.originalPrice * qty)}
                </span>
              )}
              {combo.savings > 0 && (
                <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-extrabold text-emerald-700">
                  Save {formatINR(combo.savings * qty)}
                </span>
              )}
            </div>

            {/* Included Items */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Included in Combo ({combo.items.reduce((a, b) => a + b.quantity, 0)} Packs)
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {lines.map((line, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-2xl border border-purple-100 bg-purple-50/50 p-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {line.flavor ? (
                        <div className="size-10 shrink-0">
                          <WaferVisual flavor={line.flavor} seed={idx} />
                        </div>
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <p className="font-serif text-xs font-bold text-gray-900 truncate">
                          {line.flavorName || line.flavor?.name}
                        </p>
                        <p className="text-[11px] font-medium text-gray-500">{line.packLabel} pack</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-extrabold text-purple-800 shrink-0">
                      {line.quantity} Pack{line.quantity > 1 ? "s" : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center gap-3 pt-4">
                <div className="flex items-center gap-1 rounded-xl border border-purple-200 bg-purple-50/50 p-1 shrink-0">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="grid size-8 place-items-center rounded-lg bg-white text-purple-700 shadow-xs hover:bg-purple-100"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-8 text-center text-sm font-extrabold text-purple-900 tabular-nums">{qty}</span>
                  <button
                    onClick={() => setQty((q) => Math.min(10, q + 1))}
                    className="grid size-8 place-items-center rounded-lg bg-white text-purple-700 shadow-xs hover:bg-purple-100"
                    aria-label="Increase quantity"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>

                <Button
                  onClick={handleAdd}
                  disabled={unavailable}
                  size="lg"
                  className="flex-1 h-12 text-sm font-bold rounded-2xl bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-200 flex items-center justify-center gap-2 active:scale-95"
                >
                  {added ? (
                    <>
                      <Check className="size-4" /> Added Combo to Cart
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="size-4" /> Add Combo to Cart
                    </>
                  )}
                </Button>
            </div>
          </div>
        </div>

        {/* You Might Also Like / Explore More Flavours */}
        <div className="mt-16 border-t border-purple-100/80 pt-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-purple-700">Explore More</span>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-gray-900 mt-1">You Might Also Like</h3>
            </div>
            <Button asChild variant="outline" size="sm" className="border-purple-200 text-purple-700 font-bold hover:bg-purple-50 rounded-xl">
              <Link href="/shop">
                Shop All Flavours <ArrowRight className="size-4 ml-1.5" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {flavors.slice(0, 4).map((flavor, i) => (
              <ProductCard key={flavor.id} flavor={flavor} index={i} view="grid" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
