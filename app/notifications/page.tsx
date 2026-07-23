"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  Bell,
  Package,
  Ticket,
  BellRing,
  Trash2,
  CheckCheck,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { toast } from "@/components/ui/toast";
import { apiFetchEnvelope, apiFetch } from "@/lib/api";
import { useAccount } from "@/components/account/account-provider";

interface ApiNotification {
  _id: string;
  title: string;
  message: string;
  read: boolean;
  type: "OrderStatus" | "Coupon" | "Offer" | "General";
  createdAt: string;
}

const ICONS: Record<ApiNotification["type"], React.ElementType> = {
  OrderStatus: Package,
  Coupon: Ticket,
  Offer: Ticket,
  General: BellRing,
};

const TONES: Record<ApiNotification["type"], string> = {
  OrderStatus: "bg-purple-100 text-purple-700",
  Coupon: "bg-orange-100 text-orange-700",
  Offer: "bg-orange-100 text-orange-700",
  General: "bg-gray-100 text-gray-600",
};

type Filter = "all" | "unread" | "OrderStatus" | "Offer";

const FILTER_LABELS: Record<Filter, string> = {
  all: "All",
  unread: "Unread",
  OrderStatus: "Orders",
  Offer: "Offers",
};

/** "Today" / "Yesterday" / "12 July" — the heading each group sits under. */
function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);

  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    ...(date.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}),
  });
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationsPage() {
  const { isLoggedIn, hydrated } = useAccount();

  const [items, setItems] = React.useState<ApiNotification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<Filter>("all");
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const env = await apiFetchEnvelope<ApiNotification[]>("/notifications");
      setItems(env.data ?? []);
    } catch {
      /* the empty state covers this */
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  React.useEffect(() => {
    if (!hydrated) return;
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    load();
  }, [hydrated, isLoggedIn, load]);

  const unread = items.filter((n) => !n.read).length;
  const orderCount = items.filter((n) => n.type === "OrderStatus").length;
  const offerCount = items.filter((n) => n.type === "Offer" || n.type === "Coupon").length;

  /**
   * Only surface filters that can actually match something. The store doesn't
   * currently emit customer-facing offer notifications, so a permanently empty
   * "Offers" tab would just be a dead end — it appears the moment one exists.
   */
  const filters = React.useMemo<Filter[]>(() => {
    const base: Filter[] = ["all", "unread", "OrderStatus"];
    if (offerCount > 0) base.push("Offer");
    return base;
  }, [offerCount]);

  // If the active filter disappears (e.g. the last offer was deleted), fall back.
  React.useEffect(() => {
    if (!filters.includes(filter)) setFilter("all");
  }, [filters, filter]);

  const filterCount: Record<Filter, number> = {
    all: items.length,
    unread,
    OrderStatus: orderCount,
    Offer: offerCount,
  };

  const visible = React.useMemo(() => {
    if (filter === "all") return items;
    if (filter === "unread") return items.filter((n) => !n.read);
    if (filter === "Offer") return items.filter((n) => n.type === "Offer" || n.type === "Coupon");
    return items.filter((n) => n.type === filter);
  }, [items, filter]);

  /** Group into day buckets, newest first, preserving order within a day. */
  const groups = React.useMemo(() => {
    const map = new Map<string, ApiNotification[]>();
    visible.forEach((n) => {
      const key = dayLabel(n.createdAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(n);
    });
    return [...map.entries()];
  }, [visible]);

  // Update locally first so the UI responds instantly, then persist.
  const markRead = async (id: string) => {
    const target = items.find((n) => n._id === id);
    if (!target || target.read) return;

    setItems((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    try {
      await apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
    } catch {
      load(); // reconcile with the server
    }
  };

  const markAllRead = async () => {
    if (unread === 0) return;
    setBusy(true);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await apiFetch("/notifications/read-all", { method: "PATCH" });
      toast.success("All caught up");
    } catch {
      load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    const snapshot = items;
    setItems((prev) => prev.filter((n) => n._id !== id));
    try {
      await apiFetch(`/notifications/${id}`, { method: "DELETE" });
    } catch {
      setItems(snapshot); // put it back
      toast.error("Could not delete that notification");
    }
  };

  /* ── Signed out ─────────────────────────────────────────────────────────── */
  if (hydrated && !isLoggedIn) {
    return (
      <>
        <PageHeader
          eyebrow="Notifications"
          title="Your updates"
          description="Order updates, offers and account activity — all in one place."
          crumbs={[{ label: "Home", href: "/" }, { label: "Notifications" }]}
        />
        <div className="container-px mx-auto max-w-3xl py-16">
          <EmptyState
            icon={Bell}
            title="Sign in to see your notifications"
            description="We'll keep you posted on your orders, refunds and offers."
            action={
              <Button asChild>
                <Link href="/account">
                  Sign in <ArrowRight />
                </Link>
              </Button>
            }
            tone="muted"
          />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Notifications"
        title={
          <>
            Your <span className="text-gradient-warm">updates</span>
          </>
        }
        description="Order updates, refunds, offers and account activity — all in one place."
        crumbs={[{ label: "Home", href: "/" }, { label: "Notifications" }]}
      />

      <div className="container-px mx-auto max-w-3xl py-8 sm:py-10">
        {/* Summary */}
        {!loading && items.length > 0 && (
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-white/70 p-4 shadow-[var(--shadow-soft)] backdrop-blur-sm">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-purple-100 text-purple-700">
              {unread > 0 ? <BellRing className="size-5.5" /> : <Bell className="size-5.5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-charcoal">
                {unread > 0 ? `${unread} unread notification${unread === 1 ? "" : "s"}` : "You're all caught up"}
              </p>
              <p className="text-xs text-charcoal-muted">
                {items.length} total · order updates, refunds and offers land here.
              </p>
            </div>
            {unread > 0 && (
              <Button variant="outline" size="sm" onClick={markAllRead} disabled={busy}>
                <CheckCheck className="size-3.5" />
                Mark all read
              </Button>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="mb-5 flex flex-wrap gap-1.5">
          {filters.map((value) => {
            const active = filter === value;
            const count = filterCount[value];
            return (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all duration-200",
                  active
                    ? "bg-purple-600 text-white shadow-sm"
                    : "border border-[var(--color-border)] bg-white text-charcoal-muted hover:border-purple-200"
                )}
              >
                {FILTER_LABELS[value]}
                {count > 0 && (
                  <span
                    className={cn(
                      "grid min-w-4 place-items-center rounded-full px-1 text-[9px]",
                      active
                        ? "bg-white/25 text-white"
                        : value === "unread"
                          ? "bg-orange-500 text-white"
                          : "bg-gray-100 text-charcoal-muted"
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-2xl border border-[var(--color-border)] bg-white/60"
              />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Bell}
            title={filter === "unread" ? "You're all caught up" : "No notifications yet"}
            description={
              filter === "unread"
                ? "Nothing unread right now."
                : "Order updates, refunds and offers will appear here."
            }
            action={
              <Button asChild variant="outline">
                <Link href="/shop">
                  Start shopping <ArrowRight />
                </Link>
              </Button>
            }
            tone="muted"
          />
        ) : (
          <div className="flex flex-col gap-6">
            {groups.map(([day, group]) => (
              <section key={day}>
                <h2 className="mb-2.5 px-1 text-[11px] font-bold uppercase tracking-wider text-charcoal-soft">
                  {day}
                </h2>

                <ul className="flex flex-col gap-2">
                  <AnimatePresence initial={false}>
                    {group.map((n) => {
                      const Icon = ICONS[n.type] ?? BellRing;
                      return (
                        <motion.li
                          key={n._id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -12 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div
                            className={cn(
                              "group relative flex items-start gap-3 rounded-2xl border p-4 transition-colors",
                              n.read
                                ? "border-[var(--color-border)] bg-white/60"
                                : "border-purple-150 bg-purple-50/50"
                            )}
                          >
                            <span
                              className={cn(
                                "grid size-10 shrink-0 place-items-center rounded-xl",
                                TONES[n.type] ?? TONES.General
                              )}
                            >
                              <Icon className="size-5" />
                            </span>

                            <button
                              onClick={() => markRead(n._id)}
                              className="min-w-0 flex-1 text-left"
                            >
                              <div className="flex items-center gap-2">
                                <p className="truncate text-sm font-bold text-charcoal">
                                  {n.title}
                                </p>
                                {!n.read && (
                                  <span
                                    className="size-2 shrink-0 rounded-full bg-orange-500"
                                    aria-label="Unread"
                                  />
                                )}
                              </div>
                              <p className="mt-0.5 text-xs leading-relaxed text-charcoal-muted">
                                {n.message}
                              </p>
                            </button>

                            <div className="flex shrink-0 flex-col items-end gap-2">
                              <span className="text-[10px] font-semibold text-charcoal-soft">
                                {timeLabel(n.createdAt)}
                              </span>
                              <button
                                onClick={() => remove(n._id)}
                                aria-label="Delete notification"
                                className="rounded-lg p-1 text-gray-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 focus:opacity-100 group-hover:opacity-100"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          </div>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
