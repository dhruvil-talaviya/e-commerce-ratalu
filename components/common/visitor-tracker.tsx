"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useAccount } from "@/components/account/account-provider";

const VISITOR_KEY = "ratalu.visitorId";

/** A stable, random per-browser id — not linked to any account. */
function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `v_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

/**
 * Records a page view for the admin Reach dashboard.
 *
 * Privacy-light: it sends a random browser id (made up client-side, stored in
 * localStorage), the path, and whether someone is signed in — no IP, no
 * fingerprint, no account link. Fire-and-forget: a failed beacon never affects
 * the page. Mounted once in the storefront layout; re-fires on route change.
 */
export function VisitorTracker() {
  const pathname = usePathname();
  const { isLoggedIn } = useAccount();

  React.useEffect(() => {
    // Don't count the admin console browsing itself.
    if (!pathname || pathname.startsWith("/admin")) return;

    const visitorId = getVisitorId();
    if (!visitorId) return;

    const body = JSON.stringify({
      visitorId,
      path: pathname,
      authed: isLoggedIn,
      referrer: document.referrer || "",
    });

    // sendBeacon survives navigation; fall back to fetch where it's missing.
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/v1/track", new Blob([body], { type: "application/json" }));
      } else {
        fetch("/api/v1/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      /* analytics must never throw into the page */
    }
  }, [pathname, isLoggedIn]);

  return null;
}
