"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, PackageSearch } from "lucide-react";
import { SectionHeading } from "@/components/common/section-heading";
import { Button } from "@/components/ui/button";
import { ProductCardSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useProducts } from "@/components/shop/product-provider";
import { FlavorCard } from "./flavor-card";

export function FlavorShowcase() {
  // Live catalogue from the backend (/api/v1/products) — no static data.
  const { flavors, hydrated } = useProducts();

  return (
    <section id="flavours" className="relative scroll-mt-24 bg-white/40 py-16 sm:py-20 lg:py-24">
      <div className="container-px mx-auto max-w-7xl">
        <SectionHeading
          eyebrow={`${flavors.length || "Six"} signature flavours`}
          title={
            <>
              Find your <span className="text-gradient-warm">favourite crunch</span>
            </>
          }
          description="From clean and classic to boldly fiery — every flavour is kettle-cooked in small batches and seasoned by hand."
        />

        {/* Loading */}
        {!hydrated && (
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty */}
        {hydrated && flavors.length === 0 && (
          <EmptyState
            className="mt-14"
            icon={PackageSearch}
            title="No flavours available"
            description="Our catalogue is being restocked. Please check back shortly."
            action={
              <Button asChild variant="outline">
                <Link href="/shop">Go to shop</Link>
              </Button>
            }
          />
        )}

        {/* Live catalogue */}
        {hydrated && flavors.length > 0 && (
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
            className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {flavors.map((flavor, i) => (
              <FlavorCard key={flavor.id} flavor={flavor} index={i} />
            ))}
          </motion.div>
        )}

        <div className="mt-12 flex justify-center">
          <Button asChild size="lg" variant="outline">
            <Link href="/products">
              View all products <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
