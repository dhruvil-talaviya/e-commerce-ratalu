"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Heart, ShoppingCart, Star, Trophy, Flame, Zap } from "lucide-react";
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
import { getPack, DEFAULT_PACK_ID } from "@/lib/data/products";
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
          <Button asChild variant="outline" size="lg" className="hidden shrink-0 sm:inline-flex">
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
          <Button asChild variant="outline" size="lg" className="w-full">
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
  const { addItem } = useCart();
  const { toggle: toggleWishlist, has } = useWishlist();
  const { t } = useLanguage();
  const pack = getPack(DEFAULT_PACK_ID)!;
  const isWishlisted = has(flavor.id);
  // Real ratings from approved reviews — the per-slug 4.9/1842 values were invented.
  const rating = flavor.rating?.average ?? 0;
  const reviewCount = flavor.rating?.count ?? 0;
  const discount = pack.compareAt
    ? Math.round((1 - pack.price / pack.compareAt) * 100)
    : null;

  const handleAdd = () => {
    addItem(flavor, pack, 1);
    toast.success(`${flavor.name} added`, {
      description: `${pack.label} pack · ${formatINR(pack.price)}`,
    });
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
      className="group relative flex w-[82%] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-soft)] transition-all duration-300 hover:shadow-[var(--shadow-lift)] hover:-translate-y-1 xs:w-[70%] sm:w-auto"
    >
      {/* Rank ribbon */}
      <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-orange-500 px-3 py-1 text-[11px] font-bold text-white shadow-sm">
        <Trophy className="size-3" />
        {t("bestsellers_rank", { rank: String(rank) })}
      </div>

      {/* Wishlist button */}
      <button
        onClick={handleWishlist}
        aria-label={t("card_wishlist")}
        className={cn(
          "absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-full border bg-white/90 backdrop-blur transition-all duration-200 hover:scale-110",
          isWishlisted
            ? "border-red-200 text-red-500 bg-red-50"
            : "border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-500"
        )}
      >
        <Heart className={cn("size-4", isWishlisted && "fill-current")} />
      </button>

      {/* Product image area */}
      <Link
        href={`/shop/${flavor.slug}`}
        className="relative block aspect-[4/3] overflow-hidden"
        style={{
          background: `radial-gradient(130% 130% at 50% 12%, ${flavor.gradient.from}22, ${flavor.gradient.via}11 50%, transparent 80%)`,
          backgroundColor: "#fff8f0",
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center p-6 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105">
          <WaferVisual flavor={flavor} seed={rank} className="max-h-full" />
        </div>
      </Link>

      {/* Card body */}
      <div className="flex flex-1 flex-col p-5">
        {/* Flavor badge row */}
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <FlavorBadge flavor={flavor} t={t} />
          <HeatMeter level={flavor.heat} showLabel={false} className="shrink-0" />
        </div>

        {/* Product name */}
        <Link href={`/shop/${flavor.slug}`}>
          <h3 className="text-[1.05rem] font-semibold text-gray-800 transition-colors hover:text-orange-600 leading-snug">
            {flavor.name}
          </h3>
        </Link>

        {/* Tagline */}
        <p className="mt-0.5 text-xs text-gray-400 leading-snug">{flavor.tagline}</p>

        {/* Rating — shown only when this product actually has reviews. */}
        {reviewCount > 0 && (
          <div className="mt-2 flex items-center gap-1.5">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={cn(
                    "size-3",
                    i <= Math.round(rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "fill-gray-200 text-gray-200"
                  )}
                />
              ))}
            </div>
            <span className="text-xs font-medium text-gray-600">{rating.toFixed(1)}</span>
            <span className="text-xs text-gray-400">
              ({reviewCount.toLocaleString("en-IN")})
            </span>
          </div>
        )}

        {/* Weight + Price + CTA row */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-y-3 gap-x-2 border-t border-[var(--color-border)] pt-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
              {t("card_pack", { weight: pack.label })}
            </p>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mt-0.5">
              <p className="text-[1.25rem] font-bold text-gray-800 whitespace-nowrap">{formatINR(pack.price)}</p>
              {pack.compareAt && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-sm text-gray-400 line-through whitespace-nowrap">{formatINR(pack.compareAt)}</p>
                  {discount && (
                    <span className="rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-bold text-green-600 whitespace-nowrap">
                      {t("card_off", { pct: String(discount) })}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <Button onClick={handleAdd} size="md" className="shrink-0 gap-1.5 w-full xs:w-auto">
            <ShoppingCart className="size-4" />
            {t("card_add")}
          </Button>
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
