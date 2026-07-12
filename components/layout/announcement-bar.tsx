"use client";

import * as React from "react";
import { Leaf, Sparkles, Truck, ShieldCheck } from "lucide-react";
import { useStoreSettings } from "@/components/common/settings-provider";
import { useLanguage } from "@/components/common/language-provider";

export function AnnouncementBar() {
  const { settings } = useStoreSettings();
  const { t } = useLanguage();

  if (!settings.announcementEnabled) return null;

  const messages = [
    { icon: Sparkles, text: t("announcement_default") },
    { icon: Leaf, text: "No artificial colours · No palm oil · 100% vegetarian" },
    { icon: Truck, text: "Small-batch kettle-cooked, dispatched fresh daily" },
    { icon: ShieldCheck, text: "Freshness guaranteed or your money back" },
  ];

  // Duplicate the track so the marquee loops seamlessly.
  const track = [...messages, ...messages];

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-orange-500 via-orange-400 to-yellow-400 text-white">
      <div className="flex w-max animate-marquee items-center gap-0 whitespace-nowrap py-2">
        {track.map((m, i) => {
          const Icon = m.icon;
          return (
            <span key={i} className="flex items-center gap-2.5 px-8 text-xs font-semibold tracking-wide">
              <Icon className="size-3.5 text-white/80" />
              {m.text}
              <span className="ml-6 size-1 rounded-full bg-white/40" />
            </span>
          );
        })}
      </div>
    </div>
  );
}
