"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "motion/react";
import { Heart, Menu, ShoppingBag, User, X, ShieldCheck } from "lucide-react";
import { Logo } from "./logo";
import { Button } from "@/components/ui/button";
import { NAV_LINKS } from "@/lib/constants";
import { useCart } from "@/components/cart/cart-provider";
import { useWishlist } from "@/components/cart/wishlist-provider";
import { useAccount } from "@/components/account/account-provider";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [scrolled, setScrolled] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const { scrollY } = useScroll();
  const { totals, openCart } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { user, isLoggedIn } = useAccount();
  const isAdminUser = isLoggedIn && user?.phone === "9999999999";

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 16);
  });

  // Lock body scroll while the mobile drawer is open.
  React.useEffect(() => {
    if (!menuOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
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
            ? "border-b border-[var(--color-border)] bg-cream/85 backdrop-blur-xl shadow-[0_4px_20px_-12px_rgba(91,44,111,0.25)]"
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
                className="relative rounded-full px-4 py-2 text-sm font-medium text-charcoal-muted transition-colors hover:text-purple-700"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {isAdminUser && (
              <Link
                href="/admin"
                className="hidden size-11 place-items-center rounded-full text-charcoal transition-colors hover:bg-purple-50 hover:text-purple-700 sm:grid"
                aria-label="Admin Console"
              >
                <ShieldCheck className="size-5.5 text-purple-600" />
              </Link>
            )}

            <Link
              href="/account"
              className="hidden size-11 place-items-center rounded-full text-charcoal transition-colors hover:bg-purple-50 hover:text-purple-700 sm:grid"
              aria-label={isLoggedIn && user ? `Account of ${(user.name || "Snacker").split(" ")[0]}` : "Account"}
            >
              {isLoggedIn && user ? (
                <span className="grid size-7 place-items-center rounded-full bg-purple-100 text-xs font-bold text-purple-700 border border-purple-200 shadow-sm">
                  {(user.name || "S")[0].toUpperCase()}
                </span>
              ) : (
                <User className="size-5" />
              )}
            </Link>

            <Link
              href="/account"
              className="relative hidden size-11 place-items-center rounded-full text-charcoal transition-colors hover:bg-purple-50 hover:text-purple-700 sm:grid"
              aria-label="Wishlist"
            >
              <Heart className="size-5" />
              {wishlistCount > 0 && (
                <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
                  {wishlistCount}
                </span>
              )}
            </Link>

            <button
              onClick={openCart}
              className="relative grid size-11 place-items-center rounded-full text-charcoal transition-colors hover:bg-purple-50 hover:text-purple-700"
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
                    className="absolute right-1 top-1 grid min-w-4.5 place-items-center rounded-full bg-purple-500 px-1 text-[10px] font-bold text-cream"
                  >
                    {totals.itemCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            <Button asChild size="sm" className="ml-1 hidden md:inline-flex">
              <Link href="/shop">Shop Now</Link>
            </Button>

            <button
              onClick={() => setMenuOpen(true)}
              className="grid size-11 place-items-center rounded-full text-charcoal transition-colors hover:bg-purple-50 lg:hidden"
              aria-label="Open menu"
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
              className="absolute inset-0 bg-purple-900/40 backdrop-blur-sm"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              variants={{
                hidden: { x: "100%" },
                visible: { x: 0 },
              }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="absolute right-0 top-0 flex h-full w-[82%] max-w-sm flex-col bg-cream p-6 shadow-[var(--shadow-lift)]"
            >
              <div className="flex items-center justify-between">
                <Logo />
                <button
                  onClick={() => setMenuOpen(false)}
                  className="grid size-10 place-items-center rounded-full text-charcoal hover:bg-purple-50"
                  aria-label="Close menu"
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
                      className="block rounded-2xl px-4 py-3.5 font-serif text-xl text-charcoal transition-colors hover:bg-purple-50 hover:text-purple-700"
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
              </div>

              <div className="mt-auto flex flex-col gap-3">
                <Button asChild size="lg" className="w-full" onClick={() => setMenuOpen(false)}>
                  <Link href="/shop">Shop Now</Link>
                </Button>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-3">
                    <Button asChild variant="outline" size="lg" className="flex-1" onClick={() => setMenuOpen(false)}>
                      <Link href="/account">{isLoggedIn && user ? `Hi, ${(user.name || "Snacker").split(" ")[0]}` : "Account"}</Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="flex-1" onClick={() => setMenuOpen(false)}>
                      <Link href="/account">Wishlist</Link>
                    </Button>
                  </div>
                  {isAdminUser && (
                    <Button asChild variant="outline" size="lg" className="w-full text-purple-700 border-purple-200" onClick={() => setMenuOpen(false)}>
                      <Link href="/admin">Admin Console</Link>
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
