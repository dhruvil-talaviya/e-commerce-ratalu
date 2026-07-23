"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  User,
  Package,
  MapPin,
  Heart,
  Gift,
  Ticket,
  Plus,
  Trash2,
  ArrowRight,
  LogOut,
  Compass,
  Info,
  Bell,
  BellRing,
  LifeBuoy,
  Settings as SettingsIcon,
  Check,
  ShoppingBag,
  Send,
  Mail,
  Phone,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import { PageHeader } from "@/components/common/page-header";
import { HeatMeter } from "@/components/common/heat-meter";
import { WaferVisual } from "@/components/common/wafer-visual";
import { useWishlist } from "@/components/cart/wishlist-provider";
import { useCart } from "@/components/cart/cart-provider";
import { useAccount, type SavedAddress } from "@/components/account/account-provider";
import { useLanguage } from "@/components/common/language-provider";
import { AddressForm } from "@/components/shop/address-form";
import { Edit2, CheckCircle2, ShieldCheck } from "lucide-react";
import type { Language } from "@/lib/i18n/types";
import { useProducts } from "@/components/shop/product-provider";
import { useOrders, type Order } from "@/components/shop/order-provider";
import { getPack, DEFAULT_PACK_ID, PACK_SIZES } from "@/lib/data/products";
import { apiFetch } from "@/lib/api";
import { RefundRequestDialog } from "@/components/account/refund-request-dialog";
import { SITE } from "@/lib/constants";

// Local notification type — no longer pulled from mock data
interface AppNotification {
  id: string;
  type: "order" | "offer" | "system";
  title: string;
  body: string;
  time: string;
  read: boolean;
}
import { formatINR, cn } from "@/lib/utils";
import type { Flavor } from "@/lib/types";

/** How often the account page re-pulls orders and notifications. */
const POLL_MS = 30_000;

interface ApiNotification {
  _id: string;
  title: string;
  message: string;
  read: boolean;
  type: "OrderStatus" | "Coupon" | "Offer" | "General";
  createdAt: string;
}

const NOTIF_TYPE_MAP: Record<ApiNotification["type"], AppNotification["type"]> = {
  OrderStatus: "order",
  Coupon: "offer",
  Offer: "offer",
  General: "system",
};

/** "just now" / "5m ago" / "3h ago" / "2d ago" */
function relativeTime(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Loads the customer's real notifications and keeps them fresh. */
function useNotifications(enabled: boolean) {
  const [notifs, setNotifs] = React.useState<AppNotification[]>([]);

  const refresh = React.useCallback(async () => {
    if (!enabled) return;
    try {
      const data = await apiFetch<ApiNotification[]>("/notifications");
      setNotifs(
        (data || []).map((n) => ({
          id: n._id,
          type: NOTIF_TYPE_MAP[n.type] ?? "system",
          title: n.title,
          body: n.message,
          time: relativeTime(n.createdAt),
          read: n.read,
        }))
      );
    } catch {
      // A failed poll is not worth interrupting the page for.
    }
  }, [enabled]);

  React.useEffect(() => {
    if (!enabled) return;
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [enabled, refresh]);

  const unread = notifs.filter((n) => !n.read).length;
  return { notifs, setNotifs, unread, refresh };
}

type Tab =
  | "orders"
  | "wishlist"
  | "coupons"
  | "notifications"
  | "addresses"
  | "profile"
  | "support"
  | "settings";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "profile", label: "Profile", icon: User },
  { key: "orders", label: "My Orders", icon: Package },
  { key: "wishlist", label: "Wishlist", icon: Heart },
  { key: "coupons", label: "Coupons", icon: Ticket },
  { key: "addresses", label: "Addresses", icon: MapPin },
  { key: "support", label: "Support", icon: LifeBuoy },
  { key: "settings", label: "Settings", icon: SettingsIcon },
];

const isTab = (value: string | null): value is Tab =>
  !!value && TABS.some((t) => t.key === value);

export default function AccountPage() {
  // useSearchParams needs a Suspense boundary during prerender.
  return (
    <React.Suspense fallback={<div className="container-px mx-auto max-w-6xl py-16" />}>
      <AccountView />
    </React.Suspense>
  );
}

