"use client";

import * as React from "react";
import { Star, Quote, Check, Send } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StarRating } from "@/components/common/star-rating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { REVIEWS } from "@/lib/data/reviews";
import { FLAVORS } from "@/lib/data/flavors";
import { cn } from "@/lib/utils";

export default function ReviewsPage() {
  const [reviews, setReviews] = React.useState(REVIEWS);
  const [name, setName] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [rating, setRating] = React.useState<1 | 2 | 3 | 4 | 5>(5);
  const [flavor, setFlavor] = React.useState(FLAVORS[0].name);
  const [quote, setQuote] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !location || !quote) return;

    // Pick a random gradient for the avatar
    const gradients = [
      { from: "#7a3f9c", to: "#5b2c6f" },
      { from: "#ec8a35", to: "#c9691a" },
      { from: "#e0452e", to: "#c9291a" },
      { from: "#4a4a52", to: "#2c2c2c" },
      { from: "#f4c542", to: "#c3941a" },
      { from: "#4e9c5a", to: "#2f7d3d" },
    ];
    const avatarGradient = gradients[Math.floor(Math.random() * gradients.length)];

    const initials = name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const newReview = {
      id: "user-" + Date.now(),
      name,
      location,
      rating,
      quote,
      flavor,
      initials,
      avatarGradient,
    };

    setReviews([newReview, ...reviews]);
    setSubmitted(true);

    // Reset form fields
    setName("");
    setLocation("");
    setRating(5);
    setQuote("");

    setTimeout(() => {
      setSubmitted(false);
    }, 4000);
  };

  const avgRating = React.useMemo(() => {
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
            <p className="font-serif text-5xl font-bold text-gold-300 mt-2">{avgRating} ★</p>
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
          <div className="flex flex-col gap-6">
            <h2 className="font-serif text-2xl font-semibold text-charcoal">
              All Reviews ({reviews.length})
            </h2>
            <div className="flex flex-col gap-5">
              {reviews.map((rev) => (
                <div
                  key={rev.id}
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
              ))}
            </div>
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
                      Thank you for sharing your thoughts. Your review is visible in the reviews log.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wide text-charcoal-soft">Name</label>
                      <Input
                        required
                        placeholder="Rahul S."
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wide text-charcoal-soft">Location</label>
                      <Input
                        required
                        placeholder="Delhi, DL"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                      />
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
                        <option key={f.id} value={f.name}>
                          {f.name}
                        </option>
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
                              star <= rating
                                ? "fill-gold-400 text-gold-400"
                                : "fill-transparent text-purple-200"
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

                  <Button type="submit" size="lg" className="w-full mt-2">
                    <Send className="size-4 mr-2" /> Publish Review
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
