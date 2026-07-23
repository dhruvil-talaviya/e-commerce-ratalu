import "server-only";

/**
 * Fetches published Website Builder content on the server, so CMS copy is in
 * the initial HTML rather than appearing only after hydration.
 *
 * This matters for more than speed: content fetched in a `useEffect` is
 * invisible to crawlers, which would have quietly de-indexed every heading and
 * description the owner writes in the builder.
 */

const API_ORIGIN = process.env.BACKEND_ORIGIN || "https://e-commerce-ratalu-api.onrender.com";

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
