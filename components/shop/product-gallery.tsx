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
  const galleryImages: string[] =
    (flavor as any).images && (flavor as any).images.length > 0
      ? (flavor as any).images
      : (flavor as any).gallery && (flavor as any).gallery.length > 0
      ? (flavor as any).gallery
      : flavor.image
      ? [flavor.image]
      : [];

  const hasRealImage = Boolean(flavor.image || galleryImages.length > 0);
  const showThumbnails = galleryImages.length > 1 || (!hasRealImage);
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

  const currentImage = galleryImages[active] || (flavor.image ? flavor.image : undefined);

  return (
    <div className="flex flex-col gap-4">
      {/* Main image */}
      <div
        className="relative aspect-square w-full cursor-zoom-in overflow-hidden rounded-3xl border border-[var(--color-border)] shadow-[var(--shadow-soft)] bg-[#FFF8EC]"
        style={{
          background: `radial-gradient(130% 130% at 50% 12%, ${flavor.gradient.from}22, transparent 65%)`,
        }}
        onMouseEnter={() => setZoom(true)}
        onMouseLeave={() => setZoom(false)}
        onMouseMove={onMove}
      >
        <div
          className="absolute inset-0 flex items-center justify-center transition-transform duration-200 ease-out"
          style={{
            transform: zoom ? "scale(1.8)" : "scale(1)",
            transformOrigin: `${pos.x}% ${pos.y}%`,
          }}
        >
          {currentImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentImage}
              alt={`${flavor.name} Yamora Wafers`}
              className="size-full object-cover select-none"
            />
          ) : (
            <WaferVisual flavor={flavor} seed={seeds[active]} className="h-full w-auto" />
          )}
        </div>

        <div className="absolute left-6 top-6 flex flex-col gap-2 z-10">
          {flavor.bestSeller && <Badge variant="gold" size="lg">★ Best Seller</Badge>}
          {flavor.badge && (
            <Badge variant={badgeVariant[flavor.badge] ?? "soft"} size="lg">{flavor.badge}</Badge>
          )}
        </div>

        <span className="pointer-events-none absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 text-xs font-medium text-charcoal-muted shadow-sm backdrop-blur z-10">
          <ZoomIn className="size-3.5" /> Hover to zoom
        </span>
      </div>

      {/* Thumbnails — ONLY shown if there are multiple gallery images or in generative SVG mode */}
      {showThumbnails && (
        <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar" role="tablist" aria-label="Product images">
          {galleryImages.length > 1 ? (
            galleryImages.map((imgUrl, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                role="tab"
                aria-selected={active === i}
                aria-label={`View image ${i + 1}`}
                className={cn(
                  "relative aspect-square w-20 shrink-0 overflow-hidden rounded-2xl border-2 transition-all sm:w-24 cursor-pointer",
                  active === i ? "border-purple-600 shadow-md ring-2 ring-purple-600/20" : "border-gray-200 opacity-70 hover:opacity-100"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imgUrl} alt="" className="size-full object-cover" />
              </button>
            ))
          ) : (
            seeds.map((seed, i) => (
              <button
                key={seed}
                onClick={() => setActive(i)}
                role="tab"
                aria-selected={active === i}
                aria-label={`View angle ${i + 1}`}
                className={cn(
                  "relative aspect-square w-20 shrink-0 overflow-hidden rounded-2xl border-2 transition-all sm:w-24 cursor-pointer",
                  active === i ? "border-purple-600 shadow-md ring-2 ring-purple-600/20" : "border-gray-200 opacity-70 hover:opacity-100"
                )}
                style={{
                  background: `radial-gradient(130% 130% at 50% 12%, ${flavor.gradient.from}22, transparent 65%)`,
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center p-2.5">
                  <WaferVisual flavor={flavor} seed={seed} className="h-full w-auto" />
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
