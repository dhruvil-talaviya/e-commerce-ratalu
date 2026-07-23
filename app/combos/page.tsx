import type { Metadata } from "next";
import { CombosGridClient } from "@/components/combos/combos-grid-client";

export const metadata: Metadata = {
  title: "Combo Deals & Super Saver Packs | Ratalu Chips",
  description:
    "Explore value combo bundles of purple yam ratalu chips. Bundle your favorite flavors & save up to 25% off regular prices.",
};

export default function CombosPage() {
  return <CombosGridClient />;
}
