"use client";

import * as React from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, Search, LayoutGrid, Rows3, X, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProducts } from "@/components/shop/product-provider";
import { apiFetch } from "@/lib/api";
import { EmptyState } from "@/components/ui/empty-state";
import { ProductCard } from "./product-card";
import { ComboCard, type ShopCombo } from "./combo-card";

type SortKey = "popular" | "price-asc" | "heat";
type ViewMode = "grid" | "list";

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

const ITEMS_PER_PAGE = 6;

interface ShopCategory {
  id: string;
  name: string;
  slug: string;
  image?: string;
  productCount: number;
}

export function ShopGrid() {
  const { flavors: allFlavors } = useProducts();
  const [query, setQuery] = React.useState("");
  const [heat, setHeat] = React.useState<(typeof HEAT_FILTERS)[number]["key"]>("all");
  const [sort, setSort] = React.useState<SortKey>("popular");
  const [view, setView] = React.useState<ViewMode>("grid");
  const [page, setPage] = React.useState(1);
  const [category, setCategory] = React.useState("all");
  const [categories, setCategories] = React.useState<ShopCategory[]>([]);
  const [combos, setCombos] = React.useState<ShopCombo[]>([]);

  /** Live combos — the API already filters to Active + in-schedule bundles. */
  React.useEffect(() => {
    apiFetch<ShopCombo[]>("/combos")
      .then((list) => setCombos(Array.isArray(list) ? list : []))
      .catch(() => setCombos([]));
  }, []);

  /**
   * Categories come from the database, so the admin can add one and it appears
   * here without a deploy. Empty categories are filtered out — a chip that leads
   * to "no products" is worse than no chip.
   */
  React.useEffect(() => {
    apiFetch<ShopCategory[]>("/categories/list")
      .then((list) => setCategories(list.filter((c) => c.productCount > 0)))
      .catch(() => setCategories([]));
  }, []);

  const filters = `${query}|${heat}|${sort}|${category}`;
  const [prevFilters, setPrevFilters] = React.useState(filters);
  if (filters !== prevFilters) {
    setPrevFilters(filters);
    setPage(1);
  }

  const flavors = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...allFlavors];
    if (category !== "all") {
      list = list.filter((f) => f.category?.slug === category);
    }
    if (q) {
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.tagline.toLowerCase().includes(q) ||
          f.ingredients.some((i) => i.toLowerCase().includes(q))
      );
    }
    if (heat === "mild") list = list.filter((f) => f.heat <= 1);
    if (heat === "spicy") list = list.filter((f) => f.heat >= 2);
    if (sort === "heat") list.sort((a, b) => b.heat - a.heat);
    if (sort === "popular") list.sort((a, b) => Number(b.bestSeller) - Number(a.bestSeller));
    return list;
  }, [query, heat, sort, allFlavors]);

  /**
   * A combo spans several flavours at once, so a heat or category filter can't
   * be applied to it honestly — it's hidden while those are narrowed rather
   * than shown under a filter it doesn't actually match.
   */
  const visibleCombos = React.useMemo(() => {
    if (category !== "all" || heat !== "all") return [];
    const q = query.trim().toLowerCase();
    if (!q) return combos;
    return combos.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description ?? "").toLowerCase().includes(q) ||
        c.items.some((i) => i.flavorName.toLowerCase().includes(q))
    );
  }, [combos, category, heat, query]);

  const totalPages = Math.ceil(flavors.length / ITEMS_PER_PAGE);
  const paginated = React.useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return flavors.slice(start, start + ITEMS_PER_PAGE);
  }, [flavors, page]);

  // Bundles lead the first page; repeating them on every page would be noise.
  const combosOnThisPage = page === 1 ? visibleCombos : [];

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-[var(--color-border)] bg-white/60 p-4 backdrop-blur-sm">
        {/* Row 1: search + view toggle */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-charcoal-soft" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search flavours, ingredients…"
              aria-label="Search flavours"
              className="h-11 w-full rounded-full border border-[var(--color-border)] bg-white pl-11 pr-10 text-sm text-charcoal shadow-sm transition-all placeholder:text-charcoal-soft focus-visible:border-purple-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-200"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-charcoal-soft hover:bg-cream-100 hover:text-charcoal"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1 rounded-full border border-[var(--color-border)] bg-white p-1" role="group" aria-label="View mode">
            {([
              { key: "grid", icon: LayoutGrid, label: "Grid view" },
              { key: "list", icon: Rows3, label: "List view" },
            ] as const).map((v) => {
              const Icon = v.icon;
              return (
                <button
                  key={v.key}
                  onClick={() => setView(v.key)}
                  aria-label={v.label}
                  aria-pressed={view === v.key}
                  className={cn(
                    "grid size-9 place-items-center rounded-full transition-all",
                    view === v.key ? "bg-purple-500 text-cream shadow-sm" : "text-charcoal-muted hover:text-purple-700"
                  )}
                >
                  <Icon className="size-4" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Category Visual Slider */}
        {categories.length > 0 && (
          <div className="border-t border-[var(--color-border)] pt-5 pb-2">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-charcoal-soft">Explore Categories</h3>
            
            <div className="relative">
              {/* Slider Container */}
              <div 
                className="flex gap-4 overflow-x-auto pb-4 pt-1 scroll-smooth snap-x no-scrollbar"
              >
                {/* "All" Card */}
                <button
                  onClick={() => setCategory("all")}
                  className="flex flex-col items-center gap-2 shrink-0 snap-start select-none group/card focus:outline-none w-24 sm:w-28 cursor-pointer"
                >
                  <div
                    className={cn(
                      "size-16 sm:size-20 rounded-full flex items-center justify-center border-2 transition-all duration-300 shadow-sm",
                      category === "all"
                        ? "border-purple-600 bg-purple-50 shadow-purple-200 ring-4 ring-purple-100 scale-105"
                        : "border-gray-200 bg-white group-hover/card:border-purple-300 group-hover/card:scale-105"
                    )}
                  >
                    <div className="flex flex-col items-center justify-center">
                      <span className="font-extrabold text-[11px] text-purple-700 tracking-wide">ALL</span>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-xs font-bold text-center transition-colors truncate max-w-full",
                      category === "all" ? "text-purple-700 font-extrabold" : "text-gray-600 group-hover/card:text-purple-600"
                    )}
                  >
                    All Flavours
                  </span>
                </button>

                {/* Database Categories */}
                {categories.map((c) => {
                  const isSelected = category === c.slug;
                  return (
                    <button
                      key={c.slug}
                      onClick={() => setCategory(c.slug)}
                      className="flex flex-col items-center gap-2 shrink-0 snap-start select-none group/card focus:outline-none w-24 sm:w-28 cursor-pointer"
                    >
                      <div
                        className={cn(
                          "size-16 sm:size-20 rounded-full overflow-hidden border-2 transition-all duration-300 shadow-sm flex items-center justify-center bg-white",
                          isSelected
                            ? "border-purple-600 bg-purple-50 shadow-purple-200 ring-4 ring-purple-100 scale-105"
                            : "border-gray-200 bg-white group-hover/card:border-purple-300 group-hover/card:scale-105"
                        )}
                      >
                        {c.image ? (
                          <img 
                            src={c.image} 
                            alt={c.name} 
                            className="size-full object-cover transition-transform duration-500 group-hover/card:scale-110"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center p-2 bg-gradient-to-tr from-purple-50 to-orange-50 size-full">
                            <span className="text-xl font-bold text-purple-600 uppercase">
                              {c.name.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-center justify-center max-w-full min-w-0">
                        <span
                          className={cn(
                            "text-xs font-bold text-center transition-colors truncate max-w-full block",
                            isSelected ? "text-purple-700 font-extrabold" : "text-gray-600 group-hover/card:text-purple-600"
                          )}
                        >
                          {c.name}
                        </span>
                        <span className="text-[10px] font-semibold text-gray-400">
                          {c.productCount} {c.productCount === 1 ? "item" : "items"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Row 3: sort */}
        <div className="flex border-t border-[var(--color-border)] pt-3 justify-end">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-charcoal-muted">Sort</span>
            <div className="flex max-w-full gap-1 overflow-x-auto rounded-full bg-cream-100 p-1 no-scrollbar">
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSort(s.key)}
                  className={cn(
                    "whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-medium transition-all sm:px-4 sm:py-1.5 sm:text-sm",
                    sort === s.key ? "bg-purple-500 text-cream shadow-sm" : "text-charcoal-muted hover:text-purple-700"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Result count */}
      <p className="mb-5 text-sm text-charcoal-muted">
        Showing <span className="font-semibold text-charcoal">{flavors.length}</span>{" "}
        {flavors.length === 1 ? "flavour" : "flavours"}
        {visibleCombos.length > 0 && (
          <>
            {" "}and <span className="font-semibold text-charcoal">{visibleCombos.length}</span>{" "}
            {visibleCombos.length === 1 ? "combo" : "combos"}
          </>
        )}
        {query && (
          <> for “<span className="font-medium text-purple-700">{query}</span>”</>
        )}
      </p>

      {/* Grid / List */}
      {flavors.length > 0 || combosOnThisPage.length > 0 ? (
        <motion.div
          key={`${filters}-${view}-${page}`}
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
          className={cn(
            "grid gap-3 sm:gap-6",
            view === "grid" ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-3" : "grid-cols-1"
          )}
        >
          {combosOnThisPage.map((combo, i) => (
            <ComboCard key={combo._id} combo={combo} index={i} view={view} />
          ))}
          {paginated.map((flavor, i) => (
            <ProductCard
              key={flavor.id}
              flavor={flavor}
              index={combosOnThisPage.length + i}
              view={view}
            />
          ))}
        </motion.div>
      ) : (
        <EmptyState
          icon={SearchX}
          title="No flavours found"
          description="Try a different search term or clear your filters to see everything."
          className="my-6"
        />
      )}

      {/* Pagination */}
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
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex size-10 items-center justify-center rounded-xl text-sm font-semibold transition-all",
                  active ? "bg-purple-500 text-cream shadow-sm" : "border border-[var(--color-border)] bg-white text-charcoal hover:bg-purple-50 hover:text-purple-700"
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
