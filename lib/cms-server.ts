import "server-only";

/**
 * Fetches published Website Builder content on the server, so CMS copy is in
 * the initial HTML rather than appearing only after hydration.
 *
 * This matters for more than speed: content fetched in a `useEffect` is
 * invisible to crawlers, which would have quietly de-indexed every heading and
 * description the owner writes in the builder.
 */

const API_ORIGIN =
  process.env.BACKEND_ORIGIN ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, "") ||
  "http://localhost:5001";

export interface CmsPageData {
  page: string;
  sections: { key: string; type: string; sortOrder: number }[];
  content: Record<string, Record<string, unknown>>;
}

const EMPTY: CmsPageData = { page: "", sections: [], content: {} };

export async function getPageContent(page: string): Promise<CmsPageData> {
  try {
    const res = await fetch(`${API_ORIGIN}/api/v1/content/${page}`, {
      // Content changes rarely and is revalidated on publish; 60s keeps the
      // storefront fast without serving hours-old copy.
      next: { revalidate: 60 },
    });

    if (!res.ok) return EMPTY;

    const json = await res.json();
    return (json?.data as CmsPageData) ?? EMPTY;
  } catch {
    // The storefront must render even if the content API is down — the
    // components fall back to their built-in defaults.
    return EMPTY;
  }
}

export async function getStoreSettingsServer(): Promise<Record<string, any> | null> {
  try {
    const res = await fetch(`${API_ORIGIN}/api/v1/admin/settings`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    const data = (json?.data as Record<string, any>) ?? null;
    if (data) {
      const sanitize = (url: string) => {
        if (!url) return "";
        const trimmed = url.trim();
        if (trimmed.includes("res-console.cloudinary.com")) {
          try {
            const parts = trimmed.split("/");
            const cloudName = parts[3];
            const v1Index = parts.lastIndexOf("v1");
            if (v1Index !== -1 && parts[v1Index + 1]) {
              const publicId = Buffer.from(parts[v1Index + 1], "base64").toString("utf-8");
              if (publicId) return `https://res.cloudinary.com/${cloudName}/image/upload/${publicId}.png`;
            }
          } catch (e) {}
        }
        return trimmed;
      };
      if (data.storeFavicon) data.storeFavicon = sanitize(data.storeFavicon);
      if (data.storeLogo) data.storeLogo = sanitize(data.storeLogo);
    }
    return data;
  } catch {
    return null;
  }
}
