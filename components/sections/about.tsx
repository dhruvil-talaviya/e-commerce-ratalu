"use client";

import * as React from "react";
import { Reveal, RevealGroup, RevealItem } from "@/components/common/reveal";
import { WaferVisual } from "@/components/common/wafer-visual";
import { FLAVORS } from "@/lib/data/flavors";
import { useStoreSettings } from "@/components/common/settings-provider";
import { useSection } from "@/components/cms/cms-provider";
import { CmsIcon } from "@/components/cms/icon-registry";
import type { FeatureGridContent } from "@/components/cms/types";
import { cn, sanitizeMediaUrl } from "@/lib/utils";
import { usePathname } from "next/navigation";

/** What renders if the CMS is empty or unreachable. */
const FALLBACK: FeatureGridContent = {
  eyebrow: "Our Story",
  features: [
    { icon: "Sprout", title: "Fresh, hand-selected", body: "We source purple yam at its peak and slice it within hours — never from concentrate, never frozen." },
    { icon: "Flame", title: "Traditional kettle-cooking", body: "Cooked low and slow in small batches, the old-fashioned way, for that signature shattering crunch." },
    { icon: "Package", title: "Premium, sealed packaging", body: "Nitrogen-flushed pouches lock in freshness so every pack tastes just-made when it reaches you." },
    { icon: "HandHeart", title: "Nothing artificial", body: "No artificial colours, no MSG, no palm oil. Just yam, good oil and honest seasoning." },
  ],
  badge: { year: "Est. 2021", location: "Rajkot · Gujarat" },
};

export function About() {
  const { settings, hydrated } = useStoreSettings();
  const pathname = usePathname();
  const isStoryPage = pathname === "/our-story";
  const customVideo = isStoryPage ? settings?.ourStoryVideo : settings?.brandStoryVideo;

  const cms = useSection<FeatureGridContent>("about", FALLBACK);
  const storyDetails = useSection("details", {
    body: settings?.ourStoryMainText || ""
  });

  const pillars = cms.features ?? FALLBACK.features ?? [];
  const badge = { ...FALLBACK.badge, ...(cms.badge ?? {}) };

  const media = sanitizeMediaUrl(customVideo || (typeof cms.media === "string" ? cms.media.trim() : ""));
  const hideVisual = cms.hideVisual === true;
  const [mediaError, setMediaError] = React.useState(false);

  React.useEffect(() => {
    setMediaError(false);
  }, [media]);

  const mediaIsVideo = media && !mediaError ? (media === customVideo || /\.(mp4|webm|ogg|mov)(\?|$)/i.test(media)) : false;

  const title = cms.title || settings?.ourStoryTitle || "A humble yam, reimagined.";
  const paragraphs = (cms.description || storyDetails.body || settings?.ourStoryMainText || "")
    .split(/\n\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <section id="about" className="relative scroll-mt-24 py-16 sm:py-20 lg:py-24">
      <div
        className={cn(
          "container-px mx-auto grid max-w-7xl items-center gap-16",
          // Full width when the visual is turned off.
          hideVisual ? "max-w-3xl" : "lg:grid-cols-2"
        )}
      >
        {/* Visual — uploaded photo/video, or the generated tile collage */}
        {!hideVisual && (
          <Reveal direction="right" className="relative order-2 lg:order-1">
            <div className="relative mx-auto max-w-md">
              {media && !mediaError ? (
                // A real photo or video of how the chips are grown / made.
                <div className="overflow-hidden rounded-3xl bg-white/70 shadow-[var(--shadow-lift)]">
                  {mediaIsVideo ? (
                    <video
                      src={media}
                      autoPlay={settings?.autoplayVideo ?? true}
                      loop={settings?.loopVideo ?? true}
                      muted={settings?.muteVideo ?? true}
                      playsInline
                      onError={() => setMediaError(true)}
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={media} alt={title} onError={() => setMediaError(true)} className="aspect-square w-full object-cover" />
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-5">
                  <div className="mt-10 aspect-square rounded-3xl bg-white/70 p-4 shadow-[var(--shadow-soft)]">
                    <WaferVisual flavor={FLAVORS[0]} />
                  </div>
                  <div className="aspect-square rounded-3xl bg-white/70 p-4 shadow-[var(--shadow-soft)]">
                    <WaferVisual flavor={FLAVORS[1]} seed={2} />
                  </div>
                  <div className="aspect-square rounded-3xl bg-white/70 p-4 shadow-[var(--shadow-soft)]">
                    <WaferVisual flavor={FLAVORS[4]} seed={3} />
                  </div>
                  <div className="aspect-square rounded-3xl bg-white/70 p-4 shadow-[var(--shadow-soft)]">
                    <WaferVisual flavor={FLAVORS[2]} seed={4} />
                  </div>
                </div>
              )}
            </div>
          </Reveal>
        )}

        {/* Story */}
        <div className={cn(hideVisual ? "" : "order-1 lg:order-2")}>
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-purple-600">
              <span className="size-1.5 rounded-full bg-orange-500" />
              {cms.eyebrow}
            </span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-5 font-serif text-4xl font-semibold leading-tight text-charcoal sm:text-5xl">
              {title}
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-6 space-y-4 text-lg leading-relaxed text-charcoal-muted">
              {paragraphs.length > 0 ? (
                paragraphs.map((p, idx) => <p key={idx}>{p}</p>)
              ) : (
                <>
                  <p>
                    Ratalu — the purple yam — has been a monsoon favourite in Gujarati kitchens for
                    generations. We grew up on it. So we set out to do one thing exceptionally well:
                    turn this humble root into the crispiest, most flavourful wafer you&apos;ve ever tasted.
                  </p>
                  <p>
                    No shortcuts. No factory line churning out millions. Just carefully chosen yam,
                    thin-sliced, kettle-cooked in small batches, and seasoned by hand with spices we&apos;d
                    proudly serve our own family.
                  </p>
                </>
              )}
            </div>
          </Reveal>

          <RevealGroup className="mt-10 grid gap-x-8 gap-y-7 sm:grid-cols-2">
            {pillars.map((p) => {
              return (
                <RevealItem key={p.title} className="flex gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-purple-50 text-purple-600">
                    <CmsIcon name={p.icon} className="size-5" />
                  </span>
                  <div>
                    <h3 className="font-serif text-lg font-semibold text-charcoal">{p.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-charcoal-muted">{p.body}</p>
                  </div>
                </RevealItem>
              );
            })}
          </RevealGroup>
        </div>
      </div>
    </section>
  );
}
