import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";
import { Logo } from "./logo";
import { InstagramIcon, FacebookIcon, XIcon, YoutubeIcon } from "./social-icons";
import { SITE } from "@/lib/constants";
import { useStoreSettings } from "@/components/common/settings-provider";

const COLUMNS = [
  {
    title: "Shop",
    links: [
      { label: "All Flavours", href: "/shop" },
      { label: "Best Sellers", href: "/shop?sort=popular" },
      { label: "Variety Packs", href: "/shop" },
      { label: "Gift Boxes", href: "/shop" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Our Story", href: "/our-story" },
      { label: "Why Ratalu", href: "/why-us" },
      { label: "Reviews", href: "/reviews" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "FAQ", href: "/faq" },
      { label: "Shipping & Returns", href: "/policies/shipping" },
      { label: "Track Order", href: "/account" },
      { label: "My Account", href: "/account" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/policies/privacy" },
      { label: "Terms of Service", href: "/policies/terms" },
      { label: "Refund Policy", href: "/policies/refunds" },
      { label: "FSSAI Compliance", href: "/policies/fssai" },
    ],
  },
];

const SOCIAL = [
  { icon: InstagramIcon, href: SITE.social.instagram, label: "Instagram" },
  { icon: FacebookIcon, href: SITE.social.facebook, label: "Facebook" },
  { icon: XIcon, href: SITE.social.twitter, label: "X (Twitter)" },
  { icon: YoutubeIcon, href: SITE.social.youtube, label: "YouTube" },
];

export function Footer() {
  const { settings } = useStoreSettings();
  return (
    <footer className="relative mt-16 overflow-hidden bg-purple-700 text-cream/80 sm:mt-24">
      {/* soft top glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-purple-600/60 to-transparent" />

      <div className="container-px relative mx-auto max-w-7xl py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2fr]">
          {/* Brand */}
          <div>
            <Logo onDark />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-cream/70">
              Crispy. Natural. Irresistible. Small-batch purple-yam wafers,
              kettle-cooked and delivered fresh across India.
            </p>

            <ul className="mt-6 flex flex-col gap-2.5 text-sm">
              <li className="flex items-center gap-3">
                <Mail className="size-4 text-gold-300" />
                <a href={`mailto:${settings.footerEmail}`} className="hover:text-cream">
                  {settings.footerEmail}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="size-4 text-gold-300" />
                <a href={`tel:${settings.footerPhone}`} className="hover:text-cream">
                  {settings.footerPhone}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-gold-300" />
                <span>{settings.footerAddress}</span>
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
                    className="grid size-10 place-items-center rounded-full bg-white/10 text-cream transition-all hover:-translate-y-0.5 hover:bg-gold-400 hover:text-purple-800"
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
                <h4 className="font-serif text-base font-semibold text-cream">{col.title}</h4>
                <ul className="mt-4 flex flex-col gap-2.5 text-sm">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className="text-cream/70 transition-colors hover:text-gold-300">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs text-cream/60 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {SITE.legalName}. All rights reserved.
          </p>
          <p className="flex items-center gap-2">
            <span>Made with care in Gujarat, India</span>
            <span aria-hidden>·</span>
            <span>FSSAI Lic. 10012345678901</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
