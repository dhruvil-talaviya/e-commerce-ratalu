"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/common/section-heading";
import { Button } from "@/components/ui/button";
import { FlavorCard } from "./flavor-card";
import { FLAVORS } from "@/lib/data/flavors";

export function FlavorShowcase() {
  return (
    <section id="flavours" className="relative scroll-mt-24 bg-white/40 py-16 sm:py-20 lg:py-24">
      <div className="container-px mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Six signature flavours"
          title={
            <>
              Find your <span className="text-gradient-warm">favourite crunch</span>
            </>
          }
          description="From clean and classic to boldly fiery — every flavour is kettle-cooked in small batches and seasoned by hand."
        />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
          className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {FLAVORS.map((flavor, i) => (
            <FlavorCard key={flavor.id} flavor={flavor} index={i} />
          ))}
        </motion.div>

        <div className="mt-12 flex justify-center">
          <Button asChild size="lg" variant="outline">
            <Link href="/shop">
              View all pack sizes <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
