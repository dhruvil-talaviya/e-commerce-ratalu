"use client";

import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";
import { Logo } from "./logo";
import { InstagramIcon, FacebookIcon, XIcon, YoutubeIcon } from "./social-icons";
import { SITE } from "@/lib/constants";
import { useStoreSettings } from "@/components/common/settings-provider";
import { useLanguage } from "@/components/common/language-provider";

const SOCIAL = [
  { icon: InstagramIcon, href: SITE.social.instagram, label: "Instagram" },
  { icon: FacebookIcon, href: SITE.social.facebook, label: "Facebook" },
  { icon: XIcon, href: SITE.social.twitter, label: "X (Twitter)" },
  { icon: YoutubeIcon, href: SITE.social.youtube, label: "YouTube" },
];

export function Footer() {
  const { settings } = useStoreSettings();
  const { t } = useLanguage();

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
        { label: "Track Order", href: "/account" },
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
    <footer className="relative mt-16 overflow-hidden sm:mt-24" style={{
      background: "linear-gradient(135deg, #7c3506 0%, #9a4409 30%, #c2570b 70%, #ea6c0a 100%)"
    }}>
      {/* Top glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-orange-600/30 to-transparent" />

      {/* Decorative pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-5"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "32px 32px"
        }}
      />

      <div className="container-px relative mx-auto max-w-7xl py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2fr]">
          {/* Brand */}
          <div>
            <Logo onDark />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/70">
              {t("footer_tagline")}
            </p>

            <ul className="mt-6 flex flex-col gap-2.5 text-sm">
              <li className="flex items-center gap-3">
                <Mail className="size-4 text-yellow-400" />
                <a href={`mailto:${settings.footerEmail}`} className="text-white/80 hover:text-white transition-colors">
                  {settings.footerEmail}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="size-4 text-yellow-400" />
                <a href={`tel:${settings.footerPhone}`} className="text-white/80 hover:text-white transition-colors">
                  {settings.footerPhone}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-yellow-400" />
                <span className="text-white/80">{settings.footerAddress}</span>
              </li>
            </ul>

            <div className="mt-6 flex gap-2.5">
              {SOCIAL.map((s) => {
                const Icon = s.icon;
                return (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="grid size-10 place-items-center rounded-full bg-white/10 text-white transition-all hover:-translate-y-0.5 hover:bg-yellow-400 hover:text-orange-900"
                  >
                    <Icon className="size-4.5" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h4 className="text-base font-semibold text-white">{col.title}</h4>
                <ul className="mt-4 flex flex-col gap-2.5 text-sm">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className="text-white/65 transition-colors hover:text-yellow-300">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/15 pt-8 text-xs text-white/55 sm:flex-row">
          <p>© {new Date().getFullYear()} {SITE.legalName}. All rights reserved.</p>
          <p className="flex items-center gap-2">
            <span>{t("footer_made_in")}</span>
            <span aria-hidden>·</span>
            <span>{t("footer_fssai")}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
