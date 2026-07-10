import type { Flavor } from "@/lib/types";

/**
 * The six signature flavours of Ratalu Wafers. Each carries its own
 * art-directed gradient (used for the product visual in lieu of
 * photography until Cloudinary assets are wired) and a distinct accent.
 */
export const FLAVORS: Flavor[] = [
  {
    id: "original-salted",
    slug: "original-salted",
    name: "Original Salted",
    tagline: "The one that started it all",
    description:
      "Fresh purple yam, thin-sliced and kettle-cooked in premium oil, finished with a whisper of Himalayan pink salt. Clean, honest crunch that lets the natural nuttiness of the ratalu shine.",
    heat: 0,
    ingredients: ["Fresh Ratalu (purple yam)", "Cold-pressed sunflower oil", "Himalayan pink salt"],
    gradient: { from: "#7a3f9c", via: "#5b2c6f", to: "#3d1d4c" },
    accent: "#f4c542",
    badge: "Signature",
    bestSeller: true,
  },
  {
    id: "classic-masala",
    slug: "classic-masala",
    name: "Classic Masala",
    tagline: "Nostalgia in every bite",
    description:
      "A heritage blend of roasted cumin, coriander, amchur and a hint of black salt. Warm, tangy and deeply aromatic — the flavour that tastes like home.",
    heat: 1,
    ingredients: ["Fresh Ratalu", "Sunflower oil", "Roasted cumin & coriander", "Amchur", "Black salt"],
    gradient: { from: "#ec8a35", via: "#c9691a", to: "#7a3f10" },
    accent: "#f4c542",
    bestSeller: true,
  },
  {
    id: "peri-peri",
    slug: "peri-peri",
    name: "Peri Peri",
    tagline: "Bold, fiery, unforgettable",
    description:
      "African bird's-eye chilli meets zesty lemon and roasted garlic. A confident, smoky heat that builds slowly and keeps you reaching for more.",
    heat: 3,
    ingredients: ["Fresh Ratalu", "Sunflower oil", "Peri peri chilli", "Roasted garlic", "Lemon", "Sea salt"],
    gradient: { from: "#e0452e", via: "#c9291a", to: "#7a1210" },
    accent: "#f4c542",
    badge: "Hot",
  },
  {
    id: "black-pepper",
    slug: "black-pepper",
    name: "Black Pepper",
    tagline: "Refined & aromatic",
    description:
      "Coarsely cracked Malabar black pepper over sea salt. Sharp, fragrant and grown-up — the wafer for those who like a little edge.",
    heat: 2,
    ingredients: ["Fresh Ratalu", "Sunflower oil", "Malabar black pepper", "Sea salt"],
    gradient: { from: "#4a4a52", via: "#2c2c2c", to: "#141416" },
    accent: "#f4c542",
  },
  {
    id: "cheese",
    slug: "cheese",
    name: "Cheese",
    tagline: "Creamy, savoury, moreish",
    description:
      "Aged cheddar and a touch of cultured cream dusted over each crisp. Rich and indulgent without ever being heavy — an instant crowd favourite.",
    heat: 0,
    ingredients: ["Fresh Ratalu", "Sunflower oil", "Aged cheddar", "Cultured cream", "Sea salt"],
    gradient: { from: "#f7d660", via: "#f4c542", to: "#c3941a" },
    accent: "#e67e22",
    badge: "New",
  },
  {
    id: "green-chilli",
    slug: "green-chilli",
    name: "Green Chilli",
    tagline: "Fresh heat with a kick",
    description:
      "Bright, grassy green chilli lifted with lime and a pinch of chaat masala. Vibrant, punchy and impossible to put down.",
    heat: 2,
    ingredients: ["Fresh Ratalu", "Sunflower oil", "Green chilli", "Lime", "Chaat masala", "Sea salt"],
    gradient: { from: "#4e9c5a", via: "#2f7d3d", to: "#134a1f" },
    accent: "#f4c542",
  },
];

export const HEAT_LABELS = ["Mild", "Gentle", "Medium", "Fiery"] as const;

export function getFlavor(id: string): Flavor | undefined {
  return FLAVORS.find((f) => f.id === id);
}
