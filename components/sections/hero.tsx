"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Sparkles, Star, ChevronLeft, ChevronRight, ShoppingBag, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WaferVisual } from "@/components/common/wafer-visual";
import { AnimatedCounter } from "@/components/common/animated-counter";
import { FLAVORS } from "@/lib/data/flavors";
import { useSiteStats } from "@/lib/hooks/use-site-stats";
import { useSection } from "@/components/cms/cms-provider";
import { useStoreSettings } from "@/components/common/settings-provider";
import { cn, sanitizeMediaUrl } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

export interface HeroSlide {
  id?: string;
  enabled?: boolean;
  badge?: string;
  headingLine1?: string;
  headingLine2?: string;
  description?: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  image?: string;
  video?: string;
  overlayOpacity?: number; // 0-100, default 50
  priceFrom?: number;
  layout?: "split" | "centered" | "text_only";
}

interface HeroContent extends Record<string, unknown> {
  intervalSeconds?: number;
  slides: HeroSlide[];
  stats: { value: number; suffix: string; decimals?: number; label: string }[];
  showStats: boolean;
}

const DEFAULT_HERO_VIDEO =
  "https://res.cloudinary.com/duhcdxdvy/video/upload/v1785234971/yamora/homepage/bxuek3nfq3shaze9qytt.mp4";

const HERO_FALLBACK: HeroContent = {
  intervalSeconds: 5,
  slides: [
    {
      id: "slide-1",
      enabled: true,
      badge: "Organic Purple Yam · Kettle Crisp Gold",
      headingLine1: "Welcome to the",
      headingLine2: "yamora chips",
      description:
        "Made from hand-selected fresh Ratalu, kettle-cooked into perfectly crispy wafers with unforgettable flavours. Small-batch, no artificial colours, delivered fresh.",
      primaryCta: { label: "Shop Now", href: "/shop" },
      secondaryCta: { label: "Explore Flavours", href: "#flavours" },
      video: DEFAULT_HERO_VIDEO,
      overlayOpacity: 50,
      layout: "split",
    },
  ],
  stats: [],
  showStats: false,
};

