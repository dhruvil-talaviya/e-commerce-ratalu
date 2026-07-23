"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Trophy } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { ProductCardSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ProductCard } from "@/components/shop/product-card";
import { useProducts } from "@/components/shop/product-provider";

/**
 * Best sellers listing — driven entirely by the live catalogue
 * (/api/v1/products). A product appears here when it is flagged as a
 * best seller in the admin catalogue, so the page updates the moment
 * an admin toggles the flag.
 */
export default function BestSellersPage() {
  const { flavors, hydrated } = useProducts();
  const bestSellers = flavors.filter((f) => f.bestSeller);

  return (
    <>
      <PageHeader
        eyebrow="Fan favourites"
        title={
          <>
            Best <span className="text-gradient-warm">Sellers</span>
          </>
        }
        description="The packs our customers reach for again and again — ranked by what actually sells."
        crumbs={[{ label: "Home", href: "/" }, { label: "Best Sellers" }]}
      />

      <section className="container-px mx-auto max-w-7xl py-10">
        {/* Loading */}
        {!hydrated && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty */}
        {hydrated && bestSellers.length === 0 && (
          <EmptyState
            icon={Trophy}
            title="No best sellers yet"
            description="No products are currently flagged as best sellers. Browse the full catalogue instead."
            action={
              <Button asChild>
                <Link href="/products">Browse all products</Link>
              </Button>
            }
          />
        )}

        {/* Live best sellers */}
        {hydrated && bestSellers.length > 0 && (
          <>
            <p className="mb-6 text-sm text-gray-500">
              Showing <span className="font-semibold text-gray-900">{bestSellers.length}</span>{" "}
              {bestSellers.length === 1 ? "best seller" : "best sellers"}
            </p>
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {bestSellers.map((flavor, i) => (
                <ProductCard key={flavor.id} flavor={flavor} index={i} />
              ))}
            </motion.div>
          </>
        )}
      </section>
    </>
  );
}
