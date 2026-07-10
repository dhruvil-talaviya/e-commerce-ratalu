/** Shared domain types for the storefront. */

export type HeatLevel = 0 | 1 | 2 | 3;

export interface Flavor {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  heat: HeatLevel;
  ingredients: string[];
  /** On-brand gradient tokens used for the art-directed product visual. */
  gradient: { from: string; via: string; to: string };
  /** Accent used for chips/badges tied to this flavour. */
  accent: string;
  badge?: string;
  bestSeller?: boolean;
}

export interface PackSize {
  id: string;
  label: string; // e.g. "200g"
  grams: number;
  price: number; // INR
  compareAt?: number; // INR, for strikethrough
  /** Marketing hint shown on the pack selector. */
  note?: string;
}

export interface Product {
  flavorId: string;
  packs: PackSize[];
}

export interface Review {
  id: string;
  name: string;
  location: string;
  rating: 1 | 2 | 3 | 4 | 5;
  quote: string;
  flavor: string;
  initials: string;
  avatarGradient: { from: string; to: string };
}

export interface FaqItem {
  id: string;
  category: "Shipping" | "Shelf Life" | "Ingredients" | "Storage" | "Returns";
  question: string;
  answer: string;
}

/** A single line in the cart: a flavour + pack size + quantity. */
export interface CartItem {
  key: string; // `${flavorId}:${packId}`
  flavorId: string;
  flavorName: string;
  packId: string;
  packLabel: string;
  grams: number;
  unitPrice: number;
  quantity: number;
  gradient: { from: string; via: string; to: string };
}
