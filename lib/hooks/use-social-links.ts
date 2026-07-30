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

import { SITE } from "@/lib/constants";

export function useSocialLinks() {
  const [links, setLinks] = React.useState<SocialLink[]>([]);

  React.useEffect(() => {
    let cancelled = false;

    apiFetch<SocialLink[]>("/admin/social-links/public")
      .then((data) => {
        if (cancelled) return;
        const valid = (data ?? []).filter((l) => l.enabled && l.url?.trim());
        if (valid.length > 0) {
          setLinks(valid);
        } else {
          // Provide clean fallback social channels from SITE.social
          setLinks([
            { _id: "ig", platform: "instagram", url: SITE.social.instagram, username: "yamorawafers", enabled: true, openInNewTab: true, sortOrder: 0 },
            { _id: "fb", platform: "facebook", url: SITE.social.facebook, username: "yamorawafers", enabled: true, openInNewTab: true, sortOrder: 1 },
            { _id: "x", platform: "x", url: SITE.social.twitter, username: "yamorawafers", enabled: true, openInNewTab: true, sortOrder: 2 },
            { _id: "yt", platform: "youtube", url: SITE.social.youtube, username: "yamorawafers", enabled: true, openInNewTab: true, sortOrder: 3 },
          ]);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLinks([
            { _id: "ig", platform: "instagram", url: SITE.social.instagram, username: "yamorawafers", enabled: true, openInNewTab: true, sortOrder: 0 },
            { _id: "fb", platform: "facebook", url: SITE.social.facebook, username: "yamorawafers", enabled: true, openInNewTab: true, sortOrder: 1 },
            { _id: "x", platform: "x", url: SITE.social.twitter, username: "yamorawafers", enabled: true, openInNewTab: true, sortOrder: 2 },
            { _id: "yt", platform: "youtube", url: SITE.social.youtube, username: "yamorawafers", enabled: true, openInNewTab: true, sortOrder: 3 },
          ]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return links;
}
