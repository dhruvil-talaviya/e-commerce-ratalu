"use client";

import * as React from "react";
import { Star, Quote, Check, Send, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
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
  // Guard against landing on a now-empty page after the list shrinks/grows.
  const currentPage = Math.min(page, totalPages);
  const pagedReviews = React.useMemo(
    () => reviews.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [reviews, currentPage]
  );

  const goToPage = (next: number) => {
    setPage(next);
    // Bring the list back into view so the user isn't left mid-scroll.
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
      setPage(1); // jump to the top so the new review is visible
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
    if (!reviews.length) return 0;
    const total = reviews.reduce((acc, r) => acc + r.rating, 0);
    return (total / reviews.length).toFixed(1);
  }, [reviews]);

  return (
    <>
      <PageHeader
        eyebrow="Snacker Testimonials"
        title={
          <>
            Loved across India. <span className="text-gradient-warm">Hear their story.</span>
          </>
        }
        description="Read what our community thinks about the signature purple yam wafers. Share your own crunch story below."
        crumbs={[{ label: "Home", href: "/" }, { label: "Reviews" }]}
      />

      <div className="container-px mx-auto max-w-7xl py-12">
        {/* Rating summary banner */}
        <div className="mb-12 grid gap-6 rounded-3xl border border-[var(--color-border)] bg-purple-600 px-8 py-10 text-cream shadow-[var(--shadow-lift)] sm:grid-cols-3 sm:text-center">
          <div className="flex flex-col justify-center sm:items-center">
            <p className="text-sm text-cream/70 font-semibold uppercase tracking-wider">Average Rating</p>
            <p className="font-serif text-5xl font-bold text-gold-300 mt-2">{avgRating || "—"} ★</p>
            <div className="mt-2 flex justify-center">
              <StarRating rating={Number(avgRating)} size="md" />
            </div>
          </div>
          <div className="flex flex-col justify-center border-y border-white/10 py-6 sm:border-y-0 sm:border-x sm:py-0 sm:items-center">
            <p className="text-sm text-cream/70 font-semibold uppercase tracking-wider">Total Reviews</p>
            <p className="font-serif text-5xl font-bold text-cream mt-2">{reviews.length}</p>
            <p className="text-xs text-cream/70 mt-1">Verified purchases</p>
          </div>
          <div className="flex flex-col justify-center sm:items-center">
            <p className="text-sm text-cream/70 font-semibold uppercase tracking-wider">Recommendation</p>
            <p className="font-serif text-5xl font-bold text-gold-300 mt-2">98%</p>
            <p className="text-xs text-cream/70 mt-1">Would buy again</p>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
          {/* Reviews list */}
          <div id="reviews-list" className="flex flex-col gap-6 scroll-mt-24">
            <h2 className="font-serif text-2xl font-semibold text-charcoal">
              All Reviews ({reviews.length})
            </h2>

            {loading ? (
              /* Skeleton loaders */
              <div className="flex flex-col gap-5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-36 animate-pulse rounded-3xl bg-gray-100" />
                ))}
              </div>
            ) : reviews.length === 0 ? (
              <div className="rounded-3xl border border-[var(--color-border)] bg-white/70 p-12 text-center">
                <p className="text-charcoal-muted">No reviews yet. Be the first!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {pagedReviews.map((rev) => {
                  const key = String(rev._id || rev.id);
                  return (
                    <div
                      key={key}
                      className="rounded-3xl border border-[var(--color-border)] bg-white/70 p-6 shadow-sm backdrop-blur-sm transition-all hover:shadow-md"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span
                            className="grid size-10 place-items-center rounded-full text-sm font-bold text-white shadow-inner"
                            style={{
                              background: `linear-gradient(135deg, ${rev.avatarGradient.from}, ${rev.avatarGradient.to})`,
                            }}
                          >
                            {rev.initials}
                          </span>
                          <div>
                            <p className="font-bold text-charcoal text-sm">{rev.name}</p>
                            <p className="text-[10px] text-charcoal-soft">
                              {rev.location} · loves <strong className="text-purple-600">{rev.flavor}</strong>
                            </p>
                          </div>
                        </div>
                        <StarRating rating={rev.rating} size="sm" />
                      </div>
                      <div className="relative">
                        <Quote className="absolute -left-2 -top-2 size-8 text-purple-200/40 pointer-events-none" />
                        <p className="text-sm text-charcoal-muted leading-relaxed pl-5 italic">
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
              <div className="mt-2 flex items-center justify-center gap-2">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  aria-label="Previous page"
                  className="grid size-10 place-items-center rounded-full border border-[var(--color-border)] bg-white/70 text-charcoal transition-colors hover:bg-purple-50 hover:text-purple-700 disabled:cursor-not-allowed disabled:opacity-40"
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
                        ? "border-purple-600 bg-purple-600 text-cream"
                        : "border-[var(--color-border)] bg-white/70 text-charcoal hover:bg-purple-50 hover:text-purple-700"
                    )}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  aria-label="Next page"
                  className="grid size-10 place-items-center rounded-full border border-[var(--color-border)] bg-white/70 text-charcoal transition-colors hover:bg-purple-50 hover:text-purple-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight className="size-5" />
                </button>
              </div>
            )}
          </div>

          {/* Form */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-[var(--color-border)] bg-white/70 p-6 shadow-[var(--shadow-soft)] backdrop-blur-sm sm:p-8">
              <h3 className="font-serif text-xl font-bold text-charcoal">Write a Review</h3>
              <p className="text-xs text-charcoal-soft mt-1 mb-6">
                Tell us about your crunch experience. We read every review!
              </p>

              {submitted ? (
                <div className="flex flex-col items-center gap-4 py-12 text-center">
                  <span className="grid size-14 place-items-center rounded-full bg-green-500 text-white animate-bounce">
                    <Check className="size-7" strokeWidth={3} />
                  </span>
                  <div>
                    <h4 className="font-serif text-lg font-bold text-charcoal">Review Published!</h4>
                    <p className="text-xs text-charcoal-muted mt-1 leading-relaxed">
                      Thank you for sharing your thoughts. Your review is now visible.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  {error && (
                    <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wide text-charcoal-soft">Name</label>
                      <Input required placeholder="Rahul S." value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wide text-charcoal-soft">Location</label>
                      <Input required placeholder="Delhi, DL" value={location} onChange={(e) => setLocation(e.target.value)} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide text-charcoal-soft">Favorite Flavor</label>
                    <select
                      value={flavor}
                      onChange={(e) => setFlavor(e.target.value)}
                      className="w-full rounded-2xl border border-[var(--color-border)] bg-white/80 px-4 py-3 text-sm text-charcoal outline-none transition-all focus-visible:border-purple-400 focus-visible:ring-2 focus-visible:ring-purple-200"
                    >
                      {FLAVORS.map((f) => (
                        <option key={f.id} value={f.name}>{f.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide text-charcoal-soft">Rating</label>
                    <div className="flex items-center gap-1">
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
                              star <= rating ? "fill-gold-400 text-gold-400" : "fill-transparent text-purple-200"
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide text-charcoal-soft">Review Details</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="What did you love about these yams?"
                      value={quote}
                      onChange={(e) => setQuote(e.target.value)}
                      className="w-full rounded-2xl border border-[var(--color-border)] bg-white/80 px-4 py-3 text-sm text-charcoal outline-none transition-all placeholder:text-charcoal-soft focus-visible:border-purple-400 focus-visible:ring-2 focus-visible:ring-purple-200"
                    />
                  </div>

                  <Button type="submit" size="lg" className="w-full mt-2" disabled={submitting}>
                    {submitting ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Send className="size-4 mr-2" />}
                    {submitting ? "Publishing…" : "Publish Review"}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
