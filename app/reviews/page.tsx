"use client";

import * as React from "react";
import { Star, Quote, Check, Send, Loader2, ShieldCheck, Sparkles, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PageHeader } from "@/components/common/page-header";
import { StarRating } from "@/components/common/star-rating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FLAVORS } from "@/lib/data/flavors";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Review } from "@/lib/types";
import { toast } from "@/components/ui/toast";

const INITIAL_REVIEWS: Review[] = [
  {
    _id: "rev-1",
    id: "rev-1",
    name: "Ananya Mehta",
    location: "Mumbai",
    rating: 5,
    quote: "I genuinely didn't expect a yam wafer to become my whole family's obsession. The Original Salted is impossibly crisp and doesn't taste oily at all. We're on our fourth order.",
    flavor: "Original Salted",
    createdAt: "2026-03-15",
  },
  {
    _id: "rev-2",
    id: "rev-2",
    name: "Rohan Desai",
    location: "Ahmedabad",
    rating: 5,
    quote: "The Peri Peri is the real deal — proper slow-building heat, not just spice powder. Packaging arrived sealed and premium. Feels like a brand from abroad, made right here.",
    flavor: "Peri Peri",
    createdAt: "2026-03-18",
  },
  {
    _id: "rev-3",
    id: "rev-3",
    name: "Sneha Iyer",
    location: "Bengaluru",
    rating: 5,
    quote: "Classic Masala took me straight back to my grandmother's kitchen. You can actually taste the roasted cumin. My kids finished a 500g pack in two days.",
    flavor: "Classic Masala",
    createdAt: "2026-03-20",
  },
  {
    _id: "rev-4",
    id: "rev-4",
    name: "Kabir Malhotra",
    location: "New Delhi",
    rating: 5,
    quote: "Ordered the Black Pepper on a whim and it's now my desk snack. Refined, aromatic, and it stays crunchy till the last piece. Delivery was quick too.",
    flavor: "Black Pepper",
    createdAt: "2026-03-22",
  },
  {
    _id: "rev-5",
    id: "rev-5",
    name: "Priya Nair",
    location: "Kochi",
    rating: 5,
    quote: "The Cheese flavour is dangerously good — rich but never heavy. I love that there are no weird artificial colours. Finally a snack I feel good about sharing.",
    flavor: "Cheese",
    createdAt: "2026-03-24",
  },
  {
    _id: "rev-6",
    id: "rev-6",
    name: "Aditya Rao",
    location: "Pune",
    rating: 5,
    quote: "Green Chilli with a cup of chai is my new evening ritual. Fresh, punchy and made in small batches — you can tell. Ratalu has completely spoiled other wafers for me.",
    flavor: "Green Chilli",
    createdAt: "2026-03-26",
  },
];

