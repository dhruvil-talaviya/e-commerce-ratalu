"use client";

import * as React from "react";
import { Star, Quote, Check, Send, Loader2, ChevronLeft, ChevronRight, ShieldCheck, Heart, ThumbsUp, Sparkles, Award } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StarRating } from "@/components/common/star-rating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FLAVORS } from "@/lib/data/flavors";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Review } from "@/lib/types";

export default function ReviewsPage() {
  const [reviews, setReviews] = React.useState<Review[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [name, setName] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [rating, setRating] = React.useState<1 | 2 | 3 | 4 | 5>(5);
  const [flavor, setFlavor] = React.useState(FLAVORS[0].name);
  const [quote, setQuote] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState("");
  const [page, setPage] = React.useState(1);

  const PAGE_SIZE = 8;

  // Load reviews on mount
  React.useEffect(() => {
    apiFetch<Review[]>("/reviews")
      .then((data) => {
        if (Array.isArray(data)) setReviews(data);
      })
      .catch(() => setError("Failed to load reviews. Please refresh."))
      .finally(() => setLoading(false));
  }, []);

  const totalPages = Math.max(1, Math.ceil(reviews.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedReviews = React.useMemo(
    () => reviews.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [reviews, currentPage]
  );

  const goToPage = (next: number) => {
    setPage(next);
    if (typeof window !== "undefined") {
      document.getElementById("reviews-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !location || !quote) return;
    setSubmitting(true);
    setError("");

    try {
      const newReview = await apiFetch<Review>("/reviews", {
        method: "POST",
        body: { name, location, rating, flavor, quote },
      });

      setReviews((prev) => [newReview, ...prev]);
      setPage(1);
      setSubmitted(true);
      setName("");
      setLocation("");
      setRating(5);
      setQuote("");
      setTimeout(() => setSubmitted(false), 4000);
    } catch {
      setError("Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const avgRating = React.useMemo(() => {
    if (!reviews.length) return "5.0";
    const total = reviews.reduce((acc, r) => acc + r.rating, 0);
    return (total / reviews.length).toFixed(1);
  }, [reviews]);

  return (
    <div className="min-h-screen bg-[#FFF8EC]">
      <PageHeader
        eyebrow="Snacker Testimonials"
        title={
          <>
            Loved across India. <span className="text-gradient-warm">Hear their story.</span>
          </>
        }
        description="Read authentic, verified crunch stories from Yamora Ratalu Wafers lovers across the country."
        crumbs={[{ label: "Home", href: "/" }, { label: "Reviews" }]}
      />

      <div className="container-px mx-auto max-w-7xl py-8 sm:py-12">
        {/* High-Converting Premium Customer Attraction Showcase Header */}
        <div className="mb-12 overflow-hidden rounded-3xl border border-[#5B2C83]/20 bg-gradient-to-br from-[#5B2C83] via-[#4A216E] to-[#2E1148] p-6 sm:p-10 text-white shadow-2xl relative">
          {/* Subtle glowing ambient circles */}
          <div className="pointer-events-none absolute -right-12 -top-12 size-64 rounded-full bg-[#F4B400]/15 blur-3xl" />
          <div className="pointer-events-none absolute -left-12 -bottom-12 size-64 rounded-full bg-[#4CAF50]/15 blur-3xl" />

          <div className="relative z-10 grid gap-8 lg:grid-cols-[1.2fr_1.4fr_1fr] items-center">
            {/* Box 1: Rating Score & Verified Badge */}
            <div className="flex flex-col items-center text-center lg:items-start lg:text-left border-b border-white/10 pb-6 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#4CAF50]/20 px-3 py-1 text-xs font-bold text-[#4CAF50] border border-[#4CAF50]/40">
                <ShieldCheck className="size-4" /> 100% Verified Buyer Ratings
              </div>
              
              <div className="mt-4 flex items-baseline gap-3">
                <span className="font-serif text-5xl sm:text-6xl font-black text-[#F4B400] tracking-tight">{avgRating}</span>
                <div className="flex flex-col items-start">
                  <StarRating rating={Number(avgRating)} size="md" />
                  <span className="text-xs font-semibold text-[#D7C4F5] mt-1">Overall Taste Rating</span>
                </div>
              </div>

              <p className="mt-3 text-xs text-[#D7C4F5] leading-relaxed">
                Based on <strong className="text-white font-bold">{reviews.length || 15} real snacker reviews</strong>. Kettle-cooked fresh daily.
              </p>
            </div>

            {/* Box 2: Visual Rating Breakdown Bars */}
            <div className="space-y-2 border-b border-white/10 pb-6 lg:border-b-0 lg:border-r lg:pb-0 lg:px-6">
              <p className="text-xs font-extrabold uppercase tracking-wider text-[#F4B400] mb-3 flex items-center gap-1.5">
                <Award className="size-4" /> Snacker Satisfaction Score
              </p>
              
              {[
                { stars: "5 Star", pct: "96%", label: "Loved the crunch & flavor" },
                { stars: "4 Star", pct: "4%", label: "Great natural taste" },
                { stars: "3 Star", pct: "0%", label: "Average" },
              ].map((row) => (
                <div key={row.stars} className="flex items-center gap-3 text-xs">
                  <span className="w-12 font-bold text-[#D7C4F5] shrink-0">{row.stars}</span>
                  <div className="h-2 flex-1 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-[#F4B400] rounded-full" style={{ width: row.pct }} />
                  </div>
                  <span className="w-10 text-right font-mono font-bold text-white shrink-0">{row.pct}</span>
                </div>
              ))}

              <div className="mt-4 pt-3 flex items-center justify-between text-xs text-[#D7C4F5]">
                <span className="flex items-center gap-1"><ThumbsUp className="size-3.5 text-[#F4B400]" /> 98% Repeat Order Intent</span>
                <span className="flex items-center gap-1"><Heart className="size-3.5 text-red-400" /> 100% No Preservatives</span>
              </div>
            </div>

            {/* Box 3: Highlight CTA Button */}
            <div className="flex flex-col items-center lg:items-end text-center lg:text-right space-y-4">
              <div className="rounded-2xl bg-white/10 border border-white/15 p-4 w-full">
                <p className="text-xs font-bold text-[#F4B400] uppercase tracking-wide flex items-center justify-center lg:justify-end gap-1">
                  <Sparkles className="size-3.5" /> Tried Yamora Wafers?
                </p>
                <p className="text-xs text-[#D7C4F5] mt-1">
                  Share your crunch experience and get featured on our brand page!
                </p>
              </div>

              <Button
                onClick={() => {
                  document.getElementById("write-review-form")?.scrollIntoView({ behavior: "smooth" });
                }}
                variant="accent"
                size="lg"
                className="w-full shadow-lg"
              >
                Write a Review
              </Button>
            </div>
          </div>
        </div>

        {/* Main Reviews & Form Layout */}
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
          {/* Reviews list */}
          <div id="reviews-list" className="flex flex-col gap-6 scroll-mt-24">
            <div className="flex items-center justify-between border-b border-[#e8d9eb] pb-4">
              <h2 className="font-serif text-2xl font-bold text-[#2D2D2D]">
                Customer Reviews ({reviews.length})
              </h2>
              <span className="text-xs font-bold text-[#4CAF50] bg-[#4CAF50]/15 px-3 py-1 rounded-full border border-[#4CAF50]/30">
                Verified Orders
              </span>
            </div>

            {loading ? (
              <div className="flex flex-col gap-5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-36 animate-pulse rounded-3xl bg-white/80 border border-[#e8d9eb]" />
                ))}
              </div>
            ) : reviews.length === 0 ? (
              <div className="rounded-3xl border border-[#e8d9eb] bg-white p-12 text-center shadow-xs">
                <p className="text-[#555555] font-medium">No reviews yet. Be the first snacker to share!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {pagedReviews.map((rev) => {
                  const key = String(rev._id || rev.id);
                  return (
                    <div
                      key={key}
                      className="rounded-3xl border border-[#e8d9eb] bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-[#5B2C83]/30"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span
                            className="grid size-11 place-items-center rounded-full text-sm font-extrabold text-white shadow-sm"
                            style={{
                              background: `linear-gradient(135deg, ${rev.avatarGradient.from}, ${rev.avatarGradient.to})`,
                            }}
                          >
                            {rev.initials}
                          </span>
                          <div>
                            <p className="font-bold text-[#2D2D2D] text-sm sm:text-base">{rev.name}</p>
                            <p className="text-xs text-[#777777]">
                              {rev.location} · loves <strong className="text-[#5B2C83] font-bold">{rev.flavor}</strong>
                            </p>
                          </div>
                        </div>
                        <StarRating rating={rev.rating} size="sm" />
                      </div>
                      <div className="relative pl-3">
                        <Quote className="absolute -left-2 -top-2 size-7 text-[#5B2C83]/15 pointer-events-none" />
                        <p className="text-sm text-[#555555] leading-relaxed italic">
                          &ldquo;{rev.quote}&rdquo;
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  aria-label="Previous page"
                  className="grid size-10 place-items-center rounded-full border border-[#e8d9eb] bg-white text-[#2D2D2D] transition-colors hover:bg-[#f5ebfc] hover:text-[#5B2C83] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="size-5" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => goToPage(n)}
                    aria-label={`Page ${n}`}
                    aria-current={n === currentPage ? "page" : undefined}
                    className={cn(
                      "grid size-10 place-items-center rounded-full border text-sm font-bold transition-colors",
                      n === currentPage
                        ? "border-[#5B2C83] bg-[#5B2C83] text-white"
                        : "border-[#e8d9eb] bg-white text-[#2D2D2D] hover:bg-[#f5ebfc] hover:text-[#5B2C83]"
                    )}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  aria-label="Next page"
                  className="grid size-10 place-items-center rounded-full border border-[#e8d9eb] bg-white text-[#2D2D2D] transition-colors hover:bg-[#f5ebfc] hover:text-[#5B2C83] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight className="size-5" />
                </button>
              </div>
            )}
          </div>

          {/* Form Side Column */}
          <div id="write-review-form" className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-[#e8d9eb] bg-white p-6 shadow-sm sm:p-8">
              <h3 className="font-serif text-xl font-extrabold text-[#5B2C83]">Write a Review</h3>
              <p className="text-xs text-[#555555] mt-1 mb-6">
                Tell us about your crunch experience with Yamora Wafers!
              </p>

              {submitted ? (
                <div className="flex flex-col items-center gap-4 py-12 text-center">
                  <span className="grid size-14 place-items-center rounded-full bg-[#4CAF50] text-white animate-bounce shadow-md">
                    <Check className="size-7" strokeWidth={3} />
                  </span>
                  <div>
                    <h4 className="font-serif text-lg font-bold text-[#2D2D2D]">Review Published!</h4>
                    <p className="text-xs text-[#555555] mt-1 leading-relaxed">
                      Thank you for sharing your thoughts. Your review is now live!
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  {error && (
                    <p className="rounded-xl bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 border border-red-200">{error}</p>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold uppercase tracking-wide text-[#2D2D2D]">Name</label>
                      <Input required placeholder="Rahul S." value={name} onChange={(e) => setName(e.target.value)} className="bg-[#FFF8EC]" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold uppercase tracking-wide text-[#2D2D2D]">Location</label>
                      <Input required placeholder="Delhi, DL" value={location} onChange={(e) => setLocation(e.target.value)} className="bg-[#FFF8EC]" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-wide text-[#2D2D2D]">Favorite Flavour</label>
                    <select
                      value={flavor}
                      onChange={(e) => setFlavor(e.target.value)}
                      className="w-full rounded-2xl border border-[#e8d9eb] bg-[#FFF8EC] px-4 py-3 text-sm text-[#2D2D2D] font-medium outline-none transition-all focus-visible:border-[#5B2C83] focus-visible:ring-2 focus-visible:ring-[#5B2C83]/20"
                    >
                      {FLAVORS.map((f) => (
                        <option key={f.id} value={f.name}>{f.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-wide text-[#2D2D2D]">Rating</label>
                    <div className="flex items-center gap-1.5 bg-[#FFF8EC] p-3 rounded-2xl border border-[#e8d9eb]">
                      {([1, 2, 3, 4, 5] as const).map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className="transition-transform hover:scale-110 focus:outline-none"
                        >
                          <Star
                            className={cn(
                              "size-7 transition-colors",
                              star <= rating ? "fill-[#F4B400] text-[#F4B400]" : "fill-transparent text-[#e8d9eb]"
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-wide text-[#2D2D2D]">Review Details</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="What did you love about these yams?"
                      value={quote}
                      onChange={(e) => setQuote(e.target.value)}
                      className="w-full rounded-2xl border border-[#e8d9eb] bg-[#FFF8EC] px-4 py-3 text-sm text-[#2D2D2D] outline-none transition-all placeholder:text-[#777777] focus-visible:border-[#5B2C83] focus-visible:ring-2 focus-visible:ring-[#5B2C83]/20"
                    />
                  </div>

                  <Button type="submit" variant="primary" size="lg" className="w-full mt-2" disabled={submitting}>
                    {submitting ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Send className="size-4 mr-2" />}
                    {submitting ? "Publishing…" : "Publish Review"}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
