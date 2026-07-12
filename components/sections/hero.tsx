"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import { ArrowRight, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WaferVisual } from "@/components/common/wafer-visual";
import { AnimatedCounter } from "@/components/common/animated-counter";
import { FLAVORS } from "@/lib/data/flavors";
import { REVIEW_STATS } from "@/lib/data/reviews";
import { useLanguage } from "@/components/common/language-provider";

const EASE = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  const ref = React.useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { t } = useLanguage();
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
    <section ref={ref} className="relative overflow-hidden bg-radial-cream">
      {/* Decorative background — orange/yellow glow orbs */}
      <motion.div style={{ y: yGlow }} className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-24 top-24 size-96 rounded-full bg-orange-200/40 blur-3xl" />
        <div className="absolute -right-16 top-40 size-80 rounded-full bg-yellow-200/40 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 size-72 rounded-full bg-orange-100/50 blur-3xl" />
      </motion.div>

      <div className="container-px relative mx-auto grid max-w-7xl items-center gap-10 py-14 sm:gap-12 sm:py-16 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:py-24">
        {/* Copy */}
        <motion.div variants={container} initial="hidden" animate="visible" className="relative z-10">
          {/* Social proof badge */}
          <motion.div variants={item}>
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-white/80 px-4 py-1.5 text-xs font-semibold text-orange-700 shadow-[var(--shadow-soft)] backdrop-blur">
              <span className="flex -space-x-0.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} className="size-3.5 fill-yellow-400 text-yellow-400" />
                ))}
              </span>
              {t("hero_badge", { count: REVIEW_STATS.totalReviews.toLocaleString("en-IN") })}
            </span>
          </motion.div>

          {/* Hero heading — 48px Bold Poppins */}
          <motion.h1
            variants={item}
            className="mt-6 text-[clamp(2.1rem,8vw,3rem)] font-bold leading-[1.05] text-gray-800 lg:text-5xl"
          >
            {t("hero_heading_1")}
            <br />
            <span className="text-gradient-warm">{t("hero_heading_2")}</span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-6 max-w-xl text-lg leading-relaxed text-gray-500"
          >
            {t("hero_description")}
          </motion.p>

          <motion.div variants={item} className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="xl">
              <Link href="/shop">
                {t("hero_cta_shop")} <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="xl" variant="outline">
              <Link href="#flavours">
                <Sparkles /> {t("hero_cta_explore")}
              </Link>
            </Button>
          </motion.div>

          {/* Trust stats */}
          <motion.div
            variants={item}
            className="mt-10 grid max-w-lg grid-cols-3 gap-3 border-t border-[var(--color-border)] pt-7 sm:mt-12 sm:gap-4 sm:pt-8"
          >
            <Stat value={<AnimatedCounter value={REVIEW_STATS.averageRating} decimals={1} suffix="★" />} label={t("hero_stat_rating")} />
            <Stat value={<AnimatedCounter value={6} suffix="" />} label={t("hero_stat_flavors")} />
            <Stat value={<><AnimatedCounter value={100} suffix="%" /></>} label={t("hero_stat_natural")} />
          </motion.div>
        </motion.div>

        {/* Visual */}
        <motion.div
          style={{ y: yVisual }}
          className="relative z-0 mx-auto aspect-square w-full max-w-lg"
        >
          {/* rotating dashed ring */}
          <div className="absolute inset-4 rounded-full border border-dashed border-orange-200 animate-spin-slow" aria-hidden />
          <div className="absolute inset-0 -z-10 rounded-full bg-gradient-to-br from-white/70 to-transparent blur-2xl" aria-hidden />

          {/* hero chip */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, rotate: -6 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.2 }}
            className="relative z-10 h-full w-full drop-shadow-2xl"
          >
            <WaferVisual flavor={hero} />
          </motion.div>

          {/* floating price tag */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6, ease: EASE }}
            className="absolute right-2 top-8 z-20 rounded-2xl border border-[var(--color-border)] bg-white/90 px-4 py-3 shadow-[var(--shadow-lift)] backdrop-blur animate-float-slow"
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{t("hero_price_from")}</p>
            <p className="text-2xl font-bold text-orange-500">₹99</p>
          </motion.div>

          {/* orbiting flavour chips */}
          {orbit.map((f, i) => {
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
                className={`absolute z-20 size-16 rounded-2xl border border-white/60 shadow-[var(--shadow-lift)] backdrop-blur sm:size-20 ${positions[i]}`}
                style={{ animation: `float-slow ${6 + i}s var(--ease-premium) ${i * 0.4}s infinite` }}
                title={f.name}
              >
                <WaferVisual flavor={f} seed={i + 1} />
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* scroll cue */}
      <div className="pointer-events-none absolute bottom-5 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-gray-400 lg:flex">
        <span className="text-[11px] uppercase tracking-[0.2em]">{t("hero_scroll")}</span>
        <span className="h-9 w-5 rounded-full border border-gray-300/60 p-1">
          <motion.span
            className="block size-1.5 rounded-full bg-orange-500"
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </span>
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
