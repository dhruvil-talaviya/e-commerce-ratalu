"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mail, Phone, MapPin, Send, Check, Loader2, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { SITE } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function ContactPage() {
  const [sent, setSent] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    setLoading(false);
    setSent(true);
  };

  return (
    <>
      <PageHeader
        eyebrow="Say hello"
        title={
          <>
            We&apos;d <span className="text-gradient-warm">love</span> to hear from you
          </>
        }
        description="Questions about an order, wholesale, or just want to tell us your favourite flavour? Drop us a line."
        crumbs={[{ label: "Home", href: "/" }, { label: "Contact" }]}
      />

      <div className="container-px mx-auto max-w-7xl py-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.3fr]">
          {/* Info */}
          <div className="flex flex-col gap-4">
            <InfoCard icon={Mail} label="Email us" value={SITE.email} href={`mailto:${SITE.email}`} />
            <InfoCard icon={Phone} label="Call us" value={SITE.phone} href={SITE.phoneHref} />
            <InfoCard icon={MapPin} label="Visit us" value={SITE.address} />
            <div className="flex items-center gap-4 rounded-3xl border border-[var(--color-border)] bg-purple-50/50 p-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-purple-500 text-cream">
                <Clock className="size-5" />
              </span>
              <div>
                <p className="font-semibold text-charcoal">Support hours</p>
                <p className="text-sm text-charcoal-muted">Mon–Sat, 9 AM – 7 PM IST</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="rounded-3xl border border-[var(--color-border)] bg-white/70 p-6 shadow-[var(--shadow-soft)] backdrop-blur-sm sm:p-8">
            <AnimatePresence mode="wait">
              {sent ? (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-5 py-16 text-center"
                >
                  <span className="grid size-16 place-items-center rounded-full bg-green-500 text-white">
                    <Check className="size-8" strokeWidth={3} />
                  </span>
                  <div>
                    <h2 className="font-serif text-2xl font-semibold text-charcoal">Message sent!</h2>
                    <p className="mt-2 text-charcoal-muted">
                      Thanks for reaching out — we&apos;ll get back to you within a few hours.
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setSent(false)}>
                    Send another message
                  </Button>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onSubmit={handleSubmit}
                  className="flex flex-col gap-5"
                >
                  <div className="grid gap-5 sm:grid-cols-2">
                    <LabeledInput label="Name" placeholder="Your name" required />
                    <LabeledInput label="Email" type="email" placeholder="you@example.com" required />
                  </div>
                  <LabeledInput label="Subject" placeholder="How can we help?" required />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-charcoal">Message</label>
                    <textarea
                      required
                      rows={5}
                      placeholder="Tell us more…"
                      className="w-full rounded-3xl border border-[var(--color-border)] bg-white/80 px-5 py-4 text-sm text-charcoal shadow-sm transition-all placeholder:text-charcoal-soft focus-visible:border-purple-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-200"
                    />
                  </div>
                  <Button type="submit" size="lg" disabled={loading} className="w-full sm:w-auto">
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin" /> Sending…
                      </>
                    ) : (
                      <>
                        <Send /> Send message
                      </>
                    )}
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  href?: string;
}) {
  const inner = (
    <div
      className={cn(
        "flex items-center gap-4 rounded-3xl border border-[var(--color-border)] bg-white/70 p-5 shadow-[var(--shadow-soft)] backdrop-blur-sm transition-all",
        href && "hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
      )}
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-purple-50 text-purple-600">
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-charcoal-soft">{label}</p>
        <p className="mt-0.5 font-medium text-charcoal">{value}</p>
      </div>
    </div>
  );
  return href ? <a href={href}>{inner}</a> : inner;
}

function LabeledInput({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-charcoal">{label}</label>
      <Input {...props} />
    </div>
  );
}