function AccountView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /**
   * The URL is the single source of truth for the active panel, so "Track
   * Order" links (footer, checkout success) deep-link straight to /account?tab=orders
   * and the tab survives a refresh or a shared link. Orders is the landing tab.
   */
  const paramTab = searchParams.get("tab");
  const tab: Tab = isTab(paramTab) ? paramTab : "profile";
  const setTab = React.useCallback(
    (next: Tab) => router.replace(`${pathname}?tab=${next}`, { scroll: false }),
    [router, pathname]
  );

  const { user, isLoggedIn, logout } = useAccount();
  const { count } = useWishlist();
  const { notifs, setNotifs, unread } = useNotifications(isLoggedIn);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  /**
   * Leave the protected page BEFORE dropping the session.
   *
   * Logging out used to clear the session first, which flipped `isLoggedIn` while
   * still on /account — and the redirect below then fired `/?login=true`, so
   * signing out dumped you on the home page with the login popup open. Navigating
   * first means the session is gone only once we're already somewhere public.
   */
  const handleLogout = React.useCallback(async () => {
    router.replace("/");
    await logout();
  }, [logout, router]);

  /**
   * Signed out on /account? Stay here and let the login gate do its job.
   *
   * This used to redirect to `/?login=true`, which meant you never actually saw
   * the "verify your mobile" step on the account page — you were bounced to the
   * homepage first. The gate (rendered in the layout) covers this page whenever
   * a signed-out visitor lands on it.
   */
  if (!isLoggedIn) {
    return (
      <div className="container-px mx-auto flex max-w-xl flex-col items-center justify-center py-20 text-center">
        <div className="flex flex-col items-center gap-5 rounded-3xl border border-gray-200/90 bg-white p-8 shadow-[var(--shadow-soft)] sm:p-10">
          <div className="grid size-16 place-items-center rounded-2xl bg-purple-50 text-[#5B2C83] border border-purple-100 shadow-2xs">
            <ShieldCheck className="size-8" />
          </div>

          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 bg-purple-100/70 px-3 py-1 rounded-full border border-purple-200">
              Customer Account Portal
            </span>
            <h1 className="text-2xl font-bold text-gray-900 mt-2.5">Sign in to view your account</h1>
            <p className="text-xs text-gray-500 mt-1 max-w-md leading-relaxed">
              Your orders, delivery addresses, discount coupons, and profile settings are protected behind your mobile account verification.
            </p>
          </div>

          <div className="w-full grid gap-2.5 text-left border-t border-b border-gray-100 py-4 my-1">
            <div className="flex items-center gap-3 text-xs font-semibold text-gray-700">
              <span className="grid size-6 place-items-center rounded-lg bg-emerald-50 text-emerald-600 font-bold">✓</span>
              <span>Track live order status &amp; shipping updates</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold text-gray-700">
              <span className="grid size-6 place-items-center rounded-lg bg-emerald-50 text-emerald-600 font-bold">✓</span>
              <span>Manage saved delivery addresses &amp; quick checkout</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold text-gray-700">
              <span className="grid size-6 place-items-center rounded-lg bg-emerald-50 text-emerald-600 font-bold">✓</span>
              <span>Access exclusive rewards &amp; redeemed promo coupons</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
            <Link
              href={`${pathname}?login=true`}
              className="flex-1 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#5B2C83] hover:bg-[#4a236c] px-6 py-3 text-xs font-bold text-white shadow-md transition-all cursor-pointer"
            >
              <User className="size-4" /> Sign In / Register with Mobile
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 px-5 py-3 text-xs font-bold text-gray-700 transition-all cursor-pointer"
            >
              Back to Store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const firstName = (user?.name || "Snacker").split(" ")[0];
  const activeTabInfo = TABS.find((t) => t.key === tab);
  const ActiveIcon = activeTabInfo ? activeTabInfo.icon : Package;

  return (
    <>
      <PageHeader
        eyebrow="My Account"
        title={
          <>
            Welcome back, <span className="text-gradient-warm">{firstName}</span>
          </>
        }
        description="Your orders, addresses, coupons and settings — all in one place."
        crumbs={[{ label: "Home", href: "/" }, { label: "Account" }]}
      />

      <div className="container-px mx-auto max-w-7xl py-10">
        {/* Mobile Custom Premium Tab Selector */}
        <div className="block lg:hidden mb-6 relative">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-full flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm font-bold text-gray-800 shadow-[var(--shadow-soft)] focus:outline-none"
          >
            <div className="flex items-center gap-2.5">
              <ActiveIcon className="size-4.5 text-purple-600" />
              <span>{activeTabInfo?.label}</span>
            </div>
            <ChevronDown className={cn("size-4 text-gray-400 transition-transform duration-200", mobileMenuOpen && "rotate-180")} />
          </button>

          {mobileMenuOpen && (
            <>
              {/* Menu backdrop overlay */}
              <div onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 z-30 bg-black/5" />
              <div className="absolute left-0 right-0 z-40 mt-2 rounded-2xl border border-gray-150 bg-white p-2.5 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="grid gap-1">
                  {TABS.map((t) => {
                    const Icon = t.icon;
                    const active = tab === t.key;
                    const badge = t.key === "wishlist" ? count : t.key === "notifications" ? unread : 0;
                    return (
                      <button
                        key={t.key}
                        onClick={() => {
                          setTab(t.key);
                          setMobileMenuOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all text-left",
                          active
                            ? "bg-purple-500 text-white"
                            : "text-gray-600 hover:bg-gray-50"
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className="flex-1">{t.label}</span>
                        {badge > 0 && (
                          <span className={cn("grid min-w-5 place-items-center rounded-full px-1 text-[10px] font-bold", active ? "bg-white text-purple-700" : "bg-orange-500 text-white")}>
                            {badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                  <div className="h-px bg-gray-100 my-1" />
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 text-left"
                  >
                    <LogOut className="size-4 shrink-0" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          {/* Desktop Sidebar (hidden on mobile) */}
          <aside className="hidden lg:block min-w-0 lg:sticky lg:top-24 lg:self-start">
            <nav className="flex flex-col gap-2 rounded-3xl border border-[var(--color-border)] bg-white/70 p-2 backdrop-blur-sm shadow-[var(--shadow-soft)]">
              {TABS.map((t) => {
                const Icon = t.icon;
                const active = tab === t.key;
                const badge =
                  t.key === "wishlist" ? count : t.key === "notifications" ? unread : 0;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={cn(
                      "flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all focus:outline-none",
                      active
                        ? "bg-purple-500 text-cream shadow-sm"
                        : "text-charcoal-muted hover:bg-purple-50 hover:text-purple-700"
                    )}
                  >
                    <Icon className="size-4.5 shrink-0" />
                    <span className="whitespace-nowrap">{t.label}</span>
                    {badge > 0 && (
                      <span
                        className={cn(
                          "ml-auto grid min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold",
                          active ? "bg-cream text-purple-700" : "bg-orange-500 text-white"
                        )}
                      >
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
              <div className="my-1 h-px bg-[var(--color-border)]" />
              <button
                onClick={handleLogout}
                className="flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-red-600 transition-all hover:bg-red-50 focus:outline-none"
              >
                <LogOut className="size-4.5" />
                <span className="whitespace-nowrap">Sign Out</span>
              </button>
            </nav>
          </aside>

          {/* Content */}
          <div className="min-w-0 min-h-[420px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                {tab === "orders" && <OrdersPanel />}
                {tab === "wishlist" && <WishlistPanel />}
                {tab === "coupons" && <CouponsPanel />}
                {tab === "addresses" && <AddressesPanel />}
                {tab === "profile" && <ProfilePanel />}
                {tab === "support" && <SupportPanel />}
                {tab === "settings" && <SettingsPanel onLogout={handleLogout} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-[var(--color-border)] bg-white/70 p-6 shadow-[var(--shadow-soft)] backdrop-blur-sm sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-serif text-2xl font-semibold text-charcoal">{title}</h2>
        {action}
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* NOTIFICATIONS                                                      */
/* ------------------------------------------------------------------ */

const NOTIF_ICON: Record<AppNotification["type"], React.ElementType> = {
  order: Package,
  offer: Ticket,
  system: BellRing,
};

function NotificationsPanel({
  notifs,
  setNotifs,
}: {
  notifs: AppNotification[];
  setNotifs: React.Dispatch<React.SetStateAction<AppNotification[]>>;
}) {
  // Update locally first so the UI responds instantly, then persist.
  const markAllRead = async () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await apiFetch("/notifications/read-all", { method: "PATCH" });
    } catch {
      /* the next poll will reconcile */
    }
  };

  const markRead = async (id: string) => {
    const target = notifs.find((n) => n.id === id);
    if (!target || target.read) return;
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
    } catch {
      /* the next poll will reconcile */
    }
  };

  return (
    <Panel
      title="Notifications"
      action={
        <button onClick={markAllRead} className="text-sm font-medium text-purple-600 hover:underline">
          Mark all read
        </button>
      }
    >
      {notifs.length === 0 ? (
        <EmptyState icon={Bell} title="You're all caught up" description="No new notifications right now." tone="muted" />
      ) : (
        <ul className="flex flex-col gap-2">
          {notifs.map((n) => {
            const Icon = NOTIF_ICON[n.type];
            return (
              <li key={n.id}>
                <button
                  onClick={() => markRead(n.id)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors",
                    n.read ? "border-[var(--color-border)] bg-white/50" : "border-purple-100 bg-purple-50/50"
                  )}
                >
                  <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", n.read ? "bg-cream-100 text-charcoal-muted" : "bg-purple-500 text-cream")}>
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-charcoal">{n.title}</p>
                      {!n.read && <span className="size-2 shrink-0 rounded-full bg-orange-500" />}
                    </div>
                    <p className="mt-0.5 text-sm text-charcoal-muted">{n.body}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-charcoal-soft">{n.time}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}



/* ------------------------------------------------------------------ */
/* SUPPORT                                                            */
/* ------------------------------------------------------------------ */

function SupportPanel() {
  const [sent, setSent] = React.useState(false);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    toast.success("Ticket raised", { description: "Our team will reply within a few hours." });
    setTimeout(() => setSent(false), 2500);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: Mail, label: "Email us", value: SITE.email, href: `mailto:${SITE.email}` },
          { icon: Phone, label: "Call us", value: SITE.phone, href: SITE.phoneHref },
          { icon: LifeBuoy, label: "Help centre", value: "Browse FAQs", href: "/faq" },
        ].map((c) => {
          const Icon = c.icon;
          return (
            <a key={c.label} href={c.href} className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-white/70 p-4 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-purple-50 text-purple-600">
                <Icon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-charcoal-soft">{c.label}</p>
                <p className="truncate text-sm font-semibold text-charcoal">{c.value}</p>
              </div>
            </a>
          );
        })}
      </div>

      <Panel title="Raise a support ticket">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <LabeledInput label="Subject" placeholder="What do you need help with?" required />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-charcoal">Message</label>
            <textarea
              required
              rows={4}
              placeholder="Describe your issue or question…"
              className="w-full rounded-3xl border border-[var(--color-border)] bg-white/80 px-5 py-3.5 text-sm text-charcoal shadow-sm transition-all placeholder:text-charcoal-soft focus-visible:border-purple-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-200"
            />
          </div>
          <div>
            <Button type="submit">{sent ? <><Check /> Sent</> : <><Send /> Submit ticket</>}</Button>
          </div>
        </form>
      </Panel>

      <Panel title="Your tickets">
        <EmptyState
          icon={LifeBuoy}
          title="No tickets yet"
          description="Once you submit a support request, your tickets will appear here. Our team typically replies within a few hours."
          tone="muted"
        />
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SETTINGS                                                           */
/* ------------------------------------------------------------------ */

function Toggle({ checked, onChange, label, desc }: { checked: boolean; onChange: () => void; label: string; desc: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
      <button
        onClick={onChange}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500/20",
          checked ? "bg-purple-600" : "bg-gray-200"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}

function SettingsPanel({ onLogout }: { onLogout: () => void }) {
  const { language, setLanguage, t } = useLanguage();
  const [prefs, setPrefs] = React.useState({ orders: true, offers: true, newsletter: false });
  const togglePref = (k: keyof typeof prefs) => setPrefs((p) => ({ ...p, [k]: !p[k] }));

  const LANGS: { key: Language; label: string; native: string; script: string }[] = [
    { key: "en", label: t("settings_language_en"), native: "English",  script: "Aa" },
    { key: "hi", label: t("settings_language_hi"), native: "हिन्दी",   script: "अ" },
    { key: "gu", label: t("settings_language_gu"), native: "ગુજરાતી",  script: "અ" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* ── Language Selector ── */}
      <Panel title={t("settings_language_label")}>
        <p className="mb-5 text-sm text-gray-500">{t("settings_language_subtitle")}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {LANGS.map((lang) => {
            const active = language === lang.key;
            return (
              <button
                key={lang.key}
                onClick={() => {
                  setLanguage(lang.key);
                  toast.success(t("settings_saved"));
                }}
                className={cn(
                  "group relative flex flex-col items-center gap-2.5 rounded-2xl border-2 p-5 text-center transition-all duration-200",
                  active
                    ? "border-orange-400 bg-orange-50 shadow-[0_0_0_3px_rgb(249_115_22/0.12)]"
                    : "border-gray-200 bg-white hover:border-orange-200 hover:bg-orange-50/50"
                )}
                aria-pressed={active}
              >
                {/* Script icon */}
                <span
                  className={cn(
                    "grid size-12 place-items-center rounded-full text-xl font-bold transition-colors",
                    active
                      ? "bg-orange-500 text-white"
                      : "bg-gray-100 text-gray-600 group-hover:bg-orange-100 group-hover:text-orange-600"
                  )}
                >
                  {lang.script}
                </span>
                <span className={cn("text-sm font-semibold", active ? "text-orange-700" : "text-gray-700")}>
                  {lang.native}
                </span>
                {active && (
                  <span className="absolute right-2.5 top-2.5 flex size-5 items-center justify-center rounded-full bg-orange-500">
                    <Check className="size-3 text-white" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Panel>

      {/* ── Notification preferences ── */}
      <Panel title="Notification preferences">
        <div className="flex flex-col divide-y divide-[var(--color-border)]">
          <Toggle label="Order updates" desc="Dispatch, shipping and delivery alerts." checked={prefs.orders} onChange={() => togglePref("orders")} />
          <Toggle label="Offers & coupons" desc="Flash sales, festive deals and codes." checked={prefs.offers} onChange={() => togglePref("offers")} />
          <Toggle label="Newsletter" desc="New flavours and behind-the-scenes stories." checked={prefs.newsletter} onChange={() => togglePref("newsletter")} />
        </div>
        <div className="mt-5">
          <Button onClick={() => toast.success("Preferences saved")}>Save preferences</Button>
        </div>
      </Panel>

      <div className="flex justify-end">
        <Button variant="outline" onClick={onLogout} className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700">Sign Out</Button>
      </div>
    </div>
  );
}

/* ================================================================== */
/* EXISTING PANELS (preserved)                                        */
/* ================================================================== */

function ProfilePanel() {
  const { user, updateProfile } = useAccount();
  const { flavors } = useProducts();
  const [name, setName] = React.useState(user?.name || "");
  const [phone, setPhone] = React.useState(user?.phone || "");
  const [saved, setSaved] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [showNotifs, setShowNotifs] = React.useState(false);

  const [prevUser, setPrevUser] = React.useState(user);
  if (user !== prevUser) {
    setPrevUser(user);
    setName(user?.name || "");
    setPhone(user?.phone || "");
  }

  const handleSave = () => {
    updateProfile({ name, phone });
    setSaved(true);
    toast.success("Profile updated");
    setIsEditing(false);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col gap-8">
      <Panel
        title="Profile Details"
        action={
          !isEditing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 rounded-xl border-purple-200 text-purple-700 hover:bg-purple-50"
            >
              <Edit2 className="size-3.5" />
              Edit Profile
            </Button>
          ) : undefined
        }
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <LabeledInput
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isEditing}
            className={cn(!isEditing && "bg-gray-50/30 text-gray-500")}
          />
          <LabeledInput
            label="Mobile Number"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={!isEditing}
            className={cn(!isEditing && "bg-gray-50/30 text-gray-500")}
          />
        </div>
        {isEditing && (
          <div className="mt-6 flex items-center gap-3">
            <Button onClick={handleSave} className="flex items-center gap-1.5">
              <Check className="size-4" />
              {saved ? "Saved successfully!" : "Save changes"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setName(user?.name || "");
                setPhone(user?.phone || "");
                setIsEditing(false);
              }}
              className="rounded-full border-gray-200 text-gray-600 hover:bg-gray-50 px-5"
            >
              Cancel
            </Button>
          </div>
        )}
      </Panel>

      <Panel title="Recommended Flavours">
        <p className="mb-5 text-sm text-charcoal-muted">
          Add these signature Ratalu Chips to your cart with one-click custom sizing:
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {flavors.slice(0, 2).map((f) => (
            <QuickAddCard key={f.id} flavor={f} />
          ))}
        </div>
      </Panel>
    </div>
  );
}

function QuickAddCard({ flavor }: { flavor: Flavor }) {
  const { addItem } = useCart();
  const [packId, setPackId] = React.useState(DEFAULT_PACK_ID);
  const [added, setAdded] = React.useState(false);
  const pack = getPack(packId)!;

  const handleAdd = () => {
    addItem(flavor, pack, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
      <div className="flex gap-3">
        <div
          className="size-16 shrink-0 rounded-xl p-1.5"
          style={{ background: `radial-gradient(120% 120% at 30% 20%, ${flavor.gradient.from}22, transparent)` }}
        >
          <WaferVisual flavor={flavor} />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="truncate font-serif text-base font-bold text-charcoal">{flavor.name}</h4>
          <p className="mt-0.5 line-clamp-1 text-xs text-charcoal-soft">{flavor.tagline}</p>
          <HeatMeter level={flavor.heat} className="mt-1" />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-cream-100 pt-3">
        <select
          value={packId}
          onChange={(e) => setPackId(e.target.value)}
          className="rounded-lg border border-purple-200 bg-cream-50 px-2 py-1 text-xs font-semibold text-purple-700 outline-none"
        >
          {PACK_SIZES.map((p) => (
            <option key={p.id} value={p.id}>{p.label} - {formatINR(p.price)}</option>
          ))}
        </select>
        <Button size="sm" onClick={handleAdd} variant={added ? "accent" : "primary"}>
          {added ? "Added!" : "Add to Cart"}
        </Button>
      </div>
    </div>
  );
}


/** Minutes a customer may still cancel after checkout. Mirrors the server rule. */
const CANCEL_WINDOW_MS = 5 * 60 * 1000;

/** Orders shown per page in the account panel. */
const ORDERS_PER_PAGE = 5;

/**
 * Badge colours for every status the Order schema can hold.
 *
 * This used to list "Ready for Dispatch" and "In Transit" — values that don't
 * exist in the database — while missing the real ones (Preparing, Ready to
 * Ship, Assigned to Logistics, Shipped, Returned, the Refund states…). A
 * "Shipped" order fell through to no colour at all. `STATUS_STYLE` below is the
 * single lookup, with a neutral fallback so an unknown status still renders.
 */
const STATUS_STYLE: Record<string, string> = {
  Pending: "bg-gray-100 text-gray-700 border-gray-200",
  Confirmed: "bg-purple-50 text-purple-700 border-purple-100",
  Preparing: "bg-purple-50 text-purple-700 border-purple-100",
  Packed: "bg-blue-50 text-blue-700 border-blue-100",
  "Ready to Ship": "bg-indigo-50 text-indigo-700 border-indigo-100",
  "Assigned to Logistics": "bg-indigo-50 text-indigo-700 border-indigo-100",
  Shipped: "bg-orange-50 text-orange-700 border-orange-100",
  "Out for Delivery": "bg-yellow-50 text-yellow-800 border-yellow-100",
  Delivered: "bg-green-50 text-green-700 border-green-100",
  Cancelled: "bg-red-50 text-red-700 border-red-100",
  Returned: "bg-red-50 text-red-700 border-red-100",
  "Refund Requested": "bg-amber-50 text-amber-700 border-amber-100",
  "Refund Approved": "bg-amber-50 text-amber-700 border-amber-100",
  "Refund Completed": "bg-gray-100 text-gray-700 border-gray-200",
  "Payment Failed": "bg-red-50 text-red-700 border-red-100",
  Expired: "bg-gray-100 text-gray-500 border-gray-200",
};

const statusStyle = (status: string) =>
  STATUS_STYLE[status] ?? "bg-gray-100 text-gray-700 border-gray-200";

/**
 * Ticks once a second so the cancellation countdown stays live without
 * reading the clock during render (which is impure and would not update).
 */
function useNow(active: boolean) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

function OrderStatusStepper({ status }: { status: string }) {
  const steps = [
    { label: "Placed", keys: ["Pending", "Confirmed"] },
    { label: "Packed", keys: ["Preparing", "Packed"] },
    { label: "Shipped", keys: ["Ready to Ship", "Assigned to Logistics", "Shipped"] },
    { label: "Out for Delivery", keys: ["Out for Delivery"] },
    { label: "Delivered", keys: ["Delivered"] },
  ];

  if (status === "Cancelled" || status === "Expired" || status.startsWith("Refund") || status === "Returned") {
    return (
      <div className="mt-4 rounded-xl border border-red-100 bg-red-50/30 p-3 text-center sm:p-4">
        <span className="text-xs font-semibold text-red-600">
          Order Status: {status}
        </span>
      </div>
    );
  }

  let activeStep = steps.findIndex(step => step.keys.includes(status));
  if (activeStep === -1) {
    if (status === "Delivered") activeStep = 4;
    else activeStep = 0;
  }

  return (
    <div className="mt-6 mb-2 px-2">
      <div className="relative flex items-center justify-between">
        <div className="absolute top-1/2 left-0 h-0.5 w-full -translate-y-1/2 bg-gray-200" />
        <div 
          className="absolute top-1/2 left-0 h-0.5 -translate-y-1/2 bg-purple-600 transition-all duration-500" 
          style={{ width: `${(activeStep / (steps.length - 1)) * 100}%` }}
        />

        {steps.map((step, index) => {
          const isCompleted = index < activeStep;
          const isActive = index === activeStep;
          
          return (
            <div key={step.label} className="relative z-10 flex flex-col items-center">
              <div
                className={cn(
                  "flex size-6 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-all duration-500 sm:size-7 sm:text-xs",
                  isCompleted
                    ? "border-purple-600 bg-purple-600 text-white"
                    : isActive
                    ? "border-purple-600 bg-white text-purple-600 ring-4 ring-purple-100 animate-pulse"
                    : "border-gray-300 bg-white text-gray-400"
                )}
              >
                {isCompleted ? (
                  <svg className="size-3.5 fill-none stroke-current stroke-[3px]" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={cn(
                  "mt-2 text-center text-[9px] font-bold tracking-tight sm:text-[10px]",
                  isActive ? "text-purple-600 font-extrabold" : isCompleted ? "text-gray-700 font-semibold" : "text-gray-400 font-medium"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrderCard({
  order,
}: {
  order: Order;
}) {
  const [detailedOrder, setDetailedOrder] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [timeLeft, setTimeLeft] = React.useState<number>(0);

  React.useEffect(() => {
    let active = true;
    const loadDetails = async () => {
      try {
        const res = await apiFetch<{ success: boolean; data: any }>(`/orders/${order.id}`);
        if (active && res?.data) {
          setDetailedOrder(res.data);
        }
      } catch (err) {
        console.error("Failed to load order details:", err);
      }
    };
    loadDetails();
    const interval = setInterval(loadDetails, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [order.id]);

  React.useEffect(() => {
    const calculateTimeLeft = () => {
      const targetTime = new Date(order.createdAt).getTime() + CANCEL_WINDOW_MS;
      const seconds = Math.max(0, Math.floor((targetTime - Date.now()) / 1000));
      setTimeLeft(seconds);
    };
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [order.createdAt]);

  const handleCancel = async () => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    try {
      setLoading(true);
      await apiFetch(`/orders/${order.id}/cancel`, { method: "POST" });
      toast.success("Order cancelled successfully!");
      const res = await apiFetch<{ success: boolean; data: any }>(`/orders/${order.id}`);
      if (res?.data) {
        setDetailedOrder(res.data);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel order");
    } finally {
      setLoading(false);
    }
  };

  const currentStatus = detailedOrder?.status || order.status;
  const displayRefunds = detailedOrder?.refunds || [];

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-sm sm:p-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-gray-100 pb-3 sm:pb-4">
        <div className="min-w-0">
          <span className="text-[10px] font-semibold text-gray-400 sm:text-xs">
            Placed on{" "}
            {new Date(order.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <h4 className="mt-0.5 text-base font-bold text-gray-800 sm:text-lg">
            Order <span className="font-mono text-purple-600">#{order.displayId || order.id}</span>
          </h4>
        </div>
        <Badge variant="soft" className={cn("border font-semibold shrink-0", statusStyle(currentStatus))}>
          {currentStatus}
        </Badge>
      </div>

      {/* Items */}
      <ul className="mt-3 flex flex-col gap-1.5 sm:mt-4 sm:gap-2">
        {order.items.map((item) => (
          <li
            key={`${item.flavorId}-${item.packId}`}
            className="flex justify-between gap-3 text-xs sm:text-sm"
          >
            <span className="min-w-0 truncate text-gray-500">
              {item.quantity}× {item.flavorName} ({item.packLabel})
            </span>
            <span className="shrink-0 font-semibold text-gray-800">
              {formatINR(item.unitPrice * item.quantity)}
            </span>
          </li>
        ))}
      </ul>

      {/* Refund Tracker */}
      {displayRefunds.length > 0 && (
        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-blue-700">
            <span>Refund Tracker</span>
            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-[10px]">{displayRefunds[0].status}</span>
          </div>
          <div className="mt-2 space-y-1.5 text-xs text-gray-600">
            <p>
              <span className="font-semibold text-gray-700">Refund ID:</span> {displayRefunds[0].refundId}
            </p>
            <p>
              <span className="font-semibold text-gray-700">Amount:</span> {formatINR(displayRefunds[0].requestedAmount)}
            </p>
            <p>
              <span className="font-semibold text-gray-700">Reason:</span> {displayRefunds[0].reason}
            </p>
            {displayRefunds[0].failureReason && (
              <p className="text-red-600">
                <span className="font-semibold">Failure Reason:</span> {displayRefunds[0].failureReason}
              </p>
            )}
            <div className="mt-3 border-t border-blue-200/50 pt-2.5 space-y-1">
              <p className="text-[10px] font-bold uppercase text-blue-600">Refund Timeline</p>
              <ul className="space-y-1 text-[11px]">
                {displayRefunds[0].timeline?.map((t: any, idx: number) => (
                  <li key={idx} className="flex justify-between">
                    <span>{t.note || t.status}</span>
                    <span className="text-gray-400 font-mono">{new Date(t.at).toLocaleDateString("en-IN")}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tracking Stepper */}
      <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4 sm:mt-6">
        <div className="mb-4 flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 sm:text-[11px]">
          <span>Delivery Details</span>
          <span className="shrink-0">{currentStatus}</span>
        </div>
        
        <OrderStatusStepper status={currentStatus} />
 
        <p className="mt-4 text-[10px] leading-relaxed text-gray-500 sm:text-[11px]">
          Delivering to <span className="font-bold text-gray-800">{order.address.tag}</span> —{" "}
          {order.address.addressLine}, {order.address.city}
        </p>
 
        {order.trackingNumber ? (
          <div className="mt-3 flex items-center gap-2.5 rounded-lg border border-purple-100 bg-purple-50/50 p-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-purple-600 shadow-sm">
              <Truck className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wide text-purple-700">
                {order.courierName || "Courier"}
              </p>
              <p className="truncate font-mono text-[11px] font-semibold text-gray-700">
                {order.trackingNumber}
              </p>
            </div>
          </div>
        ) : (
          currentStatus !== "Delivered" &&
          currentStatus !== "Cancelled" &&
          !currentStatus.startsWith("Refund") &&
          currentStatus !== "Returned" &&
          currentStatus !== "Expired" && (
            <p className="mt-2 text-[10px] italic text-gray-400 sm:text-[11px]">
              A tracking number will appear here once your order ships.
            </p>
          )
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 sm:mt-4 sm:pt-4">
        <div className="flex flex-col">
          <span className="text-[11px] font-medium text-gray-400 sm:text-sm">
            Paid via {(detailedOrder?.payment?.method || order.payment?.method || order.method || "").toUpperCase()}
          </span>
          {timeLeft > 0 && ['Pending', 'Confirmed', 'Preparing'].includes(currentStatus) && (
            <span className="text-[10px] font-bold text-red-500 mt-0.5 animate-pulse">
              ⏱ Can cancel for {formatTime(timeLeft)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          {timeLeft > 0 && ['Pending', 'Confirmed', 'Preparing'].includes(currentStatus) && (
            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={handleCancel}
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 h-8 text-xs font-semibold px-3"
            >
              Cancel Order
            </Button>
          )}
          <span className="text-base font-bold text-purple-600 sm:text-xl">
            {formatINR(order.totals.total)}
          </span>
        </div>
      </div>
    </div>
  );
}

function OrdersPanel() {
  const { user } = useAccount();
  const { getOrdersByUser, refreshOrders } = useOrders();
  const orders = getOrdersByUser(user?.phone || "");
  const [page, setPage] = React.useState(1);

  const pageCount = Math.max(1, Math.ceil(orders.length / ORDERS_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const visibleOrders = orders.slice(
    (currentPage - 1) * ORDERS_PER_PAGE,
    currentPage * ORDERS_PER_PAGE
  );

  React.useEffect(() => {
    const timer = setInterval(() => {
      refreshOrders();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [refreshOrders]);

  if (orders.length === 0) {
    return (
      <Panel title="Your orders">
        <EmptyState
          icon={Package}
          title="No orders yet"
          description="When you place an order, it'll appear here with live tracking."
          action={<Button asChild><Link href="/shop">Start shopping <ArrowRight /></Link></Button>}
          tone="muted"
        />
      </Panel>
    );
  }

  return (
    <Panel title={`Your orders (${orders.length})`}>
      <div className="flex flex-col gap-4 sm:gap-6">
        {visibleOrders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
          />
        ))}
      </div>


      {pageCount > 1 && (
        <nav
          aria-label="Orders pagination"
          className="mt-5 flex items-center justify-between gap-3 border-t border-gray-100 pt-4"
        >
          <button
            type="button"
            onClick={() => setPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-bold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 sm:text-xs"
          >
            <ChevronLeft className="size-3.5" />
            Previous
          </button>

          <div className="text-[11px] sm:text-xs font-semibold text-gray-500">
            Page {currentPage} of {pageCount}
          </div>

          <button
            type="button"
            onClick={() => setPage(currentPage + 1)}
            disabled={currentPage === pageCount}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-bold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 sm:text-xs"
          >
            Next
            <ChevronRight className="size-3.5" />
          </button>
        </nav>
      )}
    </Panel>
  );
}

function AddressesPanel() {
  const { user, addAddress, updateAddress, deleteAddress, setDefaultAddress, setActiveAddress } = useAccount();
  const [showForm, setShowForm] = React.useState(false);
  const [editingAddress, setEditingAddress] = React.useState<SavedAddress | null>(null);

  return (
    <Panel title="Saved Delivery Addresses">
      <p className="-mt-4 mb-6 text-xs text-charcoal-soft">
        Select your active delivery address, set defaults, delete address details, or add new locations.
      </p>

      <div className="flex flex-col gap-4">
        {showForm ? (
          <div className="border border-purple-200 rounded-3xl p-5 bg-purple-50/5">
            <h4 className="text-sm font-bold text-purple-900 mb-4 font-heading">Add New Delivery Address</h4>
            <AddressForm
              onSubmit={async (addr) => {
                await addAddress(addr);
                setShowForm(false);
                toast.success("Address added successfully");
              }}
              onCancel={() => setShowForm(false)}
            />
          </div>
        ) : editingAddress ? (
          <div className="border border-purple-200 rounded-3xl p-5 bg-purple-50/5">
            <h4 className="text-sm font-bold text-purple-900 mb-4 font-heading">Edit Delivery Address</h4>
            <AddressForm
              initialAddress={editingAddress}
              onSubmit={async (addr) => {
                await updateAddress(editingAddress.id, addr);
                setEditingAddress(null);
                toast.success("Address updated successfully");
              }}
              onCancel={() => setEditingAddress(null)}
            />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {user?.addresses?.map((addr) => {
              const isActive = user.activeAddressId === addr.id;
              return (
                <div
                  key={addr.id}
                  onClick={() => setActiveAddress(addr.id)}
                  className={cn(
                    "relative flex cursor-pointer flex-col justify-between rounded-2xl border p-5 transition-all",
                    isActive
                      ? "border-purple-600 bg-purple-50/40 ring-1 ring-purple-500 shadow-sm"
                      : "border-[var(--color-border)] bg-white/60 hover:border-purple-200 hover:bg-white"
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Badge variant={addr.addressType === "Home" ? "primary" : addr.addressType === "Work" ? "gold" : "orange"} size="sm">
                          {addr.addressType || addr.tag}
                        </Badge>
                        {addr.isDefault && (
                          <Badge variant="soft" className="text-green-700 bg-green-50 border-green-200">
                            Default
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingAddress(addr);
                          }}
                          className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                          title="Edit Address"
                        >
                          <Edit2 className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteAddress(addr.id);
                            toast.success("Address deleted");
                          }}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          aria-label="Remove address"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-4 text-sm font-semibold text-charcoal">{addr.fullName}</p>
                    <p className="mt-0.5 text-xs font-semibold text-charcoal-muted font-numbers">{addr.phone}</p>
                    <p className="mt-2 text-xs leading-relaxed text-charcoal-muted">
                      {addr.houseNo ? `${addr.houseNo}, ` : ""}
                      {addr.building ? `${addr.building}, ` : ""}
                      {addr.street ? `${addr.street}, ` : ""}
                      {addr.area ? `${addr.area}, ` : ""}
                      {addr.landmark ? `(Landmark: ${addr.landmark}), ` : ""}
                      {addr.city}, {addr.state} {addr.pinCode || addr.pincode}
                    </p>

                    {addr.latitude && (
                      <p className="mt-2 flex items-center gap-1 text-[10px] text-green-600 font-semibold">
                        <CheckCircle2 className="size-3" />
                        <span>📍 GPS Captured ({addr.latitude.toFixed(4)}, {addr.longitude?.toFixed(4)})</span>
                      </p>
                    )}
                  </div>

                  {isActive ? (
                    <div className="mt-4 flex items-center justify-between border-t border-purple-100 pt-3 text-[10px] font-bold uppercase tracking-wider text-purple-700">
                      <span>✓ Active Address</span>
                      {!addr.isDefault && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDefaultAddress(addr.id);
                            toast.success("Default address updated");
                          }}
                          className="text-[9px] font-bold text-purple-500 hover:text-purple-700 underline uppercase"
                        >
                          Set Default
                        </button>
                      )}
                    </div>
                  ) : (
                    !addr.isDefault && (
                      <div className="mt-4 border-t border-gray-100 pt-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDefaultAddress(addr.id);
                            toast.success("Default address updated");
                          }}
                          className="text-[9px] font-bold text-gray-400 hover:text-purple-650 uppercase"
                        >
                          Set Default
                        </button>
                      </div>
                    )
                  )}
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-purple-200 text-charcoal-muted transition-colors hover:border-purple-400 hover:text-purple-700"
            >
              <Plus className="size-6" />
              <span className="text-sm font-semibold">Add New Address</span>
            </button>
          </div>
        )}
      </div>
    </Panel>
  );
}

function WishlistPanel() {
  const { ids, toggle } = useWishlist();
  const { addItem } = useCart();
  const { getFlavor } = useProducts();
  const pack = getPack(DEFAULT_PACK_ID)!;
  const flavors = ids.map((id) => getFlavor(id)).filter(Boolean) as Flavor[];

  if (flavors.length === 0)
    return (
      <Panel title="Your wishlist">
        <EmptyState
          icon={Heart}
          title="Nothing saved yet"
          description="Tap the heart on any flavour to save it for later."
          action={<Button asChild><Link href="/shop">Explore flavours</Link></Button>}
          tone="muted"
        />
      </Panel>
    );

  return (
    <Panel title={`Your wishlist (${flavors.length})`}>
      <div className="grid gap-4 sm:grid-cols-2">
        {flavors.map((f) => (
          <div key={f.id} className="flex gap-4 rounded-2xl border border-[var(--color-border)] bg-white p-4">
            <div className="size-20 shrink-0 rounded-xl p-2" style={{ background: `radial-gradient(120% 120% at 30% 20%, ${f.gradient.from}22, transparent)` }}>
              <WaferVisual flavor={f} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="truncate font-serif text-lg font-semibold text-charcoal">{f.name}</p>
                  <HeatMeter level={f.heat} className="mt-1" />
                </div>
                <button onClick={() => toggle(f.id)} className="text-charcoal-soft hover:text-red-500" aria-label="Remove from wishlist">
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="mt-auto flex items-center justify-between pt-2">
                <span className="font-semibold text-purple-700">{formatINR(pack.price)}</span>
                <Button size="sm" onClick={() => addItem(f, pack, 1)}><Plus /> Add</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function CouponsPanel() {
  const [coupons, setCoupons] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    apiFetch<any[]>("/coupons")
      .then((data) => {
        if (!cancelled) setCoupons(data ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Panel title="Available coupons">
      {loading ? (
        <div className="text-xs text-gray-400">Loading coupons...</div>
      ) : coupons.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {coupons.map((c) => (
            <div key={c.code} className="relative flex items-center gap-4 overflow-hidden rounded-2xl border border-dashed border-purple-300 bg-purple-50/50 p-5">
              <span className="absolute -left-3 top-1/2 size-6 -translate-y-1/2 rounded-full bg-[var(--color-cream)]" />
              <span className="absolute -right-3 top-1/2 size-6 -translate-y-1/2 rounded-full bg-[var(--color-cream)]" />
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-purple-500 text-cream">
                <Ticket className="size-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-serif text-lg font-bold text-purple-700">{c.code}</p>
                <p className="text-sm text-charcoal-muted">{c.description}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-gray-400 italic">No coupons available right now. Check back later!</div>
      )}
      <p className="mt-5 text-sm text-charcoal-soft">Apply any code at checkout or in your cart to save instantly.</p>
    </Panel>
  );
}

function LabeledInput({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-charcoal">{label}</label>
      <Input {...props} />
    </div>
  );
}
