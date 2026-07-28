"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Heart, ShoppingCart, Star, Trophy, Flame, Zap, Minus, Plus } from "lucide-react";
import { SectionHeading } from "@/components/common/section-heading";
import { Button } from "@/components/ui/button";
import { WaferVisual } from "@/components/common/wafer-visual";
import { HeatMeter } from "@/components/common/heat-meter";
import { useCart } from "@/components/cart/cart-provider";
import { useWishlist } from "@/components/cart/wishlist-provider";
import { toast } from "@/components/ui/toast";
import { useLanguage } from "@/components/common/language-provider";
import { useProducts } from "@/components/shop/product-provider";
import { ProductCardSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { getPack, getPacks, DEFAULT_PACK_ID } from "@/lib/data/products";
import { useSection } from "@/components/cms/cms-provider";
import type { HeadingContent } from "@/components/cms/types";
import { formatINR } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Flavor } from "@/lib/types";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Pick the top 3 sellers from the live catalogue. */
function pickFeatured(flavors: Flavor[]): Flavor[] {
  const preferred = ["original-salted", "classic-masala", "peri-peri"];
  const bySlug = preferred
    .map((s) => flavors.find((f) => f.slug === s))
    .filter((f): f is Flavor => Boolean(f));
  const sellers = flavors.filter((f) => f.bestSeller);
  // preferred → flagged bestsellers → anything else, de-duped, capped at 3
  const merged = [...bySlug, ...sellers, ...flavors];
  const seen = new Set<string>();
  return merged.filter((f) => !seen.has(f.id) && seen.add(f.id)).slice(0, 3);
}

