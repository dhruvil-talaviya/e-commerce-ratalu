import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { ShopGrid } from "@/components/shop/shop-grid";
import { ProductJsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "All Products",
  description:
    "Browse the full Ratalu Chips catalogue — every flavour in 100g, 200g, 500g and 1kg packs. Free shipping over ₹599.",
  alternates: { canonical: "/products" },
};

/**
 * Canonical product listing. Reuses <ShopGrid />, which already reads the
 * live catalogue from the backend (/api/v1/products) with search, filters,
 * sorting, grid/list view and pagination. `/shop` remains available for
 * backward compatibility.
 */
export default function ProductsPage() {
  return (
    <>
      <ProductJsonLd />
      <PageHeader
        eyebrow="The full collection"
        title={
          <>
            All <span className="text-gradient-warm">Products</span>
          </>
        }
        description="Every bold flavour, every pack size. Search, filter and build your perfect box."
        crumbs={[{ label: "Home", href: "/" }, { label: "Products" }]}
      />

      <section className="container-px mx-auto max-w-7xl py-10">
        <ShopGrid />
      </section>
    </>
  );
}
