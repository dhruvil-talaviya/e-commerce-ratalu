"use client";

import * as React from "react";
import { apiFetch } from "@/lib/api";

/**
 * The social channels the admin has switched on, in the order they set.
 *
 * The footer used to hardcode four icons from `lib/constants.ts` while the
 * console's "Social Media Channels" tab wrote to a SocialLink table that
 * nothing ever read — so editing a handle in the admin changed nothing on the
 * site. (The admin endpoint was also 404ing on a double `/admin/admin/` path,
 * so the tab couldn't even load.) This reads the table the console writes.
 */
export interface SocialLink {
  _id: string;
  platform: string;
  url: string;
  username: string;
  enabled: boolean;
  openInNewTab: boolean;
  sortOrder: number;
}

export function useSocialLinks() {
  const [links, setLinks] = React.useState<SocialLink[]>([]);

  React.useEffect(() => {
    let cancelled = false;

    apiFetch<SocialLink[]>("/admin/social-links/public")
      .then((data) => {
        if (cancelled) return;
        // A channel with no URL is not a channel — never render a dead icon.
        setLinks((data ?? []).filter((l) => l.enabled && l.url?.trim()));
      })
      .catch(() => {
        if (!cancelled) setLinks([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return links;
}
