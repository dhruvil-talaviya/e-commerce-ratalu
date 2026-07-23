"use client";

import * as React from "react";
import { Sprout } from "lucide-react";
import { Reveal, RevealGroup, RevealItem } from "@/components/common/reveal";
import { AnimatedCounter } from "@/components/common/animated-counter";
import { useSection } from "@/components/cms/cms-provider";
import { CmsIcon } from "@/components/cms/icon-registry";
import type { FeatureGridContent } from "@/components/cms/types";
import { cn } from "@/lib/utils";

/** What renders if the CMS is empty or unreachable. */
const FALLBACK: FeatureGridContent = {
  eyebrow: "Farm fresh",
  title: "Real ingredients you can",
  titleHighlight: "actually pronounce",
  description:
    "Great chips start long before the kettle. Ours begin at the farm, with purple yam chosen by hand and a promise to keep everything honest and clean.",
  panel: {
    badge: "Farm to pack",
    headline: "From soil to shelf in under",
    headlineValue: 24,
    headlineSuffix: "h",
    body: "We don't stockpile. Yam is harvested, hand-washed, sliced and kettle-cooked in small daily batches — so every pack tastes garden-fresh.",
  },
  features: [
    { icon: "MapPin", title: "Grown in Gujarat", body: "Sourced direct from trusted purple-yam farms across Saurashtra." },
    { icon: "Sun", title: "Peak-season harvest", body: "Picked at ripeness for the sweetest, nuttiest flavour." },
    { icon: "Droplets", title: "Cold-pressed oils", body: "Only light, clean sunflower oil — never reused, never palm." },
    { icon: "Sprout", title: "Nothing artificial", body: "No colours, no MSG, no preservatives. Ever." },
  ],
  stats: [
    { value: 100, suffix: "%", decimals: 0, label: "Natural" },
    { value: 0, suffix: "", decimals: 0, label: "Preservatives" },
    { value: 6, suffix: "", decimals: 0, label: "Bold flavours" },
  ],
};

export function FarmFresh() {
  const cms = useSection<FeatureGridContent>("farm-fresh", FALLBACK);

  const points = cms.features ?? FALLBACK.features ?? [];
  const stats = cms.stats ?? FALLBACK.stats ?? [];
  const panel = { ...FALLBACK.panel, ...(cms.panel ?? {}) };

  const panelMedia = typeof panel.media === "string" ? panel.media.trim() : "";
  const hidePanel = panel.hidden === true;
  const panelIsVideo = /\.(mp4|webm|ogg|mov)(\?|$)/i.test(panelMedia);

  return (
    <section id="farm-fresh" className="relative scroll-mt-24 overflow-hidden py-16 sm:py-20 lg:py-24">
      <div
        className={cn(
          "container-px mx-auto grid max-w-7xl items-center gap-10 sm:gap-12 lg:gap-16",
          // Full width when the panel is turned off.
          hidePanel ? "max-w-4xl" : "lg:grid-cols-2"
        )}
      >
        {/* Visual panel — uploaded media, or the gradient stat card */}
        {!hidePanel && (
          <Reveal direction="right" className="order-2 lg:order-1">
            {panelMedia ? (
              <div className="overflow-hidden rounded-[2rem] bg-black/5 shadow-[var(--shadow-lift)]">
                {panelIsVideo ? (
                  <video
                    src={panelMedia}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="aspect-[4/3] w-full object-cover"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={panelMedia}
                    alt={panel.headline || "Farm fresh"}
                    className="aspect-[4/3] w-full object-cover"
                  />
                )}
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-green-700 via-green-800 to-purple-800 p-6 text-cream shadow-[var(--shadow-lift)] sm:p-10">
                <div className="pointer-events-none absolute -right-12 -top-12 size-56 rounded-full bg-gold-400/20 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-16 -left-10 size-56 rounded-full bg-green-400/20 blur-3xl" />
                <div className="relative">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-300 backdrop-blur sm:px-4 sm:text-xs">
                    <Sprout className="size-3.5" /> {panel.badge}
                  </span>
                  <p className="mt-5 font-serif text-2xl font-semibold leading-tight sm:mt-6 sm:text-4xl">
                    {panel.headline}{" "}
                    <span className="text-gold-300">
                      <AnimatedCounter
                        value={panel.headlineValue ?? 24}
                        suffix={panel.headlineSuffix ?? "h"}
                      />
                    </span>
                  </p>
                  <p className="mt-4 max-w-md text-sm text-cream/80 sm:text-base">{panel.body}</p>

                  {stats.length > 0 && (
                    <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/15 pt-5 sm:mt-8 sm:gap-4 sm:pt-6">
                      {stats.slice(0, 3).map((s) => (
                        <Stat
                          key={s.label}
                          value={
                            <AnimatedCounter
                              value={s.value}
                              suffix={s.suffix}
                              decimals={s.decimals ?? 0}
                            />
                          }
                          label={s.label}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </Reveal>
        )}

        {/* Copy */}
        <div className={cn(hidePanel ? "" : "order-1 lg:order-2")}>
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-purple-600">
              <span className="size-1.5 rounded-full bg-orange-500" />
              {cms.eyebrow}
            </span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-5 font-serif text-4xl font-semibold leading-tight text-charcoal sm:text-5xl">
              {cms.title}{" "}
              {cms.titleHighlight && (
                <span className="text-gradient-warm">{cms.titleHighlight}</span>
              )}
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-5 text-lg leading-relaxed text-charcoal-muted">{cms.description}</p>
          </Reveal>

          <RevealGroup className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {points.map((p) => (
              <RevealItem key={p.title} className="flex gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-green-50 text-green-700">
                  <CmsIcon name={p.icon} className="size-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-serif text-lg font-semibold text-charcoal">{p.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-charcoal-muted">{p.body}</p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div>
      <p className="font-serif text-2xl font-bold text-cream sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs text-cream/70">{label}</p>
    </div>
  );
}
