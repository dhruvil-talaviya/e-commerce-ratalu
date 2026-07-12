"use client";

import * as React from "react";
import Link from "next/link";
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
  Star,
  ArrowRight,
  LogOut,
  Compass,
  LayoutDashboard,
  Wallet,
  Users,
  Bell,
  BellRing,
  History,
  LifeBuoy,
  Settings as SettingsIcon,
  Copy,
  Check,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Share2,
  ShoppingBag,
  Send,
  Mail,
  Phone,
  ChevronDown,
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
import { useAccount } from "@/components/account/account-provider";
import { useLanguage } from "@/components/common/language-provider";
import type { Language } from "@/lib/i18n/types";
import { useProducts } from "@/components/shop/product-provider";
import { useOrders, type Order } from "@/components/shop/order-provider";
import { useRecentlyViewed } from "@/components/shop/recently-viewed-provider";
import { getPack, DEFAULT_PACK_ID, PACK_SIZES } from "@/lib/data/products";
import { COUPONS } from "@/lib/data/coupons";
import {
  ACCOUNT_STATS,
  WALLET_TX,
  NOTIFICATIONS,
  REFERRAL,
  REFERRED_FRIENDS,
  SUPPORT_TICKETS,
  type AppNotification,
} from "@/lib/data/account-mock";
import { SITE } from "@/lib/constants";
import { formatINR, cn } from "@/lib/utils";
import type { Flavor } from "@/lib/types";

type Tab =
  | "overview"
  | "orders"
  | "wishlist"
  | "recently"
  | "coupons"
  | "notifications"
  | "addresses"
  | "profile"
  | "support"
  | "settings";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "overview", label: "Dashboard", icon: LayoutDashboard },
  { key: "orders", label: "Orders", icon: Package },
  { key: "wishlist", label: "Wishlist", icon: Heart },
  { key: "recently", label: "Recently Viewed", icon: History },
  { key: "coupons", label: "Coupons", icon: Ticket },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "addresses", label: "Addresses", icon: MapPin },
  { key: "profile", label: "Profile", icon: User },
  { key: "support", label: "Support", icon: LifeBuoy },
  { key: "settings", label: "Settings", icon: SettingsIcon },
];

