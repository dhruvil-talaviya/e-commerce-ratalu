"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Search, SearchX, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { ComboCard } from "@/components/shop/combo-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ShopCombo } from "@/lib/types";

type SortKey = "popular" | "price-asc" | "price-desc" | "savings" | "rating";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "popular", label: "Featured" },
  { key: "savings", label: "Max Savings" },
  { key: "price-asc", label: "Price: Low to High" },
  { key: "price-desc", label: "Price: High to Low" },
  { key: "rating", label: "Top Rated" },
];

export function CombosGridClient() {
  const [combos, setCombos] = React.useState<ShopCombo[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<SortKey>("popular");
  const [maxPrice, setMaxPrice] = React.useState<number>(1000);
  const [minSavings, setMinSavings] = React.useState<number>(0);

  React.useEffect(() => {
    let active = true;
    apiFetch<ShopCombo[]>("/combos")
      .then((res) => {
        if (active) setCombos(Array.isArray(res) ? res : []);
      })
      .catch(() => {
        if (active) setCombos([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredCombos = React.useMemo(() => {
    let list = [...combos];

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.subtitle ?? "").toLowerCase().includes(q) ||
          (c.description ?? "").toLowerCase().includes(q) ||
          c.items.some((i) => i.flavorName.toLowerCase().includes(q))
      );
    }

    if (maxPrice < 1000) {
      list = list.filter((c) => c.comboPrice <= maxPrice);
    }

    if (minSavings > 0) {
      list = list.filter((c) => c.savings >= minSavings);
    }

    if (sort === "price-asc") list.sort((a, b) => a.comboPrice - b.comboPrice);
    if (sort === "price-desc") list.sort((a, b) => b.comboPrice - a.comboPrice);
    if (sort === "savings") list.sort((a, b) => b.savings - a.savings);
    if (sort === "rating") list.sort((a, b) => (b.rating || 4.8) - (a.rating || 4.8));

    return list;
  }, [combos, query, maxPrice, minSavings, sort]);

  return (
    <div className="container-px mx-auto max-w-7xl py-8 sm:py-14">
      {/* Header */}
      <div className="mb-8 text-center max-w-2xl mx-auto">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3.5 py-1 text-xs font-extrabold text-purple-700 uppercase tracking-wider mb-3">
          <Sparkles className="size-3.5" /> Exclusive Combo Bundles
        </span>
        <h1 className="font-serif text-2xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
          Super Value Combo Deals
        </h1>
        <p className="mt-2 text-xs sm:text-base text-gray-500 font-medium">
          Pair your favorite flavors together & save up to 25% off regular prices.
        </p>
      </div>

      {/* Toolbar */}
      <div className="mb-8 flex flex-col gap-4 rounded-2xl sm:rounded-3xl border border-purple-200/80 bg-white/80 p-4 shadow-xs backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search combos by name, flavor..."
              aria-label="Search combos"
              className="h-10.5 w-full rounded-xl sm:rounded-full border border-gray-200 bg-white pl-10 pr-9 text-xs sm:text-sm text-gray-900 shadow-xs transition-all placeholder:text-gray-400 focus-visible:border-purple-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-100"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-900"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-between sm:justify-end">
            <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
              <SlidersHorizontal className="size-3.5 text-purple-600" /> Sort
            </span>
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSort(s.key)}
                  className={cn(
                    "whitespace-nowrap rounded-lg sm:rounded-full px-3 py-1.5 text-xs font-bold transition-all",
                    sort === s.key ? "bg-purple-600 text-white shadow-xs" : "bg-gray-100 text-gray-600 hover:bg-purple-50 hover:text-purple-700"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-64 sm:h-80 w-full rounded-2xl sm:rounded-3xl" />
          ))}
        </div>
      ) : filteredCombos.length > 0 ? (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6"
        >
          {filteredCombos.map((combo, i) => (
            <ComboCard key={combo._id} combo={combo} index={i} view="grid" />
          ))}
        </motion.div>
      ) : (
        <EmptyState
          icon={SearchX}
          title="No Combo Deals Found"
          description="Try modifying your search or filters to discover active combo offers."
          className="my-10"
        />
      )}
    </div>
  );
}
