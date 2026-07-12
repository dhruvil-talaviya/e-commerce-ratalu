/** Static product metadata used by the PDP (nutrition, storage, delivery). */

export interface NutritionRow {
  label: string;
  value: string;
  /** % Daily Value, optional. */
  dv?: string;
}

/** Typical values per 100g (shared across flavours for this single product). */
export const NUTRITION: NutritionRow[] = [
  { label: "Energy", value: "512 kcal" },
  { label: "Total Fat", value: "27 g", dv: "35%" },
  { label: "  of which Saturates", value: "3.1 g", dv: "16%" },
  { label: "Carbohydrate", value: "60 g", dv: "22%" },
  { label: "  of which Sugars", value: "2.4 g" },
  { label: "Dietary Fibre", value: "6.8 g", dv: "24%" },
  { label: "Protein", value: "5.2 g" },
  { label: "Salt", value: "1.1 g", dv: "18%" },
];

export const NUTRITION_NOTE =
  "Typical values per 100g. Made in a facility that also handles dairy. Free from added preservatives, MSG and artificial colours.";

/**
 * Deterministic mock delivery estimate from a 6-digit pincode.
 * Metro prefixes ship faster; everything else 4–6 days. Backend-ready:
 * swap this for a courier serviceability API later.
 */
export function estimateDelivery(pincode: string): {
  ok: boolean;
  minDays: number;
  maxDays: number;
  zone: string;
} | null {
  const pin = pincode.replace(/\D/g, "");
  if (pin.length !== 6) return null;

  const metroPrefixes = ["11", "40", "56", "60", "70", "38", "39", "50"];
  const isMetro = metroPrefixes.some((p) => pin.startsWith(p));
  return {
    ok: true,
    minDays: isMetro ? 2 : 4,
    maxDays: isMetro ? 3 : 6,
    zone: isMetro ? "Metro express" : "Standard",
  };
}
