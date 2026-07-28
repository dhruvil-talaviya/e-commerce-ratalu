"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "motion/react";
import { Menu, ShoppingBag, User, X, ShieldCheck, Bell, LogOut, Search } from "lucide-react";
import { Logo } from "./logo";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { NAV_LINKS } from "@/lib/constants";
import { useCart } from "@/components/cart/cart-provider";
import { useAccount, isAdminSession } from "@/components/account/account-provider";
import { useUnreadNotifications } from "@/lib/hooks/use-unread-notifications";
import { useLanguage } from "@/components/common/language-provider";
import { cn } from "@/lib/utils";

import { NotificationsDrawer } from "@/components/notifications/notifications-drawer";
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
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const { scrollY } = useScroll();
  const { totals, openCart } = useCart();
  const { user, isLoggedIn, logout } = useAccount();
  const { t } = useLanguage();

  const isAdmin = isLoggedIn && isAdminSession(user);
  const unreadNotifications = useUnreadNotifications();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 16);
  });

  // Lock body scroll while the mobile drawer is open
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

  // Close drawer on desktop screen
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
          "transition-all duration-300 border-b",
          scrolled
            ? "border-[#4A1942]/15 bg-[#FDF8F0]/95 backdrop-blur-xl shadow-md"
            : "border-transparent bg-[#FDF8F0]"
        )}
      >
        <nav className="container-px mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 lg:h-20">
          <Logo />

          {/* Desktop Navigation Centered */}
          <div className="hidden items-center gap-1.5 lg:flex">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href || ((link.href as string) !== "/" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative rounded-full px-4 py-2 text-[15px] font-semibold transition-all duration-200",
                    isActive
                      ? "text-[#4A1942] font-bold"
                      : "text-[#3D2B1F] hover:text-[#4A1942] hover:bg-[#E8C8E4]/30"
                  )}
                >
                  {t((NAV_KEY_MAP[link.href] || "nav_shop") as Parameters<typeof t>[0])}
                  {isActive && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-[#E8B923]"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Actions on right */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Search shortcut button */}
            <Link
              href="/shop"
              className="grid size-10 place-items-center rounded-full text-[#4A1942] transition-colors hover:bg-[#E8C8E4]/30 hover:text-[#E8B923] sm:size-11"
              aria-label="Search Flavours"
              title="Search Flavours"
            >
              <Search className="size-5" />
            </Link>

            {/* Store Owner Admin Link */}
            {isAdmin && (
              <Link
                href="/admin/dashboard"
                className="grid size-10 place-items-center rounded-full text-[#4A1942] transition-colors hover:bg-[#E8C8E4]/30 sm:size-11"
                aria-label="Back to admin dashboard"
                title="Back to admin dashboard"
              >
                <ShieldCheck className="size-5.5 text-[#4A1942]" />
              </Link>
            )}

            {/* Notifications Drawer Toggle */}
            {isLoggedIn && (
              <button
                onClick={() => setNotificationsOpen(true)}
                className="relative grid size-10 place-items-center rounded-full text-[#3D2B1F] transition-colors hover:bg-[#E8C8E4]/30 hover:text-[#4A1942] sm:size-11"
                aria-label={
                  unreadNotifications > 0
                    ? `Notifications, ${unreadNotifications} unread`
                    : "Notifications"
                }
              >
                <Bell className="size-5.5" />
                {unreadNotifications > 0 && (
                  <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-[#E8B923] px-1 text-[9px] font-extrabold text-[#1A0F0A] shadow-sm">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                )}
              </button>
            )}

            {/* User Account */}
            <Link
              href={isLoggedIn ? "/account" : `${pathname}?login=true`}
              className="flex size-10 items-center justify-center rounded-full text-[#3D2B1F] transition-colors hover:bg-[#E8C8E4]/30 hover:text-[#4A1942] sm:size-11"
              aria-label={isLoggedIn && user ? `Account of ${(user.name || "Snacker").split(" ")[0]}` : t("nav_account")}
            >
              {isLoggedIn && user ? (
                <span className="grid size-7 place-items-center rounded-full bg-[#4A1942] text-xs font-bold text-white shadow-xs">
                  {(user.name || "S")[0].toUpperCase()}
                </span>
              ) : (
                <User className="size-5" />
              )}
            </Link>

            {/* Shopping Cart Trigger Button */}
            <button
              onClick={openCart}
              className="relative grid size-10 place-items-center rounded-full text-[#4A1942] transition-colors hover:bg-[#E8C8E4]/30 sm:size-11"
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
                    className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-[#E8B923] px-1.5 text-[10px] font-black text-[#1A0F0A] shadow-sm"
                  >
                    {totals.itemCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            {/* CTA Button */}
            <Button asChild size="sm" className="ml-1 hidden md:inline-flex bg-[#E8B923] text-[#1A0F0A] hover:bg-[#D4A017] font-bold">
              <Link href="/shop">{t("nav_shop_now")}</Link>
            </Button>

            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => setMenuOpen(true)}
              className="grid size-10 place-items-center rounded-full text-[#4A1942] transition-colors hover:bg-[#E8C8E4]/30 lg:hidden"
              aria-label={t("nav_open_menu")}
            >
              <Menu className="size-5" />
            </button>
          </div>
        </nav>
      </motion.div>

      {/* Mobile Menu Drawer */}
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
              className="absolute inset-0 bg-[#2E1148]/60 backdrop-blur-sm"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              variants={{
                hidden: { x: "100%" },
                visible: { x: 0 },
              }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="absolute right-0 top-0 flex h-full w-[85%] max-w-sm flex-col bg-[#FFF8EC] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <Logo />
                <button
                  onClick={() => setMenuOpen(false)}
                  className="grid size-10 place-items-center rounded-full text-[#5B2C83] hover:bg-[#f5ebfc]"
                  aria-label={t("nav_close_menu")}
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="mt-8 flex flex-col gap-1.5">
                {NAV_LINKS.map((link, i) => {
                  const isActive = pathname === link.href;
                  return (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.04 }}
                    >
                      <Link
                        href={link.href}
                        onClick={() => setMenuOpen(false)}
                        className={cn(
                          "block rounded-2xl px-4 py-3.5 text-lg font-bold transition-all",
                          isActive
                            ? "bg-[#5B2C83] text-white shadow-sm"
                            : "text-[#2D2D2D] hover:bg-[#f5ebfc] hover:text-[#5B2C83]"
                        )}
                      >
                        {t((NAV_KEY_MAP[link.href] || "nav_shop") as Parameters<typeof t>[0])}
                      </Link>
                    </motion.div>
                  );
                })}
              </div>

              <div className="mt-auto flex flex-col gap-3">
                <Button asChild size="lg" variant="primary" className="w-full" onClick={() => setMenuOpen(false)}>
                  <Link href="/shop">{t("nav_shop_now")}</Link>
                </Button>
                <div className="flex flex-col gap-2">
                  <Button asChild variant="outline" size="lg" className="w-full" onClick={() => setMenuOpen(false)}>
                    <Link href={isLoggedIn ? "/account" : `${pathname}?login=true`}>
                      {isLoggedIn && user ? `Hi, ${(user.name || "Snacker").split(" ")[0]}` : t("nav_account")}
                    </Link>
                  </Button>
                  {isLoggedIn && (
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold flex items-center justify-center gap-2"
                      onClick={() => {
                        setMenuOpen(false);
                        logout();
                        toast.success("Logged out successfully");
                      }}
                    >
                      <LogOut className="size-4" />
                      Logout
                    </Button>
                  )}
                  {isAdmin && (
                    <Button
                      asChild
                      variant="outline"
                      size="lg"
                      className="w-full border-[#5B2C83]/30 text-[#5B2C83]"
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

      {/* Side Notifications Drawer */}
      <NotificationsDrawer
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </header>
  );
}
