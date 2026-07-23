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

/**
 * The pack sizes a product actually sells, from the database.
 *
 * The storefront used to read the static PACK_SIZES above for every product,
 * which meant the admin could change a price and customers would keep seeing —
 * and paying — the hardcoded one. (They matched only by coincidence.) Always
 * prefer what the API returned.
 *
 * PACK_SIZES remains as a last-resort fallback so a product that somehow has no
 * packs still renders instead of crashing on `undefined`.
 */
export function getPacks(flavor: { packs?: PackSize[] }): PackSize[] {
  return flavor?.packs?.length ? flavor.packs : PACK_SIZES;
}

/** One pack by id, falling back to the first available size. */
export function getPackFor(flavor: { packs?: PackSize[] }, packId: string): PackSize {
  const packs = getPacks(flavor);
  return packs.find((p) => p.id === packId) ?? packs[0];
}
