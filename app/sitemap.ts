import type { MetadataRoute } from "next";
import { getStoreSettingsServer } from "@/lib/settings-server";
import { SITE } from "@/lib/constants";

const POLICIES = ["shipping", "privacy", "terms", "refunds", "fssai"];
const API_ORIGIN = process.env.BACKEND_ORIGIN || "http://localhost:5001";

interface Flavor {
  slug: string;
  updatedAt?: string;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await getStoreSettingsServer();
  const baseUrl = settings?.seoTitle ? "https://rataluwafers.com" : SITE.url;

  let flavors: Flavor[] = [];
  try {
    const res = await fetch(`${API_ORIGIN}/api/v1/products`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const json = await res.json();
      flavors = json?.data ?? [];
    }
  } catch (err) {
    console.error("Sitemap flavor fetch failed:", err);
  }

  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/products`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/shop`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/best-sellers`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/categories`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/offers`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  const policyRoutes: MetadataRoute.Sitemap = POLICIES.map((slug) => ({
    url: `${baseUrl}/policies/${slug}`,
    lastModified: now,
    changeFrequency: "yearly",
    priority: 0.3,
  }));

  const flavorRoutes: MetadataRoute.Sitemap = flavors.map((f) => ({
    url: `${baseUrl}/shop/${f.slug}`,
    lastModified: f.updatedAt ? new Date(f.updatedAt) : now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...policyRoutes, ...flavorRoutes];
}
