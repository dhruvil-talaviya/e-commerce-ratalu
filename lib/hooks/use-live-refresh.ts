"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

interface LiveRefreshOptions {
  enabled?: boolean;
  minIntervalMs?: number;
  refreshOnMount?: boolean;
}

/**
 * Refreshes shared client state when a route is opened again, the tab regains
 * focus, or Safari restores the page from bfcache.
 */
export function useLiveRefresh(
  refresh: () => void | Promise<void>,
  {
    enabled = true,
    minIntervalMs = 2000,
    refreshOnMount = false,
  }: LiveRefreshOptions = {}
) {
  const pathname = usePathname();
  const refreshRef = React.useRef(refresh);
  const lastRunRef = React.useRef(0);
  const mountedRef = React.useRef(false);

  React.useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  const run = React.useCallback(() => {
    if (!enabled) return;
    const now = Date.now();
    if (now - lastRunRef.current < minIntervalMs) return;
    lastRunRef.current = now;
    void refreshRef.current();
  }, [enabled, minIntervalMs]);

  React.useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      if (refreshOnMount) run();
      return;
    }
    run();
  }, [pathname, refreshOnMount, run]);

  React.useEffect(() => {
    if (!enabled) return;

    const onVisible = () => {
      if (document.visibilityState === "visible") run();
    };

    window.addEventListener("focus", run);
    window.addEventListener("pageshow", run);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("focus", run);
      window.removeEventListener("pageshow", run);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, run]);
}
