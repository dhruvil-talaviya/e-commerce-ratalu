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

const EASE = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  const ref = React.useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
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
      {/* Decorative background */}
      <motion.div style={{ y: yGlow }} className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-24 top-24 size-96 rounded-full bg-purple-200/40 blur-3xl" />
        <div className="absolute -right-16 top-40 size-80 rounded-full bg-orange-200/40 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 size-72 rounded-full bg-gold-200/40 blur-3xl" />
      </motion.div>

      <div className="container-px relative mx-auto grid max-w-7xl items-center gap-12 py-16 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:py-24">
        {/* Copy */}
        <motion.div variants={container} initial="hidden" animate="visible" className="relative z-10">
          <motion.div variants={item}>
            <span className="inline-flex items-center gap-2 rounded-full border border-purple-100 bg-white/70 px-4 py-1.5 text-xs font-semibold text-purple-700 shadow-[var(--shadow-soft)] backdrop-blur">
              <span className="flex -space-x-0.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} className="size-3.5 fill-gold-400 text-gold-400" />
                ))}
              </span>
              Loved by {REVIEW_STATS.totalReviews.toLocaleString("en-IN")}+ snackers
            </span>
          </motion.div>

          <motion.h1
            variants={item}
            className="mt-6 font-serif text-5xl font-bold leading-[0.98] text-charcoal sm:text-6xl lg:text-7xl"
          >
            Crispy. Natural.
            <br />
            <span className="text-gradient-warm">Irresistible.</span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-6 max-w-xl text-lg leading-relaxed text-charcoal-muted"
          >
            Made from carefully selected fresh <em className="not-italic font-medium text-purple-700">Ratalu</em> and
            crafted into perfectly crispy wafers with unforgettable flavours. Small-batch,
            kettle-cooked, delivered fresh to your door.
          </motion.p>

          <motion.div variants={item} className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="xl">
              <Link href="/shop">
                Shop Now <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="xl" variant="outline">
              <Link href="#flavours">
                <Sparkles /> Explore Flavours
              </Link>
            </Button>
          </motion.div>

          {/* Trust stats */}
          <motion.div
            variants={item}
            className="mt-12 grid max-w-lg grid-cols-3 gap-4 border-t border-[var(--color-border)] pt-8"
          >
            <Stat value={<AnimatedCounter value={REVIEW_STATS.averageRating} decimals={1} suffix="★" />} label="Avg. rating" />
            <Stat value={<AnimatedCounter value={6} suffix="" />} label="Bold flavours" />
            <Stat value={<><AnimatedCounter value={100} suffix="%" /></>} label="Natural" />
          </motion.div>
        </motion.div>

        {/* Visual */}
        <motion.div
          style={{ y: yVisual }}
          className="relative z-0 mx-auto aspect-square w-full max-w-lg"
        >
          {/* rotating dashed ring */}
          <div className="absolute inset-4 rounded-full border border-dashed border-purple-200 animate-spin-slow" aria-hidden />
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
            <p className="text-[11px] font-medium uppercase tracking-wide text-charcoal-soft">From</p>
            <p className="font-serif text-2xl font-bold text-purple-700">₹99</p>
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
      <div className="pointer-events-none absolute bottom-5 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-charcoal-soft lg:flex">
        <span className="text-[11px] uppercase tracking-[0.2em]">Scroll</span>
        <span className="h-9 w-5 rounded-full border border-charcoal-soft/40 p-1">
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
      <p className="font-serif text-3xl font-bold text-charcoal">{value}</p>
      <p className="mt-1 text-xs text-charcoal-muted">{label}</p>
    </div>
  );
}
