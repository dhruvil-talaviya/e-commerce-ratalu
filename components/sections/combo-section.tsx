"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { SectionHeading } from "@/components/common/section-heading";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ComboCard } from "@/components/shop/combo-card";
import { apiFetch } from "@/lib/api";
import type { ShopCombo } from "@/lib/types";
import { useSection } from "@/components/cms/cms-provider";

interface ComboContent extends Record<string, unknown> {
  enabled?: boolean;
  eyebrow?: string;
  title?: string;
  titleHighlight?: string;
  description?: string;
}

const FALLBACK_CONTENT: ComboContent = {
  enabled: true,
  eyebrow: "Combo Deals & Value Packs",
  title: "Super Value",
  titleHighlight: "Crunch Packs",
  description: "Bundle & save on irresistible flavour pairings. Handcrafted for maximum crunch.",
};

export function ComboSection() {
  const cmsContent = useSection<ComboContent>("combos", FALLBACK_CONTENT);
  const content = React.useMemo(() => ({ ...FALLBACK_CONTENT, ...cmsContent }), [cmsContent]);

  const [combos, setCombos] = React.useState<ShopCombo[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    apiFetch<ShopCombo[]>("/combos/featured")
      .then((res) => {
        if (active && Array.isArray(res) && res.length > 0) {
          setCombos(res);
        } else {
          return apiFetch<ShopCombo[]>("/combos").then((allRes) => {
            if (active) setCombos(Array.isArray(allRes) ? allRes : []);
          });
        }
      })
      .catch(() => {
        apiFetch<ShopCombo[]>("/combos")
          .then((allRes) => {
            if (active) setCombos(Array.isArray(allRes) ? allRes : []);
          })
          .catch(() => {
            if (active) setCombos([]);
          });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (content.enabled === false) return null;

  return (
    <section id="combos" className="relative scroll-mt-24 py-10 sm:py-16 lg:py-20 bg-[#FDF8F0] border-y border-[#E8DED4]">
      <div className="container-px mx-auto max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-10">
          <SectionHeading
            align="left"
            className="mb-0 max-w-xl"
            eyebrow={content.eyebrow}
            title={
              <>
                {content.title}{" "}
                {content.titleHighlight && (
                  <span className="text-[#4A1942] block sm:inline">{content.titleHighlight}</span>
                )}
              </>
            }
            description={content.description}
          />

          <Button asChild variant="outline" size="md" className="shrink-0 border-[#4A1942] text-[#4A1942] font-bold hover:bg-[#4A1942] hover:text-white transition-all hidden sm:inline-flex">
            <Link href="/combos">
              View All Combos <ArrowRight className="size-4 ml-1.5" />
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-64 sm:h-80 w-full rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 w-full">
            {combos.slice(0, 8).map((combo, i) => (
              <ComboCard key={combo._id} combo={combo} index={i} view="grid" />
            ))}
          </div>
        )}

        <div className="mt-8 flex justify-center sm:hidden">
          <Button asChild variant="outline" size="md" className="w-full border-[#4A1942] text-[#4A1942] font-bold hover:bg-[#4A1942]/5">
            <Link href="/combos">
              View All Combos ({combos.length}) <ArrowRight className="size-4 ml-1.5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
