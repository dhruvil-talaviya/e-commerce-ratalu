"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  User,
  Package,
  Clock,
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
  Tag,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Truck,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import { PageHeader } from "@/components/common/page-header";
import { HeatMeter } from "@/components/common/heat-meter";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { OrderTimeline } from "@/components/common/order-timeline";
import { ComboCard } from "@/components/shop/combo-card";
import type { ShopCombo, Flavor } from "@/lib/types";
import { WaferVisual } from "@/components/common/wafer-visual";
import { useWishlist } from "@/components/cart/wishlist-provider";
import { useCart } from "@/components/cart/cart-provider";
import { useAccount, type SavedAddress } from "@/components/account/account-provider";
import { useLanguage } from "@/components/common/language-provider";
import { AddressForm } from "@/components/shop/address-form";
import { Edit2, CheckCircle2 } from "lucide-react";
import type { Language } from "@/lib/i18n/types";
import { useProducts } from "@/components/shop/product-provider";
import { useOrders, type Order } from "@/components/shop/order-provider";
import { getPack, DEFAULT_PACK_ID, PACK_SIZES } from "@/lib/data/products";
import { apiFetch } from "@/lib/api";
import { useStoreSettings } from "@/components/common/settings-provider";
import { RefundRequestDialog } from "@/components/account/refund-request-dialog";
import { SITE } from "@/lib/constants";
import { useGoogleAuth } from "@/lib/hooks/use-google-auth";

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
  { key: "wishlist", label: "Liked Products", icon: Heart },
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

  const { user, isLoggedIn, logout, hydrated } = useAccount();
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

  if (!hydrated) {
    return (
      <div className="container-px mx-auto max-w-6xl py-24 flex flex-col items-center justify-center text-center min-h-[50vh]">
        <Loader2 className="size-8 animate-spin text-[#4A1942] mb-3" />
        <p className="text-sm font-extrabold text-[#4A1942]">Loading your account...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <InlineAuthForm />;
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
  const { settings } = useStoreSettings();
  const email = settings?.supportEmail || SITE.email;
  const phone = settings?.customerCareNumber || SITE.phone;
  const phoneHref = `tel:${phone.replace(/\s+/g, "")}`;
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
          { icon: Mail, label: "Email us", value: email, href: `mailto:${email}` },
          { icon: Phone, label: "Call us", value: phone, href: phoneHref },
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
  const addresses = Array.isArray(user?.addresses) ? user.addresses : [];
  const defaultAddr = addresses.find((a) => a.isDefault) || addresses[0];
  const initialName = user?.name || defaultAddr?.fullName || "";
  const initialPhone = user?.phone || defaultAddr?.phone || "";

  const [name, setName] = React.useState(initialName);
  const [email, setEmail] = React.useState(user?.email || "");
  const [phone, setPhone] = React.useState(initialPhone);
  const [saved, setSaved] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);

  React.useEffect(() => {
    if (user) {
      const userAddrs = Array.isArray(user.addresses) ? user.addresses : [];
      const addr = userAddrs.find((a) => a.isDefault) || userAddrs[0];
      setName(user.name || addr?.fullName || "");
      setEmail(user.email || "");
      setPhone(user.phone || addr?.phone || "");
    }
  }, [user]);

  const handleSave = async () => {
    await updateProfile({ name, email, phone });
    setSaved(true);
    toast.success("Profile updated");
    setIsEditing(false);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col gap-8">
      <Panel
        title="Personal Information"
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
            label="Email Address"
            type="email"
            value={email}
            readOnly
            disabled
            title="Email address is linked to your Google Account and cannot be changed."
            className="bg-gray-100/70 text-gray-500 cursor-not-allowed border-gray-200 select-none"
          />
          <LabeledInput
            label="Mobile Number"
            type="tel"
            maxLength={10}
            inputMode="numeric"
            value={phone}
            placeholder="10-digit mobile number"
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            disabled={!isEditing}
            className={cn(!isEditing && "bg-gray-50/30 text-gray-500 font-numbers")}
          />
        </div>
        {isEditing && (
          <div className="mt-6 flex items-center gap-3">
            <Button
              onClick={async () => {
                if (phone && !/^\d{10}$/.test(phone.trim())) {
                  toast.error("Please enter a valid 10-digit mobile number");
                  return;
                }
                await handleSave();
              }}
              className="flex items-center gap-1.5"
            >
              <Check className="size-4" />
              {saved ? "Saved successfully!" : "Save changes"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setName(user?.name || "");
                setEmail(user?.email || "");
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
  defaultExpanded = false,
  onRefreshOrders,
}: {
  order: Order;
  defaultExpanded?: boolean;
  onRefreshOrders?: () => void;
}) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
  const [detailedOrder, setDetailedOrder] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [retrying, setRetrying] = React.useState(false);
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
    return () => {
      active = false;
    };
  }, [order.id]);

  React.useEffect(() => {
    const calculateTimeLeft = () => {
      const deadline = (detailedOrder as any)?.cancellationDeadline || (order as any)?.cancellationDeadline;
      const targetTime = deadline ? new Date(deadline).getTime() : (new Date(order.createdAt).getTime() + CANCEL_WINDOW_MS);
      const seconds = Math.max(0, Math.floor((targetTime - Date.now()) / 1000));
      setTimeLeft(seconds);
    };
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [order.createdAt, (order as any)?.cancellationDeadline, (detailedOrder as any)?.cancellationDeadline]);

  const [showCancelModal, setShowCancelModal] = React.useState(false);

  const handleCancel = async () => {
    try {
      setLoading(true);
      await apiFetch(`/orders/${order.id}/cancel`, { method: "POST" });
      toast.success("Order cancelled successfully!");
      setShowCancelModal(false);
      const res = await apiFetch<{ success: boolean; data: any }>(`/orders/${order.id}`);
      if (res?.data) {
        setDetailedOrder(res.data);
      }
      if (onRefreshOrders) {
        onRefreshOrders();
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

  const totalItemsCount = order.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-xs transition-all hover:border-purple-200">
      {/* COMPACT CLICKABLE HEADER */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex flex-wrap items-center justify-between gap-2.5 p-3.5 sm:p-4 text-left bg-gradient-to-r from-gray-50/80 via-white to-purple-50/20 hover:bg-purple-50/30 transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs sm:text-sm font-extrabold text-[#5B2C83]">
                #{order.displayId || order.id}
              </span>
              <span className="text-[10px] font-bold text-gray-400">
                • {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium truncate mt-0.5">
              {totalItemsCount} {totalItemsCount === 1 ? "item" : "items"} ({order.items.map(i => i.flavorName).join(", ")})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 ml-auto sm:ml-0">
          {timeLeft > 0 && ['Pending Confirmation', 'Pending', 'Confirmed', 'Preparing'].includes(currentStatus) && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200">
              <Clock className="size-2.5 animate-spin" /> {formatTime(timeLeft)}
            </span>
          )}

          <Badge variant="soft" className={cn("border font-bold text-[10px] sm:text-xs px-2.5 py-0.5", statusStyle(currentStatus))}>
            {currentStatus}
          </Badge>

          <span className="text-xs sm:text-sm font-extrabold text-[#5B2C83]">
            {formatINR(order.totals?.total || (order as any).totalAmount || 0)}
          </span>

          <div className="grid size-7 place-items-center rounded-lg bg-gray-100 text-gray-600 hover:bg-purple-100 hover:text-purple-700 transition-all">
            <ChevronDown className={cn("size-4 transition-transform duration-200", isExpanded && "rotate-180")} />
          </div>
        </div>
      </button>

      {/* EXPANDABLE ANIMATED BODY */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-gray-100"
          >
            <div className="p-4 sm:p-5 space-y-4">
              {/* Items */}
              <div>
                <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-2">Item Breakdown</p>
                <ul className="flex flex-col gap-1.5 divide-y divide-gray-100">
                  {order.items.map((item) => (
                    <li
                      key={`${item.flavorId}-${item.packId}`}
                      className="pt-1.5 first:pt-0 flex justify-between gap-3 text-xs sm:text-sm"
                    >
                      <span className="min-w-0 truncate text-gray-600 font-medium">
                        {item.quantity}× {item.flavorName} <span className="text-gray-400 text-xs">({item.packLabel})</span>
                      </span>
                      <span className="shrink-0 font-bold text-gray-800">
                        {formatINR(item.unitPrice * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Price Summary Breakdown (Items, Discount, Shipping, Total) */}
              <div className="pt-3 border-t border-dashed border-gray-200 text-xs space-y-1.5 bg-purple-50/30 p-3 rounded-xl">
                <div className="flex justify-between text-gray-600">
                  <span>Items Subtotal</span>
                  <span className="font-semibold text-gray-800">{formatINR(order.totals?.subtotal || order.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0))}</span>
                </div>

                {Boolean(order.totals?.discount && order.totals.discount > 0) && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span className="flex items-center gap-1 font-bold">
                      <Tag className="size-3 text-emerald-600" />
                      Discount Applied
                    </span>
                    <span className="font-extrabold text-emerald-700">- {formatINR(order.totals.discount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-gray-600">
                  <span>Delivery Charges</span>
                  {order.totals?.shipping === 0 || !order.totals?.shipping ? (
                    <span className="font-bold text-emerald-600">FREE</span>
                  ) : (
                    <span className="font-semibold text-gray-800">{formatINR(order.totals.shipping)}</span>
                  )}
                </div>

                {Boolean(order.totals?.gst && order.totals.gst > 0) && (
                  <div className="flex justify-between text-gray-600">
                    <span>Taxes (GST)</span>
                    <span className="font-semibold text-gray-800">{formatINR(order.totals.gst)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-purple-200/60 text-xs sm:text-sm font-extrabold text-purple-950">
                  <span>Total Net Paid Amount</span>
                  <span className="text-base text-purple-800 font-extrabold">{formatINR(order.totals?.total || (order as any).totalAmount || 0)}</span>
                </div>
              </div>

              {/* Refund Tracker */}
              {displayRefunds.length > 0 && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-xs">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-blue-700">
                    <span>Refund Tracker</span>
                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-[10px]">{displayRefunds[0].status}</span>
                  </div>
                  <div className="mt-1.5 space-y-1 text-gray-600 text-xs">
                    <p><span className="font-semibold text-gray-700">Refund ID:</span> {displayRefunds[0].refundId}</p>
                    <p><span className="font-semibold text-gray-700">Amount:</span> {formatINR(displayRefunds[0].requestedAmount)}</p>
                  </div>
                </div>
              )}

              {/* Tracking Stepper & Progress Pipeline */}
              <div>
                <OrderTimeline
                  orderStatus={currentStatus}
                  paymentStatus={detailedOrder?.payment?.status || order.payment?.status || "Paid"}
                  fulfilmentStatus={(detailedOrder as any)?.fulfilmentStatus || (order as any)?.fulfilmentStatus}
                  cancellationDeadline={(detailedOrder as any)?.cancellationDeadline || (order as any)?.cancellationDeadline || (order as any)?.cancellableUntil}
                  confirmedAt={(detailedOrder as any)?.confirmedAt}
                  packedAt={(detailedOrder as any)?.packedAt}
                  shippedAt={(detailedOrder as any)?.shippedAt}
                  deliveredAt={(detailedOrder as any)?.deliveredAt}
                  cancelledAt={(detailedOrder as any)?.cancelledAt}
                  trackingNumber={order.trackingNumber}
                  courierName={order.courierName}
                />

                <p className="mt-2 text-[10px] sm:text-xs leading-relaxed text-gray-500 font-medium">
                  Delivering to <span className="font-bold text-gray-800">{order.address?.tag || "Delivery Address"}</span> —{" "}
                  {order.address?.addressLine}, {order.address?.city}
                </p>
              </div>

              {/* Footer Actions & Payment Info */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
                <div className="flex flex-col">
                  <span className="text-[10px] sm:text-xs font-semibold text-gray-400">
                    Paid via {(detailedOrder?.payment?.method || order.payment?.method || order.method || "").toUpperCase()}
                  </span>
                  {timeLeft > 0 && ['Pending Confirmation', 'Pending', 'Confirmed', 'Preparing'].includes(currentStatus) && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 mt-1 w-fit">
                      <Clock className="size-3 animate-spin" /> 5-Min Cancel Window ({formatTime(timeLeft)})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {(currentStatus === "Payment Pending" || currentStatus === "Payment Failed") && (detailedOrder?.payment?.status !== "Paid" && order.payment?.status !== "Paid") && (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={retrying}
                      onClick={async () => {
                        setRetrying(true);
                        try {
                          const res = await apiFetch<any>(`/payment/retry-order/${order.id}`, { method: "POST" });
                          const rzpData = res.data?.razorpay;
                          if (!rzpData) throw new Error("Payment gateway init failed.");

                          const loaded = await new Promise<boolean>((resolve) => {
                            if ((window as any).Razorpay) return resolve(true);
                            const s = document.createElement("script");
                            s.src = "https://checkout.razorpay.com/v1/checkout.js";
                            s.onload = () => resolve(true);
                            s.onerror = () => resolve(false);
                            document.body.appendChild(s);
                          });

                          if (!loaded) throw new Error("Payment SDK failed to load.");

                          const rzp = new (window as any).Razorpay({
                            key: rzpData.keyId,
                            amount: rzpData.amount,
                            currency: rzpData.currency,
                            name: "Ratalu Wafers",
                            description: `Payment Retry for #${order.displayId || order.id}`,
                            order_id: rzpData.orderId,
                            handler: function (resp: any) {
                              apiFetch("/payment/verify", {
                                method: "POST",
                                body: {
                                  orderId: order.id,
                                  razorpay_order_id: resp.razorpay_order_id,
                                  razorpay_payment_id: resp.razorpay_payment_id,
                                  razorpay_signature: resp.razorpay_signature,
                                },
                              })
                                .then(() => {
                                  toast.success("Payment successful! Order updated.");
                                  if (onRefreshOrders) {
                                    onRefreshOrders();
                                  }
                                })
                                .catch((err: any) => {
                                  toast.error(err.message || "Payment verification failed.");
                                });
                            },
                            theme: { color: "#4A1942" },
                          });
                          rzp.open();
                        } catch (err: any) {
                          toast.error(err.message || "Failed to retry payment.");
                        } finally {
                          setRetrying(false);
                        }
                      }}
                      className="bg-[#5B2C83] hover:bg-[#4B236E] text-white font-bold text-xs h-8 px-4 rounded-xl shadow-xs"
                    >
                      {retrying ? "Opening Gateway..." : "Retry Payment"}
                    </Button>
                  )}

                  {timeLeft > 0 && ['Pending Confirmation', 'Pending', 'Confirmed', 'Preparing'].includes(currentStatus) && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={loading}
                      onClick={() => setShowCancelModal(true)}
                      className="border-red-200 bg-red-50/50 text-red-600 hover:bg-red-600 hover:text-white h-8 text-xs font-bold px-3 rounded-xl transition-all shadow-xs"
                    >
                      Cancel Order
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancel}
        title="Cancel Order?"
        description={`Are you sure you want to cancel Order #${order.displayId || order.id}? Items will be restored to inventory and any paid amount will be refunded.`}
        confirmLabel="Yes, Cancel Order"
        cancelLabel="Keep Order"
        tone="danger"
        loading={loading}
      />
    </div>
  );
}

type TimeFilter = "30days" | "6months" | "all";

function OrdersPanel() {
  const { user } = useAccount();
  const { getOrdersByUser, refreshOrders } = useOrders();
  const orders = getOrdersByUser(user?.phone || "");
  const [timeFilter, setTimeFilter] = React.useState<TimeFilter>("30days");
  const [page, setPage] = React.useState(1);

  const filteredOrders = React.useMemo(() => {
    if (timeFilter === "all") return orders;
    const now = Date.now();
    const days = timeFilter === "30days" ? 30 : 180;
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    return orders.filter((o) => new Date(o.createdAt).getTime() >= cutoff);
  }, [orders, timeFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const visibleOrders = filteredOrders.slice(
    (currentPage - 1) * ORDERS_PER_PAGE,
    currentPage * ORDERS_PER_PAGE
  );

  React.useEffect(() => {
    refreshOrders();
    const timer = setInterval(() => {
      refreshOrders();
    }, 3000);
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
    <Panel title={`Your orders (${filteredOrders.length})`}>
      {/* Time Filter Tabs */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => { setTimeFilter("30days"); setPage(1); }}
            className={cn(
              "px-3 py-1 rounded-xl text-xs font-extrabold transition-all border cursor-pointer",
              timeFilter === "30days"
                ? "bg-[#5B2C83] text-white border-[#5B2C83] shadow-2xs"
                : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
            )}
          >
            Last 30 Days
          </button>
          <button
            type="button"
            onClick={() => { setTimeFilter("6months"); setPage(1); }}
            className={cn(
              "px-3 py-1 rounded-xl text-xs font-extrabold transition-all border cursor-pointer",
              timeFilter === "6months"
                ? "bg-[#5B2C83] text-white border-[#5B2C83] shadow-2xs"
                : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
            )}
          >
            Last 6 Months
          </button>
          <button
            type="button"
            onClick={() => { setTimeFilter("all"); setPage(1); }}
            className={cn(
              "px-3 py-1 rounded-xl text-xs font-extrabold transition-all border cursor-pointer",
              timeFilter === "all"
                ? "bg-[#5B2C83] text-white border-[#5B2C83] shadow-2xs"
                : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
            )}
          >
            All Orders ({orders.length})
          </button>
        </div>

        {timeFilter === "30days" && (
          <span className="text-[10px] font-semibold text-gray-400">
            Showing orders from past 30 days
          </span>
        )}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="py-12 text-center text-sm font-semibold text-gray-500">
          No orders found in the last {timeFilter === "30days" ? "30 days" : "6 months"}.
        </div>
      ) : (
        <div className="flex flex-col gap-4 sm:gap-6">
          {visibleOrders.map((order, idx) => (
            <OrderCard
              key={order.id}
              order={order}
              defaultExpanded={idx === 0}
              onRefreshOrders={refreshOrders}
            />
          ))}
        </div>
      )}


      {pageCount > 1 && (
        <nav
          aria-label="Orders pagination"
          className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4"
        >
          <p className="text-[11px] sm:text-xs font-semibold text-gray-500">
            Showing <span className="font-extrabold text-purple-900">{(currentPage - 1) * ORDERS_PER_PAGE + 1}</span>–
            <span className="font-extrabold text-purple-900">{Math.min(currentPage * ORDERS_PER_PAGE, filteredOrders.length)}</span> of{" "}
            <span className="font-extrabold text-purple-900">{filteredOrders.length}</span> orders
          </p>

          <div className="flex items-center gap-1.5 ml-auto">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-gray-700 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 sm:text-xs cursor-pointer"
            >
              <ChevronLeft className="size-3.5" />
              Previous
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={cn(
                    "size-7 rounded-lg text-xs font-extrabold transition-all cursor-pointer",
                    p === currentPage
                      ? "bg-[#5B2C83] text-white shadow-xs"
                      : "bg-gray-100 text-gray-600 hover:bg-purple-100 hover:text-purple-700"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={currentPage === pageCount}
              className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-gray-700 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 sm:text-xs cursor-pointer"
            >
              Next
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </nav>
      )}
    </Panel>
  );
}

function AddressesPanel() {
  const { user, addAddress, updateAddress, deleteAddress, setDefaultAddress, setActiveAddress } = useAccount();
  const [showForm, setShowForm] = React.useState(false);
  const [editingAddress, setEditingAddress] = React.useState<SavedAddress | null>(null);
  const [deletingAddressId, setDeletingAddressId] = React.useState<string | null>(null);

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
            {(Array.isArray(user?.addresses) ? user.addresses : []).map((addr) => {
              const isActive = user?.activeAddressId === addr.id || user?.activeAddressId === addr._id;
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
                            setDeletingAddressId(addr.id);
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
              <Plus className="size-6 text-purple-400" />
              <span className="text-xs font-bold text-purple-800">Add New Address</span>
            </button>
          </div>
        )}

        {/* Delete Address Confirmation Modal */}
        {deletingAddressId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
              onClick={() => setDeletingAddressId(null)}
            />
            <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl bg-white p-6 shadow-2xl text-center border border-purple-100 animate-in fade-in zoom-in duration-200">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 mb-4 border border-red-100">
                <Trash2 className="size-6" />
              </div>
              <h3 className="text-base font-extrabold text-gray-900 font-serif">Delete Delivery Address?</h3>
              <p className="mt-1.5 text-xs text-gray-600 font-medium leading-relaxed">
                Are you sure you want to remove this saved delivery address from your account? This action cannot be undone.
              </p>
              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingAddressId(null)}
                  className="w-full rounded-xl border border-gray-200 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await deleteAddress(deletingAddressId);
                    setDeletingAddressId(null);
                    toast.success("Address deleted successfully");
                  }}
                  className="w-full rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white hover:bg-red-700 shadow-md shadow-red-600/20 transition-all active:scale-[0.98]"
                >
                  Delete Address
                </button>
              </div>
            </div>
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
  const [combos, setCombos] = React.useState<ShopCombo[]>([]);

  React.useEffect(() => {
    apiFetch<ShopCombo[]>("/combos")
      .then((list) => setCombos(Array.isArray(list) ? list : []))
      .catch(() => setCombos([]));
  }, []);

  const pack = getPack(DEFAULT_PACK_ID)!;

  const flavors = ids.map((id) => getFlavor(id)).filter(Boolean) as Flavor[];
  const likedCombos = ids
    .map((id) => combos.find((c: ShopCombo) => c.slug === id || c._id === id || String((c as any).id) === id))
    .filter(Boolean) as ShopCombo[];

  const totalCount = flavors.length + likedCombos.length;

  if (totalCount === 0)
    return (
      <Panel title="Liked Products">
        <EmptyState
          icon={Heart}
          title="No liked items yet"
          description="Tap the heart on any flavour or combo deal to like it and save it for later."
          action={<Button asChild><Link href="/shop">Explore flavours &amp; combos</Link></Button>}
          tone="muted"
        />
      </Panel>
    );

  return (
    <Panel title={`Liked Products (${totalCount})`}>
      <div className="grid gap-4 sm:grid-cols-2">
        {likedCombos.map((c) => (
          <ComboCard key={`combo-${c._id}`} combo={c} view="grid" />
        ))}
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

function InlineAuthForm() {
  const { loginWithGoogle, loginWithEmailDirect } = useAccount();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [showEmailForm, setShowEmailForm] = React.useState(false);
  const [emailInput, setEmailInput] = React.useState("");

  const { signIn } = useGoogleAuth({
    onSuccess: async (googleUser) => {
      setError("");
      setLoading(true);
      const res = await loginWithGoogle({
        googleId: googleUser.googleId,
        email: googleUser.email,
        name: googleUser.name,
        avatar: googleUser.avatar,
        idToken: googleUser.idToken,
      });
      setLoading(false);

      if (res.success) {
        toast.success(res.message || "Logged in with Google!");
      } else {
        setError(res.message || "Google Sign-In failed.");
      }
    },
    onError: (err) => {
      setLoading(false);
      setError(err);
    },
  });

  const handleGoogle = () => {
    setError("");
    setLoading(true);
    signIn();
    // Reset loading after timeout if user cancels popup
    setTimeout(() => setLoading(false), 30000);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setLoading(true);
    const res = await loginWithEmailDirect(emailInput);
    setLoading(false);
    if (res.success) {
      toast.success(res.message || "Signed in successfully!");
    } else {
      setError(res.message || "Failed to sign in. Please try again.");
    }
  };

  return (
    <div className="container-px mx-auto max-w-5xl py-8 sm:py-14 px-4">
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-center justify-center">

        {/* ── Auth Card (Google & Email Options) ──────────────────────────────────────── */}
        <div className="w-full lg:max-w-md mx-auto shrink-0">
          <div className="w-full rounded-3xl border border-amber-200/50 bg-white p-7 sm:p-10 shadow-xl text-center">
            {/* Logo & Welcome Header */}
            <div className="flex flex-col items-center justify-center mb-6">
              <div className="size-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-4 shadow-sm border border-amber-200/60">
                <User className="size-8 text-[#4A1942]" />
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-black text-[#4A1942] tracking-tight">
                Welcome to Yamora
              </h1>
              <p className="mt-2 text-sm text-gray-600 font-medium leading-relaxed">
                Fresh Ratalu Wafers Delivered.
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600 border border-red-100">
                {error}
              </div>
            )}

            <div className="space-y-4 pt-2">
              <button
                type="button"
                onClick={handleGoogle}
                disabled={loading}
                className="group relative flex w-full items-center justify-center gap-3.5 h-12 rounded-2xl bg-gradient-to-r from-[#4A1942] to-[#5B2C83] hover:from-[#381132] hover:to-[#481f6d] text-sm font-extrabold text-white shadow-md transition-all duration-200 active:scale-[0.99] cursor-pointer disabled:opacity-60 border border-amber-400/30"
              >
                {loading ? (
                  <Loader2 className="size-5 animate-spin text-white" />
                ) : (
                  <>
                    <div className="p-1 rounded-full bg-white flex items-center justify-center shadow-xs">
                      <svg className="size-4 transition-transform duration-200 group-hover:scale-110" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                    </div>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-gray-500 font-medium leading-normal px-2 pt-2">
                By continuing you agree to our{" "}
                <Link href="/policies/terms" className="text-purple-900 font-bold underline hover:text-purple-950">
                  Terms
                </Link>{" "}
                &{" "}
                <Link href="/policies/privacy" className="text-purple-900 font-bold underline hover:text-purple-950">
                  Privacy Policy
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


