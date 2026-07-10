"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Heart,
  ShoppingBag,
  Plus,
  Minus,
  Check,
  Star,
  Leaf,
  ShieldCheck,
  Truck,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HeatMeter } from "@/components/common/heat-meter";
import { WaferVisual } from "@/components/common/wafer-visual";
import { useCart } from "@/components/cart/cart-provider";
import { useWishlist } from "@/components/cart/wishlist-provider";
import { PACK_SIZES, DEFAULT_PACK_ID } from "@/lib/data/products";
import { REVIEWS } from "@/lib/data/reviews";
import { formatINR, cn } from "@/lib/utils";
import type { Flavor } from "@/lib/types";

const badgeVariant: Record<string, "gold" | "orange" | "primary"> = {
  Signature: "primary",
  New: "gold",
  Hot: "orange",
};

export function ProductDetailClient({ flavor }: { flavor: Flavor }) {
  const { addItem } = useCart();
  const { has, toggle } = useWishlist();
  const [packId, setPackId] = React.useState(DEFAULT_PACK_ID);
  const [qty, setQty] = React.useState(1);
  const [added, setAdded] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"ingredients" | "details" | "shipping">("ingredients");

  const pack = PACK_SIZES.find((p) => p.id === packId)!;
  const wished = has(flavor.id);
  const savings = pack.compareAt ? pack.compareAt - pack.price : 0;
  
  // Filter reviews matching this flavor
  const flavorReviews = REVIEWS.filter((r) => r.flavor.toLowerCase() === flavor.name.toLowerCase());

  const handleAdd = () => {
    addItem(flavor, pack, qty);
    setAdded(true);
    setQty(1);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <div className="container-px mx-auto max-w-7xl py-8">
      {/* Breadcrumb / Back button */}
      <div className="mb-8">
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 text-sm font-medium text-charcoal-muted transition-colors hover:text-purple-700"
        >
          <ArrowLeft className="size-4" /> Back to Shop
        </Link>
      </div>

      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Left Column: Media / Graphic */}
        <div className="flex flex-col gap-6">
          <div
            className="relative aspect-square w-full overflow-hidden rounded-3xl border border-[var(--color-border)] shadow-[var(--shadow-soft)]"
            style={{
              background: `radial-gradient(130% 130% at 50% 10%, ${flavor.gradient.from}22, transparent 65%)`,
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center p-12">
              <WaferVisual flavor={flavor} seed={4} className="h-64 w-auto object-contain transition-transform duration-700 hover:scale-105" />
            </div>

            <div className="absolute left-6 top-6 flex flex-col gap-2">
              {flavor.bestSeller && (
                <Badge variant="gold" size="lg">
                  ★ Best Seller
                </Badge>
              )}
              {flavor.badge && (
                <Badge variant={badgeVariant[flavor.badge] ?? "soft"} size="lg">
                  {flavor.badge}
                </Badge>
              )}
            </div>

            <button
              onClick={() => toggle(flavor.id)}
              aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
              className="absolute right-6 top-6 grid size-12 place-items-center rounded-full bg-white text-charcoal-muted shadow-md transition-all hover:scale-110 hover:text-red-500"
            >
              <Heart className={cn("size-5.5 transition-all", wished && "fill-red-500 text-red-500")} />
            </button>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="rounded-2xl border border-[var(--color-border)] bg-white/40 p-4 backdrop-blur-sm">
              <Leaf className="mx-auto size-5 text-green-600" />
              <p className="mt-1.5 text-xs font-semibold text-charcoal">100% Veg</p>
              <p className="text-[10px] text-charcoal-muted mt-0.5">Pure ingredients</p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-white/40 p-4 backdrop-blur-sm">
              <ShieldCheck className="mx-auto size-5 text-purple-600" />
              <p className="mt-1.5 text-xs font-semibold text-charcoal">Gluten Free</p>
              <p className="text-[10px] text-charcoal-muted mt-0.5">No wheat / starch</p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-white/40 p-4 backdrop-blur-sm">
              <RotateCcw className="mx-auto size-5 text-orange-600" />
              <p className="mt-1.5 text-xs font-semibold text-charcoal">Kettle Cooked</p>
              <p className="text-[10px] text-charcoal-muted mt-0.5">Crafted in batches</p>
            </div>
          </div>
        </div>

        {/* Right Column: Info & Actions */}
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-gold-500">
              <Star className="size-4 fill-gold-400 text-gold-400" /> 4.9
            </span>
            <span className="text-xs text-charcoal-muted">· {flavorReviews.length > 0 ? "Verified Review" : "Signature Flavor"}</span>
          </div>

          <h1 className="mt-4 font-serif text-4xl font-bold text-charcoal sm:text-5xl">
            {flavor.name} <span className="text-gradient-warm">Ratalu Wafers</span>
          </h1>

          <p className="mt-3 text-lg font-medium text-purple-700">{flavor.tagline}</p>

          <p className="mt-4 text-charcoal-muted leading-relaxed">
            {flavor.description}
          </p>

          {/* Heat Level */}
          <div className="mt-6 flex items-center gap-3">
            <span className="text-sm font-semibold text-charcoal">Spice Level:</span>
            <HeatMeter level={flavor.heat} className="scale-105" />
          </div>

          {/* Size Selector */}
          <fieldset className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <legend className="text-xs font-bold uppercase tracking-wider text-charcoal-soft">
                Select pack size
              </legend>
              {savings > 0 && (
                <Badge variant="soft" size="sm" className="text-green-700 font-semibold animate-pulse">
                  Save {formatINR(savings)}
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-4 gap-3">
              {PACK_SIZES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPackId(p.id)}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-2xl border py-3 text-center transition-all",
                    p.id === packId
                      ? "border-purple-500 bg-purple-50 text-purple-700 shadow-sm ring-1 ring-purple-500"
                      : "border-[var(--color-border)] bg-white text-charcoal-muted hover:border-purple-200"
                  )}
                >
                  <span className="block text-sm font-bold">{p.label}</span>
                  <span className="block text-xs font-medium mt-0.5">{formatINR(p.price)}</span>
                  {p.note && (
                    <span className="block text-[8px] uppercase tracking-wider mt-1 font-semibold text-orange-500">
                      {p.note}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Price Summary */}
          <div className="mt-8 flex items-baseline gap-3">
            <span className="font-serif text-3xl font-bold text-purple-700">
              {formatINR(pack.price * qty)}
            </span>
            {pack.compareAt && (
              <span className="text-base text-charcoal-soft line-through">
                {formatINR(pack.compareAt * qty)}
              </span>
            )}
            <span className="text-xs text-charcoal-muted">({pack.label} Pack)</span>
          </div>

          {/* Add to Cart Actions */}
          <div className="mt-6 flex items-center gap-4">
            <div className="flex items-center rounded-full border border-[var(--color-border)] bg-white p-1">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="grid size-11 place-items-center rounded-full text-charcoal-muted transition-colors hover:bg-purple-50 hover:text-purple-700"
                aria-label="Decrease quantity"
              >
                <Minus className="size-4" />
              </button>
              <span className="w-8 text-center font-bold text-charcoal text-base tabular-nums">{qty}</span>
              <button
                onClick={() => setQty((q) => Math.min(99, q + 1))}
                className="grid size-11 place-items-center rounded-full text-charcoal-muted transition-colors hover:bg-purple-50 hover:text-purple-700"
                aria-label="Increase quantity"
              >
                <Plus className="size-4" />
              </button>
            </div>
            <Button
              onClick={handleAdd}
              variant={added ? "accent" : "primary"}
              size="xl"
              className="flex-1"
            >
              {added ? (
                <>
                  <Check className="size-5" /> Added to cart
                </>
              ) : (
                <>
                  <ShoppingBag className="size-5" /> Add to Cart · {formatINR(pack.price * qty)}
                </>
              )}
            </Button>
          </div>

          {/* Shipping Promos */}
          <div className="mt-6 flex items-center gap-4 text-xs text-charcoal-muted border-t border-[var(--color-border)] pt-5">
            <span className="flex items-center gap-1.5">
              <Truck className="size-4 text-purple-600" /> Free Shipping above ₹599
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-purple-600" /> Freshness Guaranteed
            </span>
          </div>
        </div>
      </div>

      {/* Tabs section for description/ingredients */}
      <div className="mt-16 border-t border-[var(--color-border)] pt-12">
        <div className="flex gap-4 border-b border-[var(--color-border)] pb-3">
          {(["ingredients", "details", "shipping"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "pb-2 text-sm font-bold uppercase tracking-wider transition-all border-b-2 -mb-[14px]",
                activeTab === tab
                  ? "border-purple-600 text-purple-700"
                  : "border-transparent text-charcoal-muted hover:text-purple-600"
              )}
            >
              {tab === "ingredients" && "Ingredients"}
              {tab === "details" && "Product Details"}
              {tab === "shipping" && "Shipping & Delivery"}
            </button>
          ))}
        </div>

        <div className="mt-8 min-h-[120px]">
          {activeTab === "ingredients" && (
            <div className="max-w-2xl">
              <h3 className="font-serif text-xl font-bold text-charcoal mb-4">What goes inside</h3>
              <div className="flex flex-wrap gap-2">
                {flavor.ingredients.map((ing) => (
                  <span key={ing} className="rounded-full bg-cream-100 px-4.5 py-1.5 text-sm font-semibold text-purple-800 border border-purple-100">
                    {ing}
                  </span>
                ))}
              </div>
              <p className="mt-5 text-sm text-charcoal-muted italic">
                Processed in a facility that handles dairy. Free from added preservatives, MSG, and artificial colors.
              </p>
            </div>
          )}

          {activeTab === "details" && (
            <div className="grid gap-6 max-w-3xl sm:grid-cols-2">
              <div>
                <h4 className="font-serif text-lg font-bold text-charcoal mb-2">Purple Yam (Ratalu)</h4>
                <p className="text-sm text-charcoal-muted leading-relaxed">
                  We use fresh, heritage purple yams locally sourced from farms. Kettle-cooking yams preserves their natural fiber, rich antioxidants, and distinct earthy sweetness.
                </p>
              </div>
              <div>
                <h4 className="font-serif text-lg font-bold text-charcoal mb-2">Our Kettle Cooking Process</h4>
                <p className="text-sm text-charcoal-muted leading-relaxed">
                  Unlike mass-produced potato chips, Ratalu wafers are kettle-cooked in small batches under controlled temperature. This creates a superior, thick, and satisfying crunch.
                </p>
              </div>
            </div>
          )}

          {activeTab === "shipping" && (
            <div className="max-w-2xl text-sm text-charcoal-muted flex flex-col gap-3">
              <p>
                📬 **Standard Shipping**: Dispatch in 24 hours. Delivered across major Indian cities in 2 to 5 business days.
              </p>
              <p>
                🚛 **Freshness Sealed**: Every single pouch is nitrogen-flushed to secure optimal crispiness and prevent breakage.
              </p>
              <p>
                🔄 **Easy Returns**: Received damaged packaging? Contact us within 48 hours for immediate replacement.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Flavor Reviews Section */}
      <div className="mt-16 border-t border-[var(--color-border)] pt-12">
        <h3 className="font-serif text-2xl font-bold text-charcoal mb-8">Customer Reviews</h3>
        
        {flavorReviews.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2">
            {flavorReviews.map((rev) => (
              <div key={rev.id} className="rounded-3xl border border-[var(--color-border)] bg-white/60 p-6 shadow-sm backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="grid size-10 place-items-center rounded-full text-sm font-bold text-white shadow-inner"
                      style={{
                        background: `linear-gradient(135deg, ${rev.avatarGradient.from}, ${rev.avatarGradient.to})`,
                      }}
                    >
                      {rev.initials}
                    </span>
                    <div>
                      <p className="font-bold text-charcoal text-sm">{rev.name}</p>
                      <p className="text-[10px] text-charcoal-muted">{rev.location}</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-0.5 text-xs font-semibold text-gold-500">
                    {Array.from({ length: rev.rating }).map((_, idx) => (
                      <Star key={idx} className="size-3.5 fill-gold-400 text-gold-400" />
                    ))}
                  </span>
                </div>
                <p className="text-sm text-charcoal-muted leading-relaxed italic">
                  &ldquo;{rev.quote}&rdquo;
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-[var(--color-border)] bg-cream-100/50 p-8 text-center">
            <p className="text-charcoal-muted">
              Be the first to review {flavor.name}! Order a pack today and tell us about your experience.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
