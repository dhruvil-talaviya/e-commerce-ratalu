"use client";

import * as React from "react";
import Link from "next/link";
import { MessageCircleQuestion } from "lucide-react";
import { SectionHeading } from "@/components/common/section-heading";
import { Reveal } from "@/components/common/reveal";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSection } from "@/components/cms/cms-provider";
import type { FaqItem } from "@/lib/types";

interface FaqContent extends Record<string, unknown> {
  eyebrow?: string;
  title?: string;
  titleHighlight?: string;
  description?: string;
  helpTitle?: string;
  helpText?: string;
  items?: FaqItem[];
}

// Fallback data shown when the CMS section has no questions yet.
const FALLBACK_FAQS: FaqItem[] = [
  { id: "shipping", category: "Shipping", question: "How fast do you ship, and where do you deliver?", answer: "We ship pan-India via trusted courier partners. Orders placed before 2 PM IST are dispatched the same day. Metro cities typically receive orders in 2–3 business days; the rest of India within 4–6 business days. Enjoy free shipping on all orders above ₹599." },
  { id: "shelf-life", category: "Shelf Life", question: "How long do the wafers stay fresh?", answer: "Because we cook in small batches with no artificial preservatives, each pack is best enjoyed within 3 months of the manufacturing date printed on the pack. Our nitrogen-flushed pouches lock in that just-cooked crunch until you open them." },
  { id: "returns", category: "Returns", question: "What is your returns and refund policy?", answer: "Your happiness is guaranteed. If a pack arrives damaged, stale, or you're simply not delighted, write to us within 7 days of delivery with a photo and we'll send a free replacement or a full refund — no lengthy questions asked." },
];

const FALLBACK_CONTENT: FaqContent = {
  eyebrow: "Good to know",
  title: "Questions?",
  titleHighlight: "We've got answers.",
  description: "Everything about freshness, shipping and storage — so you can order with total confidence.",
  helpTitle: "Still curious?",
  helpText: "Our team replies within a few hours.",
  items: FALLBACK_FAQS,
};

export function Faq() {
  // Content — heading + questions — is managed in the Website Builder.
  const cmsContent = useSection<Record<string, any>>("faqs", {});
  const content = React.useMemo(() => {
    const merged = { ...FALLBACK_CONTENT, ...cmsContent };
    if (cmsContent.title && !cmsContent.titleHighlight) {
      merged.titleHighlight = "";
    }
    return merged;
  }, [cmsContent]);

  const faqs = React.useMemo<FaqItem[]>(() => {
    const items = Array.isArray(content.items) ? content.items.filter((f) => f?.question) : [];
    return items.length > 0 ? items : FALLBACK_FAQS;
  }, [content.items]);

  const defaultOpen = "";

  return (
    <section id="faqs" className="relative scroll-mt-24 py-8 sm:py-16 lg:py-24">
      <div className="container-px mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.85fr_1.15fr]">
        {/* Left: heading + help card */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            align="left"
            eyebrow={content.eyebrow || FALLBACK_CONTENT.eyebrow}
            title={
              <>
                {content.title || FALLBACK_CONTENT.title}
                {content.titleHighlight && (
                  <>
                    <br />
                    <span className="text-gradient-warm">{content.titleHighlight}</span>
                  </>
                )}
              </>
            }
            description={content.description || FALLBACK_CONTENT.description}
          />

          <Reveal delay={0.15}>
            <div className="mt-8 flex items-center gap-4 rounded-3xl border border-[var(--color-border)] bg-white/70 p-5 shadow-[var(--shadow-soft)]">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-purple-50 text-purple-600">
                <MessageCircleQuestion className="size-6" />
              </span>
              <div className="flex-1">
                <p className="font-semibold text-charcoal">{content.helpTitle || FALLBACK_CONTENT.helpTitle}</p>
                <p className="text-sm text-charcoal-muted">{content.helpText || FALLBACK_CONTENT.helpText}</p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/contact">Contact</Link>
              </Button>
            </div>
          </Reveal>
        </div>

        {/* Right: accordion */}
        <Reveal direction="up" delay={0.1}>
          <Accordion type="single" collapsible defaultValue={String(defaultOpen)} className="flex flex-col gap-3">
            {faqs.map((faq, idx) => {
                const key = String(faq.id || faq._id || `faq-${idx}`);
                return (
                  <AccordionItem key={key} value={key}>
                    <AccordionTrigger>
                      <span className="flex flex-col items-start gap-1.5">
                        {faq.category && (
                          <Badge variant="cream" size="sm">
                            {faq.category}
                          </Badge>
                        )}
                        {faq.question}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>{faq.answer}</AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
