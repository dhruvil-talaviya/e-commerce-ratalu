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
import { getPackFor } from "@/lib/data/products";
import { formatINR, cn } from "@/lib/utils";
import type { ShopCombo } from "@/lib/types";

export function ComboDetailClient({ combo }: { combo: ShopCombo }) {
  const { addItem } = useCart();
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
    for (let q = 0; q < qty; q++) {
      lines.forEach((line) => {
        if (!line.flavor) return;
        addItem(line.flavor, getPackFor(line.flavor, line.packId), line.quantity);
      });
    }
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
          {/* Left: Gallery (5 cols) */}
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

              <Badge variant="primary" size="md" className="absolute left-4 top-4 shadow-sm z-10">
                <Sparkles className="size-3.5" /> Combo Offer
              </Badge>

              {combo.discountPercent > 0 && (
                <span className="absolute right-4 top-4 rounded-full bg-green-600 px-3 py-1 text-xs font-extrabold text-white shadow-sm z-10">
                  SAVE {combo.discountPercent}% OFF
                </span>
              )}
            </div>

            {/* Thumbnail selector */}
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={cn(
                      "size-16 rounded-xl border-2 overflow-hidden transition-all shrink-0 bg-white",
                      selectedImage === i ? "border-purple-600 ring-2 ring-purple-200" : "border-gray-200 opacity-70"
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt="" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Info & Buy Section (6 cols) */}
          <div className="lg:col-span-6 flex flex-col gap-5 bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-8 shadow-xs">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  <Star className="size-3.5 fill-amber-400 text-amber-500" />
                  <span className="text-xs font-extrabold text-amber-900">{ratingVal.toFixed(1)}</span>
                </div>
                <span className="text-xs font-semibold text-gray-500">({reviewCount} verified reviews)</span>
              </div>

              <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">
                {combo.name}
              </h1>
              {combo.subtitle && (
                <p className="mt-1 text-sm font-semibold text-purple-700">{combo.subtitle}</p>
              )}
            </div>

            {/* Pricing Card */}
            <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-4">
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Bundle Price</span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-serif text-2xl sm:text-3xl font-extrabold text-purple-900">
                      {formatINR(combo.comboPrice)}
                    </span>
                    {combo.originalPrice > combo.comboPrice && (
                      <span className="text-sm sm:text-base text-gray-400 line-through font-medium">
                        {formatINR(combo.originalPrice)}
                      </span>
                    )}
                  </div>
                </div>

                {combo.savings > 0 && (
                  <span className="rounded-xl bg-green-600 px-3 py-1.5 text-xs font-extrabold text-white shadow-xs">
                    You Save {formatINR(combo.savings)}
                  </span>
                )}
              </div>
            </div>

            {/* Products Included */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-3 flex items-center gap-1.5">
                <Tag className="size-4 text-purple-600" /> Packs Included in this Combo ({combo.items.length})
              </h3>
              <div className="space-y-2">
                {lines.map((line, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 rounded-xl border border-gray-200/80 bg-gray-50/70 p-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className="size-10 shrink-0 rounded-lg shadow-xs"
                        style={{
                          background: line.flavor
                            ? `radial-gradient(120% 120% at 30% 20%, ${line.flavor.gradient.from}, ${line.flavor.gradient.to})`
                            : "#9333ea",
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-serif text-xs font-bold text-gray-900 truncate">
                          {line.flavorName}
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

            {/* Description */}
            {combo.description && (
              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-1">About This Bundle</h4>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{combo.description}</p>
              </div>
            )}

            {/* Action Bar */}
            <div className="border-t border-gray-100 pt-4 space-y-4">
              <div className="flex items-center gap-3">
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
                      <ShoppingBag className="size-4" /> Add Combo to Cart · {formatINR(combo.comboPrice * qty)}
                    </>
                  )}
                </Button>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap items-center justify-around gap-2 text-[11px] font-semibold text-gray-500 pt-2 border-t border-gray-100">
                <span className="flex items-center gap-1">
                  <Truck className="size-3.5 text-orange-600" /> Dispatch in 24 Hrs
                </span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="size-3.5 text-green-600" /> Freshness Guaranteed
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
