"use client";

import * as React from "react";
import Link from "next/link";
import { Mail, Phone, MapPin, ChevronDown } from "lucide-react";
import { Logo } from "./logo";
import { SITE } from "@/lib/constants";
import { useStoreSettings } from "@/components/common/settings-provider";
import { useLanguage } from "@/components/common/language-provider";
import { useSocialLinks } from "@/lib/hooks/use-social-links";
import { SocialIcon, SOCIAL_LABELS } from "./social-icons";

export function Footer() {
  const { settings } = useStoreSettings();
  const { t } = useLanguage();
  const socials = useSocialLinks();
  const [openSection, setOpenSection] = React.useState<string | null>(null);

  const toggleMobileCol = (title: string) => {
    setOpenSection((prev) => (prev === title ? null : title));
  };

  const COLUMNS = [
    {
      title: t("footer_col_shop"),
      links: [
        { label: "All Flavours", href: "/shop" },
        { label: "Best Sellers", href: "/shop?sort=popular" },
        { label: "Variety Packs", href: "/shop" },
        { label: "Gift Boxes", href: "/shop" },
      ],
    },
    {
      title: t("footer_col_company"),
      links: [
        { label: "Our Story", href: "/our-story" },
        { label: "Why Ratalu", href: "/why-us" },
        { label: "Reviews", href: "/reviews" },
        { label: "Contact", href: "/contact" },
      ],
    },
    {
      title: t("footer_col_support"),
      links: [
        { label: "FAQ", href: "/faq" },
        { label: "Shipping & Returns", href: "/policies/shipping" },
        { label: "Track Order", href: "/account?tab=orders" },
        { label: "My Account", href: "/account" },
      ],
    },
    {
      title: t("footer_col_legal"),
      links: [
        { label: "Privacy Policy", href: "/policies/privacy" },
        { label: "Terms of Service", href: "/policies/terms" },
        { label: "Refund Policy", href: "/policies/refunds" },
        { label: "FSSAI Compliance", href: "/policies/fssai" },
      ],
    },
  ];

  return (
    <footer className="relative mt-8 overflow-hidden sm:mt-24 bg-[#2E1148] text-white">
      {/* Top golden accent line */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#5B2C83] via-[#F4B400] to-[#5B2C83]" />

      {/* Decorative background overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-5"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "32px 32px"
        }}
      />

      <div className="container-px relative mx-auto max-w-7xl py-10 sm:py-16">
        <div className="grid gap-8 sm:gap-12 lg:grid-cols-[1.4fr_2fr]">
          {/* Brand & Contact */}
          <div>
            <Logo onDark />
            <p className="mt-3 sm:mt-5 max-w-sm text-xs sm:text-sm leading-relaxed text-[#D7C4F5]">
              {t("footer_tagline")}
            </p>

            <ul className="mt-4 sm:mt-6 flex flex-col gap-2.5 text-xs sm:text-sm">
              <li className="flex items-center gap-2.5">
                <Mail className="size-4 text-[#F4B400]" />
                <a href={`mailto:${settings.supportEmail}`} className="text-[#D7C4F5] hover:text-[#F4B400] transition-colors font-medium">
                  {settings.supportEmail}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="size-4 text-[#F4B400]" />
                <a href={`tel:${settings.customerCareNumber}`} className="text-[#D7C4F5] hover:text-[#F4B400] transition-colors font-medium">
                  {settings.customerCareNumber}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-[#F4B400]" />
                <span className="text-[#D7C4F5] font-medium">{settings.businessAddress}</span>
              </li>
            </ul>

            {socials.length > 0 && (
              <div className="mt-5 sm:mt-6 flex flex-wrap gap-2.5">
                {socials.map((s) => (
                  <a
                    key={s._id}
                    href={s.url}
                    target={s.openInNewTab ? "_blank" : undefined}
                    rel={s.openInNewTab ? "noopener noreferrer" : undefined}
                    aria-label={SOCIAL_LABELS[s.platform] ?? s.platform}
                    className="grid size-9 sm:size-10 place-items-center rounded-full bg-white/10 text-white transition-all hover:-translate-y-0.5 hover:bg-[#F4B400] hover:text-[#2E1148] shadow-sm"
                  >
                    <SocialIcon platform={s.platform} className="size-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Link columns: Accordion on mobile, grid on desktop */}
          <div className="flex flex-col sm:grid sm:grid-cols-4 gap-3 sm:gap-8 border-t border-white/10 pt-6 sm:border-0 sm:pt-0">
            {COLUMNS.map((col) => {
              const isOpen = openSection === col.title;
              return (
                <div key={col.title} className="border-b border-white/10 pb-3 sm:border-0 sm:pb-0">
                  <button
                    onClick={() => toggleMobileCol(col.title)}
                    className="flex w-full items-center justify-between py-1 text-left sm:cursor-default sm:py-0 focus:outline-none"
                  >
                    <h4 className="text-sm sm:text-base font-bold text-white tracking-wide">{col.title}</h4>
                    <ChevronDown className={`size-4 text-[#F4B400] transition-transform sm:hidden ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  <ul className={`mt-3 flex-col gap-2.5 text-xs sm:text-sm ${isOpen ? "flex" : "hidden sm:flex"}`}>
                    {col.links.map((link) => (
                      <li key={link.label}>
                        <Link href={link.href} className="text-[#D7C4F5] transition-colors hover:text-[#F4B400] font-medium">
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-[#D7C4F5] sm:flex-row font-medium">
          <p>© {new Date().getFullYear()} {settings.storeName || settings.businessName || SITE.name}. All rights reserved.</p>
          <p className="flex items-center gap-2 text-white/80">
            <span>{t("footer_made_in")}</span>
            <span aria-hidden className="text-[#F4B400]">·</span>
            <span>{t("footer_fssai")}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
