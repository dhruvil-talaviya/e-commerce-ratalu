"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MessageCircleQuestion, Phone, Mail, Clock, Sparkles, Truck, PackageCheck, ShieldCheck, CreditCard, UserCheck, MapPin, HelpCircle, ArrowRight, ChevronDown } from "lucide-react";
import { FAQS } from "@/lib/data/faq";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSection } from "@/components/cms/cms-provider";
import type { FaqItem } from "@/lib/types";

interface FaqProps {
  variant?: "homepage" | "page";
}

export function Faq({ variant = "page" }: FaqProps) {
  const isHomepage = variant === "homepage";
  const cmsContent = useSection<Record<string, any>>("faqs", {});
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("All");
  const [openId, setOpenId] = React.useState<string | null>("shipping");

  const faqsList = React.useMemo<FaqItem[]>(() => {
    const cmsItems = Array.isArray(cmsContent.items) ? cmsContent.items.filter((f) => f?.question) : [];
    return cmsItems.length > 0 ? cmsItems : FAQS;
  }, [cmsContent.items]);

  const categories = React.useMemo(() => {
    const cats = Array.from(new Set(faqsList.map((f) => f.category || "General").filter(Boolean)));
    return ["All", ...cats];
  }, [faqsList]);

  const filteredFaqs = React.useMemo(() => {
    return faqsList.filter((faq) => {
      const matchesCat = selectedCategory === "All" || (faq.category || "General") === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        faq.question.toLowerCase().includes(q) ||
        faq.answer.toLowerCase().includes(q) ||
        (faq.category && faq.category.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [faqsList, selectedCategory, searchQuery]);

  const getCategoryIcon = (category?: string) => {
    switch (category?.toLowerCase()) {
      case "shipping": return <Truck className="size-3.5 text-[#5B2C83]" />;
      case "products": return <PackageCheck className="size-3.5 text-amber-700" />;
      case "returns": return <ShieldCheck className="size-3.5 text-rose-700" />;
      case "payments": return <CreditCard className="size-3.5 text-emerald-700" />;
      case "orders": return <UserCheck className="size-3.5 text-indigo-700" />;
      default: return <HelpCircle className="size-3.5 text-[#5B2C83]" />;
    }
  };

  const displayFaqs = React.useMemo(() => {
    if (isHomepage) {
      return faqsList.slice(0, 4);
    }
    return filteredFaqs;
  }, [isHomepage, faqsList, filteredFaqs]);

  return (
    <section id="faqs" className="relative scroll-mt-24 py-14 sm:py-20 lg:py-24 bg-gradient-to-b from-[#FBF8F3] via-white to-[#FBF8F3] overflow-hidden">
      {/* Soft Decorative Ambient Background Glows */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-r from-purple-200/20 via-amber-200/20 to-purple-200/20 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="container-px mx-auto max-w-6xl">
        {/* Header Block with Motion */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mx-auto max-w-3xl text-center mb-10 sm:mb-14"
        >
          <span className="inline-flex items-center gap-1.5 bg-[#5B2C83]/10 text-[#5B2C83] border border-[#5B2C83]/20 mb-3 px-4 py-1.5 rounded-full text-xs font-extrabold tracking-wider uppercase shadow-2xs">
            <Sparkles className="size-3.5 text-[#5B2C83]" />
            {isHomepage ? "Quick Answers" : "Help Center & Answers"}
          </span>
          <h2 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-extrabold text-gray-950 tracking-tight leading-[1.15]">
            {isHomepage ? "Got Questions? We've Got Answers." : "Frequently Asked Questions"}
          </h2>
          <p className="mt-3.5 text-base sm:text-lg text-gray-600 max-w-xl mx-auto leading-relaxed">
            {isHomepage 
              ? "Everything you need to know about our fresh purple yam wafers, fast delivery, and simple online ordering."
              : "Everything you need to know about our purple yam wafers, fresh preparation, fast shipping, and order security."}
          </p>

          {/* Premium Animated Search Bar (Only shown on full /faq page) */}
          {!isHomepage && (
            <>
              <div className="relative mt-8 max-w-lg mx-auto group">
                <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 size-4.5 text-[#5B2C83] group-focus-within:scale-110 transition-transform duration-200" />
                <Input
                  type="text"
                  placeholder="Search by topic or question (e.g. shipping, fresh, cancel)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-4 py-3.5 h-13 bg-white/90 backdrop-blur-md border border-gray-200 focus:border-[#5B2C83] focus:ring-4 focus:ring-[#5B2C83]/10 rounded-2xl shadow-sm text-sm text-gray-900 placeholder:text-gray-400 transition-all duration-200"
                />
              </div>

              {/* Category Pills with Smooth Motion */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 mt-6">
                {categories.map((cat) => {
                  const active = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`relative px-4.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                        active
                          ? "bg-[#5B2C83] text-white shadow-md shadow-[#5B2C83]/25 scale-105"
                          : "bg-white text-gray-700 border border-gray-200/90 hover:border-[#5B2C83]/40 hover:bg-purple-50/50 hover:scale-102"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </motion.div>

        <div className="grid gap-10 lg:grid-cols-[1.25fr_0.75fr] items-start">
          {/* Left Column: Accordion Questions */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {displayFaqs.length === 0 ? (
              <div className="rounded-3xl border border-gray-200/80 bg-white p-10 text-center shadow-xs">
                <HelpCircle className="size-10 text-purple-300 mx-auto mb-3 animate-pulse" />
                <p className="text-base font-bold text-gray-900">No matching questions found</p>
                <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">Try typing a different keyword or reset your category filter.</p>
                <Button size="sm" onClick={() => { setSearchQuery(""); setSelectedCategory("All"); }} className="mt-5 bg-[#5B2C83] hover:bg-[#4a236c] text-white text-xs font-bold rounded-xl px-5">
                  Reset Search
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                {displayFaqs.map((faq, idx) => {
                  const key = String(faq.id || faq._id || `faq-${idx}`);
                  const isOpen = openId === key;
                  const isPopular = idx < 3;

                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.04 }}
                      className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                        isOpen
                          ? "border-[#5B2C83]/50 bg-white shadow-md shadow-[#5B2C83]/5 ring-1 ring-[#5B2C83]/20"
                          : "border-gray-200/80 bg-white/90 hover:border-[#5B2C83]/30 hover:bg-white hover:shadow-2xs"
                      }`}
                    >
                      <button
                        onClick={() => setOpenId(isOpen ? null : key)}
                        className="w-full px-5 py-4 flex items-center justify-between text-left gap-4"
                      >
                        <div className="flex flex-col items-start gap-2 pr-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {faq.category && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#5B2C83] bg-purple-100/70 border border-purple-200/80 px-2.5 py-0.5 rounded-md">
                                {getCategoryIcon(faq.category)}
                                {faq.category}
                              </span>
                            )}
                            {isPopular && (
                              <span className="inline-flex items-center text-[10px] font-extrabold text-amber-950 bg-amber-100 border border-amber-300/80 px-2.5 py-0.5 rounded-md">
                                ⭐ Most Asked
                              </span>
                            )}
                          </div>
                          <span className="font-bold text-sm sm:text-base text-gray-950 leading-snug">{faq.question}</span>
                        </div>

                        <span className={`grid size-8 shrink-0 place-items-center rounded-xl transition-transform duration-300 ${
                          isOpen ? "bg-[#5B2C83] text-white rotate-180" : "bg-purple-50 text-[#5B2C83]"
                        }`}>
                          <ChevronDown className="size-4" />
                        </span>
                      </button>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                          >
                            <div className="px-5 pb-4 pt-1 text-gray-600 leading-relaxed text-xs sm:text-sm border-t border-gray-100 mt-1">
                              {faq.answer}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}

                {/* Homepage CTA to view full FAQ page */}
                {isHomepage && (
                  <div className="mt-2 text-center sm:text-left">
                    <Button asChild variant="outline" className="border-[#5B2C83] text-[#5B2C83] hover:bg-[#5B2C83] hover:text-white font-bold text-xs rounded-xl px-6 py-2.5 shadow-2xs group/all">
                      <Link href="/faq" className="inline-flex items-center gap-2">
                        View All 10 Frequently Asked Questions
                        <ArrowRight className="size-4 group-hover/all:translate-x-1 transition-transform" />
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* Right Column: Premium Support & Order Help Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col gap-5 sticky top-28"
          >
            {/* Ultra-Luxury Support Card */}
            <div className="rounded-3xl border border-purple-900/10 bg-gradient-to-br from-[#2D1236] via-[#3E1A4A] to-[#1A0A20] p-7 text-white shadow-2xl relative overflow-hidden group">
              {/* Background Ambient Glow */}
              <div className="absolute -right-10 -bottom-10 size-48 bg-amber-400/15 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700 pointer-events-none" />

              <div className="flex items-center gap-3.5 mb-5">
                <span className="grid size-12 place-items-center rounded-2xl bg-white/10 text-amber-300 backdrop-blur-md shadow-inner border border-white/10">
                  <MessageCircleQuestion className="size-6" />
                </span>
                <div>
                  <h3 className="font-serif text-xl font-bold text-white tracking-tight">Still Have Questions?</h3>
                  <p className="text-xs text-purple-200/90 mt-0.5">Our support team is ready to assist you</p>
                </div>
              </div>

              <div className="flex flex-col gap-3.5 my-6 text-xs text-purple-100/90 border-y border-white/10 py-5">
                <div className="flex items-center gap-3 group/item">
                  <Mail className="size-4 text-amber-300 shrink-0 group-hover/item:scale-110 transition-transform" />
                  <span className="font-medium">yamorawafers@gmail.com</span>
                </div>
                <div className="flex items-center gap-3 group/item">
                  <Phone className="size-4 text-amber-300 shrink-0 group-hover/item:scale-110 transition-transform" />
                  <span className="font-medium">+91 91041 18363</span>
                </div>
                <div className="flex items-center gap-3 group/item">
                  <Clock className="size-4 text-amber-300 shrink-0 group-hover/item:scale-110 transition-transform" />
                  <span className="font-medium">Mon – Sat: 10:00 AM – 7:00 PM IST</span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button asChild size="sm" className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-gray-950 font-bold text-xs rounded-xl h-11 shadow-lg hover:shadow-amber-400/20 transition-all border-0">
                  <a href="https://wa.me/919104118363" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5">
                    WhatsApp Chat
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/15 text-xs font-bold rounded-xl h-11 backdrop-blur-xs transition-all">
                  <Link href="/contact" className="flex items-center justify-center gap-1 group/btn">
                    Contact Us
                    <ArrowRight className="size-3.5 ml-0.5 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Quick Order Tracking Callout Box */}
            <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50/90 to-amber-100/50 p-5 text-xs text-amber-950 flex items-start gap-3.5 shadow-xs hover:shadow-sm transition-shadow">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-200/80 text-amber-950 font-bold shadow-2xs">
                <MapPin className="size-4.5" />
              </span>
              <div>
                <p className="font-bold text-amber-950 text-sm">Need live tracking for an order?</p>
                <p className="mt-1 text-amber-900/80 leading-relaxed">
                  Go to your <Link href="/account" className="underline font-bold text-[#5B2C83] hover:text-purple-950">Account Dashboard → My Orders</Link> to view real-time courier milestones.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
