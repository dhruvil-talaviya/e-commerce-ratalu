"use client";

import * as React from "react";
import { apiFetchEnvelope } from "@/lib/api";
import { useAccount } from "@/components/account/account-provider";

/** How often the header bell re-checks. */
const POLL_MS = 60_000;

/**
 * Unread notification count for the header bell.
 *
 * Reads `meta.unread`, which the server counts across the whole inbox — not by
 * counting the rows it returned. A page-local count would silently under-report
 * as soon as the list is truncated.
 */
export function useUnreadNotifications(): number {
  const { isLoggedIn } = useAccount();
  const [unread, setUnread] = React.useState(0);

  React.useEffect(() => {
    if (!isLoggedIn) {
      setUnread(0);
      return;
    }

    let alive = true;

    const load = async () => {
      try {
        // limit=1: we only want the count, not the payload.
        const env = await apiFetchEnvelope<unknown>("/notifications?limit=1");
        const meta = env.meta as { unread?: number } | undefined;
        if (alive) setUnread(meta?.unread ?? 0);
      } catch {
        /* the bell is not worth interrupting the page for */
      }
    };

    load();
    const timer = setInterval(load, POLL_MS);

    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [isLoggedIn]);

  return unread;
}
