/** Shared domain types for the storefront. */

export type HeatLevel = 0 | 1 | 2 | 3;

export interface Flavor {
  /* ── Product page content, from the CMS (was hardcoded in the components) ── */
  labels?: { text: string; tone?: string; enabled?: boolean; showOn?: string }[];
  trustBadges?: { icon?: string; title: string; description?: string; color?: string; enabled?: boolean }[];
  highlights?: { icon?: string; title: string; description?: string }[];
  nutrition?: {
    servingSize?: string;
    calories?: string;
    protein?: string;
    fat?: string;
    saturatedFat?: string;
    carbohydrates?: string;
    sugar?: string;
    fibre?: string;
    sodium?: string;
    note?: string;
  };
  productInfo?: {
    allergens?: string;
    storage?: string;
    shelfLife?: string;
    countryOfOrigin?: string;
    manufacturer?: string;
    packedBy?: string;
    netWeight?: string;
    fssai?: string;
  };
  delivery?: {
    title?: string;
    description?: string;
    estimate?: string;
    dispatch?: string;
    sameDay?: boolean;
    codAvailable?: boolean;
    returnSummary?: string;
  };
  /** Set from the admin console; drives storefront category filters. */
  category?: { id: string; name: string; slug: string } | null;
  categoryId?: string | null;
  /** Real rating, computed from approved reviews. `count: 0` = show nothing. */
  rating?: {
    average: number;
    count: number;
    distribution: Record<string, number>;
  };
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
  status?: "Active" | "Inactive";
  packs?: PackSize[];
  maxQtyPerCheckout?: number | null;
  image?: string | null;
  inStock?: boolean;
  taxOverrideEnabled?: boolean;
  taxRate?: number;
  hsnCode?: string;
  taxCategory?: string;
  taxInclusive?: boolean;
}

export interface PackSize {
  id: string;
  label: string; // e.g. "200g"
  grams: number;
  price: number; // INR
  compareAt?: number; // INR, for strikethrough
  /** Marketing hint shown on the pack selector. */
  note?: string;
  stock?: number;
  sku?: string;
}

export interface Product {
  flavorId: string;
  packs: PackSize[];
}

export interface Review {
  /** MongoDB _id or frontend-assigned id */
  _id?: string;
  id?: string;
  name: string;
  location: string;
  rating: 1 | 2 | 3 | 4 | 5;
  quote: string;
  flavor: string;
  initials: string;
  avatarGradient: { from: string; to: string };
  active?: boolean;
  createdAt?: string;
}

export interface FaqItem {
  /** MongoDB _id or static frontend id */
  _id?: string;
  id?: string;
  category: string; // Flexible — admin can create any category
  question: string;
  answer: string;
  sortOrder?: number;
  active?: boolean;
}

export interface Banner {
  _id: string;
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl: string;
  mobileImageUrl?: string;
  ctaText?: string;
  ctaLink?: string;
  type: "hero" | "slider" | "offer" | "category" | "promotional";
  position: string;
  sortOrder: number;
  active: boolean;
  textColor?: string;
  overlayColor?: string;
  textAlign?: "left" | "center" | "right";
  startDate?: string;
  endDate?: string;
}

export interface HomepageSection {
  _id: string;
  sectionName: string;
  enabled: boolean;
  sortOrder: number;
  title?: string;
  subtitle?: string;
  description?: string;
  eyebrow?: string;
  content?: Record<string, unknown>;
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
  isCombo?: boolean;
  comboId?: string;
  comboName?: string;
}

export interface ShopComboItem {
  flavorId: string;
  flavorName: string;
  packId: string;
  packLabel: string;
  quantity: number;
  flavor?: Flavor;
}

export interface ShopCombo {
  _id: string;
  name: string;
  slug: string;
  subtitle?: string;
  description?: string;
  image?: string;
  images?: string[];
  badge?: string;
  comboPrice: number;
  originalPrice: number;
  savings: number;
  discountPercent: number;
  rating?: number;
  reviewCount?: number;
  status?: "Active" | "Inactive";
  featured?: boolean;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string;
  };
  items: ShopComboItem[];
}
