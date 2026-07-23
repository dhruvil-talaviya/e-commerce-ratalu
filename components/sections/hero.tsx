"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import { ArrowRight, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WaferVisual } from "@/components/common/wafer-visual";
import { AnimatedCounter } from "@/components/common/animated-counter";
import { FLAVORS } from "@/lib/data/flavors";
import { useSiteStats } from "@/lib/hooks/use-site-stats";
import { useSection } from "@/components/cms/cms-provider";
import { useStoreSettings } from "@/components/common/settings-provider";
import { cn, sanitizeMediaUrl } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

interface HeroSlide {
  enabled?: boolean;
  badge?: string;
  badgeCount?: number;
  headingLine1?: string;
  headingLine2?: string;
  description?: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  /**
   * A real brand photo or animated GIF/video-frame for the hero visual. When
   * set it replaces the generated wafer blob; when blank the blob renders, so
   * the page still looks finished before any image is uploaded.
   */
  image?: string;
  /** Price shown on the floating tag. Was hardcoded "₹99". */
  priceFrom?: number;
}

interface HeroContent extends Record<string, unknown> {
  slides: HeroSlide[];
  stats: { value: number; suffix: string; decimals?: number; label: string }[];
  showStats: boolean;
}

/**
 * What the hero renders if the CMS has nothing to say — the copy the site
 * shipped with. Keeps the page whole if the content API is unreachable, and
 * means a fresh install still looks finished.
 */
const HERO_FALLBACK: HeroContent = {
  slides: [
    {
      enabled: true,
      // No count baked in. The badge is filled from the real customer count and
      // hidden if there isn't one — it used to claim "2,000+ snackers" against
      // a customer table holding 14 rows.
      badge: "Loved by {count} snackers",
      badgeCount: 0,
      headingLine1: "Crispy. Natural.",
      headingLine2: "Irresistible.",
      description:
        "Made from hand-selected fresh Ratalu, kettle-cooked into perfectly crispy wafers with unforgettable flavours. Small-batch, no artificial colours, delivered fresh.",
      primaryCta: { label: "Shop Now", href: "/shop" },
      secondaryCta: { label: "Explore Flavours", href: "#flavours" },
    },
  ],
  /**
   * Only claims we can substantiate. "4.9★ Avg. rating" was hardcoded here and
   * shown to every visitor while the store had zero approved reviews. The rating
   * and flavour count are replaced with live figures below; anything we can't
   * count is simply not shown.
   */
  stats: [{ value: 100, suffix: "%", decimals: 0, label: "Natural" }],
  showStats: true,
};

