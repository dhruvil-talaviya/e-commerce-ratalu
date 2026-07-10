"use client";

import * as React from "react";
import { Leaf, Sparkles, Truck, ShieldCheck } from "lucide-react";
import { useStoreSettings } from "@/components/common/settings-provider";

export function AnnouncementBar() {
  const { settings } = useStoreSettings();

  if (!settings.announcementEnabled) return null;

  const messages = [
    { icon: Sparkles, text: settings.announcementText },
    { icon: Leaf, text: "No artificial colours · No palm oil · 100% vegetarian" },
    { icon: Truck, text: "Small-batch kettle-cooked, dispatched fresh daily" },
    { icon: ShieldCheck, text: "Freshness guaranteed or your money back" },
  ];

  // Duplicate the track so the marquee loops seamlessly.
  const track = [...messages, ...messages];

  return (
    <div className="relative overflow-hidden bg-purple-500 text-cream">
      <div className="flex w-max animate-marquee items-center gap-0 whitespace-nowrap py-2">
        {track.map((m, i) => {
          const Icon = m.icon;
          return (
            <span key={i} className="flex items-center gap-2.5 px-8 text-xs font-medium tracking-wide">
              <Icon className="size-3.5 text-gold-300" />
              {m.text}
              <span className="ml-6 size-1 rounded-full bg-cream/40" />
            </span>
          );
        })}
      </div>
    </div>
  );
}
