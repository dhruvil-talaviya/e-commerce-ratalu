import type { Metadata } from "next";
import { Truck, ShieldCheck, Leaf } from "lucide-react";
import { ShopGrid } from "@/components/shop/shop-grid";
import { ProductJsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "Shop All Flavours",
  description:
    "Shop all six flavours of Ratalu Chips in 100g, 200g, 500g and 1kg packs. Kettle-cooked purple yam chips with free shipping over ₹599.",
  alternates: { canonical: "/shop" },
};

const PROMISES = [
  { icon: Truck, text: "Free shipping over ₹599" },
  { icon: Leaf, text: "No artificial colours" },
  { icon: ShieldCheck, text: "Freshness guaranteed" },
];

export default function ShopPage() {
  return (
    <>
      <ProductJsonLd />

      {/* Header */}
      <section className="bg-radial-cream">
        <div className="container-px mx-auto max-w-7xl pb-10 pt-14 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-purple-600">
            <span className="size-1.5 rounded-full bg-orange-500" />
            The full collection
          </span>
          <h1 className="mx-auto mt-5 max-w-2xl font-serif text-4xl font-bold leading-tight text-charcoal sm:text-5xl lg:text-6xl">
            Shop <span className="text-gradient-warm">Ratalu Chips</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-charcoal-muted">
            Six bold flavours. Four pack sizes. One unforgettable crunch. Pick your favourites and
            build the perfect box.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {PROMISES.map((p) => {
              const Icon = p.icon;
              return (
                <span key={p.text} className="flex items-center gap-2 text-sm text-charcoal-muted">
                  <Icon className="size-4 text-orange-500" /> {p.text}
                </span>
              );
            })}
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="container-px mx-auto max-w-7xl py-12">
        <ShopGrid />
      </section>
    </>
  );
}
