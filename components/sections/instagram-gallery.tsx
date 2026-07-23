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
  eyebrow: "On the 'gram",
  title: "Join the",
  titleHighlight: "crunch community",
  handle: "@rataluchips",
  description: "Tag {handle} to get featured. Real snackers, real love.",
  postLimit: 6,
  posts: [
    { flavorIndex: 0, caption: "Movie night sorted 🍿" },
    { flavorIndex: 2, caption: "That peri peri kick 🔥" },
    { flavorIndex: 4, caption: "Cheesy little obsession 🧀" },
    { flavorIndex: 1, caption: "Nostalgia in a pack ✨" },
    { flavorIndex: 5, caption: "Green chilli > everything 🌶️" },
    { flavorIndex: 3, caption: "Cracked pepper perfection" },
  ],
};

export function InstagramGallery() {
  const cms = useSection<GalleryContent>("instagram", FALLBACK);
  const socials = useSocialLinks();

  const handle = cms.handle ?? FALLBACK.handle ?? "";

  /**
   * The follow link comes from the Social Media Channels tab, so changing the
   * handle in the console actually changes where this button goes. It used to
   * point at a URL hardcoded in lib/constants.ts.
   */
  const instagram = socials.find((s) => s.platform === "instagram");
  const profileUrl = instagram?.url || SITE.social.instagram;

  const limit = Math.max(Number(cms.postLimit ?? FALLBACK.postLimit ?? 6), 0);

  const posts = (cms.posts ?? FALLBACK.posts ?? [])
    .slice(0, limit)
    .map((p, i) => ({
      ...p,
      // The generated wafer is the stand-in until a real photo is uploaded.
      // Clamped: an admin who removes a flavour must not crash the page.
      flavor: FLAVORS[(p.flavorIndex ?? i) % FLAVORS.length],
    }))
    .filter((p) => Boolean(p.image) || Boolean(p.flavor));

  if (posts.length === 0) return null;

  return (
    <section id="instagram" className="relative scroll-mt-24 py-16 sm:py-20 lg:py-24">
      <div className="container-px mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            align="left"
            eyebrow={cms.eyebrow}
            title={
              <>
                {cms.title}{" "}
                <span className="text-gradient-warm">{cms.titleHighlight}</span>
              </>
            }
            description={(cms.description ?? "").replace("{handle}", handle)}
            className="max-w-xl"
          />
          <Button asChild size="lg" className="hidden shrink-0 sm:inline-flex">
            <a href={profileUrl} target="_blank" rel="noopener noreferrer">
              <InstagramIcon className="size-5" /> Follow {handle}
            </a>
          </Button>
        </div>

        {/*
          The grid follows the number of posts instead of always assuming six —
          three posts used to leave half a row of dead space on desktop.
        */}
        <div
          className={cn(
            "mt-10 grid grid-cols-2 gap-3 sm:gap-4",
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
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: (i % 6) * 0.05 }}
              className="group relative aspect-square overflow-hidden rounded-2xl bg-cream-100"
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
                  className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center p-4 transition-transform duration-500 group-hover:scale-110">
                  <WaferVisual flavor={post.flavor} seed={i + 3} className="max-h-full opacity-95" />
                </div>
              )}

              {/* Caption only. No fabricated likes or comments. */}
              {post.caption && (
                <div className="absolute inset-0 flex flex-col justify-end bg-linear-to-t from-black/70 via-black/10 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <p className="line-clamp-2 text-xs font-medium text-white">{post.caption}</p>
                </div>
              )}

              <span className="absolute right-2 top-2 text-white/70 drop-shadow transition-colors group-hover:text-white">
                <InstagramIcon className="size-4" />
              </span>
            </motion.a>
          ))}
        </div>

        <div className="mt-8 sm:hidden">
          <Button asChild size="lg" className="w-full">
            <a href={profileUrl} target="_blank" rel="noopener noreferrer">
              <InstagramIcon className="size-5" /> Follow {handle}
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
