"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Minus, Check, Star, ArrowRight, Heart } from "lucide-react";
import { Modal, ModalContent, ModalTitle, ModalDescription } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HeatMeter } from "@/components/common/heat-meter";
import { WaferVisual } from "@/components/common/wafer-visual";
import { useCart } from "@/components/cart/cart-provider";
import { useWishlist } from "@/components/cart/wishlist-provider";
import { toast } from "@/components/ui/toast";
import { PACK_SIZES, DEFAULT_PACK_ID } from "@/lib/data/products";
import { formatINR, cn } from "@/lib/utils";
import type { Flavor } from "@/lib/types";

export function QuickView({
  flavor,
  open,
  onOpenChange,
}: {
  flavor: Flavor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { addItem } = useCart();
  const { has, toggle } = useWishlist();
  const [packId, setPackId] = React.useState(DEFAULT_PACK_ID);
  const [qty, setQty] = React.useState(1);

  const pack = PACK_SIZES.find((p) => p.id === packId)!;
  const wished = has(flavor.id);

  // Reset selection each time it opens.
  React.useEffect(() => {
    if (open) {
      setPackId(DEFAULT_PACK_ID);
      setQty(1);
    }
  }, [open, flavor.id]);

  const handleAdd = () => {
    addItem(flavor, pack, qty);
    toast.success(`${flavor.name} added`, { description: `${pack.label} · ${formatINR(pack.price * qty)}` });
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-2xl overflow-hidden p-0">
        <div className="grid max-h-[85vh] grid-cols-1 overflow-y-auto sm:max-h-none sm:grid-cols-2 sm:overflow-visible">
          {/* Visual */}
          <div
            className="relative flex aspect-square items-center justify-center p-8"
            style={{
              background: `radial-gradient(130% 130% at 50% 15%, ${flavor.gradient.from}22, transparent 62%)`,
            }}
          >
            <WaferVisual flavor={flavor} className="max-h-full" />
            {flavor.bestSeller && (
              <Badge variant="gold" size="sm" className="absolute left-4 top-4">
                ★ Best seller
              </Badge>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-gold-500">
              <Star className="size-4 fill-gold-400 text-gold-400" /> 4.9
              <span className="text-xs font-normal text-charcoal-soft">· Verified reviews</span>
            </div>
            <ModalTitle className="mt-2 font-serif text-2xl font-bold text-charcoal">
              {flavor.name}
            </ModalTitle>
            <p className="text-sm font-medium text-purple-700">{flavor.tagline}</p>
            <ModalDescription className="mt-3 line-clamp-3 text-sm leading-relaxed text-charcoal-muted">
              {flavor.description}
            </ModalDescription>

            <div className="mt-4">
              <HeatMeter level={flavor.heat} />
            </div>

            {/* Pack selector */}
            <div className="mt-5 grid grid-cols-4 gap-2">
              {PACK_SIZES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPackId(p.id)}
                  aria-pressed={p.id === packId}
                  className={cn(
                    "min-w-0 rounded-xl border px-1 py-2 text-center transition-all",
                    p.id === packId
                      ? "border-purple-500 bg-purple-50 text-purple-700 shadow-sm"
                      : "border-[var(--color-border)] bg-white text-charcoal-muted hover:border-purple-200"
                  )}
                >
                  <span className="block text-sm font-bold">{p.label}</span>
                  <span className="block text-[10px]">{formatINR(p.price)}</span>
                </button>
              ))}
            </div>

            <div className="mt-5 flex items-baseline gap-2">
              <span className="font-serif text-2xl font-bold text-purple-700">
                {formatINR(pack.price * qty)}
              </span>
              {pack.compareAt && (
                <span className="text-sm text-charcoal-soft line-through">
                  {formatINR(pack.compareAt * qty)}
                </span>
              )}
            </div>

            {/* Qty + add */}
            <div className="mt-4 flex items-center gap-3">
              <div className="flex shrink-0 items-center rounded-full border border-[var(--color-border)] bg-white">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid size-10 place-items-center rounded-full text-charcoal-muted hover:text-purple-700" aria-label="Decrease quantity">
                  <Minus className="size-4" />
                </button>
                <span className="w-7 text-center text-sm font-bold tabular-nums">{qty}</span>
                <button onClick={() => setQty((q) => Math.min(99, q + 1))} className="grid size-10 place-items-center rounded-full text-charcoal-muted hover:text-purple-700" aria-label="Increase quantity">
                  <Plus className="size-4" />
                </button>
              </div>
              <Button onClick={handleAdd} className="min-w-0 flex-1">
                <Check className="size-4" /> Add to cart
              </Button>
              <button
                onClick={() => toggle(flavor.id)}
                aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
                className="grid size-11 shrink-0 place-items-center rounded-full border border-[var(--color-border)] bg-white text-charcoal-muted transition-colors hover:text-red-500"
              >
                <Heart className={cn("size-5", wished && "fill-red-500 text-red-500")} />
              </button>
            </div>

            <Button asChild variant="link" className="mt-4 justify-start" onClick={() => onOpenChange(false)}>
              <Link href={`/shop/${flavor.slug}`}>
                View full details <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
