import type { Review } from "@/lib/types";

export const REVIEWS: Review[] = [
  {
    id: "r1",
    name: "Ananya Mehta",
    location: "Mumbai, MH",
    rating: 5,
    quote:
      "I genuinely didn't expect a yam wafer to become my whole family's obsession. The Original Salted is impossibly crisp and doesn't taste oily at all. We're on our fourth order.",
    flavor: "Original Salted",
    initials: "AM",
    avatarGradient: { from: "#7a3f9c", to: "#5b2c6f" },
  },
  {
    id: "r2",
    name: "Rohan Desai",
    location: "Ahmedabad, GJ",
    rating: 5,
    quote:
      "The Peri Peri is the real deal — proper slow-building heat, not just spice powder. Packaging arrived sealed and premium. Feels like a brand from abroad, made right here.",
    flavor: "Peri Peri",
    initials: "RD",
    avatarGradient: { from: "#e0452e", to: "#c9291a" },
  },
  {
    id: "r3",
    name: "Sneha Iyer",
    location: "Bengaluru, KA",
    rating: 5,
    quote:
      "Classic Masala took me straight back to my grandmother's kitchen. You can actually taste the roasted cumin. My kids finished a 500g pack in two days.",
    flavor: "Classic Masala",
    initials: "SI",
    avatarGradient: { from: "#ec8a35", to: "#c9691a" },
  },
  {
    id: "r4",
    name: "Kabir Malhotra",
    location: "New Delhi, DL",
    rating: 5,
    quote:
      "Ordered the Black Pepper on a whim and it's now my desk snack. Refined, aromatic, and it stays crunchy till the last piece. Delivery was quick too.",
    flavor: "Black Pepper",
    initials: "KM",
    avatarGradient: { from: "#4a4a52", to: "#2c2c2c" },
  },
  {
    id: "r5",
    name: "Priya Nair",
    location: "Kochi, KL",
    rating: 5,
    quote:
      "The Cheese flavour is dangerously good — rich but never heavy. I love that there are no weird artificial colours. Finally a snack I feel good about sharing.",
    flavor: "Cheese",
    initials: "PN",
    avatarGradient: { from: "#f4c542", to: "#c3941a" },
  },
  {
    id: "r6",
    name: "Aditya Rao",
    location: "Pune, MH",
    rating: 5,
    quote:
      "Green Chilli with a cup of chai is my new evening ritual. Fresh, punchy and made in small batches — you can tell. Ratalu has completely spoiled other wafers for me.",
    flavor: "Green Chilli",
    initials: "AR",
    avatarGradient: { from: "#4e9c5a", to: "#2f7d3d" },
  },
];

export const REVIEW_STATS = {
  averageRating: 4.9,
  totalReviews: 2847,
  wouldRecommend: 98,
};