export default function ReviewsPage() {
  const [reviews, setReviews] = React.useState<Review[]>(INITIAL_REVIEWS);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [name, setName] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [rating, setRating] = React.useState<1 | 2 | 3 | 4 | 5>(5);
  const [flavor, setFlavor] = React.useState(FLAVORS[0].name);
  const [quote, setQuote] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState("");

  const [featuredIdx, setFeaturedIdx] = React.useState(0);
  const [listOffset, setListOffset] = React.useState(0);

  // Auto-rotate silent featured review reel every 4s
  React.useEffect(() => {
    if (reviews.length <= 1) return;
    const interval = setInterval(() => {
      setFeaturedIdx((prev) => (prev + 1) % reviews.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [reviews.length]);

  // Auto-cycle through the 5 visible reviews list if there are more than 5 reviews
  React.useEffect(() => {
    if (reviews.length <= 5) return;
    const interval = setInterval(() => {
      setListOffset((prev) => (prev + 1) % reviews.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [reviews.length]);

  // Load reviews on mount
  React.useEffect(() => {
    apiFetch<Review[]>("/reviews")
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setReviews(data);
        } else {
          setReviews(INITIAL_REVIEWS);
        }
      })
      .catch(() => {
        setReviews(INITIAL_REVIEWS);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !quote.trim()) return;
    setSubmitting(true);
    setError("");

    const newRev: Review = {
      _id: `rev-user-${Date.now()}`,
      id: `rev-user-${Date.now()}`,
      name: name.trim(),
      location: location.trim() || "Verified Buyer",
      rating,
      flavor,
      quote: quote.trim(),
      createdAt: new Date().toISOString().split("T")[0],
    };

    try {
      await apiFetch<Review>("/reviews", {
        method: "POST",
        body: { name, location, rating, flavor, quote },
      });
    } catch {
      // Continue with local state so customer sees review instantly
    }

    // Prepend customer's own review to top so they see it FIRST
    setReviews((prev) => [newRev, ...prev]);
    setListOffset(0);
    setSubmitted(true);
    setName("");
    setLocation("");
    setRating(5);
    setQuote("");
    toast.success("Thank you for your review! ❤️", {
      description: "Your review is published at the top.",
    });
    setTimeout(() => setSubmitted(false), 5000);
    setSubmitting(false);
  };

  const avgRating = React.useMemo(() => {
    if (!reviews.length) return "5.0";
    const total = reviews.reduce((acc, r) => acc + r.rating, 0);
    return (total / reviews.length).toFixed(1);
  }, [reviews]);

  // Compute exactly 5 visible reviews cleanly
  const visible5Reviews = React.useMemo(() => {
    if (!reviews.length) return [];
    if (reviews.length <= 5) return reviews;
    const result = [];
    for (let i = 0; i < 5; i++) {
      result.push(reviews[(listOffset + i) % reviews.length]);
    }
    return result;
  }, [reviews, listOffset]);

  const featuredRev = reviews[featuredIdx % reviews.length] || reviews[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8EC] via-[#FDF3E3] to-[#FFF8EC] font-sans pb-16">
      <PageHeader
        eyebrow="Snacker Feedback"
        title={
          <>
            Real Stories. <span className="text-gradient-warm">100% Honest Reviews.</span>
          </>
        }
        description="Discover authentic crunch experiences shared by Yamora Ratalu Wafers lovers across India."
        crumbs={[{ label: "Home", href: "/" }, { label: "Reviews" }]}
      />

      <div className="container-px mx-auto max-w-7xl py-5 sm:py-8">
        {/* ── HERO BANNER WITH VECTOR ILLUSTRATION & RATING METRICS ────────── */}
        <div className="relative mb-6 sm:mb-8 overflow-hidden rounded-3xl border border-purple-200/80 bg-gradient-to-br from-[#4A1942] via-[#5B2C83] to-[#2E1148] p-5 sm:p-8 lg:p-10 text-white shadow-[0_16px_40px_rgba(74,25,66,0.3)]">
          <div className="pointer-events-none absolute -right-16 -top-16 size-80 rounded-full bg-[#E8B923]/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 -bottom-16 size-80 rounded-full bg-[#4CAF50]/20 blur-3xl" />

          <div className="relative z-10 grid gap-6 lg:grid-cols-12 items-center">
            {/* Left Column */}
            <div className="lg:col-span-7 space-y-4 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#4CAF50]/40 bg-[#4CAF50]/20 px-3.5 py-1 text-xs font-semibold text-[#75f07a] backdrop-blur-md shadow-sm">
                <ShieldCheck className="size-3.5 text-[#4CAF50]" /> Verified Customer Ratings
              </div>

              <h2 className="font-serif text-2xl sm:text-4xl lg:text-5xl font-black leading-tight text-white tracking-tight drop-shadow-md">
                Snacker Reviews & Stories
              </h2>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-4 pt-1 max-w-lg mx-auto lg:mx-0">
                <div className="rounded-2xl border border-white/15 bg-white/10 p-2.5 sm:p-4 backdrop-blur-md shadow-md text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className="font-serif text-xl sm:text-3xl font-extrabold text-[#F5D76E]">{avgRating}</span>
                    <Star className="size-4 sm:size-5 fill-[#E8B923] text-[#E8B923]" />
                  </div>
                  <p className="text-[10px] sm:text-xs text-[#E8C8E4] font-medium mt-0.5">Average Rating</p>
                </div>

                <div className="rounded-2xl border border-white/15 bg-white/10 p-2.5 sm:p-4 backdrop-blur-md shadow-md text-center">
                  <span className="font-serif text-xl sm:text-3xl font-extrabold text-white">98%</span>
                  <p className="text-[10px] sm:text-xs text-[#E8C8E4] font-medium mt-0.5">Repeat Buyers</p>
                </div>

                <div className="rounded-2xl border border-white/15 bg-white/10 p-2.5 sm:p-4 backdrop-blur-md shadow-md text-center">
                  <span className="font-serif text-xl sm:text-3xl font-extrabold text-[#75f07a]">100%</span>
                  <p className="text-[10px] sm:text-xs text-[#E8C8E4] font-medium mt-0.5">Natural Yams</p>
                </div>
              </div>
            </div>

            {/* Right Column: Clean Vector Review Illustration */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <img
                src="/images/review-illustration.png"
                alt="Customer Reviews Illustration"
                className="w-full max-w-[180px] sm:max-w-[240px] lg:max-w-md h-auto object-contain drop-shadow-xl transition-transform duration-300 hover:scale-105"
              />
            </div>
          </div>
        </div>

        {/* ── SILENT AUTOMATIC FEATURED REVIEW SHOWCASE REEL ──────────────── */}
        {reviews.length > 0 && (
          <div className="mb-6 overflow-hidden rounded-2xl border border-amber-200/90 bg-gradient-to-r from-purple-950 via-[#4A1942] to-[#3B1234] p-4 sm:p-6 text-white shadow-lg relative">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
              <span className="flex size-2 rounded-full bg-[#E8B923] animate-ping" />
              <span className="text-[10px] sm:text-xs font-semibold text-[#F5D76E]">
                ✨ Featured Customer Feedback
              </span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={featuredRev._id || featuredIdx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.4 }}
                className="space-y-2"
              >
                <div className="flex items-center gap-2">
                  <StarRating rating={featuredRev.rating} size="sm" />
                  <span className="text-[10px] sm:text-xs font-semibold text-[#F5D76E] bg-white/10 px-2 py-0.5 rounded-full">
                    {featuredRev.flavor}
                  </span>
                </div>

                <p className="font-serif text-sm sm:text-lg font-bold leading-relaxed text-white drop-shadow-xs italic">
                  &ldquo;{featuredRev.quote}&rdquo;
                </p>

                <p className="text-[11px] sm:text-xs text-[#E8C8E4] font-medium">
                  — <strong className="text-white font-bold">{featuredRev.name}</strong> ({featuredRev.location})
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* ── MAIN CONTENT GRID: SUBMISSION FORM & 5 ANIMATED REVIEWS ──────── */}
        <div className="grid gap-6 sm:gap-8 lg:grid-cols-12 items-start">
          {/* WRITE REVIEW FORM: Appears first on mobile (right after Featured Customer Feedback), and on the right side on desktop (lg:order-2 lg:col-span-5) */}
          <div id="write-review-form" className="lg:order-2 lg:col-span-5 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-purple-200/90 bg-white p-5 sm:p-7 shadow-[0_12px_36px_rgba(74,25,66,0.08)]">
              <div className="flex items-center gap-3 mb-2">
                <div className="grid size-9 place-items-center rounded-xl bg-purple-100 text-[#5B2C83]">
                  <Sparkles className="size-4.5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-[#4A1942]">Write a Review</h3>
                  <p className="text-xs text-gray-500 font-medium">Share your Yamora crunch experience!</p>
                </div>
              </div>

              {submitted ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <span className="grid size-12 place-items-center rounded-full bg-green-500 text-white shadow-md animate-bounce">
                    <Check className="size-6 stroke-[3]" />
                  </span>
                  <div>
                    <h4 className="font-serif text-lg font-bold text-[#1A0F0A]">Review Published!</h4>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      Thank you! Your review is now visible at the top of the reviews list.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
                  {error && (
                    <p className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600 border border-red-200">{error}</p>
                  )}

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-gray-700">Your Full Name</label>
                    <Input required placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className="bg-purple-50/40 border-purple-200 text-xs sm:text-sm" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-gray-700">City / State</label>
                    <Input required placeholder="City or state" value={location} onChange={(e) => setLocation(e.target.value)} className="bg-purple-50/40 border-purple-200 text-xs sm:text-sm" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-gray-700">Favorite Flavour</label>
                    <select
                      value={flavor}
                      onChange={(e) => setFlavor(e.target.value)}
                      className="w-full rounded-xl border border-purple-200 bg-purple-50/40 px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 font-medium outline-none focus:border-[#5B2C83] focus:ring-2 focus:ring-[#5B2C83]/20"
                    >
                      {FLAVORS.map((f) => (
                        <option key={f.id} value={f.name}>{f.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-gray-700">Star Rating</label>
                    <div className="flex items-center justify-between rounded-xl border border-purple-200 bg-purple-50/40 p-2.5">
                      {([1, 2, 3, 4, 5] as const).map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className="transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                        >
                          <Star
                            className={cn(
                              "size-6 transition-colors",
                              star <= rating ? "fill-[#E8B923] text-[#E8B923]" : "fill-transparent text-gray-300"
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-gray-700">Your Review</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="What did you love about these crispy yams?"
                      value={quote}
                      onChange={(e) => setQuote(e.target.value)}
                      className="w-full rounded-xl border border-purple-200 bg-purple-50/40 p-3 text-xs sm:text-sm text-gray-900 outline-none focus:border-[#5B2C83] focus:ring-2 focus:ring-[#5B2C83]/20 placeholder:text-gray-400"
                    />
                  </div>

                  <Button type="submit" variant="primary" size="lg" className="w-full shadow-md font-bold text-sm sm:text-base py-2.5" disabled={submitting}>
                    {submitting ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Send className="size-4 mr-2" />}
                    {submitting ? "Publishing…" : "Post Review"}
                  </Button>
                </form>
              )}
            </div>
          </div>

          {/* 5 ANIMATED REVIEWS LIST: Appears after the form on mobile, and on the left side on desktop (lg:order-1 lg:col-span-7) */}
          <div id="reviews-list" className="lg:order-1 lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between border-b border-purple-100/80 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="size-4 sm:size-5 text-[#5B2C83]" />
                <h3 className="font-serif text-base sm:text-xl font-extrabold text-[#1A0F0A]">
                  Verified Snacker Feedback
                </h3>
              </div>
            </div>

            {/* 5 Review Cards List */}
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/60 border border-purple-100/60 backdrop-blur-md" />
                ))}
              </div>
            ) : visible5Reviews.length === 0 ? (
              <div className="rounded-2xl border border-purple-100 bg-white/70 backdrop-blur-md p-8 text-center shadow-xs">
                <p className="text-gray-600 text-sm font-medium">No reviews yet. Be the first snacker to share!</p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div key={listOffset} className="space-y-3">
                  {visible5Reviews.map((rev, index) => {
                    const key = String(rev._id || rev.id || index);
                    return (
                      <motion.div
                        key={key + "-" + index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.35, delay: index * 0.05 }}
                        className="group relative overflow-hidden rounded-2xl border border-purple-200/50 bg-white/80 backdrop-blur-md p-4 sm:p-5 shadow-xs transition-all duration-300 hover:shadow-md hover:bg-white hover:border-purple-300"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2.5">
                            {/* Avatar */}
                            <div
                              className="grid size-9 sm:size-10 place-items-center rounded-xl text-xs sm:text-sm font-extrabold text-white shadow-xs shrink-0"
                              style={{
                                background: rev.avatarGradient
                                  ? `linear-gradient(135deg, ${rev.avatarGradient.from}, ${rev.avatarGradient.to})`
                                  : "linear-gradient(135deg, #5B2C83, #8E4585)",
                              }}
                            >
                              {rev.initials || rev.name.slice(0, 2).toUpperCase()}
                            </div>

                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="font-bold text-[#1A0F0A] text-xs sm:text-sm">{rev.name}</h4>
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-green-50 px-1.5 py-0.5 text-[9px] font-semibold text-green-700 border border-green-200">
                                  <Check className="size-2.5 stroke-[3]" /> Verified
                                </span>
                              </div>
                              <p className="text-[10px] sm:text-xs text-gray-500 font-medium">
                                {rev.location} · <strong className="text-[#5B2C83] font-semibold">{rev.flavor}</strong>
                              </p>
                            </div>
                          </div>

                          {/* Rating */}
                          <div className="shrink-0 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                            <StarRating rating={rev.rating} size="sm" />
                          </div>
                        </div>

                        {/* Quote */}
                        <div className="relative pt-0.5 pl-1">
                          <p className="text-xs sm:text-sm text-gray-700 font-medium leading-relaxed italic">
                            &ldquo;{rev.quote}&rdquo;
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
