"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { WhatsAppIcon } from "./social-icons";
import { SITE } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Floating WhatsApp Business enquiry button. Fixed bottom-right, above the
 * mobile safe area. Opens a pre-filled chat with the store's WA Business
 * number. Purely presentational — no PII, safe to render everywhere.
 */
import { useStoreSettings } from "@/components/common/settings-provider";

export function WhatsAppButton() {
  const { settings, hydrated } = useStoreSettings();
  const [showHint, setShowHint] = React.useState(false);
  const pathname = usePathname();
  const onProductPage = /^\/shop\/[^/]+\/?$/.test(pathname || "");

  // Nudge the tooltip open once, a few seconds after load (desktop only feel).
  React.useEffect(() => {
    const t = setTimeout(() => setShowHint(true), 3500);
    const t2 = setTimeout(() => setShowHint(false), 9000);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, []);

  if (!hydrated) return null;
  if (!settings.whatsappEnabled) return null;

  const wNo = `${settings.whatsappCountryCode || "91"}${settings.whatsappNumber || "9825000000"}`;
  const message = encodeURIComponent(settings.defaultGreetingMessage || "Hi, I have an enquiry about your chips.");
  const href = `https://wa.me/${wNo}?text=${message}`;

  const isLeft = settings.whatsappButtonPosition === "bottom-left";
  const showDesktop = settings.whatsappShowOnDesktop ?? true;
  const showMobile = settings.whatsappShowOnMobile ?? true;

  return (
    <div
      className={cn(
        "fixed z-40 items-center gap-2 sm:flex",
        isLeft ? "bottom-4 left-4 sm:bottom-6 sm:left-6" : "bottom-4 right-4 sm:bottom-6 sm:right-6",
        onProductPage ? "hidden" : "flex",
        !showDesktop && "md:hidden",
        !showMobile && "max-md:hidden"
      )}
    >
      {/* Tooltip / label */}
      <motion.div
        initial={false}
        animate={showHint ? { opacity: 1, x: 0, pointerEvents: "auto" } : { opacity: 0, x: isLeft ? -8 : 8, pointerEvents: "none" }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="hidden items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-[var(--shadow-lift)] sm:flex"
      >
        {settings.whatsappButtonText || "Chat with us"}
        <button
          onClick={() => setShowHint(false)}
          aria-label="Dismiss"
          className="grid size-5 place-items-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        >
          <X className="size-3.5" />
        </button>
      </motion.div>

      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={settings.whatsappButtonText || "Chat with us on WhatsApp"}
        onMouseEnter={() => setShowHint(true)}
        className={cn(
          "group relative grid size-13 place-items-center rounded-full bg-[#25D366] text-white shadow-[var(--shadow-lift)] transition-transform duration-300 hover:scale-110 active:scale-95 sm:size-14"
        )}
      >
        {/* pulse ring */}
        <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-60 motion-safe:animate-ping" aria-hidden />
        <WhatsAppIcon className="relative size-7 sm:size-8" />
      </a>
    </div>
  );
}
