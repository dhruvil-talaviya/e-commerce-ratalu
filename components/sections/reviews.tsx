"use client";

import { motion } from "motion/react";
import { Quote } from "lucide-react";
import { SectionHeading } from "@/components/common/section-heading";
import { StarRating } from "@/components/common/star-rating";
import { AnimatedCounter } from "@/components/common/animated-counter";
import { Reveal } from "@/components/common/reveal";
import { REVIEWS, REVIEW_STATS } from "@/lib/data/reviews";
import type { Review } from "@/lib/types";

export function Reviews() {
  // Two marquee rows travelling in opposite directions.
  const rowA = [...REVIEWS, ...REVIEWS];
  const rowB = [...REVIEWS.slice().reverse(), ...REVIEWS.slice().reverse()];

  return (
    <section id="reviews" className="relative scroll-mt-24 overflow-hidden py-16 sm:py-20 lg:py-24">
      <div className="container-px mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Loved across India"
          title={
            <>
              Don&apos;t take our word.
              <br />
              Take <span className="text-gradient-warm">theirs.</span>
            </>
          }
        />

        {/* Rating summary */}
        <Reveal className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-x-10 gap-y-4">
          <div className="flex items-center gap-3">
            <span className="font-serif text-5xl font-bold text-charcoal">
              <AnimatedCounter value={REVIEW_STATS.averageRating} decimals={1} />
            </span>
            <div>
              <StarRating rating={5} size="md" />
              <p className="mt-1 text-sm text-charcoal-muted">
                {REVIEW_STATS.totalReviews.toLocaleString("en-IN")} verified reviews
              </p>
            </div>
          </div>
          <div className="h-12 w-px bg-[var(--color-border)]" />
          <div className="text-center">
            <p className="font-serif text-5xl font-bold text-purple-700">
              <AnimatedCounter value={REVIEW_STATS.wouldRecommend} suffix="%" />
            </p>
            <p className="mt-1 text-sm text-charcoal-muted">would recommend</p>
          </div>
        </Reveal>
      </div>

      {/* Marquee rows */}
      <div className="relative mt-14 flex flex-col gap-6">
        <MarqueeRow items={rowA} duration={46} />
        <MarqueeRow items={rowB} duration={54} reverse />
        {/* edge fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[var(--color-cream)] to-transparent sm:w-40" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[var(--color-cream)] to-transparent sm:w-40" />
      </div>
    </section>
  );
}

function MarqueeRow({
  items,
  duration,
  reverse = false,
}: {
  items: Review[];
  duration: number;
  reverse?: boolean;
}) {
  return (
    <div className="group flex overflow-hidden">
      <motion.div
        className="flex shrink-0 gap-6 pr-6"
        animate={{ x: reverse ? ["-50%", "0%"] : ["0%", "-50%"] }}
        transition={{ duration, repeat: Infinity, ease: "linear" }}
      >
        {items.map((r, i) => (
          <ReviewCard key={`${r.id}-${i}`} review={r} />
        ))}
      </motion.div>
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <figure className="flex w-80 shrink-0 flex-col rounded-3xl border border-[var(--color-border)] bg-white/80 p-6 shadow-[var(--shadow-soft)] backdrop-blur-sm sm:w-96">
      <div className="flex items-center justify-between">
        <StarRating rating={review.rating} size="sm" />
        <Quote className="size-6 text-purple-200" />
      </div>
      <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-charcoal">
        &ldquo;{review.quote}&rdquo;
      </blockquote>
      <figcaption className="mt-5 flex items-center gap-3 border-t border-[var(--color-border)] pt-4">
        <span
          className="grid size-11 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
          style={{
            background: `linear-gradient(135deg, ${review.avatarGradient.from}, ${review.avatarGradient.to})`,
          }}
        >
          {review.initials}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-charcoal">{review.name}</p>
          <p className="truncate text-xs text-charcoal-muted">
            {review.location} · loves {review.flavor}
          </p>
        </div>
      </figcaption>
    </figure>
  );
}
