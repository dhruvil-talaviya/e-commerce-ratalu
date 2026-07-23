"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mail, Phone, MapPin, Send, Check, Loader2, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { SITE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useStoreSettings } from "@/components/common/settings-provider";
import { apiFetch } from "@/lib/api";
import { CmsProvider, useSection } from "@/components/cms/cms-provider";
import type { CmsPageData } from "@/lib/cms-server";

export default function ContactClient({ initialCms }: { initialCms: CmsPageData }) {
  return (
    <CmsProvider page="contact" initial={initialCms as any}>
      <ContactView />
    </CmsProvider>
  );
}

function ContactView() {
  const { settings } = useStoreSettings();
  const [sent, setSent] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Form states
  const [name, setName] = React.useState("");
  const [emailVal, setEmailVal] = React.useState("");
  const [phoneVal, setPhoneVal] = React.useState("");
  const [inquiryType, setInquiryType] = React.useState("General");
  const [subject, setSubject] = React.useState("");
  const [messageVal, setMessageVal] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      await apiFetch("/admin/contact/inquiry", {
        method: "POST",
        body: {
          name,
          email: emailVal,
          phone: phoneVal,
          inquiryType,
          message: subject ? `[Subject: ${subject}] ${messageVal}` : messageVal,
        },
      });
      setSent(true);
      // Reset form
      setName("");
      setEmailVal("");
      setPhoneVal("");
      setSubject("");
      setMessageVal("");
      setInquiryType("General");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const cms = useSection("details", {
    title: settings?.contactTitle || "We'd love to hear from you",
    subtitle: settings?.contactDescription || "Questions about an order, wholesale, or just want to tell us your favourite flavour? Drop us a line.",
    body: settings?.contactSupportHours || "Mon–Sat, 9 AM – 7 PM IST"
  });

  const title = cms.title;
  const description = cms.subtitle;
  const email = settings?.supportEmail || SITE.email;
  const phone = settings?.customerCareNumber || SITE.phone;
  const address = settings?.businessAddress || SITE.address;
  const supportHours = cms.body;

  return (
    <>
      <PageHeader
        eyebrow="Say hello"
        title={title}
        description={description}
        crumbs={[{ label: "Home", href: "/" }, { label: "Contact" }]}
      />

      <div className="container-px mx-auto max-w-7xl py-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.3fr]">
          {/* Info */}
          <div className="flex flex-col gap-4">
            <InfoCard icon={Mail} label="Email us" value={email} href={`mailto:${email}`} />
            <InfoCard icon={Phone} label="Call us" value={phone} href={`tel:${(phone || "").replace(/\s+/g, "")}`} />
            <InfoCard icon={MapPin} label="Visit us" value={address} />
            <div className="flex items-center gap-4 rounded-3xl border border-[var(--color-border)] bg-purple-50/50 p-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-purple-500 text-cream">
                <Clock className="size-5" />
              </span>
              <div>
                <p className="font-semibold text-charcoal">Support hours</p>
                <p className="text-sm text-charcoal-muted">{supportHours}</p>
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
                      Thanks for reaching out — our team will get back to you shortly.
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
                  {errorMsg && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800">
                      {errorMsg}
                    </div>
                  )}

                  <div className="grid gap-5 sm:grid-cols-2">
                    <LabeledInput
                      label="Name"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                    <LabeledInput
                      label="Email"
                      type="email"
                      placeholder="you@example.com"
                      value={emailVal}
                      onChange={(e) => setEmailVal(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <LabeledInput
                      label="Phone Number"
                      type="tel"
                      placeholder="e.g. +91 98250 11111"
                      value={phoneVal}
                      onChange={(e) => setPhoneVal(e.target.value)}
                      required
                    />
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-charcoal">Inquiry Type</label>
                      <select
                        value={inquiryType}
                        onChange={(e) => setInquiryType(e.target.value)}
                        className="h-10 rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-charcoal shadow-sm outline-none focus-visible:border-purple-400 focus-visible:ring-2 focus-visible:ring-purple-200"
                      >
                        <option value="General">General Enquiry</option>
                        <option value="Product Inquiry">Product Inquiry</option>
                        <option value="Order Status">Order Status</option>
                        <option value="Bulk Order">Wholesale / Bulk Order</option>
                        <option value="Distributor">Distributor Enquiry</option>
                        <option value="Franchise">Franchise Inquiry</option>
                      </select>
                    </div>
                  </div>

                  <LabeledInput
                    label="Subject"
                    placeholder="How can we help?"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                  />

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-charcoal">Message</label>
                    <textarea
                      required
                      rows={5}
                      placeholder="Tell us more…"
                      value={messageVal}
                      onChange={(e) => setMessageVal(e.target.value)}
                      className="w-full rounded-3xl border border-[var(--color-border)] bg-white/80 px-5 py-4 text-sm text-charcoal shadow-sm transition-all placeholder:text-charcoal-soft focus-visible:border-purple-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-200"
                    />
                  </div>

                  <Button type="submit" size="lg" disabled={loading} className="w-full sm:w-auto bg-purple-650 hover:bg-purple-750 text-white font-semibold">
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
