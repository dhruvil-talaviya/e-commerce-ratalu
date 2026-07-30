"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, Sparkles, Pause, Play } from "lucide-react";
import { useSection } from "@/components/cms/cms-provider";
import { cn, sanitizeMediaUrl } from "@/lib/utils";

export interface CarouselSlide {
  id: string;
  enabled?: boolean;
  image?: string;
  video?: string;
  badge?: string;
  title?: string;
  subtitle?: string;
  link?: string;
}

export interface FullWidthCarouselContent extends Record<string, unknown> {
  enabled?: boolean;
  autoSlide?: boolean;
  intervalSeconds?: number;
  slides: CarouselSlide[];
}

const FALLBACK_SLIDES: CarouselSlide[] = [
  {
    id: "photo-1",
    enabled: true,
    image: "https://images.unsplash.com/photo-1621447504864-d8686e12698c?q=80&w=1920&auto=format&fit=crop",
    badge: "Handcrafted Batch",
    title: "100% Heritage Ratalu",
    subtitle: "Sourced fresh from local farms in Gujarat, hand-sliced for optimal crunch.",
  },
  {
    id: "photo-2",
    enabled: true,
    image: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?q=80&w=1920&auto=format&fit=crop",
    badge: "Kettle Cooked Gold",
    title: "Golden Wafer Perfection",
    subtitle: "Slowly kettle-cooked in cold-pressed oil to lock in natural antioxidants.",
  },
  {
    id: "photo-3",
    enabled: true,
    image: "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?q=80&w=1920&auto=format&fit=crop",
    badge: "Vrat & Fasting Pure",
    title: "Seasoned with Rock Salt",
    subtitle: "Finished with Sendha Namak and authentic spices — 100% vegetarian & fasting friendly.",
  },
];

const FALLBACK_CONTENT: FullWidthCarouselContent = {
  enabled: true,
  autoSlide: true,
  intervalSeconds: 3.5,
  slides: FALLBACK_SLIDES,
};

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "100%" : "-100%",
    opacity: 0.7,
    scale: 1.02,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? "100%" : "-100%",
    opacity: 0.7,
    scale: 0.98,
  }),
};

export function FullWidthCarousel() {
  const cms = useSection<FullWidthCarouselContent>("full_width_carousel", FALLBACK_CONTENT);
  const slides = React.useMemo(() => {
    const list = (cms.slides ?? []).filter((s) => s.enabled !== false && (s.image || s.video));
    return list.length > 0 ? list : FALLBACK_SLIDES;
  }, [cms.slides]);

  const [[currentIndex, direction], setSlideState] = React.useState([0, 1]);

  const autoSlide = cms.autoSlide !== false;
  const intervalMs = (cms.intervalSeconds || 3.5) * 1000;

  const paginate = React.useCallback((newDirection: number) => {
    setSlideState(([prev]) => {
      const nextIndex = (prev + newDirection + slides.length) % slides.length;
      return [nextIndex, newDirection];
    });
  }, [slides.length]);

  React.useEffect(() => {
    if (!autoSlide || slides.length <= 1) return;
    const timer = setInterval(() => {
      paginate(1);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [autoSlide, slides.length, intervalMs, paginate]);

  if (cms.enabled === false) return null;

  const currentSlide = slides[currentIndex] || slides[0];

  const videoUrl = currentSlide.video ? sanitizeMediaUrl(currentSlide.video) : "";
  const imageUrl = currentSlide.image ? sanitizeMediaUrl(currentSlide.image) : "";

  return (
    <section
      id="photo-carousel"
      className="relative w-screen max-w-none left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] overflow-hidden bg-[#120814] py-0 my-4 sm:my-10 shadow-xl"
    >
      <div className="relative w-full h-[460px] xs:h-[500px] sm:h-[560px] lg:h-[650px] overflow-hidden bg-[#120814]">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={currentSlide.id || currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 260, damping: 28 },
              opacity: { duration: 0.4 },
              scale: { duration: 0.4 },
            }}
            className="absolute inset-0 size-full"
          >
            {/* Background Media (Video or Image) */}
            {videoUrl ? (
              <video
                src={videoUrl}
                autoPlay
                loop
                muted
                playsInline
                className="size-full object-cover object-center brightness-95"
              />
            ) : imageUrl ? (
              <img
                src={imageUrl}
                alt={currentSlide.title || "Ratalu Wafers Gallery"}
                className="size-full object-cover object-center brightness-95"
              />
            ) : (
              <div className="size-full bg-gradient-to-br from-[#290c24] via-[#120814] to-[#4a1942]" />
            )}

            {/* Light Black Ambient Overlays for Premium Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#120814] via-[#120814]/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#120814]/80 via-transparent to-[#120814]/80 hidden sm:block" />

            {/* Slide Content Overlay */}
            <div className="absolute inset-0 flex items-end sm:items-center justify-center p-6 pb-12 sm:p-12 lg:p-16">
              <div className="max-w-3xl text-center text-white">
                {currentSlide.badge && (
                  <motion.div
                    initial={{ y: 15, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.15 }}
                    className="mb-2 sm:mb-3.5 flex justify-center"
                  >
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E8B923]/50 bg-[#4A1942]/90 px-3.5 sm:px-4 py-1 text-[11px] sm:text-xs font-extrabold text-[#F5D76E] backdrop-blur-md shadow-lg">
                      <Sparkles className="size-3.5 text-[#E8B923]" /> {currentSlide.badge}
                    </span>
                  </motion.div>
                )}

                {currentSlide.title && (
                  <motion.h2
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.25 }}
                    className="font-serif text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight text-white drop-shadow-md"
                  >
                    {currentSlide.title}
                  </motion.h2>
                )}

                {currentSlide.subtitle && (
                  <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.35 }}
                    className="mt-2 sm:mt-3 max-w-2xl mx-auto text-xs xs:text-sm sm:text-base text-[#E8C8E4] font-medium leading-relaxed drop-shadow-xs"
                  >
                    {currentSlide.subtitle}
                  </motion.p>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Dynamic Navigation Arrows (Visible on sm+) */}
        {slides.length > 1 && (
          <>
            <button
              onClick={() => paginate(-1)}
              aria-label="Previous slide"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 hidden sm:flex size-10 items-center justify-center rounded-full bg-[#120814]/60 text-white backdrop-blur-md border border-white/10 hover:bg-[#120814]/90 transition-all cursor-pointer"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              onClick={() => paginate(1)}
              aria-label="Next slide"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 hidden sm:flex size-10 items-center justify-center rounded-full bg-[#120814]/60 text-white backdrop-blur-md border border-white/10 hover:bg-[#120814]/90 transition-all cursor-pointer"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}

        {/* Dynamic Dot Indicators (Both Mobile & Desktop) */}
        {slides.length > 1 && (
          <div className="absolute bottom-3.5 sm:bottom-5 inset-x-0 z-20 flex items-center justify-center gap-1.5 sm:gap-2">
            {slides.map((s, idx) => (
              <button
                key={s.id || idx}
                onClick={() => setSlideState([idx, idx > currentIndex ? 1 : -1])}
                aria-label={`Go to slide ${idx + 1}`}
                className={cn(
                  "h-1.5 sm:h-2 rounded-full transition-all duration-300 cursor-pointer",
                  idx === currentIndex
                    ? "w-6 sm:w-8 bg-[#E8B923] shadow-md"
                    : "w-1.5 sm:w-2 bg-white/40 hover:bg-white/70"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
