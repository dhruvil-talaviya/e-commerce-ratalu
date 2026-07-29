"use client";

import * as React from "react";
import { ProductCard } from "@/components/shop/product-card";
import type { Flavor } from "@/lib/types";

export function FlavorCard({ flavor, index = 0 }: { flavor: Flavor; index?: number }) {
  return <ProductCard flavor={flavor} index={index} view="grid" />;
}