export function Hero() {
  const ref = React.useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { settings } = useStoreSettings();

  const cms = useSection<HeroContent>("hero", HERO_FALLBACK);
  const slide = (cms.slides ?? []).find((s) => s.enabled !== false) ?? HERO_FALLBACK.slides[0];

  const activeMedia = sanitizeMediaUrl(slide?.image || settings?.homepageHeroVideo || "");
  const [videoError, setVideoError] = React.useState(false);

  React.useEffect(() => {
    setVideoError(false);
  }, [slide?.image, settings?.homepageHeroVideo]);

  const isVideo = React.useMemo(() => {
    if (videoError) return false;
    if (!activeMedia) return false;
    return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(activeMedia);
  }, [activeMedia, videoError]);

  /**
   * Real numbers, from the database. A rating we haven't earned is not a
   * rounding error — it's a lie to a customer deciding whether to buy.
   */
  const siteStats = useSiteStats();

  /**
   * ONE source of stats — the CMS list (or the fallback) — with real numbers
   * filled in by label, never appended on top.
   *
   * Appending live stats to the stored CMS stats produced two "Bold flavours"
   * tiles and re-surfaced a hardcoded "4.9★" that lived in the published hero
   * content. Here a tile labelled like a rating takes the real average (and is
   * dropped entirely when there are no reviews); a tile labelled like a flavour
   * count takes the live count; everything else (e.g. "100% Natural") is left
   * exactly as the admin wrote it.
   */
  const stats = React.useMemo(() => {
    const source = cms.stats ?? HERO_FALLBACK.stats;

    return source
      .map((s) => {
        const label = String(s.label ?? "").toLowerCase();

        if (label.includes("rating")) {
          if (!siteStats || siteStats.avgRating == null) return null; // no reviews → no tile
          return { ...s, value: siteStats.avgRating, decimals: 1, suffix: s.suffix || "★" };
        }

        if (label.includes("flavour") || label.includes("flavor")) {
          return siteStats?.flavourCount
            ? { ...s, value: siteStats.flavourCount, decimals: 0, suffix: "" }
            : s;
        }

        return s;
      })
      .filter((s): s is NonNullable<typeof s> => Boolean(s));
  }, [cms.stats, siteStats]);

  // The badge only appears once there are real customers to point at.
  const badgeCount = siteStats?.customerCount ?? 0;
  const showBadge = Boolean(slide.badge) && badgeCount > 0;
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const yVisual = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 120]);
  const yGlow = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -80]);

  const hero = FLAVORS[0];
  const orbit = [FLAVORS[2], FLAVORS[4], FLAVORS[1], FLAVORS[5]];

  const container = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
  };
  const item = {
    hidden: { opacity: 0, y: 26 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
  };

  return (
    <section ref={ref} id="hero" className="relative overflow-hidden bg-radial-cream">
      {/* Decorative background — orange/yellow glow orbs */}
      <motion.div style={{ y: yGlow }} className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-24 top-24 size-96 rounded-full bg-orange-200/40 blur-3xl" />
        <div className="absolute -right-16 top-40 size-80 rounded-full bg-yellow-200/40 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 size-72 rounded-full bg-orange-100/50 blur-3xl" />
      </motion.div>

      <div className="container-px relative mx-auto grid max-w-7xl items-center gap-10 py-14 sm:gap-12 sm:py-16 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:py-24">
        {/* Copy */}
        <motion.div variants={container} initial="hidden" animate="visible" className="relative z-10">
          {/* Social proof — only when there is proof. */}
          {showBadge && (
            <motion.div variants={item}>
              <span className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-white/80 px-4 py-1.5 text-xs font-semibold text-orange-700 shadow-[var(--shadow-soft)] backdrop-blur">
                {/* Stars only mean something next to a real rating. */}
                {siteStats?.avgRating != null && (
                  <span className="flex -space-x-0.5">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <Star
                        key={i}
                        className={cn(
                          "size-3.5",
                          i < Math.round(siteStats.avgRating ?? 0)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-yellow-200"
                        )}
                      />
                    ))}
                  </span>
                )}
                {(slide.badge ?? "").replace("{count}", badgeCount.toLocaleString("en-IN"))}
              </span>
            </motion.div>
          )}

          {/* Hero heading — 48px Bold Poppins */}
          <motion.h1
            variants={item}
            className="mt-6 text-[clamp(2.1rem,8vw,3rem)] font-bold leading-[1.05] text-gray-800 lg:text-5xl"
          >
            {slide.headingLine1}
            <br />
            <span className="text-gradient-warm">{slide.headingLine2}</span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-6 max-w-xl text-lg leading-relaxed text-gray-500"
          >
            {slide.description}
          </motion.p>

          <motion.div variants={item} className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            {slide.primaryCta?.label && (
              <Button asChild size="xl">
                <Link href={slide.primaryCta.href || "/shop"}>
                  {slide.primaryCta.label} <ArrowRight />
                </Link>
              </Button>
            )}
            {slide.secondaryCta?.label && (
              <Button asChild size="xl" variant="outline">
                <Link href={slide.secondaryCta.href || "#flavours"}>
                  <Sparkles /> {slide.secondaryCta.label}
                </Link>
              </Button>
            )}
          </motion.div>

          {/* Trust stats */}
          {cms.showStats !== false && stats.length > 0 && (
            <motion.div
              variants={item}
              className="mt-10 grid max-w-lg grid-cols-3 gap-3 border-t border-[var(--color-border)] pt-7 sm:mt-12 sm:gap-4 sm:pt-8"
            >
              {stats.slice(0, 3).map((s, i) => (
                <Stat
                  key={`${s.label}-${i}`}
                  value={
                    <AnimatedCounter
                      value={s.value}
                      decimals={s.decimals ?? 0}
                      suffix={s.suffix ?? ""}
                    />
                  }
                  label={s.label}
                />
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* Visual */}
        <motion.div
          style={{ y: yVisual }}
          className="relative z-0 mx-auto aspect-square w-full max-w-lg"
        >
          {/* rotating dashed ring */}
          {!isVideo && (
            <div className="absolute inset-4 rounded-full border border-dashed border-orange-200 animate-spin-slow" aria-hidden />
          )}
          <div className="absolute inset-0 -z-10 rounded-full bg-gradient-to-br from-white/70 to-transparent blur-2xl" aria-hidden />

          {/* hero visual — the admin's brand image, or the generated blob */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, rotate: slide.image ? 0 : -6 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.2 }}
            className="relative z-10 h-full w-full drop-shadow-2xl"
          >
            {activeMedia && !videoError ? (
              // object-contain so any aspect ratio fits the circle without cropping.
              <div className="grid h-full w-full place-items-center animate-float-slow">
                {isVideo ? (
                  <video
                    src={activeMedia}
                    autoPlay={settings?.autoplayVideo ?? true}
                    loop={settings?.loopVideo ?? true}
                    muted={settings?.muteVideo ?? true}
                    playsInline
                    onError={() => setVideoError(true)}
                    className="max-h-full max-w-full object-contain rounded-2xl pointer-events-none"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeMedia}
                    alt={slide.headingLine1 || "Ratalu wafers"}
                    onError={() => setVideoError(true)}
                    className="max-h-full max-w-full object-contain"
                  />
                )}
              </div>
            ) : (
              <WaferVisual flavor={hero} />
            )}
          </motion.div>

          {/* orbiting flavour chips */}
          {!isVideo && orbit.map((f, i) => {
            const positions = [
              "bottom-6 left-0",
              "bottom-16 right-0",
              "top-24 -left-2",
              "top-2 right-16",
            ];
            return (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 + i * 0.12, duration: 0.5, ease: EASE }}
                className={`absolute z-20 size-16 sm:size-20 rounded-2xl border border-white/80 bg-white/30 shadow-[0_8px_32px_0_rgba(124,58,237,0.08)] backdrop-blur-md hover:scale-110 hover:rotate-6 hover:border-purple-300/40 hover:shadow-[0_12px_40px_0_rgba(124,58,237,0.18)] transition-all duration-300 cursor-pointer ${positions[i]}`}
                style={{ animation: `float-slow ${6 + i}s var(--ease-premium) ${i * 0.4}s infinite` }}
                title={f.name}
              >
                <WaferVisual flavor={f} seed={i + 1} />
              </motion.div>
            );
          })}
        </motion.div>
      </div>

    </section>
  );
}

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div>
      <p className="text-2xl font-bold text-gray-800 sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{label}</p>
    </div>
  );
}
