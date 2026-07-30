"use client";

import * as React from "react";
import { motion } from "motion/react";
import { SectionHeading } from "@/components/common/section-heading";
import { Button } from "@/components/ui/button";
import { WaferVisual } from "@/components/common/wafer-visual";
import { InstagramIcon } from "@/components/layout/social-icons";
import { FLAVORS } from "@/lib/data/flavors";
import { SITE } from "@/lib/constants";
import { useSection } from "@/components/cms/cms-provider";
import { cn } from "@/lib/utils";
import { useSocialLinks } from "@/lib/hooks/use-social-links";
import type { GalleryContent } from "@/components/cms/types";

/**
 * What renders if the CMS is empty or unreachable.
 *
 * Note what is NOT here any more: invented like counts. Each tile used to show
 * "1,284 ♥" and a derived comment count, presented to customers as real
 * engagement on posts that don't exist. Nothing on this page now claims a number
 * we can't stand behind.
 */
const FALLBACK: GalleryContent = {
  eyebrow: "📸 INSTAGRAM COMMUNITY",
  title: "Join the",
  titleHighlight: "crunch community",
  handle: "@yamorawafers",
  description: "Tag {handle} to get featured. Real snackers, real love.",
  postLimit: 6,
  posts: [
    { flavorIndex: 0, caption: "Movie night sorted 🍿 #YamoraWafers" },
    { flavorIndex: 2, caption: "That peri peri kick 🔥 #SnackTime" },
    { flavorIndex: 4, caption: "Cheesy little obsession 🧀 #NaturallyCrispy" },
    { flavorIndex: 1, caption: "Nostalgia in a pack ✨ #Yamora" },
    { flavorIndex: 5, caption: "Green chilli > everything 🌶️ #PureRatalu" },
    { flavorIndex: 3, caption: "Cracked pepper perfection 🥔 #TastySnacking" },
  ],
};

export function InstagramGallery() {
  const cms = useSection<GalleryContent>("instagram", FALLBACK);
  const socials = useSocialLinks();

  const handle = cms.handle || "@yamorawafers";

  const instagram = socials.find((s) => s.platform === "instagram");
  const profileUrl = instagram?.url || SITE.social.instagram || "https://instagram.com/yamorawafers";

  const limit = Math.max(Number(cms.postLimit ?? FALLBACK.postLimit ?? 6), 0);

  const posts = (cms.posts ?? FALLBACK.posts ?? [])
    .slice(0, limit)
    .map((p, i) => ({
      ...p,
      flavor: FLAVORS[(p.flavorIndex ?? i) % FLAVORS.length],
    }))
    .filter((p) => Boolean(p.image) || Boolean(p.flavor));

  return (
    <section id="instagram" className="relative scroll-mt-24 py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-white via-[#FAF5FF] to-white border-t border-purple-100/60">
      <div className="container-px mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            align="left"
            eyebrow={cms.eyebrow}
            title={
              <>
                {cms.title}{" "}
                <span className="bg-gradient-to-r from-[#5B2C83] via-[#D98A2B] to-[#5B2C83] bg-clip-text text-transparent font-black">{cms.titleHighlight}</span>
              </>
            }
            description={(cms.description ?? "").replace("{handle}", handle)}
            className="max-w-xl"
          />
          <Button asChild size="lg" className="hidden shrink-0 sm:inline-flex bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:brightness-110 text-white font-bold shadow-md transition-all duration-300 border-0">
            <a href={profileUrl} target="_blank" rel="noopener noreferrer">
              <InstagramIcon className="size-5" /> Follow {handle}
            </a>
          </Button>
        </div>

        {/* Instagram Post Grid */}
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
              initial={{ opacity: 0, scale: 0.92 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: (i % 6) * 0.05 }}
              className="group relative aspect-square overflow-hidden rounded-2xl sm:rounded-3xl bg-cream-100 shadow-sm border border-purple-100 hover:shadow-xl hover:border-purple-300 transition-all duration-300"
              style={
                post.image
                  ? undefined
                  : {
                      background: `radial-gradient(130% 130% at 40% 20%, ${post.flavor.gradient.from}, ${post.flavor.gradient.to})`,
                    }
              }
              aria-label={post.caption ? `Instagram post: ${post.caption}` : "Instagram post"}
            >
              {post.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.image}
                  alt={post.caption ?? ""}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center p-4 transition-transform duration-500 group-hover:scale-110">
                  <WaferVisual flavor={post.flavor} seed={i + 3} className="max-h-full opacity-95" />
                </div>
              )}

              {/* Caption Overlay */}
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/30 to-transparent p-3.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <p className="line-clamp-2 text-xs font-semibold text-white leading-snug">{post.caption}</p>
                <div className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-amber-300">
                  <span>View post →</span>
                </div>
              </div>

              {/* Top Instagram Badge */}
              <div className="absolute right-2.5 top-2.5 rounded-full bg-black/40 p-1.5 backdrop-blur-md text-white/90 group-hover:bg-gradient-to-tr group-hover:from-[#833AB4] group-hover:to-[#FD1D1D] group-hover:text-white transition-all duration-300">
                <InstagramIcon className="size-3.5" />
              </div>
            </motion.a>
          ))}
        </div>

        <div className="mt-8 sm:hidden">
          <Button asChild size="lg" className="w-full bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white font-bold shadow-md border-0">
            <a href={profileUrl} target="_blank" rel="noopener noreferrer">
              <InstagramIcon className="size-5" /> Follow {handle}
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
