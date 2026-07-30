"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Play, Heart, MessageCircle, Send, Music2, CheckCircle2, ExternalLink } from "lucide-react";
import { SectionHeading } from "@/components/common/section-heading";
import { Button } from "@/components/ui/button";
import { InstagramIcon } from "@/components/layout/social-icons";
import { FLAVORS } from "@/lib/data/flavors";
import { SITE } from "@/lib/constants";
import { useSection } from "@/components/cms/cms-provider";
import { cn } from "@/lib/utils";
import { useSocialLinks } from "@/lib/hooks/use-social-links";
import type { GalleryContent } from "@/components/cms/types";

export interface InstagramPost {
  flavorIndex?: number;
  caption?: string;
  image?: string;
  video?: string;
  isVideo?: boolean;
  likes?: number;
  comments?: number;
  link?: string;
}

const FALLBACK: GalleryContent = {
  eyebrow: "📸 INSTAGRAM REELS & FEED",
  title: "Watch & Join the",
  titleHighlight: "crunch community",
  handle: "@yamorawafers",
  description: "Click any reel to watch & follow directly on {handle}.",
  postLimit: 6,
  posts: [
    {
      flavorIndex: 0,
      caption: "Movie night sorted with Original Salted! 🍿 Crispy, thin & 100% natural. #YamoraWafers #CrunchTime",
      image: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=800&q=80",
      link: "https://instagram.com/yamorawafers",
      likes: 1840,
      isVideo: true,
    },
    {
      flavorIndex: 2,
      caption: "That peri peri kick 🔥 Spice up your snacking routine! #YamoraWafers #PeriPeri",
      image: "https://images.unsplash.com/photo-1621447504864-d8686e12698c?auto=format&fit=crop&w=800&q=80",
      link: "https://instagram.com/yamorawafers",
      likes: 2410,
      isVideo: true,
    },
    {
      flavorIndex: 4,
      caption: "Cheesy little obsession 🧀 Kettle-cooked perfection! #NaturallyCrispy #SnackBetter",
      image: "https://images.unsplash.com/photo-1528751014936-863e6e7a319c?auto=format&fit=crop&w=800&q=80",
      link: "https://instagram.com/yamorawafers",
      likes: 1950,
      isVideo: true,
    },
    {
      flavorIndex: 1,
      caption: "Nostalgia in every pack ✨ Roasted spices & pure ratalu goodness. #HeritageFlavours",
      image: "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&w=800&q=80",
      link: "https://instagram.com/yamorawafers",
      likes: 1680,
      isVideo: true,
    },
    {
      flavorIndex: 5,
      caption: "Green chilli > everything 🌶️ Zesty, punchy & addictive! #PureRatalu #Yamora",
      image: "https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?auto=format&fit=crop&w=800&q=80",
      link: "https://instagram.com/yamorawafers",
      likes: 2130,
      isVideo: true,
    },
    {
      flavorIndex: 3,
      caption: "Cracked pepper perfection 🥔 Bold Malabar pepper crunch. #TastySnacking #YamoraWafers",
      image: "https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=800&q=80",
      link: "https://instagram.com/yamorawafers",
      likes: 1790,
      isVideo: true,
    },
  ],
};

