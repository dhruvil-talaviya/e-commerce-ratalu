import "server-only";

/**
 * The store's real, countable stats — fetched on the server so structured data
 * carries honest numbers.
 *
 * The JSON-LD used to hardcode `aggregateRating: 4.9` over `2847` reviews from a
 * mock file. That is fabricated review markup: it tells Google the store has
 * 2,847 ratings averaging 4.9 when it has none, which is both false advertising
 * to anyone who sees the rich result and a manual-action risk under Google's
 * review-snippet policy.
 */

const API_ORIGIN = process.env.BACKEND_ORIGIN || "https://e-commerce-ratalu-api.onrender.com";

export interface SiteStats {
  avgRating: number | null;
  reviewCount: number;
  customerCount: number;
  flavourCount: number;
}

const EMPTY: SiteStats = {
  avgRating: null,
  reviewCount: 0,
  customerCount: 0,
  flavourCount: 0,
};

export async function getSiteStats(): Promise<SiteStats> {
  try {
    const res = await fetch(`${API_ORIGIN}/api/v1/stats`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return EMPTY;

    const json = await res.json();
    return (json?.data as SiteStats) ?? EMPTY;
  } catch {
    return EMPTY;
  }
}
