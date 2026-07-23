"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "motion/react";
import { Menu, ShoppingBag, User, X, ShieldCheck, Bell } from "lucide-react";
import { Logo } from "./logo";
import { Button } from "@/components/ui/button";
import { NAV_LINKS } from "@/lib/constants";
import { useCart } from "@/components/cart/cart-provider";
import { useAccount, isAdminSession } from "@/components/account/account-provider";
import { useUnreadNotifications } from "@/lib/hooks/use-unread-notifications";
import { useLanguage } from "@/components/common/language-provider";
import { cn } from "@/lib/utils";

import { usePathname } from "next/navigation";

// Map href to translation key
const NAV_KEY_MAP: Record<string, string> = {
  "/shop":      "nav_shop",
  "/our-story": "nav_our_story",
  "/why-us":    "nav_why_us",
  "/reviews":   "nav_reviews",
  "/faq":       "nav_faq",
  "/contact":   "nav_contact",
};

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const { scrollY } = useScroll();
  const { totals, openCart } = useCart();
  const { user, isLoggedIn } = useAccount();
  const { t } = useLanguage();

  /**
   * Keyed on the session role, never a phone number — the previous hardcoded
   * check silently broke the moment the admin's number changed.
   */
  const isAdmin = isLoggedIn && isAdminSession(user);
  const unreadNotifications = useUnreadNotifications();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 16);
  });

  // Lock body scroll while the mobile drawer is open, compensating for scrollbar width.
  React.useEffect(() => {
    if (!menuOpen) return;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [menuOpen]);

  // Close the drawer when the viewport grows to desktop.
  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => mq.matches && setMenuOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <header className="sticky top-0 z-40">
      <motion.div
        className={cn(
          "transition-colors duration-300",
          scrolled
            ? "border-b border-[var(--color-border)] bg-[#fff8f0]/90 backdrop-blur-xl shadow-[0_4px_20px_-12px_rgba(249,115,22,0.2)]"
            : "bg-transparent"
        )}
      >
        <nav className="container-px mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 lg:h-18">
          <Logo />

          {/* Desktop nav */}
          <div className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative rounded-full px-4 py-2 text-[15px] font-medium text-gray-500 transition-colors hover:text-orange-600 hover:bg-orange-50"
              >
                {t((NAV_KEY_MAP[link.href] || "nav_shop") as Parameters<typeof t>[0])}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Only the store owner sees this — it's their way back to the console. */}
            {isAdmin && (
              <Link
                href="/admin/dashboard"
                className="grid size-11 place-items-center rounded-full text-purple-700 transition-colors hover:bg-purple-50"
                aria-label="Back to admin dashboard"
                title="Back to admin dashboard"
              >
                <ShieldCheck className="size-5.5" />
              </Link>
            )}

            {/* Notifications live in the header, not buried in the profile page. */}
            {isLoggedIn && (
              <Link
                href="/notifications"
                className="relative grid size-11 place-items-center rounded-full text-gray-700 transition-colors hover:bg-orange-50 hover:text-orange-600"
                aria-label={
                  unreadNotifications > 0
                    ? `Notifications, ${unreadNotifications} unread`
                    : "Notifications"
                }
              >
                <Bell className="size-5.5" />
                {unreadNotifications > 0 && (
                  <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-orange-500 px-1 text-[9px] font-bold text-white shadow-sm">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                )}
              </Link>
            )}

            <Link
              href={isLoggedIn ? "/account" : `${pathname}?login=true`}
              className="hidden size-11 place-items-center rounded-full text-gray-700 transition-colors hover:bg-orange-50 hover:text-orange-600 sm:grid"
              aria-label={isLoggedIn && user ? `Account of ${(user.name || "Snacker").split(" ")[0]}` : t("nav_account")}
            >
              {isLoggedIn && user ? (
                <span className="grid size-7 place-items-center rounded-full bg-orange-100 text-xs font-bold text-orange-700 border border-orange-200 shadow-sm">
                  {(user.name || "S")[0].toUpperCase()}
                </span>
              ) : (
                <User className="size-5" />
              )}
            </Link>

            <button
              onClick={openCart}
              className="relative grid size-11 place-items-center rounded-full text-gray-700 transition-colors hover:bg-orange-50 hover:text-orange-600"
              aria-label={`Cart, ${totals.itemCount} items`}
            >
              <ShoppingBag className="size-5" />
              <AnimatePresence>
                {totals.itemCount > 0 && (
                  <motion.span
                    key={totals.itemCount}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    className="absolute right-1 top-1 grid min-w-4.5 place-items-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white"
                  >
                    {totals.itemCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            <Button asChild size="sm" className="ml-1 hidden md:inline-flex">
              <Link href="/shop">{t("nav_shop_now")}</Link>
            </Button>

            <button
              onClick={() => setMenuOpen(true)}
              className="grid size-11 place-items-center rounded-full text-gray-700 transition-colors hover:bg-orange-50 lg:hidden"
              aria-label={t("nav_open_menu")}
            >
              <Menu className="size-5" />
            </button>
          </div>
        </nav>
      </motion.div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="fixed inset-0 z-50 lg:hidden"
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <motion.div
              variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              variants={{
                hidden: { x: "100%" },
                visible: { x: 0 },
              }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="absolute right-0 top-0 flex h-full w-[82%] max-w-sm flex-col bg-[#fff8f0] p-6 shadow-[var(--shadow-lift)]"
            >
              <div className="flex items-center justify-between">
                <Logo />
                <button
                  onClick={() => setMenuOpen(false)}
                  className="grid size-10 place-items-center rounded-full text-gray-700 hover:bg-orange-50"
                  aria-label={t("nav_close_menu")}
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="mt-8 flex flex-col gap-1">
                {NAV_LINKS.map((link, i) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.05 }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-2xl px-4 py-3.5 text-xl font-semibold text-gray-700 transition-colors hover:bg-orange-50 hover:text-orange-600"
                    >
                      {t((NAV_KEY_MAP[link.href] || "nav_shop") as Parameters<typeof t>[0])}
                    </Link>
                  </motion.div>
                ))}
              </div>

              <div className="mt-auto flex flex-col gap-3">
                <Button asChild size="lg" className="w-full" onClick={() => setMenuOpen(false)}>
                  <Link href="/shop">{t("nav_shop_now")}</Link>
                </Button>
                <div className="flex flex-col gap-2">
                  <Button asChild variant="outline" size="lg" className="w-full" onClick={() => setMenuOpen(false)}>
                    <Link href={isLoggedIn ? "/account" : `${pathname}?login=true`}>{isLoggedIn && user ? `Hi, ${(user.name || "Snacker").split(" ")[0]}` : t("nav_account")}</Link>
                  </Button>
                  {isLoggedIn && (
                    <Button asChild variant="outline" size="lg" className="w-full" onClick={() => setMenuOpen(false)}>
                      <Link href="/notifications">
                        Notifications
                        {unreadNotifications > 0 && (
                          <span className="ml-1.5 grid min-w-4.5 place-items-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
                            {unreadNotifications}
                          </span>
                        )}
                      </Link>
                    </Button>
                  )}
                  {isAdmin && (
                    <Button
                      asChild
                      variant="outline"
                      size="lg"
                      className="w-full border-purple-200 text-purple-700"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Link href="/admin/dashboard">Back to Admin Dashboard</Link>
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