export function InstagramGallery() {
  const cms = useSection<GalleryContent>("instagram", FALLBACK);
  const socials = useSocialLinks();
  const sliderRef = React.useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = React.useState(0);

  const handle = cms.handle || "@yamorawafers";
  const cleanHandle = handle.replace(/^@/, "").trim();
  const handleProfileUrl = cleanHandle ? `https://instagram.com/${cleanHandle}` : "https://instagram.com/yamorawafers";

  const instagram = socials.find((s) => s.platform === "instagram");
  const isCustomUrl =
    instagram?.url &&
    !instagram.url.toLowerCase().includes("ratalu") &&
    !instagram.url.toLowerCase().includes("dhruvil");
  const profileUrl = isCustomUrl ? instagram.url : handleProfileUrl;

  const limit = Math.max(Number(cms.postLimit ?? FALLBACK.postLimit ?? 6), 0);

  const rawPosts: InstagramPost[] = Array.isArray(cms.posts) && cms.posts.length > 0
    ? (cms.posts as InstagramPost[])
    : (FALLBACK.posts as InstagramPost[]);

  const posts = rawPosts.slice(0, limit).map((p, i) => {
    const flavor = FLAVORS[(p.flavorIndex ?? i) % FLAVORS.length];
    const imgSrc = p.image || flavor?.image || "/logo.jpg";
    const isVideo = Boolean(p.video || p.isVideo !== false);
    
    let targetUrl = profileUrl;
    if (p.link && p.link.trim()) {
      const linkStr = p.link.trim();
      if (!linkStr.toLowerCase().includes("dhruvil") && !linkStr.toLowerCase().includes("ratalu")) {
        targetUrl = linkStr;
      }
    }

    if (cleanHandle && targetUrl.includes("instagram.com")) {
      targetUrl = targetUrl.replace(
        /instagram\.com\/(rataluchips|ratalu_chips|rataluwafers|ratalu|dhruvil_talaviya_|dhruvil_talaviya|dhruvil)/gi,
        `instagram.com/${cleanHandle}`
      );
    }

    return {
      ...p,
      flavor,
      imgSrc,
      isVideo,
      targetUrl,
      likes: p.likes || Math.floor(1400 + ((i * 383) % 1100)),
      comments: p.comments || Math.floor(32 + ((i * 17) % 65)),
    };
  });

  const scrollToSlide = (idx: number) => {
    if (!sliderRef.current) return;
    const items = sliderRef.current.querySelectorAll<HTMLAnchorElement>(".reel-card-item");
    if (items[idx]) {
      items[idx].scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      setActiveIndex(idx);
    }
  };

  const handleScroll = () => {
    if (!sliderRef.current) return;
    const container = sliderRef.current;
    const scrollPos = container.scrollLeft;
    const cardWidth = container.firstElementChild?.clientWidth || 280;
    const newIdx = Math.round(scrollPos / cardWidth);
    if (newIdx !== activeIndex && newIdx >= 0 && newIdx < posts.length) {
      setActiveIndex(newIdx);
    }
  };

  return (
    <section id="instagram" className="relative scroll-mt-24 py-14 sm:py-20 lg:py-24 bg-gradient-to-b from-white via-[#FAF5FF]/80 to-white border-t border-purple-100/60 overflow-hidden">
      <div className="container-px mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            align="left"
            eyebrow={cms.eyebrow}
            title={
              <>
                {cms.title}{" "}
                <span className="bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] bg-clip-text text-transparent font-black">
                  {cms.titleHighlight}
                </span>
              </>
            }
            description={(cms.description ?? "Swipe reels & click to watch directly on {handle}.").replace("{handle}", handle)}
            className="max-w-xl"
          />
          
          <Button
            asChild
            size="lg"
            className="hidden shrink-0 sm:inline-flex bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:brightness-110 text-white font-extrabold shadow-md hover:shadow-xl transition-all duration-300 border-0 rounded-full px-7 py-3"
          >
            <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm">
              <InstagramIcon className="size-5" /> Follow {handle} on Instagram
            </a>
          </Button>
        </div>

        {/* 
          Reel Layout:
          - Mobile (< sm): Horizontal snap-x slider with smooth touch swipe and peek.
          - Desktop (>= sm): Clean 3 to 6 column grid layout.
        */}
        <div
          ref={sliderRef}
          onScroll={handleScroll}
          className="mt-8 sm:mt-10 flex sm:grid overflow-x-auto sm:overflow-x-visible snap-x snap-mandatory gap-4 sm:gap-6 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid-cols-3 lg:grid-cols-6 pb-4 sm:pb-0"
        >
          {posts.map((post, i) => (
            <motion.a
              key={i}
              href={post.targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-20px" }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: (i % 6) * 0.05 }}
              className="reel-card-item group relative aspect-[9/16] w-[78vw] sm:w-full max-w-[290px] sm:max-w-none shrink-0 snap-center overflow-hidden rounded-3xl bg-gray-950 shadow-lg border border-purple-200/50 hover:shadow-2xl hover:border-purple-400 transition-all duration-500 cursor-pointer block"
              aria-label={post.caption ? `Watch Instagram reel: ${post.caption}` : "Watch Instagram reel"}
            >
              {/* Media Content: Video or High-Res Image Poster */}
              {post.video ? (
                <video
                  src={post.video}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.imgSrc}
                  alt={post.caption ?? `Yamora Wafers Instagram Reel ${i + 1}`}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              )}

              {/* Reel Header Pill (Top Left) */}
              <div className="absolute left-3 top-3 z-20 flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-white shadow-sm border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="" className="size-4 rounded-full ring-1 ring-purple-400 object-cover" />
                <span className="text-[10px] font-extrabold tracking-wide uppercase">REEL</span>
              </div>

              {/* Top Right Direct Instagram Link Icon */}
              <div className="absolute right-3 top-3 z-20 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-md p-2 text-white/90 group-hover:bg-gradient-to-tr group-hover:from-[#833AB4] group-hover:to-[#FD1D1D] group-hover:scale-110 group-hover:text-white transition-all duration-300 shadow-sm">
                <InstagramIcon className="size-3.5" />
              </div>

              {/* Play Pulse Overlay on Hover */}
              <div className="absolute inset-0 z-10 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20 backdrop-blur-[1px]">
                <div className="grid size-12 place-items-center rounded-full bg-white/90 text-purple-900 shadow-xl group-hover:scale-110 transition-transform duration-300">
                  <Play className="size-6 fill-purple-900 ml-0.5" />
                </div>
              </div>

              {/* Bottom Authentic Instagram Reel Interface Overlay */}
              <div className="absolute inset-0 z-20 flex flex-col justify-end bg-gradient-to-t from-black/95 via-black/50 to-transparent p-3.5 text-white">
                <div className="flex items-end justify-between gap-2">
                  {/* Left Column: Account, Caption & Audio */}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    {/* User Handle & Verified Badge */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black tracking-tight text-white drop-shadow-xs">{handle}</span>
                      <CheckCircle2 className="size-3.5 fill-blue-500 text-white shrink-0" />
                    </div>

                    {/* Caption */}
                    {post.caption && (
                      <p className="line-clamp-2 text-[11px] font-medium text-white/90 leading-snug drop-shadow-xs">
                        {post.caption}
                      </p>
                    )}

                    {/* Audio Track */}
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/80">
                      <Music2 className="size-3 animate-spin-slow shrink-0" />
                      <span className="truncate">original audio - yamorawafers</span>
                    </div>
                  </div>

                  {/* Right Column: Floating Engagement Action Stack */}
                  <div className="flex flex-col items-center gap-3 shrink-0 pb-1">
                    {/* Heart & Likes */}
                    <div className="flex flex-col items-center">
                      <div className="grid size-8 place-items-center rounded-full bg-white/10 backdrop-blur-md group-hover:bg-rose-600 group-hover:text-white transition-colors duration-300">
                        <Heart className="size-4 fill-white text-white group-hover:scale-110 transition-transform" />
                      </div>
                      <span className="mt-0.5 text-[9px] font-extrabold text-white">{post.likes.toLocaleString()}</span>
                    </div>

                    {/* Comment */}
                    <div className="flex flex-col items-center">
                      <div className="grid size-8 place-items-center rounded-full bg-white/10 backdrop-blur-md">
                        <MessageCircle className="size-4 text-white" />
                      </div>
                      <span className="mt-0.5 text-[9px] font-extrabold text-white">{post.comments}</span>
                    </div>

                    {/* Direct External Link Icon */}
                    <div className="grid size-8 place-items-center rounded-full bg-gradient-to-tr from-[#833AB4] to-[#FD1D1D] text-white shadow-sm group-hover:scale-110 transition-transform">
                      <ExternalLink className="size-3.5" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.a>
          ))}
        </div>

        {/* Mobile Pagination Indicator Dots */}
        <div className="flex items-center justify-center gap-1.5 mt-2 sm:hidden">
          {posts.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollToSlide(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                activeIndex === i ? "w-6 bg-gradient-to-r from-[#833AB4] to-[#FD1D1D]" : "w-1.5 bg-purple-200"
              )}
            />
          ))}
        </div>

        {/* Mobile Follow Button */}
        <div className="mt-6 sm:hidden">
          <Button
            asChild
            size="lg"
            className="w-full bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white font-extrabold shadow-lg border-0 rounded-full py-3.5 text-sm"
          >
            <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
              <InstagramIcon className="size-5" /> Follow {handle} on Instagram
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
