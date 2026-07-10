"use client";

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
import { FAQS } from "@/lib/data/faq";

export function Faq() {
  return (
    <section id="faq" className="relative scroll-mt-24 py-24">
      <div className="container-px mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.85fr_1.15fr]">
        {/* Left: heading + help card */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            align="left"
            eyebrow="Good to know"
            title={
              <>
                Questions?
                <br />
                <span className="text-gradient-warm">We&apos;ve got answers.</span>
              </>
            }
            description="Everything about freshness, shipping and storage — so you can order with total confidence."
          />

          <Reveal delay={0.15}>
            <div className="mt-8 flex items-center gap-4 rounded-3xl border border-[var(--color-border)] bg-white/70 p-5 shadow-[var(--shadow-soft)]">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-purple-50 text-purple-600">
                <MessageCircleQuestion className="size-6" />
              </span>
              <div className="flex-1">
                <p className="font-semibold text-charcoal">Still curious?</p>
                <p className="text-sm text-charcoal-muted">Our team replies within a few hours.</p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/contact">Contact</Link>
              </Button>
            </div>
          </Reveal>
        </div>

        {/* Right: accordion */}
        <Reveal direction="up" delay={0.1}>
          <Accordion type="single" collapsible defaultValue={FAQS[0].id} className="flex flex-col gap-3">
            {FAQS.map((faq) => (
              <AccordionItem key={faq.id} value={faq.id}>
                <AccordionTrigger>
                  <span className="flex flex-col items-start gap-1.5">
                    <Badge variant="cream" size="sm">
                      {faq.category}
                    </Badge>
                    {faq.question}
                  </span>
                </AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
