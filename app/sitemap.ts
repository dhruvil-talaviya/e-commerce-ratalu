import type { MetadataRoute } from "next";
import { SITE } from "@/lib/constants";

const POLICIES = ["shipping", "privacy", "terms", "refunds", "fssai"];
const API_ORIGIN = process.env.BACKEND_ORIGIN || "https://e-commerce-ratalu-api.onrender.com";

interface ProductItem {
  slug: string;
  updatedAt?: string;
}

interface ComboItem {
  slug: string;
  updatedAt?: string;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://yamorawafers.com";

  let products: ProductItem[] = [];
  let combos: ComboItem[] = [];

  try {
    const res = await fetch(`${API_ORIGIN}/api/v1/products`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const json = await res.json();
      products = json?.data ?? [];
    }
  } catch (err) {
    console.error("Sitemap product fetch failed:", err);
  }

  try {
    const res = await fetch(`${API_ORIGIN}/api/v1/combos`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const json = await res.json();
      combos = json?.data ?? [];
    }
  } catch (err) {
    console.error("Sitemap combo fetch failed:", err);
  }

  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${baseUrl}/shop`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/products`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/combos`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/best-sellers`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/categories`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/offers`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${baseUrl}/our-story`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/why-us`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/reviews`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/track-order`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  const policyRoutes: MetadataRoute.Sitemap = POLICIES.map((slug) => ({
    url: `${baseUrl}/policies/${slug}`,
    lastModified: now,
    changeFrequency: "yearly",
    priority: 0.3,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${baseUrl}/shop/${p.slug}`,
    lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const comboRoutes: MetadataRoute.Sitemap = combos.map((c) => ({
    url: `${baseUrl}/combos/${c.slug}`,
    lastModified: c.updatedAt ? new Date(c.updatedAt) : now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...productRoutes, ...comboRoutes, ...policyRoutes];
}
