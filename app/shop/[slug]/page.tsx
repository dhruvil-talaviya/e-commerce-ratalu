"use client";

import * as React from "react";
import { notFound, useParams } from "next/navigation";
import { useProducts } from "@/components/shop/product-provider";
import { ProductDetailClient } from "@/components/shop/product-detail-client";

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { getFlavorBySlug, hydrated } = useProducts();
  const flavor = getFlavorBySlug(slug);

  if (!flavor && hydrated) {
    notFound();
  }

  if (!flavor) {
    return null; // Return empty during loading hydration to avoid false notFound trigger
  }

  return <ProductDetailClient flavor={flavor} />;
}
