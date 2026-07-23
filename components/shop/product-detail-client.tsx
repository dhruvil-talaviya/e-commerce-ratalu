"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useInView } from "motion/react";
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
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStoreSettings } from "@/components/common/settings-provider";
import { HeatMeter } from "@/components/common/heat-meter";
import { useCart } from "@/components/cart/cart-provider";
import { useWishlist } from "@/components/cart/wishlist-provider";
import { ProductGallery } from "./product-gallery";
import { DeliveryEstimate } from "./delivery-estimate";
import { FrequentlyBoughtTogether } from "./frequently-bought-together";
import { RelatedProducts } from "./related-products";
import { getPacks, getPackFor, DEFAULT_PACK_ID } from "@/lib/data/products";
import { NUTRITION, NUTRITION_NOTE } from "@/lib/data/product-meta";
import { REVIEWS } from "@/lib/data/reviews";
import { CmsIcon } from "@/components/cms/icon-registry";
import { formatINR, cn } from "@/lib/utils";
import type { Flavor } from "@/lib/types";

type TabKey = "ingredients" | "nutrition" | "details" | "storage" | "shipping";
const TABS: { key: TabKey; label: string }[] = [
  { key: "ingredients", label: "Ingredients" },
  { key: "nutrition", label: "Nutrition" },
  { key: "details", label: "Product Details" },
  { key: "storage", label: "Storage" },
  { key: "shipping", label: "Shipping & Returns" },
];

