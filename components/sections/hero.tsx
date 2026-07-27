"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import { ArrowRight, Sparkles, Star, Leaf } from "lucide-react";
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
  image?: string;
  priceFrom?: number;
}

interface HeroContent extends Record<string, unknown> {
  slides: HeroSlide[];
  stats: { value: number; suffix: string; decimals?: number; label: string }[];
  showStats: boolean;
}

const HERO_FALLBACK: HeroContent = {
  slides: [
    {
      enabled: true,
      badge: "Loved by {count} snackers",
      badgeCount: 0,
      headingLine1: "Crispy. Natural.",
      headingLine2: "Irresistible Yam Wafers.",
      description:
        "Made from hand-selected fresh Ratalu (Purple Yam), kettle-cooked into perfectly crispy wafers with unforgettable flavours. Small-batch, no artificial colours, 100% vegetarian.",
      primaryCta: { label: "Shop Now", href: "/shop" },
      secondaryCta: { label: "Explore Flavours", href: "#flavours" },
    },
  ],
  stats: [{ value: 100, suffix: "%", decimals: 0, label: "Natural Ratalu" }],
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

  const siteStats = useSiteStats();

  const stats = React.useMemo(() => {
    const source = cms.stats ?? HERO_FALLBACK.stats;

    return source
      .map((s) => {
        const label = String(s.label ?? "").toLowerCase();

        if (label.includes("rating")) {
          if (!siteStats || siteStats.avgRating == null) return null;
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
    <section ref={ref} id="hero" className="relative overflow-hidden bg-[#FFF8EC]">
      {/* Decorative ambient glow orbs */}
      <motion.div style={{ y: yGlow }} className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-24 top-24 size-96 rounded-full bg-[#5B2C83]/10 blur-3xl" />
        <div className="absolute -right-16 top-40 size-80 rounded-full bg-[#F4B400]/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 size-72 rounded-full bg-[#4CAF50]/15 blur-3xl" />
      </motion.div>

      <div className="container-px relative mx-auto grid max-w-7xl items-center gap-6 py-8 sm:gap-12 sm:py-16 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:py-24">
        {/* Copy */}
        <motion.div variants={container} initial="hidden" animate="visible" className="relative z-10 text-center lg:text-left">
          {/* Social proof badge */}
          {showBadge ? (
            <motion.div variants={item} className="flex justify-center lg:justify-start">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#5B2C83]/20 bg-white/90 px-3.5 py-1.5 text-xs font-bold text-[#5B2C83] shadow-[var(--shadow-soft)] backdrop-blur">
                {siteStats?.avgRating != null && (
                  <span className="flex -space-x-0.5">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <Star
                        key={i}
                        className={cn(
                          "size-3.5",
                          i < Math.round(siteStats.avgRating ?? 0)
                            ? "fill-[#F4B400] text-[#F4B400]"
                            : "text-[#F4B400]/30"
                        )}
                      />
                    ))}
                  </span>
                )}
                {(slide.badge ?? "").replace("{count}", badgeCount.toLocaleString("en-IN"))}
              </span>
            </motion.div>
          ) : (
            <motion.div variants={item} className="flex justify-center lg:justify-start">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#4CAF50]/30 bg-white/90 px-3.5 py-1.5 text-xs font-bold text-[#4CAF50] shadow-[var(--shadow-soft)] backdrop-blur">
                <Leaf className="size-3.5 text-[#4CAF50]" /> 100% Fresh Kettle-Cooked Ratalu Wafers
              </span>
            </motion.div>
          )}

          {/* Hero heading */}
          <motion.h1
            variants={item}
            className="mt-4 text-3xl font-extrabold leading-[1.1] text-[#2D2D2D] sm:mt-6 sm:text-5xl lg:text-6xl tracking-tight"
          >
            {slide.headingLine1}{" "}
            <span className="text-gradient-warm block sm:inline">{slide.headingLine2}</span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-3 max-w-xl text-sm leading-relaxed text-[#555555] mx-auto lg:mx-0 sm:mt-6 sm:text-base lg:text-lg"
          >
            {slide.description}
          </motion.p>

          <motion.div variants={item} className="mt-6 flex flex-row items-center justify-center gap-3 sm:mt-9 sm:justify-start">
            {slide.primaryCta?.label && (
              <Button asChild size="lg" variant="primary" className="sm:h-13 sm:px-8 text-sm sm:text-base font-bold flex-1 sm:flex-none">
                <Link href={slide.primaryCta.href || "/shop"}>
                  {slide.primaryCta.label} <ArrowRight className="size-4 ml-1" />
                </Link>
              </Button>
            )}
            {slide.secondaryCta?.label && (
              <Button asChild size="lg" variant="accent" className="sm:h-13 sm:px-8 text-sm sm:text-base font-bold flex-1 sm:flex-none">
                <Link href={slide.secondaryCta.href || "#flavours"}>
                  <Sparkles className="size-4 text-[#2D2D2D]" /> {slide.secondaryCta.label}
                </Link>
              </Button>
            )}
          </motion.div>

          {/* Trust stats */}
          {cms.showStats !== false && stats.length > 0 && (
            <motion.div
              variants={item}
              className="mt-6 grid max-w-lg grid-cols-3 gap-3 border-t border-[#e8d9eb] pt-4 sm:mt-12 sm:gap-6 sm:pt-8"
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

        {/* Visual Artwork */}
        <motion.div
          style={{ y: yVisual }}
          className={cn("relative z-0 mx-auto w-full transition-all", isVideo ? "aspect-video max-w-full sm:max-w-xl lg:max-w-2xl mt-4 lg:mt-0" : "aspect-square max-w-[300px] sm:max-w-md lg:max-w-lg")}
        >
          {!isVideo && (
            <div className="absolute inset-4 rounded-full border border-dashed border-[#5B2C83]/30 animate-spin-slow" aria-hidden />
          )}
          <div className="absolute inset-0 -z-10 rounded-full bg-gradient-to-br from-white/80 to-[#F4B400]/20 blur-2xl" aria-hidden />

          <motion.div
            initial={{ opacity: 0, scale: 0.85, rotate: slide.image ? 0 : -6 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.2 }}
            className="relative z-10 h-full w-full drop-shadow-2xl flex items-center justify-center"
          >
            {activeMedia && !videoError ? (
              <div className="grid h-full w-full place-items-center">
                {isVideo ? (
                  <video
                    src={activeMedia}
                    autoPlay={settings?.autoplayVideo ?? true}
                    loop={settings?.loopVideo ?? true}
                    muted={settings?.muteVideo ?? true}
                    playsInline
                    onError={() => setVideoError(true)}
                    className="w-full h-full object-cover rounded-2xl sm:rounded-3xl shadow-xl border border-white/40 pointer-events-none"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeMedia}
                    alt={slide.headingLine1 || "Ratalu wafers"}
                    onError={() => setVideoError(true)}
                    className="max-h-full max-w-full object-contain drop-shadow-xl"
                  />
                )}
              </div>
            ) : (
              <WaferVisual flavor={hero} />
            )}
          </motion.div>

          {/* Floating Orbit Chips */}
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
                className={`hidden sm:block absolute z-20 size-16 sm:size-20 rounded-2xl border border-white/90 bg-white/80 shadow-[0_8px_32px_0_rgba(91,44,131,0.12)] backdrop-blur-md hover:scale-110 hover:rotate-6 hover:border-[#F4B400] transition-all duration-300 cursor-pointer ${positions[i]}`}
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
      <p className="text-2xl font-extrabold text-[#5B2C83] sm:text-3xl font-mono">{value}</p>
      <p className="mt-1 text-xs font-semibold text-[#555555]">{label}</p>
    </div>
  );
}