export function BestSellers() {
  const { t } = useLanguage();
  // Live catalogue from the backend — no static data.
  const { flavors, hydrated } = useProducts();
  const featured = React.useMemo(() => pickFeatured(flavors), [flavors]);

  /**
   * Heading is editable in the Website Builder; the translated strings are the
   * fallback. Before this, the "Best Sellers" row in the builder wrote to a
   * section nothing read, so editing it did nothing.
   */
  const cmsContent = useSection<Record<string, any>>("best-sellers", {});
  const heading = React.useMemo(() => {
    const fallback = {
      eyebrow: t("bestsellers_eyebrow"),
      title: t("bestsellers_title_1"),
      titleHighlight: t("bestsellers_title_2"),
      description: t("bestsellers_description"),
    };
    const merged = { ...fallback, ...cmsContent };
    if (cmsContent.title && !cmsContent.titleHighlight) {
      merged.titleHighlight = "";
    }
    return merged;
  }, [cmsContent, t]);

  return (
    <section id="best-sellers" className="relative scroll-mt-24 py-16 sm:py-20 lg:py-24">
      <div className="container-px mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            align="left"
            eyebrow={heading.eyebrow}
            title={
              <>
                {heading.title}
                {heading.titleHighlight && (
                  <>
                    {" "}
                    <span className="text-gradient-warm">{heading.titleHighlight}</span>
                  </>
                )}
              </>
            }
            description={heading.description}
            className="max-w-xl"
          />
          <Button asChild variant="outline" size="lg" className="hidden shrink-0 sm:inline-flex border-[#4A1942] text-[#4A1942] hover:bg-[#4A1942] hover:text-white font-bold">
            <Link href="/best-sellers">
              {t("bestsellers_view_all")} <ArrowRight />
            </Link>
          </Button>
        </div>

        {/* Loading */}
        {!hydrated && (
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty */}
        {hydrated && featured.length === 0 && (
          <EmptyState
            className="mt-10"
            icon={Trophy}
            title="No best sellers yet"
            description="Once orders start rolling in, our top products will appear here."
            action={
              <Button asChild variant="outline">
                <Link href="/products">Browse all products</Link>
              </Button>
            }
          />
        )}

        {/* Mobile: snap slider · Desktop: grid */}
        {hydrated && featured.length > 0 && (
          <div className="mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 no-scrollbar sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0">
            {featured.map((flavor, i) => (
              <FeaturedCard key={flavor.id} flavor={flavor} rank={i + 1} />
            ))}
          </div>
        )}

        <div className="mt-6 sm:hidden">
          <Button asChild variant="outline" size="lg" className="w-full border-[#4A1942] text-[#4A1942]">
            <Link href="/best-sellers">
              {t("bestsellers_view_all_mob")} <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function FeaturedCard({ flavor, rank }: { flavor: Flavor; rank: number }) {
  const { items, addItem, updateQuantity, removeItem } = useCart();
  const { toggle: toggleWishlist, has } = useWishlist();
  const { t } = useLanguage();

  const [packId, setPackId] = React.useState<string>(DEFAULT_PACK_ID);
  const pack = getPack(packId) || getPack(DEFAULT_PACK_ID)!;

  const isWishlisted = has(flavor.id);
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

  // Real ratings from approved reviews
  const rating = flavor.rating?.average ?? 0;
  const reviewCount = flavor.rating?.count ?? 0;
  const discount = pack.compareAt
    ? Math.round((1 - pack.price / pack.compareAt) * 100)
    : null;

  const handleAdd = () => {
    if (isOutOfStock) return;
    addItem(flavor, pack, 1);
    toast.success(`${flavor.name} added`, {
      description: `${pack.label} pack · ${formatINR(pack.price)}`,
    });
  };

  const handleInc = () => {
    if (!cartItem) {
      addItem(flavor, pack, 1);
    } else {
      updateQuantity(cartItem.key, cartItem.quantity + 1);
    }
  };

  const handleDec = () => {
    if (!cartItem) return;
    if (cartItem.quantity <= 1) {
      removeItem(cartItem.key);
    } else {
      updateQuantity(cartItem.key, cartItem.quantity - 1);
    }
  };

  const handleWishlist = () => {
    toggleWishlist(flavor.id);
    if (!isWishlisted) toast.success("Liked product ❤️");
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, ease: EASE, delay: rank * 0.06 }}
      className="group relative flex w-[68%] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-[#E8DED4] bg-white shadow-xs transition-all duration-300 hover:shadow-md hover:-translate-y-1 xs:w-[60%] sm:w-auto"
    >
      {/* Rank ribbon */}
      <div className="absolute left-2.5 top-2.5 z-10 flex items-center gap-1 rounded-full bg-[#C75B12] px-2.5 py-0.5 text-[10px] sm:text-[11px] font-extrabold text-white shadow-sm">
        <Trophy className="size-2.5 sm:size-3 text-[#F5D76E]" />
        {t("bestsellers_rank", { rank: String(rank) })}
      </div>

      {/* Wishlist button */}
      <button
        onClick={handleWishlist}
        aria-label={t("card_wishlist")}
        className={cn(
          "absolute right-2.5 top-2.5 z-10 grid size-7.5 sm:size-9 place-items-center rounded-full border bg-white/90 backdrop-blur transition-all duration-200 hover:scale-110",
          isWishlisted
            ? "border-red-200 text-red-500 bg-red-50"
            : "border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-500"
        )}
      >
        <Heart className={cn("size-3.5 sm:size-4", isWishlisted && "fill-current text-red-500")} />
      </button>

      {/* Product image area */}
      <Link
        href={`/shop/${flavor.slug}`}
        className="relative block aspect-[4/3] overflow-hidden"
        style={{
          background: `radial-gradient(130% 130% at 50% 12%, ${flavor.gradient.from}22, ${flavor.gradient.via}11 50%, transparent 80%)`,
          backgroundColor: "#F5EDE3",
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-6 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105">
          <WaferVisual flavor={flavor} seed={rank} className="max-h-full" />
        </div>
      </Link>

      {/* Card body */}
      <div className="flex flex-1 flex-col justify-between p-3.5 sm:p-5">
        <div>
          {/* Flavor badge row */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <FlavorBadge flavor={flavor} t={t} />
            <HeatMeter level={flavor.heat} showLabel={false} className="shrink-0" />
          </div>

          {/* Product name */}
          <Link href={`/shop/${flavor.slug}`}>
            <h3 className="font-serif text-[1.1rem] font-bold text-[#4A1942] transition-colors hover:text-[#6B2D5B] leading-snug">
              {flavor.name}
            </h3>
          </Link>

          {/* Tagline */}
          <p className="mt-0.5 text-xs text-[#8A7B70] leading-snug">{flavor.tagline}</p>

          {/* Rating */}
          {reviewCount > 0 && (
            <div className="mt-2 flex items-center gap-1.5">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={cn(
                      "size-3",
                      i <= Math.round(rating)
                        ? "fill-[#E8B923] text-[#E8B923]"
                        : "fill-gray-200 text-gray-200"
                    )}
                  />
                ))}
              </div>
              <span className="text-xs font-bold text-[#4A1942]">{rating.toFixed(1)}</span>
              <span className="text-xs text-[#8A7B70]">
                ({reviewCount.toLocaleString("en-IN")})
              </span>
            </div>
          )}

          {/* Pack Size Selector Chips */}
          <div className="mt-3 flex items-center justify-between gap-1 border-t border-[#E8DED4]/80 pt-2.5">
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
                    "rounded-lg px-2 py-0.5 text-[10px] font-bold border transition-all shrink-0 cursor-pointer",
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

        {/* Weight + Price + Stepper CTA row */}
        <div className="mt-4 border-t border-[#E8DED4] pt-3">
          <div className="flex items-baseline justify-between gap-1">
            <div className="flex items-baseline gap-1.5">
              <span className="font-serif text-lg font-bold text-[#D4A017] whitespace-nowrap">{formatINR(pack.price)}</span>
              {pack.compareAt && (
                <span className="text-xs text-[#8A7B70] line-through whitespace-nowrap">{formatINR(pack.compareAt)}</span>
              )}
            </div>
            <span className="text-[10px] text-[#8A7B70] font-medium">{pack.label} pack</span>
          </div>

          {cartQty > 0 ? (
            <div className="mt-2.5 flex h-9.5 w-full items-center justify-between rounded-xl border border-[#4A1942] bg-[#E8C8E4]/40 px-2.5 font-bold text-[#4A1942] shadow-xs">
              <button
                type="button"
                onClick={handleDec}
                className="grid size-7 place-items-center rounded-lg bg-white text-[#4A1942] shadow-xs hover:bg-[#4A1942] hover:text-white transition-all active:scale-90 cursor-pointer"
                aria-label="Decrease quantity"
              >
                <Minus className="size-3.5" />
              </button>
              <span className="text-xs sm:text-sm font-extrabold text-[#4A1942] font-mono">{cartQty} in cart</span>
              <button
                type="button"
                onClick={handleInc}
                className="grid size-7 place-items-center rounded-lg bg-[#4A1942] text-white shadow-xs hover:bg-[#E8B923] hover:text-[#1A0F0A] transition-all active:scale-90 cursor-pointer"
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
                "mt-2.5 w-full h-9.5 text-xs font-bold rounded-xl active:scale-95 transition-all shadow-md cursor-pointer",
                isOutOfStock
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-[#D4A017] text-[#1A0F0A] hover:bg-[#E8B923]"
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

/** Colored flavor badge based on the flavor badge field */
function FlavorBadge({
  flavor,
  t,
}: {
  flavor: Flavor;
  t: ReturnType<typeof useLanguage>["t"];
}) {
  if (!flavor.badge && !flavor.bestSeller) return null;

  if (flavor.badge === "Hot")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-[10px] font-bold text-red-600 border border-red-100">
        <Flame className="size-3" /> {t("badge_hot")}
      </span>
    );
  if (flavor.badge === "New")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-[10px] font-bold text-green-600 border border-green-100">
        <Zap className="size-3" /> {t("badge_new")}
      </span>
    );
  if (flavor.badge === "Signature")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-0.5 text-[10px] font-bold text-orange-600 border border-orange-100">
        ✦ {t("badge_signature")}
      </span>
    );
  if (flavor.bestSeller)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2.5 py-0.5 text-[10px] font-bold text-yellow-700 border border-yellow-100">
        ⭐ {t("badge_bestseller")}
      </span>
    );

  return null;
}