export function ProductDetailClient({ flavor }: { flavor: Flavor }) {
  const { settings } = useStoreSettings();
  const { addItem } = useCart();
  const { has, toggle } = useWishlist();
  const router = useRouter();
  const [packId, setPackId] = React.useState(DEFAULT_PACK_ID);
  const [qty, setQty] = React.useState(1);
  const [added, setAdded] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<TabKey>("ingredients");

  const gstEnabled = settings.gstEnabled !== false;
  const globalGstRate = settings.taxRate || 5;
  const globalTaxInclusive = settings.taxInclusive !== false;

  let activeRate = globalGstRate;
  let activeInclusive = globalTaxInclusive;
  if (flavor.taxOverrideEnabled) {
    activeRate = flavor.taxRate || 0;
    activeInclusive = flavor.taxInclusive !== false;
  }

  // Prices come from the database, never the static file — otherwise an admin
  // could change a price and customers would keep paying the hardcoded one.
  const packs = getPacks(flavor);
  const pack = getPackFor(flavor, packId);
  const wished = has(flavor.id);
  const savings = pack.compareAt ? pack.compareAt - pack.price : 0;

  const flavorReviews = REVIEWS.filter((r) => r.flavor.toLowerCase() === flavor.name.toLowerCase());

  /** Real rating from approved reviews. Falls back to "no reviews" — never a made-up score. */
  const rating = flavor.rating ?? { average: 0, count: 0, distribution: {} };

  /**
   * Product page content, from the CMS. Only enabled badges/labels render, and
   * an empty list renders nothing rather than falling back to hardcoded copy —
   * if the admin deletes a badge, it must actually disappear.
   */
  const trustBadges = (flavor.trustBadges ?? []).filter((b) => b.enabled !== false);
  const labels = (flavor.labels ?? []).filter(
    (l) => l.enabled !== false && (l.showOn ?? "all") !== "card"
  );
  const highlights = flavor.highlights ?? [];
  const nutrition = flavor.nutrition ?? {};
  const productInfo = flavor.productInfo ?? {};
  const delivery = flavor.delivery ?? {};

  // Show the mobile sticky bar only while the inline Add button is off-screen.
  const inlineRef = React.useRef<HTMLDivElement>(null);
  const endRef = React.useRef<HTMLDivElement>(null);
  const inlineInView = useInView(inlineRef, { margin: "-80px 0px 0px 0px" });
  const endInView = useInView(endRef, { margin: "0px 0px -120px 0px" });
  const showStickyBar = !inlineInView && !endInView;



  const handleAdd = () => {
    addItem(flavor, pack, qty);
    setAdded(true);
    setQty(1);
    setTimeout(() => setAdded(false), 1600);
  };

  const buyNow = () => {
    addItem(flavor, pack, qty);
    router.push("/checkout");
  };

  return (
    <div className="container-px mx-auto max-w-7xl pt-6 pb-10 sm:py-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-sm text-charcoal-soft">
        <Link href="/" className="hover:text-purple-600">Home</Link>
        <span>/</span>
        <Link href="/shop" className="hover:text-purple-600">Shop</Link>
        <span>/</span>
        <span className="truncate text-charcoal-muted">{flavor.name}</span>
      </nav>

      <Link
        href="/shop"
        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-charcoal-muted transition-colors hover:text-purple-700"
      >
        <ArrowLeft className="size-4" /> Back to Shop
      </Link>

      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Left: gallery (sticky on desktop) */}
        <div className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
          <ProductGallery flavor={flavor} />

          {/*
            Trust badges come from the database — the admin adds, edits, reorders
            and removes them. They used to be a hardcoded array of three, so
            changing "Gluten Free" meant a code deploy.
          */}
          {trustBadges.length > 0 && (
            <div
              className={cn(
                "grid gap-2.5 text-center sm:gap-4",
                trustBadges.length >= 3 ? "grid-cols-3" : "grid-cols-2"
              )}
            >
              {trustBadges.map((b) => (
                <div
                  key={b.title}
                  className="min-w-0 rounded-2xl border border-[var(--color-border)] bg-white/40 p-3 backdrop-blur-sm sm:p-4"
                >
                  <CmsIcon
                    name={b.icon}
                    className={cn("mx-auto size-5", b.color || "text-purple-600")}
                  />
                  <p className="mt-1.5 text-xs font-semibold text-charcoal">{b.title}</p>
                  {b.description && (
                    <p className="mt-0.5 hidden text-[10px] text-charcoal-muted xs:block">
                      {b.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: info & actions */}
        <div className="flex min-w-0 flex-col">
          {/*
            The rating is computed on the server from APPROVED reviews. It used
            to be a hardcoded "4.9" printed regardless of what customers had
            actually said. With no reviews we now show nothing rather than
            inventing a score.
          */}
          <div className="flex items-center gap-2.5">
            {rating.count > 0 ? (
              <>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-gold-500">
                  <Star className="size-4 fill-gold-400 text-gold-400" />
                  {rating.average.toFixed(1)}
                </span>
                <span className="text-xs text-charcoal-muted">
                  · {rating.count} verified review{rating.count === 1 ? "" : "s"}
                </span>
              </>
            ) : (
              <span className="text-xs text-charcoal-muted">Signature flavour</span>
            )}
            <span className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-green-700">
              <span className="size-2 rounded-full bg-green-500" /> In stock
            </span>
          </div>

          <h1 className="mt-4 font-serif text-4xl font-bold text-charcoal sm:text-5xl">
            {flavor.name} <span className="text-gradient-warm">Ratalu Chips</span>
          </h1>

          <p className="mt-3 text-lg font-medium text-purple-700">{flavor.tagline}</p>
          <p className="mt-4 leading-relaxed text-charcoal-muted">{flavor.description}</p>

          {/* Heat */}
          <div className="mt-6 flex items-center gap-3">
            <span className="text-sm font-semibold text-charcoal">Spice Level:</span>
            <HeatMeter level={flavor.heat} />
          </div>

          {/* Size selector */}
          <fieldset className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <legend className="text-xs font-bold uppercase tracking-wider text-charcoal-soft">Select pack size</legend>
              {savings > 0 && flavor.inStock !== false && (
                <Badge variant="soft" size="sm" className="font-semibold text-green-700">Save {formatINR(savings)}</Badge>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {packs.map((p) => {
                const isOutOfStock = flavor.inStock === false;
                return (
                  <button
                    key={p.id}
                    disabled={isOutOfStock}
                    onClick={() => setPackId(p.id)}
                    aria-pressed={p.id === packId}
                    className={cn(
                      "flex min-w-0 flex-col items-center justify-center rounded-2xl border py-3 text-center transition-all",
                      p.id === packId
                        ? "border-purple-500 bg-purple-50 text-purple-700 shadow-sm ring-1 ring-purple-500"
                        : "border-[var(--color-border)] bg-white text-charcoal-muted hover:border-purple-200",
                      isOutOfStock && "opacity-40 cursor-not-allowed hover:border-[var(--color-border)]"
                    )}
                  >
                    <span className="block text-sm font-bold">{p.label}</span>
                    <span className="mt-0.5 block text-xs font-medium">{formatINR(p.price)}</span>
                    {p.note && !isOutOfStock && (
                      <span className="mt-1 block text-[8px] font-semibold uppercase tracking-wider text-orange-500">{p.note}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Price */}
          <div className="mt-8 flex items-baseline gap-3">
            <span className="font-serif text-3xl font-bold text-purple-700">{formatINR(pack.price * qty)}</span>
            {pack.compareAt && (
              <span className="text-base text-charcoal-soft line-through">{formatINR(pack.compareAt * qty)}</span>
            )}
            <span className="text-xs text-charcoal-muted">
              ({pack.label} pack · {gstEnabled ? (activeInclusive ? `incl. ${activeRate}% GST` : `+${activeRate}% GST`) : "excl. taxes"})
            </span>
          </div>

          {/* Actions */}
          <div ref={inlineRef} className="mt-6 flex items-center gap-2 sm:gap-4">
            <div className={cn("flex shrink-0 items-center rounded-full border border-[var(--color-border)] bg-white p-1", flavor.inStock === false && "opacity-40 cursor-not-allowed")}>
              <button disabled={flavor.inStock === false} onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid size-9 place-items-center rounded-full text-charcoal-muted transition-colors hover:bg-purple-50 hover:text-purple-700 disabled:pointer-events-none sm:size-11" aria-label="Decrease quantity">
                <Minus className="size-4" />
              </button>
              <span className="w-7 text-center text-base font-bold tabular-nums text-charcoal sm:w-8">{qty}</span>
              <button disabled={flavor.inStock === false} onClick={() => setQty((q) => Math.min(99, q + 1))} className="grid size-9 place-items-center rounded-full text-charcoal-muted transition-colors hover:bg-purple-50 hover:text-purple-700 disabled:pointer-events-none sm:size-11" aria-label="Increase quantity">
                <Plus className="size-4" />
              </button>
            </div>
            <Button disabled={flavor.inStock === false} onClick={handleAdd} variant={flavor.inStock === false ? "outline" : (added ? "accent" : "primary")} size="xl" className="min-w-0 flex-1">
              {flavor.inStock === false ? (
                <span className="truncate">Out of Stock</span>
              ) : added ? (
                <><Check className="size-5" /> <span className="truncate">Added to cart</span></>
              ) : (
                <>
                  <ShoppingBag className="size-5" />
                  <span className="truncate">Add to Cart</span>
                  <span className="hidden xs:inline">· {formatINR(pack.price * qty)}</span>
                </>
              )}
            </Button>
            {(() => {
              const baseLikes = flavor.likesCount || 0;
              // eslint-disable-next-line react-hooks/rules-of-hooks
              const initiallyWished = React.useRef(wished).current;
              const currentLikes = Math.max(0, baseLikes + (wished ? (initiallyWished ? 0 : 1) : (initiallyWished ? -1 : 0)));

              return (
                <button
                  onClick={() => toggle(flavor.id)}
                  aria-label={wished ? "Unlike product" : "Like product"}
                  aria-pressed={wished}
                  className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-4 text-charcoal-muted transition-colors hover:border-red-200 hover:text-red-500 sm:h-13"
                >
                  <Heart className={cn("size-5 sm:size-5.5", wished && "fill-red-500 text-red-500")} />
                  <span className={cn("text-sm font-extrabold", wished ? "text-red-600" : "text-gray-700")}>
                    {currentLikes > 0 ? currentLikes : "Like"}
                  </span>
                </button>
              );
            })()}
          </div>

          {flavor.inStock !== false && (
            <Button onClick={buyNow} variant="secondary" size="xl" className="mt-3 w-full">
              <Zap className="size-5" /> Buy Now
            </Button>
          )}

          {/* Delivery estimate */}
          <div className="mt-6">
            <DeliveryEstimate />
          </div>

          {/* Promos */}
          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--color-border)] pt-5 text-xs text-charcoal-muted">
            <span className="flex items-center gap-1.5"><Truck className="size-4 text-purple-600" /> Free shipping above ₹599</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="size-4 text-purple-600" /> Freshness guaranteed</span>
            <span className="flex items-center gap-1.5"><RotateCcw className="size-4 text-purple-600" /> 7-day easy returns</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-16 border-t border-[var(--color-border)] pt-12">
        <div className="flex gap-4 overflow-x-auto border-b border-[var(--color-border)] pb-3 no-scrollbar" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              role="tab"
              aria-selected={activeTab === t.key}
              className={cn(
                "-mb-[14px] shrink-0 whitespace-nowrap border-b-2 pb-2 text-sm font-bold uppercase tracking-wider transition-all",
                activeTab === t.key ? "border-purple-600 text-purple-700" : "border-transparent text-charcoal-muted hover:text-purple-600"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-8 min-h-[140px]">
          {activeTab === "ingredients" && (
            <div className="max-w-2xl">
              <h3 className="mb-4 font-serif text-xl font-bold text-charcoal">What goes inside</h3>
              <div className="flex flex-wrap gap-2">
                {flavor.ingredients.map((ing) => (
                  <span key={ing} className="rounded-full border border-purple-100 bg-cream-100 px-4 py-1.5 text-sm font-semibold text-purple-800">{ing}</span>
                ))}
              </div>
              <p className="mt-5 text-sm italic text-charcoal-muted">{NUTRITION_NOTE}</p>
            </div>
          )}

          {activeTab === "nutrition" && (
            <div className="max-w-md">
              <h3 className="mb-4 font-serif text-xl font-bold text-charcoal">Nutrition information</h3>
              <div className="overflow-hidden rounded-2xl border border-[var(--color-border)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-cream-100 text-left text-xs uppercase tracking-wide text-charcoal-soft">
                      <th className="px-4 py-2.5 font-semibold">Per 100g</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Amount</th>
                      <th className="px-4 py-2.5 text-right font-semibold">% DV*</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {NUTRITION.map((row) => (
                      <tr key={row.label} className={row.label.startsWith("  ") ? "text-charcoal-muted" : "text-charcoal"}>
                        <td className="px-4 py-2.5">{row.label.trim()}</td>
                        <td className="px-4 py-2.5 text-right font-medium tabular-nums">{row.value}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-charcoal-muted">{row.dv ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-charcoal-soft">*Percent Daily Values are based on a 2,000 kcal diet.</p>
            </div>
          )}

          {activeTab === "details" && (
            <div className="grid max-w-3xl gap-6 sm:grid-cols-2">
              <div>
                <h4 className="mb-2 font-serif text-lg font-bold text-charcoal">Purple Yam (Ratalu)</h4>
                <p className="text-sm leading-relaxed text-charcoal-muted">
                  We use fresh, heritage purple yams locally sourced from Gujarat farms. Kettle-cooking preserves
                  their natural fibre, antioxidants and distinct earthy sweetness.
                </p>
              </div>
              <div>
                <h4 className="mb-2 font-serif text-lg font-bold text-charcoal">Our kettle-cooking process</h4>
                <p className="text-sm leading-relaxed text-charcoal-muted">
                  Unlike mass-produced potato chips, Ratalu Chips are kettle-cooked in small batches under
                  controlled temperature — for a superior, thick and satisfying crunch.
                </p>
              </div>
            </div>
          )}

          {activeTab === "storage" && (
            <div className="max-w-2xl text-sm leading-relaxed text-charcoal-muted">
              <h3 className="mb-4 font-serif text-xl font-bold text-charcoal">Storage & shelf life</h3>
              <ul className="flex flex-col gap-2.5">
                <li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-green-600" /> Store in a cool, dry place away from direct sunlight.</li>
                <li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-green-600" /> Best enjoyed within 3 months of the manufacturing date on the pack.</li>
                <li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-green-600" /> Once opened, reseal the pouch or transfer to an airtight container to keep it crisp.</li>
                <li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-green-600" /> Nitrogen-flushed pouches lock in freshness until you open them.</li>
              </ul>
            </div>
          )}

          {activeTab === "shipping" && (
            <div className="flex max-w-2xl flex-col gap-3 text-sm leading-relaxed text-charcoal-muted">
              <p><strong className="text-charcoal">Standard shipping:</strong> Dispatched within 24 hours. Delivered across major Indian cities in 2–5 business days.</p>
              <p><strong className="text-charcoal">Freshness sealed:</strong> Every pouch is nitrogen-flushed to secure optimal crispiness and prevent breakage in transit.</p>
              <p><strong className="text-charcoal">Easy returns:</strong> Received damaged or stale packaging? Contact us within 7 days for a free replacement or full refund.</p>
            </div>
          )}
        </div>
      </div>

      {/* Frequently bought together */}
      <div className="mt-16">
        <FrequentlyBoughtTogether flavor={flavor} />
      </div>

      {/* Reviews */}
      <div className="mt-16 border-t border-[var(--color-border)] pt-12">
        <h3 className="mb-8 font-serif text-2xl font-bold text-charcoal">Customer reviews</h3>
        {flavorReviews.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2">
            {flavorReviews.map((rev) => (
              <div key={rev.id} className="rounded-3xl border border-[var(--color-border)] bg-white/60 p-6 shadow-sm backdrop-blur-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="grid size-10 place-items-center rounded-full text-sm font-bold text-white"
                      style={{ background: `linear-gradient(135deg, ${rev.avatarGradient.from}, ${rev.avatarGradient.to})` }}
                    >
                      {rev.initials}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-charcoal">{rev.name}</p>
                      <p className="text-[10px] text-charcoal-muted">{rev.location}</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-0.5 text-xs font-semibold text-gold-500">
                    {Array.from({ length: rev.rating }).map((_, idx) => (
                      <Star key={idx} className="size-3.5 fill-gold-400 text-gold-400" />
                    ))}
                  </span>
                </div>
                <p className="text-sm italic leading-relaxed text-charcoal-muted">&ldquo;{rev.quote}&rdquo;</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-[var(--color-border)] bg-cream-100/50 p-8 text-center">
            <p className="text-charcoal-muted">Be the first to review {flavor.name}! Order a pack today and tell us about your experience.</p>
          </div>
        )}
      </div>

      {/* Related products */}
      <div className="mt-16 border-t border-[var(--color-border)] pt-12">
        <RelatedProducts flavor={flavor} />
      </div>

      {/* End sentinel */}
      <div ref={endRef} aria-hidden className="h-px w-full" />

      {/* Mobile sticky Add-to-Cart bar */}
      <AnimatePresence>
        {showStickyBar && flavor.inStock !== false && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-border)] bg-cream/95 px-4 pt-3 pb-safe backdrop-blur-xl lg:hidden"
          >
            <div className="mx-auto flex max-w-2xl items-center gap-3">
              <div className="shrink-0">
                <p className="text-[11px] leading-none text-charcoal-muted">{pack.label} pack</p>
                <p className="font-serif text-lg font-bold leading-tight text-purple-700">{formatINR(pack.price * qty)}</p>
              </div>
              <div className="flex shrink-0 items-center rounded-full border border-[var(--color-border)] bg-white">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid size-10 place-items-center rounded-full text-charcoal-muted hover:text-purple-700" aria-label="Decrease quantity">
                  <Minus className="size-4" />
                </button>
                <span className="w-6 text-center text-sm font-bold tabular-nums">{qty}</span>
                <button onClick={() => setQty((q) => Math.min(99, q + 1))} className="grid size-10 place-items-center rounded-full text-charcoal-muted hover:text-purple-700" aria-label="Increase quantity">
                  <Plus className="size-4" />
                </button>
              </div>
              <Button onClick={handleAdd} variant={added ? "accent" : "primary"} size="lg" className="min-w-0 flex-1">
                {added ? <Check className="size-5" /> : <ShoppingBag className="size-5" />}
                <span className="truncate">{added ? "Added" : "Add to Cart"}</span>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
