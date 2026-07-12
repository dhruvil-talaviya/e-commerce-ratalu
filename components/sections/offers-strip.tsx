"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Ticket, Copy, Check, Sparkles, Clock } from "lucide-react";
import { SectionHeading } from "@/components/common/section-heading";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { COUPONS } from "@/lib/data/coupons";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

export function OffersStrip() {
  return (
    <section id="offers" className="relative scroll-mt-24 py-16 sm:py-20 lg:py-24">
      <div className="container-px mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Today's Offers"
          title={
            <>
              Save more on every <span className="text-gradient-warm">crunch</span>
            </>
          }
          description="Grab a code below — it's copied to your clipboard, ready to paste at checkout."
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {COUPONS.map((c, i) => (
            <CouponCard key={c.code} code={c.code} description={c.description} index={i} />
          ))}
        </div>

        {/* Festive banner */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, ease: EASE }}
          className="relative mt-6 overflow-hidden rounded-3xl bg-gradient-to-r from-orange-500 via-orange-500 to-gold-400 p-8 text-white shadow-[var(--shadow-lift)] sm:p-10"
        >
          <div className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-white/15 blur-3xl" />
          <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/20 backdrop-blur">
                <Sparkles className="size-6" />
              </span>
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/80">
                  <Clock className="size-3.5" /> Limited time
                </p>
                <h3 className="mt-1 font-serif text-2xl font-bold sm:text-3xl">
                  Buy 2 packs, get the 3rd at 50% off
                </h3>
                <p className="mt-1 text-sm text-white/85">
                  Auto-applied on eligible combos. No code needed.
                </p>
              </div>
            </div>
            <Button
              asChild
              variant="subtle"
              size="lg"
              className="shrink-0 bg-white text-orange-600 hover:bg-white"
            >
              <a href="/shop">Shop the combo</a>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function CouponCard({
  code,
  description,
  index,
}: {
  code: string;
  description: string;
  index: number;
}) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      /* clipboard may be unavailable; still show success UX */
    }
    setCopied(true);
    toast.success("Coupon copied!", { description: `Paste ${code} at checkout to save.` });
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, ease: EASE, delay: index * 0.06 }}
      className="group relative flex items-center gap-4 overflow-hidden rounded-3xl border border-dashed border-purple-300 bg-white/80 p-5 shadow-[var(--shadow-soft)] backdrop-blur-sm transition-shadow hover:shadow-[var(--shadow-lift)]"
    >
      {/* ticket notches */}
      <span className="absolute -left-3 top-1/2 size-6 -translate-y-1/2 rounded-full bg-[var(--color-cream)]" aria-hidden />
      <span className="absolute -right-3 top-1/2 size-6 -translate-y-1/2 rounded-full bg-[var(--color-cream)]" aria-hidden />

      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-purple-500 text-cream transition-transform group-hover:scale-105">
        <Ticket className="size-6" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="font-serif text-lg font-bold tracking-wide text-purple-700">{code}</p>
        <p className="truncate text-sm text-charcoal-muted">{description}</p>
      </div>

      <button
        onClick={handleCopy}
        aria-label={`Copy coupon ${code}`}
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-xl border transition-all",
          copied
            ? "border-green-200 bg-green-50 text-green-600"
            : "border-[var(--color-border)] bg-white text-charcoal-muted hover:border-purple-300 hover:text-purple-700"
        )}
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      </button>
    </motion.div>
  );
}
