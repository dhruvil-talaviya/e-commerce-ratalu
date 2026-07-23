import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComboDetailClient } from "@/components/combos/combo-detail-client";
import { apiFetch } from "@/lib/api";
import type { ShopCombo } from "@/lib/types";

async function fetchCombo(slug: string): Promise<ShopCombo | null> {
  try {
    const data = await apiFetch<ShopCombo>(`/combos/${slug}`);
    return data || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const combo = await fetchCombo(slug);
  if (!combo) {
    return { title: "Combo Deal Not Found | Ratalu Chips" };
  }
  return {
    title: `${combo.name} - Super Value Combo | Ratalu Chips`,
    description:
      combo.subtitle ||
      combo.description ||
      `Save ${combo.discountPercent}% on ${combo.name}. Handcrafted crunchy purple yam ratalu chips combo deal.`,
  };
}

export default async function ComboPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const combo = await fetchCombo(slug);

  if (!combo) {
    notFound();
  }

  return <ComboDetailClient combo={combo} />;
}
