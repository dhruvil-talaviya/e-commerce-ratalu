import type { PackSize, Product } from "@/lib/types";
import { FLAVORS } from "./flavors";

/**
 * Pack sizes are shared across flavours (single-product brand), so we
 * define them once and attach to every flavour to form the catalogue.
 */
export const PACK_SIZES: PackSize[] = [
  { id: "100g", label: "100g", grams: 100, price: 99, note: "Snack pack" },
  { id: "200g", label: "200g", grams: 200, price: 179, compareAt: 198, note: "Most loved" },
  { id: "500g", label: "500g", grams: 500, price: 399, compareAt: 495, note: "Family size" },
  { id: "1kg", label: "1kg", grams: 1000, price: 749, compareAt: 990, note: "Best value" },
];

export const PRODUCTS: Product[] = FLAVORS.map((flavor) => ({
  flavorId: flavor.id,
  packs: PACK_SIZES,
}));

export const DEFAULT_PACK_ID = "200g";

export function getPack(packId: string): PackSize | undefined {
  return PACK_SIZES.find((p) => p.id === packId);
}
