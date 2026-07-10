import type { MetadataRoute } from "next";
import { SITE } from "@/lib/constants";

const POLICIES = ["shipping", "privacy", "terms", "refunds", "fssai"];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE.url, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE.url}/shop`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE.url}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  const policyRoutes: MetadataRoute.Sitemap = POLICIES.map((slug) => ({
    url: `${SITE.url}/policies/${slug}`,
    lastModified: now,
    changeFrequency: "yearly",
    priority: 0.3,
  }));

  return [...staticRoutes, ...policyRoutes];
}
