"use client";

import * as React from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProducts } from "@/components/shop/product-provider";
import { ProductCard } from "./product-card";

type SortKey = "popular" | "price-asc" | "heat";
const HEAT_FILTERS = [
  { key: "all", label: "All" },
  { key: "mild", label: "Mild" },
  { key: "spicy", label: "Spicy" },
] as const;

const SORTS: { key: SortKey; label: string }[] = [
  { key: "popular", label: "Most loved" },
  { key: "price-asc", label: "Price" },
  { key: "heat", label: "Spiciest" },
];

const ITEMS_PER_PAGE = 3;

export function ShopGrid() {
  const { flavors: allFlavors } = useProducts();
  const [heat, setHeat] = React.useState<(typeof HEAT_FILTERS)[number]["key"]>("all");
  const [sort, setSort] = React.useState<SortKey>("popular");
  const [page, setPage] = React.useState(1);

  const [prevHeat, setPrevHeat] = React.useState(heat);
  const [prevSort, setPrevSort] = React.useState(sort);

  if (heat !== prevHeat || sort !== prevSort) {
    setPrevHeat(heat);
    setPrevSort(sort);
    setPage(1);
  }

  const flavors = React.useMemo(() => {
    let list = [...allFlavors];
    if (heat === "mild") list = list.filter((f) => f.heat <= 1);
    if (heat === "spicy") list = list.filter((f) => f.heat >= 2);
    if (sort === "heat") list.sort((a, b) => b.heat - a.heat);
    if (sort === "popular") list.sort((a, b) => Number(b.bestSeller) - Number(a.bestSeller));
    return list;
  }, [heat, sort, allFlavors]);

  const totalPages = Math.ceil(flavors.length / ITEMS_PER_PAGE);
  
  const paginatedFlavors = React.useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return flavors.slice(start, start + ITEMS_PER_PAGE);
  }, [flavors, page]);

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-[var(--color-border)] bg-white/60 p-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-charcoal-muted">Heat</span>
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-full bg-cream-100 p-1 no-scrollbar">
            {HEAT_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setHeat(f.key)}
                className={cn(
                  "whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-medium transition-all sm:px-4 sm:py-1.5 sm:text-sm",
                  heat === f.key
                    ? "bg-purple-500 text-cream shadow-sm"
                    : "text-charcoal-muted hover:text-purple-700"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-charcoal-muted">Sort</span>
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-full bg-cream-100 p-1 no-scrollbar">
            {SORTS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSort(s.key)}
                className={cn(
                  "whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-medium transition-all sm:px-4 sm:py-1.5 sm:text-sm",
                  sort === s.key
                    ? "bg-purple-500 text-cream shadow-sm"
                    : "text-charcoal-muted hover:text-purple-700"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <motion.div
        key={`${heat}-${sort}-${page}`}
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {paginatedFlavors.map((flavor, i) => (
          <ProductCard key={flavor.id} flavor={flavor} index={i} />
        ))}
      </motion.div>

      {flavors.length === 0 && (
        <p className="py-16 text-center text-charcoal-muted">
          No flavours match that filter — try another.
        </p>
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="mt-12 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex size-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white text-charcoal transition-all hover:bg-purple-50 hover:text-purple-700 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-charcoal"
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </button>
          
          {Array.from({ length: totalPages }, (_, i) => {
            const num = i + 1;
            const active = page === num;
            return (
              <button
                key={num}
                onClick={() => setPage(num)}
                className={cn(
                  "flex size-10 items-center justify-center rounded-xl text-sm font-semibold transition-all",
                  active
                    ? "bg-purple-500 text-cream shadow-sm"
                    : "border border-[var(--color-border)] bg-white text-charcoal hover:bg-purple-50 hover:text-purple-700"
                )}
              >
                {num}
              </button>
            );
          })}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex size-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white text-charcoal transition-all hover:bg-purple-50 hover:text-purple-700 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-charcoal"
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}

