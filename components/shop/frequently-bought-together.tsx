"use client";

import * as React from "react";
import { Plus, Check, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WaferVisual } from "@/components/common/wafer-visual";
import { useCart } from "@/components/cart/cart-provider";
import { toast } from "@/components/ui/toast";
import { FLAVORS } from "@/lib/data/flavors";
import { getPack, DEFAULT_PACK_ID } from "@/lib/data/products";
import { formatINR, cn } from "@/lib/utils";
import type { Flavor } from "@/lib/types";

/** "Frequently bought together" bundle with per-item toggles + combined price. */
export function FrequentlyBoughtTogether({ flavor }: { flavor: Flavor }) {
  const { addItem } = useCart();
  const pack = getPack(DEFAULT_PACK_ID)!;

  // The current flavour + two complementary flavours.
  const companions = FLAVORS.filter((f) => f.id !== flavor.id).slice(0, 2);
  const bundle = [flavor, ...companions];

  const [selected, setSelected] = React.useState<Record<string, boolean>>(
    Object.fromEntries(bundle.map((f) => [f.id, true]))
  );

  const chosen = bundle.filter((f) => selected[f.id]);
  const total = chosen.length * pack.price;

  const addAll = () => {
    chosen.forEach((f) => addItem(f, pack, 1));
    toast.success(`${chosen.length} packs added`, { description: `Bundle total ${formatINR(total)}` });
  };

  return (
    <div className="rounded-3xl border border-[var(--color-border)] bg-white/60 p-6 sm:p-8">
      <h3 className="font-serif text-xl font-bold text-charcoal sm:text-2xl">Frequently bought together</h3>
      <p className="mt-1 text-sm text-charcoal-muted">Build the perfect snack box and save on shipping.</p>

      <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-center">
        {/* Item chips with + connectors */}
        <div className="flex flex-1 items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {bundle.map((f, i) => (
            <React.Fragment key={f.id}>
              {i > 0 && <Plus className="size-5 shrink-0 text-charcoal-soft" />}
              <button
                onClick={() => setSelected((s) => ({ ...s, [f.id]: !s[f.id] }))}
                aria-pressed={selected[f.id]}
                className={cn(
                  "group relative flex w-28 shrink-0 flex-col items-center gap-2 rounded-2xl border-2 p-3 text-center transition-all",
                  selected[f.id] ? "border-purple-500 bg-purple-50/50" : "border-[var(--color-border)] bg-white opacity-60 hover:opacity-100"
                )}
              >
                <span
                  className={cn(
                    "absolute right-2 top-2 grid size-5 place-items-center rounded-full border transition-colors",
                    selected[f.id] ? "border-purple-500 bg-purple-500 text-cream" : "border-charcoal-soft/40 bg-white"
                  )}
                >
                  {selected[f.id] && <Check className="size-3.5" />}
                </span>
                <div
                  className="size-14 rounded-xl p-1.5"
                  style={{ background: `radial-gradient(120% 120% at 30% 20%, ${f.gradient.from}22, transparent)` }}
                >
                  <WaferVisual flavor={f} seed={i + 7} />
                </div>
                <span className="line-clamp-1 text-xs font-semibold text-charcoal">{f.name}</span>
                <span className="text-xs text-purple-700">{formatINR(pack.price)}</span>
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Total + CTA */}
        <div className="flex shrink-0 flex-col gap-3 border-t border-[var(--color-border)] pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div>
            <p className="text-xs uppercase tracking-wide text-charcoal-soft">
              {chosen.length} {chosen.length === 1 ? "item" : "items"} ({pack.label} each)
            </p>
            <p className="font-serif text-2xl font-bold text-purple-700">{formatINR(total)}</p>
          </div>
          <Button onClick={addAll} disabled={chosen.length === 0} size="lg">
            <ShoppingBag /> Add {chosen.length} to cart
          </Button>
        </div>
      </div>
    </div>
  );
}
