"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Ticket, Copy, Check, Sparkles, Clock, ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/common/section-heading";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api";
import { useSection } from "@/components/cms/cms-provider";
import type { HeadingContent } from "@/components/cms/types";
import { cn, formatINR } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Heading copy, editable in the Website Builder (was hardcoded). */
const HEADING_FALLBACK: HeadingContent = {
  eyebrow: "Today's Offers",
  title: "Save more on every",
  titleHighlight: "crunch",
  description: "Grab a code below — it's copied to your clipboard, ready to paste at checkout.",
};

interface ApiCoupon {
  _id: string;
  code: string;
  description: string;
}

interface ApiCombo {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  comboPrice: number;
  originalPrice: number;
  savings: number;
  discountPercent: number;
  badge?: string;
}

export function OffersStrip() {
  const heading = useSection<HeadingContent>("offers", HEADING_FALLBACK);

  // Live coupons + combos from the backend — no static data. The combo banner
  // used to be a hardcoded "Buy 2 packs, get the 3rd at 50% off" that had no
  // relationship to any real combo; it now shows the combos the admin created
  // on the Categories & Combos page (or nothing, if there are none).
  const [coupons, setCoupons] = React.useState<ApiCoupon[]>([]);
  const [combos, setCombos] = React.useState<ApiCombo[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiFetch<ApiCoupon[]>("/coupons").catch(() => []),
      apiFetch<ApiCombo[]>("/combos").catch(() => []),
    ])
      .then(([couponData, comboData]) => {
        if (cancelled) return;
        setCoupons(couponData ?? []);
        setCombos(comboData ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="offers" className="relative scroll-mt-24 py-16 sm:py-20 lg:py-24">
      <div className="container-px mx-auto max-w-7xl">
        <SectionHeading
          eyebrow={heading.eyebrow}
          title={
            <>
              {heading.title}
              {heading.titleHighlight && (
                <>
                  {" "}
                  <span className="text-gradient-warm">{heading.titleHighlight}</span>
                </>
              )}
            </>
          }
          description={heading.description}
        />

        {loading ? (
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-3xl" />
            ))}
          </div>
        ) : coupons.length > 0 ? (
          <>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {coupons.slice(0, 3).map((c, i) => (
                <CouponCard key={c._id} code={c.code} description={c.description} index={i} />
              ))}
            </div>
            <div className="mt-8 flex justify-center">
              <Button asChild variant="outline" size="lg">
                <Link href="/offers">
                  View all offers <ArrowRight />
                </Link>
              </Button>
            </div>
          </>
        ) : null}

        {/* Real combo offers — one banner per combo the admin created. */}
        {combos.length > 0 && (
          <div className="mt-6 flex flex-col gap-4">
            {combos.slice(0, 3).map((combo, i) => (
              <motion.div
                key={combo._id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, ease: EASE, delay: i * 0.05 }}
                className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-500 via-orange-500 to-gold-400 p-6 text-white shadow-[var(--shadow-lift)] sm:p-9"
              >
                <div className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-white/15 blur-3xl" />
                <div className="relative flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
                  <div className="flex items-start gap-4">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/20 backdrop-blur">
                      <Sparkles className="size-6" />
                    </span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/80">
                        <Clock className="size-3.5" /> {combo.badge || "Combo offer"}
                      </p>
                      <h3 className="mt-1 font-serif text-xl font-bold sm:text-3xl">{combo.name}</h3>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-white/90">
                        <span className="font-bold">{formatINR(combo.comboPrice)}</span>
                        {combo.originalPrice > combo.comboPrice && (
                          <span className="text-white/70 line-through">
                            {formatINR(combo.originalPrice)}
                          </span>
                        )}
                        {combo.savings > 0 && (
                          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">
                            Save {formatINR(combo.savings)} · {combo.discountPercent}% off
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Button
                    asChild
                    variant="subtle"
                    size="lg"
                    className="shrink-0 bg-white text-orange-600 hover:bg-white"
                  >
                    <Link href="/products">Shop the combo</Link>
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
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
