"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Play, Heart, ExternalLink } from "lucide-react";
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
  link?: string;
}

const FALLBACK: GalleryContent = {
  eyebrow: "📸 INSTAGRAM COMMUNITY",
  title: "Join the",
  titleHighlight: "crunch community",
  handle: "@yamorawafers",
  description: "Tag {handle} to get featured. Real snackers, real love.",
  postLimit: 6,
  posts: [
    {
      flavorIndex: 0,
      caption: "Movie night sorted with Original Salted 🍿 #YamoraWafers #CrunchTime",
      image: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=800&q=80",
      likes: 1420,
    },
    {
      flavorIndex: 2,
      caption: "That peri peri kick 🔥 #SnackTime #PeriPeriCrunch",
      image: "https://images.unsplash.com/photo-1621447504864-d8686e12698c?auto=format&fit=crop&w=800&q=80",
      likes: 2105,
    },
    {
      flavorIndex: 4,
      caption: "Cheesy little obsession 🧀 #NaturallyCrispy #YamoraSnacks",
      image: "https://images.unsplash.com/photo-1528751014936-863e6e7a319c?auto=format&fit=crop&w=800&q=80",
      likes: 1890,
    },
    {
      flavorIndex: 1,
      caption: "Nostalgia in every pack ✨ #YamoraWafers #HeritageFlavours",
      image: "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&w=800&q=80",
      likes: 1650,
    },
    {
      flavorIndex: 5,
      caption: "Green chilli > everything 🌶️ #PureRatalu #CrispyGoodness",
      image: "https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?auto=format&fit=crop&w=800&q=80",
      likes: 1340,
    },
    {
      flavorIndex: 3,
      caption: "Cracked pepper perfection 🥔 #TastySnacking #Yamora",
      image: "https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=800&q=80",
      likes: 1980,
    },
  ],
};

export function InstagramGallery() {
  const cms = useSection<GalleryContent>("instagram", FALLBACK);
  const socials = useSocialLinks();

  const handle = cms.handle || "@yamorawafers";
  const instagram = socials.find((s) => s.platform === "instagram");
  const profileUrl = instagram?.url || SITE.social.instagram || "https://instagram.com/yamorawafers";

  const limit = Math.max(Number(cms.postLimit ?? FALLBACK.postLimit ?? 6), 0);

  const rawPosts: InstagramPost[] = Array.isArray(cms.posts) && cms.posts.length > 0
    ? (cms.posts as InstagramPost[])
    : (FALLBACK.posts as InstagramPost[]);

  const posts = rawPosts.slice(0, limit).map((p, i) => {
    const flavor = FLAVORS[(p.flavorIndex ?? i) % FLAVORS.length];
    const imgSrc = p.image || flavor?.image || "/logo.jpg";
    const isVideo = Boolean(p.video || p.isVideo);
    return {
      ...p,
      flavor,
      imgSrc,
      isVideo,
      likes: p.likes || Math.floor(1200 + ((i * 317) % 950)),
    };
  });

  return (
    <section id="instagram" className="relative scroll-mt-24 py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-white via-[#FAF5FF]/70 to-white border-t border-purple-100/60">
      <div className="container-px mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            align="left"
            eyebrow={cms.eyebrow}
            title={
              <>
                {cms.title}{" "}
                <span className="bg-gradient-to-r from-[#5B2C83] via-[#D98A2B] to-[#5B2C83] bg-clip-text text-transparent font-black">
                  {cms.titleHighlight}
                </span>
              </>
            }
            description={(cms.description ?? "Tag {handle} to get featured. Real snackers, real love.").replace("{handle}", handle)}
            className="max-w-xl"
          />
          <Button
            asChild
            size="lg"
            className="hidden shrink-0 sm:inline-flex bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:brightness-110 text-white font-extrabold shadow-md hover:shadow-lg transition-all duration-300 border-0 rounded-full px-6"
          >
            <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
              <InstagramIcon className="size-5" /> Follow {handle}
            </a>
          </Button>
        </div>

        {/* Instagram Posts & Reels Grid */}
        <div
          className={cn(
            "mt-10 grid grid-cols-2 gap-3.5 sm:gap-5",
            posts.length <= 2 && "sm:grid-cols-2",
            posts.length === 3 && "sm:grid-cols-3",
            posts.length === 4 && "sm:grid-cols-2 lg:grid-cols-4",
            posts.length === 5 && "sm:grid-cols-3 lg:grid-cols-5",
            posts.length >= 6 && "sm:grid-cols-3 lg:grid-cols-6"
          )}
        >
          {posts.map((post, i) => (
            <motion.a
              key={i}
              href={post.link || profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: (i % 6) * 0.06 }}
              className="group relative aspect-square overflow-hidden rounded-2xl sm:rounded-3xl bg-gray-900 shadow-md border border-purple-100/80 hover:shadow-2xl hover:border-purple-300 transition-all duration-500"
              aria-label={post.caption ? `Instagram post: ${post.caption}` : "Instagram post"}
            >
              {/* Media Element: Video or High-Res Image */}
              {post.video ? (
                <video
                  src={post.video}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="size-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.imgSrc}
                  alt={post.caption ?? `Yamora Wafers Instagram post ${i + 1}`}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              )}

              {/* Reel Indicator Pill */}
              {post.isVideo && (
                <div className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-white shadow-xs">
                  <Play className="size-2.5 fill-white text-white" />
                  <span>REEL</span>
                </div>
              )}

              {/* Top Right Instagram Icon Badge */}
              <div className="absolute right-3 top-3 z-10 rounded-full bg-black/50 backdrop-blur-md p-2 text-white/90 group-hover:bg-gradient-to-tr group-hover:from-[#833AB4] group-hover:to-[#FD1D1D] group-hover:scale-110 group-hover:text-white transition-all duration-300 shadow-sm">
                <InstagramIcon className="size-3.5" />
              </div>

              {/* Bottom Gradient Hover Overlay */}
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-rose-400">
                    <Heart className="size-3 fill-rose-500 text-rose-500" />
                    {post.likes.toLocaleString()}
                  </span>
                  <span className="text-[10px] font-bold text-amber-300 flex items-center gap-0.5">
                    View <ExternalLink className="size-2.5 ml-0.5" />
                  </span>
                </div>
                <p className="line-clamp-2 text-xs font-medium text-white/95 leading-relaxed">
                  {post.caption}
                </p>
              </div>
            </motion.a>
          ))}
        </div>

        {/* Mobile Follow Button */}
        <div className="mt-8 sm:hidden">
          <Button
            asChild
            size="lg"
            className="w-full bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white font-extrabold shadow-md border-0 rounded-full py-3.5"
          >
            <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
              <InstagramIcon className="size-5" /> Follow {handle}
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
