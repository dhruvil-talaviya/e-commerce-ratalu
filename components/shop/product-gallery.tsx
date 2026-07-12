"use client";

import * as React from "react";
import { ZoomIn } from "lucide-react";
import { WaferVisual } from "@/components/common/wafer-visual";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Flavor } from "@/lib/types";

const badgeVariant: Record<string, "gold" | "orange" | "primary"> = {
  Signature: "primary",
  New: "gold",
  Hot: "orange",
};

/**
 * Product image gallery with a thumbnail slider and hover-zoom. Uses the
 * generative WaferVisual at different seeds as distinct "angles"; because
 * it's SVG, zooming stays perfectly crisp. Swap the inner visuals for
 * <CldImage /> when Cloudinary photography lands — the shell is identical.
 */
export function ProductGallery({ flavor }: { flavor: Flavor }) {
  const seeds = [4, 11, 21, 33];
  const [active, setActive] = React.useState(0);
  const [zoom, setZoom] = React.useState(false);
  const [pos, setPos] = React.useState({ x: 50, y: 50 });

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPos({
      x: ((e.clientX - r.left) / r.width) * 100,
      y: ((e.clientY - r.top) / r.height) * 100,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Main image */}
      <div
        className="relative aspect-square w-full cursor-zoom-in overflow-hidden rounded-3xl border border-[var(--color-border)] shadow-[var(--shadow-soft)]"
        style={{
          background: `radial-gradient(130% 130% at 50% 12%, ${flavor.gradient.from}22, transparent 65%)`,
        }}
        onMouseEnter={() => setZoom(true)}
        onMouseLeave={() => setZoom(false)}
        onMouseMove={onMove}
      >
        <div
          className="absolute inset-0 flex items-center justify-center p-10 transition-transform duration-200 ease-out"
          style={{
            transform: zoom ? "scale(2)" : "scale(1)",
            transformOrigin: `${pos.x}% ${pos.y}%`,
          }}
        >
          <WaferVisual flavor={flavor} seed={seeds[active]} className="h-full w-auto" />
        </div>

        <div className="absolute left-6 top-6 flex flex-col gap-2">
          {flavor.bestSeller && <Badge variant="gold" size="lg">★ Best Seller</Badge>}
          {flavor.badge && (
            <Badge variant={badgeVariant[flavor.badge] ?? "soft"} size="lg">{flavor.badge}</Badge>
          )}
        </div>

        <span className="pointer-events-none absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 text-xs font-medium text-charcoal-muted shadow-sm backdrop-blur">
          <ZoomIn className="size-3.5" /> Hover to zoom
        </span>
      </div>

      {/* Thumbnails */}
      <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar" role="tablist" aria-label="Product images">
        {seeds.map((seed, i) => (
          <button
            key={seed}
            onClick={() => setActive(i)}
            role="tab"
            aria-selected={active === i}
            aria-label={`View ${i + 1}`}
            className={cn(
              "relative aspect-square w-20 shrink-0 overflow-hidden rounded-2xl border-2 transition-all sm:w-24",
              active === i ? "border-purple-500 shadow-sm" : "border-[var(--color-border)] opacity-70 hover:opacity-100"
            )}
            style={{
              background: `radial-gradient(130% 130% at 50% 12%, ${flavor.gradient.from}22, transparent 65%)`,
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center p-2.5">
              <WaferVisual flavor={flavor} seed={seed} className="h-full w-auto" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
