"use client";

import * as React from "react";
import { Plus, Check, ShoppingBag, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WaferVisual } from "@/components/common/wafer-visual";
import { useCart } from "@/components/cart/cart-provider";
import { useProducts } from "@/components/shop/product-provider";
import { toast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api";
import { formatINR, cn } from "@/lib/utils";
import type { Flavor } from "@/lib/types";

interface ComboItem {
  flavorId: string;
  flavorName: string;
  packId: string;
  packLabel: string;
  quantity: number;
}

interface Combo {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  items: ComboItem[];
  comboPrice: number;
  originalPrice: number;
  savings: number;
  discountPercent: number;
  badge?: string;
}

export function FrequentlyBoughtTogether({ flavor }: { flavor: Flavor }) {
  const { addItem } = useCart();
  const { getFlavorBySlug } = useProducts();
  const [combos, setCombos] = React.useState<Combo[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    apiFetch<Combo[]>("/combos")
      .then((res) => {
        if (!cancelled) setCombos(res ?? []);
      })
      .catch(() => {
        if (!cancelled) setCombos([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Filter combos that contain the current flavor slug or id
  const matchingCombos = React.useMemo(() => {
    if (!combos.length) return [];
    return combos.filter((c) =>
      c.items.some((item) => item.flavorId === flavor.id || item.flavorId === flavor.slug)
    );
  }, [combos, flavor.id, flavor.slug]);

  // Fallback: If no combo specifically contains this flavor, suggest general combos
  const displayCombos = matchingCombos.length > 0 ? matchingCombos : combos.slice(0, 3);

  const handleAddCombo = (combo: Combo) => {
    combo.items.forEach((item) => {
      // Resolve the flavor details
      const itemFlavor = getFlavorBySlug(item.flavorId) || getFlavorBySlug(item.flavorId.replace("flavor-", ""));
      if (itemFlavor) {
        const packSize = {
          id: item.packId,
          label: item.packLabel,
          grams: item.packId.includes("200") ? 200 : 400, // simple inference
          price: combo.originalPrice / combo.items.length // mock or proportional price
        };
        addItem(itemFlavor, packSize, item.quantity);
      }
    });

    toast.success(`Combo "${combo.name}" added to cart!`, {
      description: `Saved ${formatINR(combo.savings)} on this bundle.`
    });
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-[var(--color-border)] bg-white/60 p-8 text-center animate-pulse">
        <p className="text-charcoal-muted text-sm font-semibold">Loading custom combo offers...</p>
      </div>
    );
  }

  if (displayCombos.length === 0) {
    return null; // Don't show the section if no combos exist
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <span className="inline-flex max-w-fit items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
          <Gift className="size-3.5" /> Special Combos & Bundles
        </span>
        <h3 className="font-serif text-2xl font-bold text-charcoal sm:text-3xl mt-1">Super Saver Combo Offers</h3>
        <p className="text-sm text-charcoal-muted">Unlock bulk pricing and extra savings by choosing a pre-packaged bundle.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {displayCombos.map((combo) => (
          <div
            key={combo._id}
            className="flex flex-col justify-between rounded-3xl border border-[var(--color-border)] bg-white/70 p-6 shadow-sm hover:shadow-md transition-shadow duration-300"
          >
            <div>
              {/* Combo title and badge */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <h4 className="font-bold text-charcoal text-base leading-snug">{combo.name}</h4>
                {combo.badge && (
                  <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-green-700">
                    {combo.badge}
                  </span>
                )}
              </div>

              {combo.description && (
                <p className="text-xs text-charcoal-muted line-clamp-2 mb-4 leading-relaxed">
                  {combo.description}
                </p>
              )}

              {/* Items grid */}
              <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar">
                {combo.items.map((item, idx) => {
                  const itemFlavor = getFlavorBySlug(item.flavorId) || getFlavorBySlug(item.flavorId.replace("flavor-", ""));
                  return (
                    <React.Fragment key={idx}>
                      {idx > 0 && <span className="text-charcoal-soft font-bold text-xs shrink-0">+</span>}
                      <div className="flex flex-col items-center gap-1 w-20 shrink-0 text-center">
                        <div
                          className="size-12 rounded-xl p-1.5 border border-purple-50 bg-purple-50/20"
                          style={{
                            background: itemFlavor
                              ? `radial-gradient(120% 120% at 30% 20%, ${itemFlavor.gradient?.from}22, transparent)`
                              : undefined
                          }}
                        >
                          {itemFlavor ? (
                            <WaferVisual flavor={itemFlavor} seed={idx + 3} />
                          ) : (
                            <span className="grid size-full place-items-center bg-gray-100 rounded-lg text-gray-400 font-mono text-[9px] font-bold">
                              {item.quantity}x
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-semibold text-charcoal truncate w-full">
                          {item.flavorName}
                        </span>
                        <span className="text-[9px] text-charcoal-muted">
                          {item.quantity}x {item.packLabel}
                        </span>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-4 mt-auto">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-serif text-lg font-extrabold text-purple-700">
                    {formatINR(combo.comboPrice)}
                  </span>
                  <span className="text-xs text-charcoal-muted line-through">
                    {formatINR(combo.originalPrice)}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-green-600">
                  Save {formatINR(combo.savings)} ({combo.discountPercent}% off)
                </span>
              </div>

              <Button
                onClick={() => handleAddCombo(combo)}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs"
              >
                <ShoppingBag className="size-3.5 mr-1" /> Add Bundle
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