export default function AccountPage() {
  const [tab, setTab] = React.useState<Tab>("overview");
  const { user, isLoggedIn, logout } = useAccount();
  const { count } = useWishlist();
  const [notifs, setNotifs] = React.useState<AppNotification[]>(NOTIFICATIONS);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const unread = notifs.filter((n) => !n.read).length;

  if (!isLoggedIn) {
    return (
      <div className="container-px mx-auto flex max-w-lg flex-col items-center gap-6 py-32 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-purple-50 text-purple-300">
          <User className="size-8" />
        </span>
        <div>
          <h1 className="font-serif text-3xl font-bold text-charcoal">Sign in required</h1>
          <p className="mt-2 text-charcoal-muted">Please log in to manage your account details.</p>
        </div>
      </div>
    );
  }

  const firstName = (user?.name || "Snacker").split(" ")[0];
  const activeTabInfo = TABS.find((t) => t.key === tab);
  const ActiveIcon = activeTabInfo ? activeTabInfo.icon : LayoutDashboard;

  return (
    <>
      <PageHeader
        eyebrow="My Account"
        title={
          <>
            Welcome back, <span className="text-gradient-warm">{firstName}</span>
          </>
        }
        description="Your orders, wallet, rewards, referrals and settings — all in one premium hub."
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
                      logout();
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
                onClick={logout}
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
                {tab === "overview" && <OverviewPanel onNavigate={setTab} notifs={notifs} />}
                {tab === "orders" && <OrdersPanel />}
                {tab === "wishlist" && <WishlistPanel />}
                {tab === "recently" && <RecentlyViewedPanel />}
                {tab === "coupons" && <CouponsPanel />}
                {tab === "notifications" && (
                  <NotificationsPanel notifs={notifs} setNotifs={setNotifs} />
                )}
                {tab === "addresses" && <AddressesPanel />}
                {tab === "profile" && <ProfilePanel />}
                {tab === "support" && <SupportPanel />}
                {tab === "settings" && <SettingsPanel onLogout={logout} />}
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
/* OVERVIEW                                                            */
/* ------------------------------------------------------------------ */
function OverviewPanel({
  onNavigate,
  notifs,
}: {
  onNavigate: (t: Tab) => void;
  notifs: AppNotification[];
}) {
  const { user } = useAccount();
  const { getOrdersByUser } = useOrders();
  const { count: wishlistCount } = useWishlist();
  const orders = getOrdersByUser(user?.phone || "");
  const addressesCount = user?.addresses.length || 0;

  const stats = [
    { icon: Package, label: "Total orders", value: String(orders.length), tone: "purple", tab: "orders" as Tab },
    { icon: Heart, label: "Wishlist", value: String(wishlistCount), tone: "orange", tab: "wishlist" as Tab },
    { icon: MapPin, label: "Addresses", value: String(addressesCount), tone: "green", tab: "addresses" as Tab },
    { icon: Ticket, label: "Active coupons", value: "3", tone: "gold", tab: "coupons" as Tab },
  ];
  const toneClass: Record<string, string> = {
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600",
    green: "bg-green-50 text-green-600",
    gold: "bg-yellow-50 text-yellow-600",
  };

  type QuickAction = { label: string; icon: React.ElementType } & (
    | { href: string }
    | { tab: Tab }
  );
  const quickActions: QuickAction[] = [
    { label: "Shop flavours", icon: ShoppingBag, href: "/shop" },
    { label: "Track orders", icon: Package, tab: "orders" },
    { label: "Delivery address", icon: MapPin, tab: "addresses" },
    { label: "Get help", icon: LifeBuoy, tab: "support" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.label}
              onClick={() => onNavigate(s.tab)}
              className="flex flex-col items-start gap-3 rounded-3xl border border-[var(--color-border)] bg-white/70 p-5 text-left shadow-[var(--shadow-soft)] backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
            >
              <span className={cn("grid size-11 place-items-center rounded-2xl", toneClass[s.tone])}>
                <Icon className="size-5" />
              </span>
              <div>
                <p className="font-serif text-2xl font-bold text-charcoal">{s.value}</p>
                <p className="text-xs text-charcoal-muted">{s.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {quickActions.map((a) => {
          const Icon = a.icon;
          const inner = (
            <>
              <span className="grid size-10 place-items-center rounded-xl bg-purple-50 text-purple-600 transition-colors group-hover:bg-purple-500 group-hover:text-cream">
                <Icon className="size-5" />
              </span>
              <span className="text-sm font-semibold text-charcoal">{a.label}</span>
            </>
          );
          const cls =
            "group flex flex-col items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-white/70 p-4 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]";
          return "href" in a ? (
            <Link key={a.label} href={a.href} className={cls}>{inner}</Link>
          ) : (
            <button key={a.label} onClick={() => onNavigate(a.tab)} className={cn(cls, "text-left")}>{inner}</button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent orders */}
        <Panel
          title="Recent orders"
          action={
            <button onClick={() => onNavigate("orders")} className="text-sm font-medium text-purple-600 hover:underline">
              View all
            </button>
          }
        >
          {orders.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No orders yet"
              description="Your latest orders will show here."
              action={<Button asChild size="sm"><Link href="/shop">Start shopping</Link></Button>}
              tone="muted"
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {orders.slice(0, 3).map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-white p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-charcoal">#{o.id}</p>
                    <p className="text-xs text-charcoal-muted">
                      {o.items.reduce((n, i) => n + i.quantity, 0)} items · {formatINR(o.totals.total)}
                    </p>
                  </div>
                  <Badge variant="soft" size="sm" className="shrink-0">{o.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Notifications preview */}
        <Panel
          title="Notifications"
          action={
            <button onClick={() => onNavigate("notifications")} className="text-sm font-medium text-purple-600 hover:underline">
              View all
            </button>
          }
        >
          <ul className="flex flex-col gap-3">
            {notifs.slice(0, 3).map((n) => (
              <li key={n.id} className="flex items-start gap-3">
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read ? "bg-charcoal-soft/30" : "bg-orange-500")} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-charcoal">{n.title}</p>
                  <p className="line-clamp-1 text-xs text-charcoal-muted">{n.body}</p>
                </div>
                <span className="shrink-0 text-[11px] text-charcoal-soft">{n.time}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* WALLET                                                             */
/* ------------------------------------------------------------------ */

function WalletPanel() {
  return (
    <div className="flex flex-col gap-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-700 via-purple-800 to-charcoal p-7 text-cream shadow-[var(--shadow-lift)] sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-gold-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-sm text-cream/70">Ratalu Wallet balance</p>
            <p className="mt-1 font-serif text-5xl font-bold text-gold-300">{formatINR(ACCOUNT_STATS.walletBalance)}</p>
            <p className="mt-2 text-sm text-cream/70">Use at checkout for instant savings.</p>
          </div>
          <Wallet className="size-10 text-cream/60" />
        </div>
        <div className="relative mt-6 flex gap-3">
          <Button variant="accent" onClick={() => toast.info("Add money", { description: "Wallet top-up is coming soon." })}>
            <Plus /> Add money
          </Button>
          <Button variant="subtle" onClick={() => toast.success("Applied at checkout", { description: "Your balance will be used automatically." })}>
            Use balance
          </Button>
        </div>
      </div>

      <Panel title="Transaction history">
        <ul className="flex flex-col divide-y divide-[var(--color-border)]">
          {WALLET_TX.map((tx) => {
            const credit = tx.type === "credit";
            return (
              <li key={tx.id} className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0">
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", credit ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600")}>
                  {credit ? <ArrowDownLeft className="size-5" /> : <ArrowUpRight className="size-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-charcoal">{tx.label}</p>
                  <p className="text-xs text-charcoal-soft">
                    {new Date(tx.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <span className={cn("shrink-0 font-semibold tabular-nums", credit ? "text-green-700" : "text-charcoal")}>
                  {credit ? "+" : "−"}{formatINR(tx.amount)}
                </span>
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* REFERRALS                                                          */
/* ------------------------------------------------------------------ */

function ReferralsPanel() {
  const [copied, setCopied] = React.useState(false);
  const link = `${SITE.url}/r/${REFERRAL.code}`;

  const copy = async (text: string, label: string) => {
    try { await navigator.clipboard.writeText(text); } catch {}
    setCopied(true);
    toast.success(`${label} copied!`, { description: "Share it with a friend to earn ₹100." });
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 to-gold-400 p-7 text-white shadow-[var(--shadow-lift)] sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 size-44 rounded-full bg-white/20 blur-3xl" />
        <div className="relative">
          <h2 className="font-serif text-3xl font-bold">Give ₹100, get ₹100</h2>
          <p className="mt-2 max-w-md text-white/90">Share your code — your friend saves ₹100 on their first order and you earn ₹100 in wallet credit when they buy.</p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <div className="flex flex-1 items-center justify-between gap-3 rounded-2xl border border-dashed border-white/50 bg-white/15 px-4 py-3 backdrop-blur">
              <span className="font-serif text-xl font-bold tracking-wider">{REFERRAL.code}</span>
              <button onClick={() => copy(REFERRAL.code, "Code")} className="grid size-9 place-items-center rounded-xl bg-white/20 transition-colors hover:bg-white/30" aria-label="Copy referral code">
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </button>
            </div>
            <Button variant="subtle" size="lg" className="bg-white text-orange-600 hover:bg-white" onClick={() => copy(link, "Link")}>
              <Share2 /> Copy invite link
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Invited", value: REFERRAL.invited },
          { label: "Joined", value: REFERRAL.joined },
          { label: "Earned", value: formatINR(REFERRAL.earned) },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-[var(--color-border)] bg-white/70 p-4 text-center">
            <p className="font-serif text-2xl font-bold text-purple-700">{s.value}</p>
            <p className="text-xs text-charcoal-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <Panel title="Your referrals">
        <ul className="flex flex-col divide-y divide-[var(--color-border)]">
          {REFERRED_FRIENDS.map((f) => (
            <li key={f.name} className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-purple-100 text-sm font-bold text-purple-700">
                {f.name.split(" ").map((p) => p[0]).join("")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-charcoal">{f.name}</p>
                <p className="text-xs text-charcoal-soft">{f.status === "Joined" ? "Completed first order" : "Invite sent"}</p>
              </div>
              {f.status === "Joined" ? (
                <span className="shrink-0 font-semibold text-green-700">+{formatINR(f.reward)}</span>
              ) : (
                <Badge variant="cream" size="sm">Pending</Badge>
              )}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* NOTIFICATIONS                                                      */
/* ------------------------------------------------------------------ */

const NOTIF_ICON: Record<AppNotification["type"], React.ElementType> = {
  order: Package,
  offer: Ticket,
  reward: Gift,
  system: BellRing,
};

function NotificationsPanel({
  notifs,
  setNotifs,
}: {
  notifs: AppNotification[];
  setNotifs: React.Dispatch<React.SetStateAction<AppNotification[]>>;
}) {
  const markAllRead = () => setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  const toggleRead = (id: string) =>
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n)));

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
                  onClick={() => toggleRead(n.id)}
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
/* RECENTLY VIEWED                                                    */
/* ------------------------------------------------------------------ */

function RecentlyViewedPanel() {
  const { ids, clear } = useRecentlyViewed();
  const { getFlavor } = useProducts();
  const { addItem } = useCart();
  const pack = getPack(DEFAULT_PACK_ID)!;
  const flavors = ids.map((id) => getFlavor(id)).filter(Boolean) as Flavor[];

  if (flavors.length === 0) {
    return (
      <Panel title="Recently viewed">
        <EmptyState
          icon={History}
          title="Nothing here yet"
          description="Flavours you view will appear here for quick access."
          action={<Button asChild><Link href="/shop">Browse flavours</Link></Button>}
          tone="muted"
        />
      </Panel>
    );
  }

  return (
    <Panel
      title="Recently viewed"
      action={
        <button onClick={clear} className="text-sm font-medium text-charcoal-muted hover:text-red-500">
          Clear
        </button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {flavors.map((f) => (
          <div key={f.id} className="flex gap-4 rounded-2xl border border-[var(--color-border)] bg-white p-4">
            <Link
              href={`/shop/${f.slug}`}
              className="size-20 shrink-0 rounded-xl p-2"
              style={{ background: `radial-gradient(120% 120% at 30% 20%, ${f.gradient.from}22, transparent)` }}
            >
              <WaferVisual flavor={f} />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <Link href={`/shop/${f.slug}`}>
                <p className="truncate font-serif text-lg font-semibold text-charcoal hover:text-purple-700">{f.name}</p>
              </Link>
              <HeatMeter level={f.heat} className="mt-1" />
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
        <ul className="flex flex-col divide-y divide-[var(--color-border)]">
          {SUPPORT_TICKETS.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-charcoal">{t.subject}</p>
                <p className="text-xs text-charcoal-soft">{t.id} · {new Date(t.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
              </div>
              <Badge variant={t.status === "Open" ? "orange" : "soft"} size="sm" className={t.status === "Resolved" ? "text-green-700" : ""}>
                {t.status}
              </Badge>
            </li>
          ))}
        </ul>
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

      <Panel title="Change password">
        <div className="grid gap-4 sm:grid-cols-2">
          <LabeledInput label="Current password" type="password" placeholder="••••••••" />
          <LabeledInput label="New password" type="password" placeholder="••••••••" />
        </div>
        <div className="mt-5 flex gap-3">
          <Button variant="outline" onClick={() => toast.success("Password updated")}>Update password</Button>
          <Button variant="ghost" onClick={onLogout} className="text-red-600 hover:bg-red-50 ml-auto">Sign Out</Button>
        </div>
      </Panel>
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
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col gap-8">
      <Panel title="Profile Details">
        <div className="grid gap-5 sm:grid-cols-2">
          <LabeledInput label="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
          <LabeledInput label="Mobile Number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="mt-6 flex items-center gap-3">
          <Button onClick={handleSave}>{saved ? "Saved successfully!" : "Save changes"}</Button>
        </div>
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

function OrdersPanel() {
  const { user } = useAccount();
  const { getOrdersByUser, cancelOrder } = useOrders();
  const orders = getOrdersByUser(user?.phone || "");

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

  const canCancel = (order: Order) => {
    if (order.status !== "Pending" && order.status !== "Confirmed") return false;
    const diffMs = Date.now() - new Date(order.createdAt).getTime();
    const diffMins = diffMs / (1000 * 60);
    return diffMins < 15;
  };

  const handleCancelClick = (orderId: string) => {
    cancelOrder(orderId);
    toast.success("Order Cancelled Successfully", {
      description: `Order #${orderId} has been cancelled. If paid, your refund will reflect soon.`,
    });
  };

  const statusProgress: Record<string, number> = {
    Pending: 10,
    Confirmed: 25,
    Packed: 40,
    "Ready for Dispatch": 60,
    "In Transit": 75,
    "Out for Delivery": 90,
    Delivered: 100,
    Cancelled: 100,
  };

  const statusColors: Record<string, string> = {
    Pending: "bg-gray-100 text-gray-700 border-gray-200",
    Confirmed: "bg-purple-50 text-purple-700 border-purple-100",
    Packed: "bg-blue-50 text-blue-700 border-blue-100",
    "Ready for Dispatch": "bg-indigo-50 text-indigo-700 border-indigo-100",
    "In Transit": "bg-orange-50 text-orange-700 border-orange-100",
    "Out for Delivery": "bg-yellow-50 text-yellow-800 border-yellow-100",
    Delivered: "bg-green-50 text-green-700 border-green-100",
    Cancelled: "bg-red-50 text-red-700 border-red-100",
  };

  return (
    <Panel title={`Your orders (${orders.length})`}>
      <div className="flex flex-col gap-6">
        {orders.map((order) => {
          const cancelAllowed = canCancel(order);
          return (
            <div key={order.id} className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
                <div>
                  <span className="text-xs font-semibold text-gray-400">
                    Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <h4 className="mt-0.5 text-lg font-bold text-gray-800">
                    Order ID: <span className="text-purple-600">#{order.id}</span>
                  </h4>
                </div>
                <Badge variant="soft" className={cn("border font-semibold", statusColors[order.status])}>
                  {order.status}
                </Badge>
              </div>

              <ul className="mt-4 flex flex-col gap-2">
                {order.items.map((item) => (
                  <li key={item.key} className="flex justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-gray-500">{item.quantity}x {item.flavorName} ({item.packLabel})</span>
                    <span className="shrink-0 font-semibold text-gray-800">{formatINR(item.unitPrice * item.quantity)}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  <span>Shipping Status</span>
                  <span>{order.status}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      order.status === "Cancelled" ? "bg-red-500" : "bg-purple-600"
                    )}
                    style={{ width: `${statusProgress[order.status] ?? 10}%` }}
                  />
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-gray-500">
                  Delivering to: <span className="font-bold text-gray-800">{order.address.tag}</span> - {order.address.addressLine}, {order.address.city}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-4">
                <div className="flex gap-2">
                  <span className="text-sm font-medium text-gray-400">Paid via {order.method.toUpperCase()}</span>
                  {cancelAllowed && (
                    <button
                      onClick={() => handleCancelClick(order.id)}
                      className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg px-3 py-1.5 transition-colors focus:outline-none border border-red-200/50"
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
                <span className="text-xl font-bold text-purple-600">Total Paid: {formatINR(order.totals.total)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function AddressesPanel() {
  const { user, addAddress, deleteAddress, setActiveAddress } = useAccount();
  const [showForm, setShowForm] = React.useState(false);
  const [tag, setTag] = React.useState<"Home" | "Work" | "Other">("Home");
  const [addressLine, setAddressLine] = React.useState("");
  const [city, setCity] = React.useState("");
  const [state, setState] = React.useState("");
  const [pincode, setPincode] = React.useState("");
  const [locLoading, setLocLoading] = React.useState(false);

  const handleUseLocation = () => {
    setLocLoading(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => {
          const mockLocations = [
            { line: "Flat 402, Sea Breeze, Marine Drive", city: "Mumbai", state: "Maharashtra", pin: "400021" },
            { line: "Block G, Naman BKC Centre, Bandra East", city: "Mumbai", state: "Maharashtra", pin: "400051" },
            { line: "101 Green Heights, Off Linking Road", city: "Mumbai", state: "Maharashtra", pin: "400050" },
            { line: "B-204 Dev Aurum, Prahlad Nagar", city: "Ahmedabad", state: "Gujarat", pin: "380015" },
          ];
          const randomLoc = mockLocations[Math.floor(Math.random() * mockLocations.length)];
          setAddressLine(randomLoc.line);
          setCity(randomLoc.city);
          setState(randomLoc.state);
          setPincode(randomLoc.pin);
          setLocLoading(false);
        },
        () => {
          setAddressLine("Flat 12, Royal Palms Mansion, Park Street");
          setCity("Kolkata");
          setState("West Bengal");
          setPincode("700016");
          setLocLoading(false);
        }
      );
    } else {
      setLocLoading(false);
    }
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressLine || !city || !state || !pincode) return;
    addAddress({ tag, addressLine, city, state, pincode });
    toast.success("Address added");
    setTag("Home");
    setAddressLine("");
    setCity("");
    setState("");
    setPincode("");
    setShowForm(false);
  };

  return (
    <Panel title="Saved Delivery Addresses">
      <p className="-mt-4 mb-6 text-xs text-charcoal-soft">
        Select your active delivery address, delete address details, or add new home/work locations.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {user?.addresses.map((addr) => {
          const isActive = user.activeAddressId === addr.id;
          return (
            <div
              key={addr.id}
              onClick={() => setActiveAddress(addr.id)}
              className={cn(
                "relative flex cursor-pointer flex-col justify-between rounded-2xl border p-5 transition-all",
                isActive ? "border-purple-600 bg-purple-50/40 ring-1 ring-purple-500 shadow-sm" : "border-[var(--color-border)] bg-white/60 hover:border-purple-200 hover:bg-white"
              )}
            >
              <div>
                <div className="flex items-center justify-between">
                  <Badge variant={addr.tag === "Home" ? "primary" : addr.tag === "Work" ? "gold" : "orange"} size="sm">{addr.tag}</Badge>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteAddress(addr.id); }}
                    className="text-charcoal-soft transition-colors hover:text-red-500"
                    aria-label="Remove address"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <p className="mt-4 text-sm font-semibold text-charcoal">{user.name}</p>
                <p className="mt-1 text-xs leading-relaxed text-charcoal-muted">
                  {addr.addressLine},<br />{addr.city}, {addr.state} {addr.pincode}
                </p>
              </div>
              {isActive && (
                <div className="mt-4 flex items-center justify-between border-t border-purple-100 pt-3 text-[10px] font-bold uppercase tracking-wider text-purple-700">
                  <span>✓ Active Address</span>
                </div>
              )}
            </div>
          );
        })}

        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-purple-200 text-charcoal-muted transition-colors hover:border-purple-400 hover:text-purple-700"
          >
            <Plus className="size-6" />
            <span className="text-sm font-semibold">Add New Address</span>
          </button>
        ) : (
          <form onSubmit={handleSaveAddress} className="flex flex-col gap-4 rounded-2xl border border-dashed border-purple-300 bg-purple-50/20 p-5 sm:col-span-2">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-charcoal-soft">Address Type</span>
              <div className="flex flex-wrap items-center gap-2">
                {(["Home", "Work", "Other"] as const).map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setTag(t)}
                    className={cn(
                      "rounded-lg border px-3.5 py-1.5 text-xs font-semibold transition-all",
                      tag === t ? "border-purple-600 bg-purple-500 text-cream shadow-sm" : "border-cream-200 bg-white text-charcoal-muted hover:border-purple-200"
                    )}
                  >
                    {t}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleUseLocation}
                  disabled={locLoading}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-purple-700 transition-colors hover:bg-purple-50"
                >
                  <Compass className={cn("size-3.5", locLoading && "animate-spin")} />
                  {locLoading ? "Locating..." : "Use Current Location"}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-charcoal-soft">Address details</label>
              <textarea
                required
                rows={2}
                placeholder="Flat / House no, building, street, area"
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-2.5 text-sm text-charcoal outline-none transition-all placeholder:text-charcoal-soft focus-visible:border-purple-400 focus-visible:ring-2 focus-visible:ring-purple-200"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-charcoal-soft">City</label>
                <Input required placeholder="Mumbai" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-charcoal-soft">State</label>
                <Input required placeholder="Maharashtra" value={state} onChange={(e) => setState(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-charcoal-soft">PIN Code</label>
                <Input required placeholder="400001" value={pincode} onChange={(e) => setPincode(e.target.value)} />
              </div>
            </div>

            <div className="mt-2 flex gap-2">
              <Button type="submit" size="sm">Save Address</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
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

function RewardsPanel() {
  const points = ACCOUNT_STATS.rewardPoints;
  const nextTier = ACCOUNT_STATS.nextTier;
  return (
    <div className="flex flex-col gap-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600 to-purple-800 p-8 text-cream shadow-[var(--shadow-lift)]">
        <div className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-gold-400/20 blur-3xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-sm text-cream/70">Crunch points</p>
            <p className="font-serif text-5xl font-bold text-gold-300">{points}</p>
          </div>
          <Star className="size-12 fill-gold-300 text-gold-300" />
        </div>
        <div className="relative mt-6">
          <div className="mb-2 flex justify-between text-xs text-cream/70">
            <span>{points} pts</span>
            <span>{nextTier} pts · Gold tier</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-gold-400" style={{ width: `${(points / nextTier) * 100}%` }} />
          </div>
          <p className="mt-3 text-sm text-cream/80">
            Earn 1 point per ₹10 spent. You&apos;re {nextTier - points} points from a free 200g pack!
          </p>
        </div>
      </div>
      <Panel title="How rewards work">
        <ul className="grid gap-3 sm:grid-cols-3">
          {[
            { t: "Earn", d: "1 point for every ₹10 you spend." },
            { t: "Refer", d: "Give ₹100, get ₹100 for every friend." },
            { t: "Redeem", d: "500 points = a free 200g pack." },
          ].map((x) => (
            <li key={x.t} className="rounded-2xl bg-cream-100 p-4">
              <p className="font-serif text-lg font-semibold text-purple-700">{x.t}</p>
              <p className="mt-1 text-sm text-charcoal-muted">{x.d}</p>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function CouponsPanel() {
  return (
    <Panel title="Available coupons">
      <div className="grid gap-4 sm:grid-cols-2">
        {COUPONS.map((c) => (
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
