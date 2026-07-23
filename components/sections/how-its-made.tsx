"use client";

import { SectionHeading } from "@/components/common/section-heading";
import { RevealGroup, RevealItem } from "@/components/common/reveal";
import { useSection } from "@/components/cms/cms-provider";
import { CmsIcon } from "@/components/cms/icon-registry";
import type { FeatureGridContent } from "@/components/cms/types";
import { useStoreSettings } from "@/components/common/settings-provider";
import { sanitizeMediaUrl } from "@/lib/utils";

/** What renders if the CMS is empty or unreachable. */
const FALLBACK: FeatureGridContent = {
  eyebrow: "How we make it",
  title: "Five steps to the",
  titleHighlight: "perfect crunch",
  description: "No factory shortcuts — just a careful, small-batch craft we're proud of.",
  features: [
    { icon: "Hand", title: "Hand-selected", body: "Fresh purple yam, chosen by hand for size, colour & starch." },
    { icon: "Slice", title: "Thin-sliced", body: "Cut to the perfect thickness within hours of arriving." },
    { icon: "Flame", title: "Kettle-cooked", body: "Small batches, cooked low & slow for a shattering crunch." },
    { icon: "Sparkles", title: "Seasoned by hand", body: "Real spices tossed on fresh — never sprayed, never dull." },
    { icon: "PackageCheck", title: "Nitrogen-sealed", body: "Flushed & sealed to lock in that just-cooked freshness." },
  ],
};

export function HowItsMade() {
  const { settings } = useStoreSettings();
  const cms = useSection<FeatureGridContent & { video?: string; autoplay?: boolean; muted?: boolean; loop?: boolean }>("how-its-made", FALLBACK);
  const steps = cms.features ?? FALLBACK.features ?? [];

  const videoUrl = sanitizeMediaUrl(cms.video || settings?.manufacturingProcessVideo || "");
  const autoplay = cms.autoplay !== undefined ? cms.autoplay : (settings?.autoplayVideo ?? true);
  const muted = cms.muted !== undefined ? cms.muted : (settings?.muteVideo ?? true);
  const loop = cms.loop !== undefined ? cms.loop : (settings?.loopVideo ?? true);

  return (
    <section id="how-its-made" className="relative scroll-mt-24 bg-white/40 py-16 sm:py-20 lg:py-24">
      <div className="container-px mx-auto max-w-7xl">
        <SectionHeading
          eyebrow={cms.eyebrow}
          title={
            cms.titleHighlight ? (
              <>
                {cms.title} <span className="text-gradient-warm">{cms.titleHighlight}</span>
              </>
            ) : (
              cms.title
            )
          }
          description={cms.description}
        />

        <RevealGroup className="relative mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {/* connecting line on desktop */}
          <div
            className="pointer-events-none absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-purple-200 to-transparent lg:block"
            aria-hidden
          />
          {steps.map((s, i) => (
            <RevealItem key={s.title} className="relative flex flex-col items-center text-center">
              <div className="relative">
                <span className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 text-cream shadow-[var(--shadow-soft)]">
                  <CmsIcon name={s.icon} className="size-6" />
                </span>
                <span className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-gold-400 text-[11px] font-bold text-purple-800 shadow-sm">
                  {i + 1}
                </span>
              </div>
              <h3 className="mt-5 font-serif text-lg font-semibold text-charcoal">{s.title}</h3>
              <p className="mt-1.5 max-w-[15rem] text-sm leading-relaxed text-charcoal-muted">
                {s.body}
              </p>
            </RevealItem>
          ))}
        </RevealGroup>

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
      </div>
    </section>
  );
}
