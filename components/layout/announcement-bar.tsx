"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { useSection, useSectionVisible } from "@/components/cms/cms-provider";
import { CmsIcon } from "@/components/cms/icon-registry";
import type { AnnouncementContent } from "@/components/cms/types";

/**
 * The scrolling strip at the top of every storefront page.
 *
 * Reads the "announcement" section from the Website Builder — its messages,
 * colours and on/off state. It used to read a completely different set of
 * fields on Settings and carry three hardcoded messages, so editing the
 * announcement in the builder changed nothing on the site.
 */
const FALLBACK: AnnouncementContent = {
  enabled: true,
  backgroundColor: "#f97316",
  textColor: "#ffffff",
  items: [
    { text: "No artificial colours · No palm oil · 100% vegetarian", icon: "Leaf" },
    { text: "Small-batch kettle-cooked, dispatched fresh daily", icon: "Truck" },
    { text: "Freshness guaranteed or your money back", icon: "ShieldCheck" },
  ],
};

export function AnnouncementBar() {
  const cms = useSection<AnnouncementContent>("announcement", FALLBACK);
  const sectionVisible = useSectionVisible("announcement");

  // Respect both the section's visibility toggle and its own enabled flag.
  if (!sectionVisible || cms.enabled === false) return null;

  const items = (cms.items ?? []).filter((m) => m.text?.trim());
  if (items.length === 0) return null;

  // Duplicate the track so the marquee loops seamlessly.
  const track = [...items, ...items];

  const bgColor = cms.backgroundColor || FALLBACK.backgroundColor;
  const textColor = cms.textColor || FALLBACK.textColor;

  return (
    <div
      className="relative overflow-hidden font-sans"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <div className="flex w-max animate-marquee items-center gap-0 whitespace-nowrap py-2">
        {track.map((m, i) => (
          <span
            key={i}
            className="flex items-center gap-2 px-6 text-[11px] font-semibold tracking-wide sm:gap-2.5 sm:px-8 sm:text-xs"
          >
            {m.icon ? (
              <CmsIcon name={m.icon} className="size-3.5 opacity-80" />
            ) : (
              <Sparkles className="size-3.5 opacity-80" />
            )}
            {m.text}
            <span className="ml-4 size-1 rounded-full bg-current opacity-40 sm:ml-6" />
          </span>
        ))}
      </div>
    </div>
  );
}
