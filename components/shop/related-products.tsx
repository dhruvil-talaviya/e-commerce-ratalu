"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WaferVisual } from "@/components/common/wafer-visual";
import { HeatMeter } from "@/components/common/heat-meter";
import { useCart } from "@/components/cart/cart-provider";
import { toast } from "@/components/ui/toast";
import { FLAVORS } from "@/lib/data/flavors";
import { getPack, DEFAULT_PACK_ID } from "@/lib/data/products";
import { formatINR } from "@/lib/utils";
import type { Flavor } from "@/lib/types";

/** "You may also like" — other flavours as a responsive snap slider. */
export function RelatedProducts({ flavor }: { flavor: Flavor }) {
  const { addItem } = useCart();
  const pack = getPack(DEFAULT_PACK_ID)!;
  const related = FLAVORS.filter((f) => f.id !== flavor.id).slice(0, 4);

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <h3 className="font-serif text-2xl font-bold text-charcoal">You may also like</h3>
        <Button asChild variant="link" className="shrink-0">
          <Link href="/shop">All flavours <ArrowRight className="size-4" /></Link>
        </Button>
      </div>

      <div className="mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 no-scrollbar sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-4">
        {related.map((f, i) => {
          const add = () => {
            addItem(f, pack, 1);
            toast.success(`${f.name} added`, { description: `${pack.label} · ${formatINR(pack.price)}` });
          };
          return (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: i * 0.05 }}
              className="group flex w-[68%] shrink-0 snap-start flex-col overflow-hidden rounded-3xl border border-[var(--color-border)] bg-white/80 shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-lift)] xs:w-[58%] sm:w-auto"
            >
              <Link
                href={`/shop/${f.slug}`}
                className="relative block aspect-square overflow-hidden"
                style={{ background: `radial-gradient(130% 130% at 50% 12%, ${f.gradient.from}22, transparent 62%)` }}
              >
                <div className="absolute inset-0 flex items-center justify-center p-6 transition-transform duration-500 group-hover:scale-105">
                  <WaferVisual flavor={f} seed={i + 5} className="max-h-full" />
                </div>
              </Link>
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/shop/${f.slug}`} className="min-w-0">
                    <h4 className="truncate font-serif text-lg font-semibold text-charcoal hover:text-purple-700">{f.name}</h4>
                  </Link>
                  <HeatMeter level={f.heat} showLabel={false} className="mt-1 shrink-0" />
                </div>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <span className="font-serif text-lg font-bold text-purple-700">{formatINR(pack.price)}</span>
                  <Button onClick={add} size="sm"><Plus /> Add</Button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
