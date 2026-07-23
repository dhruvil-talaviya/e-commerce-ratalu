"use client";

import * as React from "react";
import { apiFetch } from "@/lib/api";

/**
 * Serves published Website Builder content to the storefront.
 *
 * Fallback is deliberate and load-bearing: if the CMS has no document for a
 * section, or the API is unreachable, `useSection` returns the caller's default.
 * The storefront must never render an empty hero because a content fetch failed,
 * and a newly added section must render sensibly before anyone has edited it.
 */

type SectionContent = Record<string, unknown>;

export interface CmsPage {
  page: string;
  sections: { key: string; type: string; sortOrder: number }[];
  content: Record<string, SectionContent>;
}

interface CmsContextValue {
  content: Record<string, SectionContent>;
  order: string[];
  hydrated: boolean;
  /** True while showing unpublished drafts (admin preview). */
  preview: boolean;
}

const CmsContext = React.createContext<CmsContextValue>({
  content: {},
  order: [],
  hydrated: false,
  preview: false,
});

/** The admin section shape returned by GET /admin/content/:page. */
interface AdminSection {
  key: string;
  type: string;
  sortOrder: number;
  enabled: boolean;
  draft: SectionContent | null;
  published: SectionContent | null;
}

export function CmsProvider({
  page,
  initial,
  children,
}: {
  page: string;
  /**
   * Content fetched on the server. Passing it in means the CMS copy is already
   * in the initial HTML — crawlers see it, and there's no flash of fallback
   * text on load. Without it we'd fetch client-side and the content would be
   * invisible to search engines.
   */
  initial?: CmsPage;
  children: React.ReactNode;
}) {
  /**
   * The first render must be identical on the server and the client, so it is
   * ALWAYS seeded from `initial` (the published content) — never from anything
   * that reads `window`.
   *
   * `?preview=1` used to be read during render via `window.location.search`.
   * The server can't see that param, so it rendered the published content while
   * the client rendered the fallback — a hydration mismatch on every preview
   * URL. Preview is now detected AFTER mount, in the effect below, so the draft
   * is swapped in as a normal post-hydration update.
   */
  const [value, setValue] = React.useState<CmsContextValue>(() => ({
    content: initial?.content ?? {},
    order: (initial?.sections ?? []).map((s) => s.key),
    hydrated: Boolean(initial),
    preview: false,
  }));

  React.useEffect(() => {
    let alive = true;

    // Safe to read the URL here — this only runs on the client, after hydration.
    const isPreview =
      new URLSearchParams(window.location.search).get("preview") === "1";

    // ── Draft preview ────────────────────────────────────────────────────────
    if (isPreview) {
      apiFetch<AdminSection[]>(`/admin/content/${page}`)
        .then((sections) => {
          if (!alive) return;

          const enabled = (sections ?? []).filter((s) => s.enabled);
          const content: Record<string, SectionContent> = {};
          enabled.forEach((s) => {
            // Draft wins; fall back to what's live for untouched sections.
            const c = s.draft ?? s.published;
            if (c) content[s.key] = c;
          });

          setValue({
            content,
            order: enabled.map((s) => s.key),
            hydrated: true,
            preview: true,
          });
        })
        .catch(() => {
          // Not an admin, or the fetch failed — fall back to published content.
          if (alive) setValue((v) => ({ ...v, hydrated: true }));
        });

      return () => {
        alive = false;
      };
    }

    // ── Normal published content ─────────────────────────────────────────────
    // Already server-rendered — no need to fetch again on mount.
    if (initial) return;

    fetch(`/api/v1/content/${page}`)
      .then((r) => r.json())
      .then((json) => {
        if (!alive) return;
        const data: CmsPage | undefined = json?.data;
        setValue({
          content: data?.content ?? {},
          order: (data?.sections ?? []).map((s) => s.key),
          hydrated: true,
          preview: false,
        });
      })
      .catch(() => {
        // Fall through to defaults — never blank the page over a failed fetch.
        if (alive) setValue((v) => ({ ...v, hydrated: true }));
      });

    return () => {
      alive = false;
    };
  }, [page, initial]);

  React.useEffect(() => {
    if (value.hydrated) {
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      if (hash) {
        setTimeout(() => {
          const element = document.getElementById(hash.slice(1));
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            
            // Add a premium highlight glow
            element.classList.add("ring-8", "ring-purple-600/30", "transition-all", "duration-1000");
            setTimeout(() => {
              element.classList.remove("ring-8", "ring-purple-600/30");
            }, 2500);
          }
        }, 350);
      }
    }
  }, [value.hydrated, value.preview]);

  return <CmsContext.Provider value={value}>{children}</CmsContext.Provider>;
}

/** Are we currently rendering unpublished drafts? */
export function useCmsPreview(): boolean {
  return React.useContext(CmsContext).preview;
}

/**
 * Read one section's published content, merged over the component's defaults.
 *
 * The merge is shallow by design: a section's content is a flat bag of fields,
 * and a deep merge would make it impossible for the admin to *clear* a nested
 * value (an empty array would keep resurrecting the default).
 */
export function useSection<T extends SectionContent>(key: string, fallback: T): T {
  const { content, hydrated } = React.useContext(CmsContext);

  return React.useMemo(() => {
    if (!hydrated) return fallback;
    const published = content[key];
    if (!published) return fallback;
    return { ...fallback, ...published } as T;
  }, [content, key, fallback, hydrated]);
}

/** Is this section currently published and visible? */
export function useSectionVisible(key: string): boolean {
  const { content, order, hydrated } = React.useContext(CmsContext);
  // Before hydration, assume visible — otherwise every section flashes in.
  if (!hydrated) return true;
  return order.includes(key) && Boolean(content[key]);
}

export function useCmsOrder(): string[] {
  return React.useContext(CmsContext).order;
}
