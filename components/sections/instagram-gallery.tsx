"use client";

import { motion } from "motion/react";
import { Heart, MessageCircle } from "lucide-react";
import { SectionHeading } from "@/components/common/section-heading";
import { Button } from "@/components/ui/button";
import { WaferVisual } from "@/components/common/wafer-visual";
import { InstagramIcon } from "@/components/layout/social-icons";
import { FLAVORS } from "@/lib/data/flavors";
import { SITE } from "@/lib/constants";

const HANDLE = "@rataluchips";

// Playful post captions paired with a flavour visual.
const POSTS = [
  { flavor: FLAVORS[0], caption: "Movie night sorted 🍿", likes: 1284 },
  { flavor: FLAVORS[2], caption: "That peri peri kick 🔥", likes: 2043 },
  { flavor: FLAVORS[4], caption: "Cheesy little obsession 🧀", likes: 1567 },
  { flavor: FLAVORS[1], caption: "Nostalgia in a pack ✨", likes: 1892 },
  { flavor: FLAVORS[5], caption: "Green chilli > everything 🌶️", likes: 1120 },
  { flavor: FLAVORS[3], caption: "Cracked pepper perfection", likes: 977 },
];

export function InstagramGallery() {
  return (
    <section className="relative py-16 sm:py-20 lg:py-24">
      <div className="container-px mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            align="left"
            eyebrow="On the 'gram"
            title={
              <>
                Join the <span className="text-gradient-warm">crunch community</span>
              </>
            }
            description={`Tag ${HANDLE} to get featured. Real snackers, real love.`}
            className="max-w-xl"
          />
          <Button asChild size="lg" className="hidden shrink-0 sm:inline-flex">
            <a href={SITE.social.instagram} target="_blank" rel="noopener noreferrer">
              <InstagramIcon className="size-5" /> Follow {HANDLE}
            </a>
          </Button>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
          {POSTS.map((post, i) => (
            <motion.a
              key={i}
              href={SITE.social.instagram}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, scale: 0.92 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: (i % 6) * 0.05 }}
              className="group relative aspect-square overflow-hidden rounded-2xl"
              style={{
                background: `radial-gradient(130% 130% at 40% 20%, ${post.flavor.gradient.from}, ${post.flavor.gradient.to})`,
              }}
              aria-label={`Instagram post: ${post.caption}`}
            >
              <div className="absolute inset-0 flex items-center justify-center p-4 transition-transform duration-500 group-hover:scale-110">
                <WaferVisual flavor={post.flavor} seed={i + 3} className="max-h-full opacity-95" />
              </div>

              {/* hover overlay */}
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-black/10 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <p className="line-clamp-1 text-xs font-medium text-white">{post.caption}</p>
                <div className="mt-1.5 flex items-center gap-3 text-[11px] font-semibold text-white/90">
                  <span className="flex items-center gap-1">
                    <Heart className="size-3.5 fill-white/90" /> {post.likes.toLocaleString("en-IN")}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="size-3.5" /> {Math.round(post.likes / 18)}
                  </span>
                </div>
              </div>

              {/* corner IG glyph */}
              <span className="absolute right-2 top-2 text-white/70 transition-colors group-hover:text-white">
                <InstagramIcon className="size-4" />
              </span>
            </motion.a>
          ))}
        </div>

        <div className="mt-8 sm:hidden">
          <Button asChild size="lg" className="w-full">
            <a href={SITE.social.instagram} target="_blank" rel="noopener noreferrer">
              <InstagramIcon className="size-5" /> Follow {HANDLE}
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
