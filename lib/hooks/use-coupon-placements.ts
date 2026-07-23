"use client";

import * as React from "react";
import { apiFetch } from "@/lib/api";

/**
 * The coupon the admin has chosen to advertise in a given place.
 *
 * Placement is a property of the coupon, set on the Coupons page. It used to be
 * free text in Settings (`welcomeOfferCoupon`), which is how the login popup
 * ended up promoting "WELCOME10" — a code that had never been created. Reading
 * it from the coupon itself means the thing being advertised and the thing that
 * redeems are the same record.
 *
 * The endpoint is per-account: a customer who has already ordered is not shown a
 * first-order-only offer they would be refused at checkout.
 */
export interface PlacedCoupon {
  code: string;
  title: string;
  displayLabel: string;
  description: string;
  minSubtotal: number;
  firstOrderOnly: boolean;
}

interface Placements {
  loginPopup: PlacedCoupon | null;
  homepage: PlacedCoupon | null;
}

export function useCouponPlacements() {
  const [placements, setPlacements] = React.useState<Placements>({
    loginPopup: null,
    homepage: null,
  });

  React.useEffect(() => {
    let cancelled = false;

    apiFetch<Placements>("/coupons/placements")
      .then((data) => {
        if (!cancelled && data) setPlacements(data);
      })
      .catch(() => {
        // No offer is a perfectly good outcome — show nothing rather than a guess.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return placements;
}
