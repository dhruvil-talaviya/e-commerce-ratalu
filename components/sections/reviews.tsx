"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Quote } from "lucide-react";
import { SectionHeading } from "@/components/common/section-heading";
import { StarRating } from "@/components/common/star-rating";
import { AnimatedCounter } from "@/components/common/animated-counter";
import { Reveal } from "@/components/common/reveal";
import { apiFetch } from "@/lib/api";
import { useSection } from "@/components/cms/cms-provider";
import type { HeadingContent } from "@/components/cms/types";
import type { Review } from "@/lib/types";
import { useStoreSettings } from "@/components/common/settings-provider";
import { sanitizeMediaUrl } from "@/lib/utils";

/** Heading copy, editable in the Website Builder (was hardcoded). */
const HEADING_FALLBACK: HeadingContent = {
  eyebrow: "Loved across India",
  title: "Don't take our word.",
  titleHighlight: "Take theirs.",
};

// Fallback reviews shown while loading or on API error
const FALLBACK_REVIEWS: Review[] = [
  { id: "r1", name: "Ananya Mehta", location: "Mumbai, MH", rating: 5, quote: "I genuinely didn't expect a yam wafer to become my whole family's obsession. The Original Salted is impossibly crisp and doesn't taste oily at all. We're on our fourth order.", flavor: "Original Salted", initials: "AM", avatarGradient: { from: "#7a3f9c", to: "#5b2c6f" } },
  { id: "r2", name: "Rohan Desai", location: "Ahmedabad, GJ", rating: 5, quote: "The Peri Peri is the real deal — proper slow-building heat, not just spice powder. Packaging arrived sealed and premium. Feels like a brand from abroad, made right here.", flavor: "Peri Peri", initials: "RD", avatarGradient: { from: "#e0452e", to: "#c9291a" } },
  { id: "r3", name: "Sneha Iyer", location: "Bengaluru, KA", rating: 5, quote: "Classic Masala took me straight back to my grandmother's kitchen. You can actually taste the roasted cumin. My kids finished a 500g pack in two days.", flavor: "Classic Masala", initials: "SI", avatarGradient: { from: "#ec8a35", to: "#c9691a" } },
  { id: "r4", name: "Kabir Malhotra", location: "New Delhi, DL", rating: 5, quote: "Ordered the Black Pepper on a whim and it's now my desk snack. Refined, aromatic, and it stays crunchy till the last piece. Delivery was quick too.", flavor: "Black Pepper", initials: "KM", avatarGradient: { from: "#4a4a52", to: "#2c2c2c" } },
  { id: "r5", name: "Priya Nair", location: "Kochi, KL", rating: 5, quote: "The Cheese flavour is dangerously good — rich but never heavy. I love that there are no weird artificial colours. Finally a snack I feel good about sharing.", flavor: "Cheese", initials: "PN", avatarGradient: { from: "#f4c542", to: "#c3941a" } },
  { id: "r6", name: "Aditya Rao", location: "Pune, MH", rating: 5, quote: "Green Chilli with a cup of chai is my new evening ritual. Fresh, punchy and made in small batches — you can tell. Ratalu has completely spoiled other wafers for me.", flavor: "Green Chilli", initials: "AR", avatarGradient: { from: "#4e9c5a", to: "#2f7d3d" } },
];

export function Reviews() {
  const { settings } = useStoreSettings();
  const cmsContent = useSection<Record<string, any>>("testimonials", {});
  const heading = React.useMemo(() => {
    const merged = { ...HEADING_FALLBACK, ...cmsContent };
    if (cmsContent.title && !cmsContent.titleHighlight) {
      merged.titleHighlight = "";
    }
    return merged;
  }, [cmsContent]);

  const [reviews, setReviews] = React.useState<Review[]>(FALLBACK_REVIEWS);
  /** True once REAL reviews have loaded — the summary numbers depend on it. */
  const [hasReal, setHasReal] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    apiFetch<Review[]>("/reviews")
      .then((data) => {
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setReviews(data);
          setHasReal(true);
        }
      })
      .catch(() => { /* keep fallback cards */ });
    return () => { cancelled = true; };
  }, []);

  const avgRating = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);
  const totalReviews = reviews.length;

  // Derived from the real ratings, not a made-up "98%". Only shown with real data.
  const wouldRecommend = Math.round(
    (reviews.filter((r) => r.rating >= 4).length / reviews.length) * 100
  );

  // Two marquee rows travelling in opposite directions
  const rowA = [...reviews, ...reviews];
  const rowB = [...reviews.slice().reverse(), ...reviews.slice().reverse()];

  const videoUrl = sanitizeMediaUrl(heading.video || settings?.customerTestimonialsVideo || "");
  const autoplay = heading.autoplay !== undefined ? heading.autoplay : (settings?.autoplayVideo ?? true);
  const muted = heading.muted !== undefined ? heading.muted : (settings?.muteVideo ?? true);
  const loop = heading.loop !== undefined ? heading.loop : (settings?.loopVideo ?? true);

  return (
    <section id="testimonials" className="relative scroll-mt-24 overflow-hidden py-16 sm:py-20 lg:py-24">
      <div className="container-px mx-auto max-w-7xl">
        <SectionHeading
          eyebrow={heading.eyebrow}
          title={
            <>
              {heading.title}
              {heading.titleHighlight && (
                <>
                  {" "}
                  <span className="text-gradient-warm">{heading.titleHighlight}</span>
                </>
              )}
            </>
          }
          description={heading.description}
        />

        {/*
          Rating summary — real numbers only. It used to show a hardcoded 4.9★
          and "98% would recommend" even with no reviews. Now it derives both
          from the loaded reviews and appears only once real reviews exist.
        */}
        {hasReal && (
          <Reveal className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-x-10 gap-y-4">
            <div className="flex items-center gap-3">
              <span className="font-serif text-5xl font-bold text-charcoal">
                <AnimatedCounter value={Number(avgRating)} decimals={1} />
              </span>
              <div>
                <StarRating rating={Math.round(Number(avgRating))} size="md" />
                <p className="mt-1 text-sm text-charcoal-muted">
                  {totalReviews.toLocaleString("en-IN")} verified{" "}
                  {totalReviews === 1 ? "review" : "reviews"}
                </p>
              </div>
            </div>
            <div className="h-12 w-px bg-[var(--color-border)]" />
            <div className="text-center">
              <p className="font-serif text-5xl font-bold text-purple-700">
                <AnimatedCounter value={wouldRecommend} suffix="%" />
              </p>
              <p className="mt-1 text-sm text-charcoal-muted">would recommend</p>
            </div>
          </Reveal>
        )}
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
          <ReviewCard key={`${r._id || r.id}-${i}`} review={r} />
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
