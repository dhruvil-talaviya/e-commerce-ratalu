import type { MetadataRoute } from "next";
import { getStoreSettingsServer } from "@/lib/settings-server";
import { SITE } from "@/lib/constants";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getStoreSettingsServer();
  const rulesText = settings?.robotsTxt || "";

  if (!rulesText) {
    return {
      rules: [
        {
          userAgent: "*",
          allow: "/",
          disallow: ["/account", "/checkout", "/api/"],
        },
      ],
      sitemap: `${SITE.url}/sitemap.xml`,
      host: SITE.url,
    };
  }

  const rulesList: Array<{ userAgent: string; allow?: string[]; disallow?: string[] }> = [];
  let currentAgent = "*";
  let allows: string[] = [];
  let disallows: string[] = [];
  let sitemapUrl = `${SITE.url}/sitemap.xml`;

  rulesText.split("\n").forEach((line: string) => {
    const clean = line.trim();
    if (!clean || clean.startsWith("#")) return;
    const parts = clean.split(":");
    if (parts.length < 2) return;
    const key = parts[0].trim().toLowerCase();
    const value = parts.slice(1).join(":").trim();

    if (key === "user-agent") {
      if (allows.length || disallows.length) {
        rulesList.push({ userAgent: currentAgent, allow: allows, disallow: disallows });
        allows = [];
        disallows = [];
      }
      currentAgent = value;
    } else if (key === "allow") {
      allows.push(value);
    } else if (key === "disallow") {
      disallows.push(value);
    } else if (key === "sitemap") {
      sitemapUrl = value;
    }
  });

  if (allows.length || disallows.length) {
    rulesList.push({ userAgent: currentAgent, allow: allows, disallow: disallows });
  }

  return {
    rules: rulesList.length > 0 ? rulesList : [{ userAgent: "*", allow: "/" }],
    sitemap: sitemapUrl,
  };
}