export function Hero() {
  const { settings } = useStoreSettings();
  const siteStats = useSiteStats();

  const cms = useSection<HeroContent>("hero", HERO_FALLBACK);
  const slides = React.useMemo(() => {
    const raw = (cms.slides ?? []).filter((s) => s.enabled !== false);
    return raw.length > 0 ? raw : HERO_FALLBACK.slides;
  }, [cms.slides]);

  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const intervalMs = (cms.intervalSeconds || 5) * 1000;

  // Auto-play carousel timer
  React.useEffect(() => {
    if (slides.length <= 1 || isPaused) return;
    const id = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [slides.length, intervalMs, isPaused]);

  // Keyboard navigation
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setCurrentIndex((p) => (p - 1 + slides.length) % slides.length);
      if (e.key === "ArrowRight") setCurrentIndex((p) => (p + 1) % slides.length);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [slides.length]);

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);

  const slide = slides[currentIndex] || slides[0];

  // Separate background video and foreground image
  const videoUrl = sanitizeMediaUrl(slide?.video || settings?.homepageHeroVideo || DEFAULT_HERO_VIDEO);
  const imageUrl = sanitizeMediaUrl(slide?.image || "");
  const overlayOpacity = ((slide?.overlayOpacity ?? 50) / 100).toFixed(2);

  const stats = React.useMemo(() => {
    const source = cms.stats && cms.stats.length > 0 ? cms.stats : HERO_FALLBACK.stats;
    const mapped = source
      .map((s) => {
        const label = String(s.label ?? "").toLowerCase();
        if (label.includes("rating")) {
          if (!siteStats || siteStats.avgRating == null) return null;
          return { ...s, value: siteStats.avgRating, decimals: 1, suffix: s.suffix || "★" };
        }
        if (label.includes("flavour") || label.includes("flavor")) {
          return siteStats?.flavourCount ? { ...s, value: siteStats.flavourCount, decimals: 0, suffix: "" } : s;
        }
        return s;
      })
      .filter((s): s is NonNullable<typeof s> => Boolean(s));

    return mapped;
  }, [cms.stats, siteStats]);

  const showStats = cms.showStats === true && stats.length > 0;

  const badgeCount = siteStats?.customerCount ?? 0;
  const heroFlavor = FLAVORS[currentIndex % FLAVORS.length];
  const isCentered = slide.layout === "centered";
  const isTextOnly = slide.layout === "text_only";

  return (
    <section
      id="hero"
      aria-label="Hero carousel"
      className="relative w-full overflow-hidden bg-[#1E0A1A] text-white"
      style={{ minHeight: "clamp(520px, 80vh, 860px)" }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* ── LAYER 0: Full-bleed background (video OR image) ─────────────── */}
      <AnimatePresence>
        <motion.div
          key={`bg-${currentIndex}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 z-0"
        >
          {videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              draggable={false}
            />
          ) : (
            // Fallback gradient background
            <div className="absolute inset-0 bg-gradient-to-br from-[#2A0C25] via-[#381132] to-[#4A1942]" />
          )}

          {/* Dark gradient overlay — keeps text readable, but video is clearly visible */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, rgba(26,4,22,${overlayOpacity}) 0%, rgba(42,12,37,${(Number(overlayOpacity) * 0.75).toFixed(2)}) 50%, rgba(26,4,22,${overlayOpacity}) 100%)`,
            }}
          />

          {/* Left-side stronger gradient so text is always legible */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#1E0A1A]/80 via-[#1E0A1A]/30 to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* ── LAYER 1: Ambient glow blobs ─────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 z-[1]" aria-hidden>
        <div className="absolute -left-20 top-1/4 h-80 w-80 rounded-full bg-[#6B2D5B]/30 blur-3xl" />
        <div className="absolute right-1/4 top-1/3 h-60 w-60 rounded-full bg-[#E8B923]/15 blur-3xl" />
        <div className="absolute bottom-8 left-1/3 h-64 w-64 rounded-full bg-[#8E4585]/20 blur-3xl" />
      </div>

      {/* ── LAYER 2: Prev / Next side arrows ────────────────────────────── */}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={prevSlide}
            aria-label="Previous slide"
            className="absolute left-3 top-1/2 z-20 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/50 active:scale-90 sm:left-5 sm:h-12 sm:w-12"
          >
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
          <button
            type="button"
            onClick={nextSlide}
            aria-label="Next slide"
            className="absolute right-3 top-1/2 z-20 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/50 active:scale-90 sm:right-5 sm:h-12 sm:w-12"
          >
            <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </>
      )}

      {/* ── LAYER 3: Content ─────────────────────────────────────────────── */}
      <div className="relative z-10 flex h-full w-full items-center" style={{ minHeight: "inherit" }}>
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id || currentIndex}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.55, ease: EASE }}
              className={cn(
                "grid items-center gap-8",
                isCentered || isTextOnly || !imageUrl
                  ? "place-items-center text-center max-w-4xl mx-auto"
                  : "grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12"
              )}
            >
              {/* ─── Left / Centre: Copy ─────────────────────────────────── */}
              <div className={cn("flex flex-col", isCentered || isTextOnly || !imageUrl ? "items-center text-center max-w-3xl mx-auto" : "items-start text-left")}>
                {/* Badge */}
                <motion.span
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#E8B923]/50 bg-[#6B2D5B]/70 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-widest text-[#F5D76E] shadow backdrop-blur-sm"
                >
                  <Sparkles className="h-3 w-3 text-[#E8B923]" />
                  {badgeCount > 0 && slide.badge?.includes("{count}")
                    ? slide.badge.replace("{count}", badgeCount.toLocaleString("en-IN"))
                    : slide.badge || "Organic Purple Yam · Kettle Crisp Gold"}
                </motion.span>

                {/* Heading */}
                <motion.h1
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.5 }}
                  className="mt-4 font-serif text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl"
                >
                  {slide.headingLine1}
                  {slide.headingLine2 && (
                    <span className="mt-1 block text-[#F5D76E]">{slide.headingLine2}</span>
                  )}
                </motion.h1>

                {/* Description */}
                {slide.description && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25, duration: 0.5 }}
                    className="mt-4 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base lg:text-lg"
                  >
                    {slide.description}
                  </motion.p>
                )}

                {/* CTAs */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.45 }}
                  className="mt-7 flex flex-wrap gap-3"
                >
                  <Button
                    asChild
                    size="lg"
                    className="bg-[#D4A017] text-[#1A0F0A] hover:bg-[#E8B923] font-extrabold shadow-xl shadow-[#D4A017]/30 transition-all active:scale-95"
                  >
                    <Link href={slide.primaryCta?.href || "/shop"}>
                      {slide.primaryCta?.label || "Shop Now"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>

                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 font-semibold"
                  >
                    <Link href={slide.secondaryCta?.href || "/shop?category=combos"}>
                      <ShoppingBag className="mr-2 h-4 w-4 text-[#F5D76E]" />
                      {slide.secondaryCta?.label || "Shop Combos"}
                    </Link>
                  </Button>
                </motion.div>

                {/* Stats bar */}
                {showStats && stats.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="mt-8 flex flex-wrap items-center gap-6 border-t border-white/10 pt-6"
                  >
                    {stats.map((s, idx) => (
                      <div key={idx} className="flex flex-col">
                        <span className="font-serif text-2xl font-extrabold text-[#F5D76E] sm:text-3xl">
                          <AnimatedCounter value={s.value} decimals={s.decimals} suffix={s.suffix} />
                        </span>
                        <span className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-white/60">
                          {s.label}
                        </span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </div>

              {/* ─── Right: Product visual (only shown when custom slide image is uploaded) ───────────── */}
              {!isCentered && !isTextOnly && imageUrl && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.6, ease: EASE }}
                  className="relative hidden lg:flex items-center justify-center"
                >
                  <div className="relative aspect-square w-full max-w-[460px] grid place-items-center">
                    {/* Glow ring */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#6B2D5B]/50 via-[#8E4585]/30 to-[#E8B923]/25 blur-2xl animate-pulse" />

                    <motion.img
                      src={imageUrl}
                      alt={slide.headingLine1 || "Featured Product"}
                      animate={{ y: [0, -12, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      className="relative z-10 max-h-[88%] max-w-[88%] object-contain drop-shadow-[0_24px_48px_rgba(0,0,0,0.6)] rounded-3xl"
                    />
                  </div>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── LAYER 4: Bottom bar — dot indicators + pause button ──────────── */}
      {slides.length > 1 && (
        <div className="absolute bottom-5 left-0 right-0 z-20 flex items-center justify-center gap-3 px-4">
          {/* Dot indicators */}
          <div className="flex items-center gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={cn(
                  "h-2 rounded-full transition-all duration-300 cursor-pointer",
                  currentIndex === idx
                    ? "w-8 bg-[#E8B923]"
                    : "w-2 bg-white/40 hover:bg-white/70"
                )}
              />
            ))}
          </div>

          {/* Pause/Play toggle */}
          <button
            type="button"
            onClick={() => setIsPaused((p) => !p)}
            aria-label={isPaused ? "Play slideshow" : "Pause slideshow"}
            className="ml-2 grid h-7 w-7 place-items-center rounded-full bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/30"
          >
            {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}
    </section>
  );
}
