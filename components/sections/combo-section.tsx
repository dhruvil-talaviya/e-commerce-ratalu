"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/common/section-heading";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ComboCard } from "@/components/shop/combo-card";
import { apiFetch } from "@/lib/api";
import type { ShopCombo } from "@/lib/types";

export function ComboSection() {
  const [combos, setCombos] = React.useState<ShopCombo[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    apiFetch<ShopCombo[]>("/combos/featured")
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

  if (!loading && combos.length === 0) {
    return null;
  }

  return (
    <section id="combos" className="relative scroll-mt-24 py-8 sm:py-16 lg:py-20 bg-gradient-to-b from-purple-50/40 via-white to-orange-50/30 border-y border-purple-100/60">
      <div className="container-px mx-auto max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-10">
          <SectionHeading
            align="left"
            className="mb-0 max-w-xl"
            eyebrow="⭐⭐ Combo Deals ⭐⭐"
            title={
              <>
                Super Value <span className="text-gradient-warm">Crunch Packs</span>
              </>
            }
            description="Bundle & save big on irresistible flavour pairings. Handcrafted for maximum crunch."
          />

          <Button asChild variant="outline" size="md" className="shrink-0 border-purple-300 text-purple-700 font-bold hover:bg-purple-50 hidden sm:inline-flex">
            <Link href="/combos">
              View All Combos <ArrowRight className="size-4 ml-1.5" />
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-64 sm:h-80 w-full rounded-2xl sm:rounded-3xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {combos.slice(0, 8).map((combo, i) => (
              <ComboCard key={combo._id} combo={combo} index={i} view="grid" />
            ))}
          </div>
        )}

        <div className="mt-8 flex justify-center sm:hidden">
          <Button asChild variant="outline" size="md" className="w-full border-purple-300 text-purple-700 font-bold hover:bg-purple-50">
            <Link href="/combos">
              View All Combos ({combos.length}) <ArrowRight className="size-4 ml-1.5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
