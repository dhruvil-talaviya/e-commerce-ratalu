"use client";

import * as React from "react";
import { SectionHeading } from "@/components/common/section-heading";
import { Reveal, RevealGroup, RevealItem } from "@/components/common/reveal";
import { AnimatedCounter } from "@/components/common/animated-counter";
import { useSection } from "@/components/cms/cms-provider";
import { CmsIcon } from "@/components/cms/icon-registry";
import type { FeatureGridContent } from "@/components/cms/types";
import { useStoreSettings } from "@/components/common/settings-provider";
import { sanitizeMediaUrl } from "@/lib/utils";

/** What renders if the CMS is empty or unreachable — the copy the site shipped with. */
const FALLBACK: FeatureGridContent = {
  eyebrow: "Why Ratalu",
  title: "Why Choose Ratalu Chips",
  description:
    "Crafting the ultimate guilt-free gourmet snack. Sourced responsibly, cooked traditionally, seasoned by hand.",
  features: [
    { icon: "Leaf", title: "Fresh Ingredients", body: "Sliced from just-harvested yam, never frozen or from concentrate." },
    { icon: "Hand", title: "Hand-Selected Ratalu", body: "Every root is chosen by hand for the perfect size, colour and starch." },
    { icon: "Droplets", title: "Premium Quality Oil", body: "Cold-pressed sunflower oil only — light, clean and never reused." },
    { icon: "Ban", title: "No Artificial Colours", body: "That gorgeous purple is 100% natural. No dyes, no MSG, no palm oil." },
    { icon: "Sparkles", title: "Perfect Crispiness", body: "Kettle-cooked low and slow for a signature shattering crunch." },
    { icon: "Clock", title: "Made Fresh", body: "Cooked in small batches and dispatched within days, not months." },
  ],
  stats: [
    { value: 100, suffix: "%", decimals: 0, label: "Natural ingredients" },
    { value: 3, suffix: "", decimals: 0, label: "Simple ingredients" },
    { value: 0, suffix: "", decimals: 0, label: "Artificial colours" },
    { value: 24, suffix: "h", decimals: 0, label: "Yam to kettle" },
  ],
};

export function WhyChooseUs() {
  const { settings } = useStoreSettings();
  const cms = useSection<FeatureGridContent & { video?: string; autoplay?: boolean; muted?: boolean; loop?: boolean }>("why-choose-us", FALLBACK);

  // An admin who deletes every feature should get an empty grid, not the
  // fallback resurrecting itself — but a *missing* key falls back.
  const features = cms.features ?? FALLBACK.features ?? [];
  const stats = cms.stats ?? FALLBACK.stats ?? [];

  const videoUrl = sanitizeMediaUrl(cms.video || settings?.whyUsVideo || "");
  const autoplay = cms.autoplay !== undefined ? cms.autoplay : (settings?.autoplayVideo ?? true);
  const muted = cms.muted !== undefined ? cms.muted : (settings?.muteVideo ?? true);
  const loop = cms.loop !== undefined ? cms.loop : (settings?.loopVideo ?? true);

  return (
    <section id="why-choose-us" className="relative scroll-mt-24 py-8 sm:py-16 lg:py-24">
      <div className="container-px mx-auto max-w-7xl">
        <SectionHeading
          eyebrow={cms.eyebrow}
          title={cms.title}
          description={cms.description}
        />

        {videoUrl && (
          <div className="mt-8 sm:mt-16 w-screen relative left-1/2 -translate-x-1/2 overflow-hidden bg-black aspect-video max-h-[50vh] sm:max-h-[70vh] shadow-[var(--shadow-lift)]">
            <video
              src={videoUrl}
              autoPlay={autoplay}
              muted={muted}
              loop={loop}
              playsInline
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <RevealGroup className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            return (
              <RevealItem
                key={f.title}
                className="group rounded-3xl border border-[var(--color-border)] bg-white/70 p-7 shadow-[var(--shadow-soft)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 text-cream shadow-[var(--shadow-soft)] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                  <CmsIcon name={f.icon} className="size-6" />
                </span>
                <h3 className="mt-5 font-serif text-xl font-semibold text-charcoal">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-charcoal-muted">{f.body}</p>
              </RevealItem>
            );
          })}
        </RevealGroup>

        {/* Stat band */}
        {stats.length > 0 && (
          <Reveal className="mt-8">
            <div className="relative overflow-hidden rounded-3xl bg-purple-600 px-8 py-10 text-cream shadow-[var(--shadow-lift)]">
              <div className="pointer-events-none absolute -right-10 -top-10 size-56 rounded-full bg-orange-500/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-16 left-1/4 size-56 rounded-full bg-gold-400/20 blur-3xl" />
              <div className="relative grid grid-cols-2 gap-8 sm:grid-cols-4">
                {stats.map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="font-serif text-4xl font-bold text-gold-300 sm:text-5xl">
                      <AnimatedCounter
                        value={s.value}
                        suffix={s.suffix}
                        decimals={s.decimals ?? 0}
                      />
                    </p>
                    <p className="mt-2 text-sm text-cream/80">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
