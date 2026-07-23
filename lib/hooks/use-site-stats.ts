"use client";

import * as React from "react";
import { apiFetch } from "@/lib/api";

/**
 * The facts the site is allowed to state about itself.
 *
 * Every number here is counted from the database. `avgRating` is null when
 * nothing has been reviewed yet — the caller must then say nothing, rather than
 * fall back to a flattering default. The hero used to advertise "4.9★" and
 * "Loved by 2,000+ snackers" with zero approved reviews and 14 customers.
 */
export interface SiteStats {
  avgRating: number | null;
  reviewCount: number;
  customerCount: number;
  flavourCount: number;
}

export function useSiteStats() {
  const [stats, setStats] = React.useState<SiteStats | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    apiFetch<SiteStats>("/stats")
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        // Say nothing rather than guess.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return stats;
}
