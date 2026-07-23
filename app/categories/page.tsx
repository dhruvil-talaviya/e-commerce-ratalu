"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { LayoutGrid, ArrowRight, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { apiFetch } from "@/lib/api";

/** Matches the Category model returned by GET /api/v1/categories. */
interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  visibility?: boolean;
  status?: "Active" | "Inactive";
}

export default function CategoriesPage() {
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Category[]>("/categories");
      setCategories((data ?? []).filter((c) => c.status !== "Inactive" && c.visibility !== false));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load categories.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <PageHeader
        eyebrow="Browse by category"
        title={
          <>
            Shop <span className="text-gradient-warm">Categories</span>
          </>
        }
        description="Find exactly what you're craving — every category is managed live from our catalogue."
        crumbs={[{ label: "Home", href: "/" }, { label: "Categories" }]}
      />

      <section className="container-px mx-auto max-w-7xl py-10">
        {/* Loading */}
        {loading && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-44 w-full rounded-2xl" />
            ))}
          </div>
        )}

        {/* Error + retry */}
        {!loading && error && (
          <EmptyState
            icon={RefreshCw}
            title="Couldn't load categories"
            description={error}
            action={
              <Button onClick={load} variant="outline">
                <RefreshCw className="size-4" /> Try again
              </Button>
            }
          />
        )}

        {/* Empty */}
        {!loading && !error && categories.length === 0 && (
          <EmptyState
            icon={LayoutGrid}
            title="No categories yet"
            description="Categories added in the admin panel will appear here automatically."
            action={
              <Button asChild>
                <Link href="/products">Browse all products</Link>
              </Button>
            }
          />
        )}

        {/* Live categories */}
        {!loading && !error && categories.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c, i) => (
              <motion.div
                key={c._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: i * 0.05 }}
              >
                <Link
                  href={`/products?category=${encodeURIComponent(c.slug)}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-soft)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-orange-50">
                    {c.image ? (
                      <Image
                        src={c.image}
                        alt={c.name}
                        fill
                        sizes="(max-width: 640px) 100vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-orange-300">
                        <LayoutGrid className="size-10" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h2 className="text-lg font-bold text-gray-900 transition-colors group-hover:text-orange-600">
                      {c.name}
                    </h2>
                    {c.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-gray-500">{c.description}</p>
                    )}
                    <span className="mt-auto flex items-center gap-1.5 pt-4 text-sm font-semibold text-purple-600">
                      Shop now <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
