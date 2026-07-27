"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  Bell,
  BellRing,
  Tag,
  ShoppingBag,
  Truck,
  CheckCircle2,
  XCircle,
  CreditCard,
  RotateCcw,
  Megaphone,
  Gift,
  X,
  CheckCheck,
  Trash2,
  ExternalLink,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
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

/** Pick a meaningful icon from the notification title/message text */
function getNotificationIcon(n: ApiNotification): React.ElementType {
  const text = (n.title + " " + n.message).toLowerCase();

  if (n.type === "OrderStatus") {
    if (text.includes("delivered") || text.includes("delivery")) return CheckCircle2;
    if (text.includes("shipped") || text.includes("on its way") || text.includes("out for delivery")) return Truck;
    if (text.includes("cancel")) return XCircle;
    if (text.includes("refund")) return RotateCcw;
    if (text.includes("payment") || text.includes("paid")) return CreditCard;
    if (text.includes("placed") || text.includes("received your order")) return ShoppingBag;
    return ShoppingBag;
  }

  if (n.type === "Coupon") return Tag;
  if (n.type === "Offer") return Gift;

  // General
  if (text.includes("offer") || text.includes("deal") || text.includes("sale")) return Megaphone;
  return BellRing;
}

/** Icon background + foreground by type and context */
function getNotificationTone(n: ApiNotification): { bg: string; icon: string; dot: string } {
  const text = (n.title + " " + n.message).toLowerCase();

  if (n.type === "OrderStatus") {
    if (text.includes("delivered")) return { bg: "bg-emerald-100", icon: "text-emerald-700", dot: "bg-emerald-500" };
    if (text.includes("cancel")) return { bg: "bg-rose-100", icon: "text-rose-700", dot: "bg-rose-500" };
    if (text.includes("refund")) return { bg: "bg-amber-100", icon: "text-amber-700", dot: "bg-amber-500" };
    if (text.includes("payment") || text.includes("paid")) return { bg: "bg-blue-100", icon: "text-blue-700", dot: "bg-blue-500" };
    if (text.includes("shipped") || text.includes("out for delivery")) return { bg: "bg-indigo-100", icon: "text-indigo-700", dot: "bg-indigo-500" };
    return { bg: "bg-purple-100", icon: "text-purple-700", dot: "bg-purple-500" };
  }

  if (n.type === "Coupon" || n.type === "Offer") {
    return { bg: "bg-orange-100", icon: "text-orange-700", dot: "bg-orange-500" };
  }

  return { bg: "bg-gray-100", icon: "text-gray-600", dot: "bg-gray-400" };
}

function timeAgo(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

interface NotificationsDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationsDrawer({ open, onClose }: NotificationsDrawerProps) {
  const { isLoggedIn } = useAccount();
  const [items, setItems] = React.useState<ApiNotification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<"all" | "unread" | "OrderStatus">("all");
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const env = await apiFetchEnvelope<ApiNotification[]>("/notifications");
      setItems(env.data ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  React.useEffect(() => {
    if (open && isLoggedIn) {
      void load();
    }
  }, [open, isLoggedIn, load]);

  // Lock body scroll when drawer is open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const unread = items.filter((n) => !n.read).length;

  const visible = React.useMemo(() => {
    if (filter === "all") return items;
    if (filter === "unread") return items.filter((n) => !n.read);
    return items.filter((n) => n.type === "OrderStatus");
  }, [items, filter]);

  const markRead = async (id: string) => {
    const target = items.find((n) => n._id === id);
    if (!target || target.read) return;
    setItems((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    try {
      await apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
    } catch {
      void load();
    }
  };

  const markAllRead = async () => {
    if (unread === 0) return;
    setBusy(true);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await apiFetch("/notifications/read-all", { method: "PATCH" });
      toast.success("All caught up!");
    } catch {
      void load();
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
      setItems(snapshot);
      toast.error("Could not delete notification");
    }
  };

  const tabs = [
    { id: "all" as const, label: "All", count: items.length },
    { id: "unread" as const, label: "Unread", count: unread },
    { id: "OrderStatus" as const, label: "Orders", count: items.filter((i) => i.type === "OrderStatus").length },
  ];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          />

          {/* Side Drawer Panel */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100/80">
              <div className="flex items-center gap-3">
                <div className="relative flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-violet-700 shadow-sm shadow-purple-200">
                  <Bell className="size-4.5 text-white" />
                  {unread > 0 && (
                    <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-white">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900 leading-tight">Notifications</h2>
                  <p className="text-[11px] text-gray-400 font-medium mt-px">
                    {unread > 0 ? `${unread} new update${unread !== 1 ? "s" : ""}` : "You're all caught up"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {unread > 0 && (
                  <button
                    onClick={markAllRead}
                    disabled={busy}
                    title="Mark all as read"
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-purple-700 hover:bg-purple-50 transition-colors disabled:opacity-50"
                  >
                    <CheckCheck className="size-3.5" />
                    <span>Mark read</span>
                  </button>
                )}
                <button
                  onClick={onClose}
                  aria-label="Close notifications"
                  className="flex size-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                  <X className="size-4.5" />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 border-b border-gray-100 bg-gray-50/40 px-5 py-2.5">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold transition-all duration-150",
                    filter === tab.id
                      ? "bg-purple-600 text-white shadow-sm"
                      : "bg-white border border-gray-200 text-gray-500 hover:border-purple-200 hover:text-purple-700"
                  )}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span
                      className={cn(
                        "min-w-[16px] rounded-full px-1 py-px text-center text-[9px] font-bold",
                        filter === tab.id
                          ? "bg-white/25 text-white"
                          : "bg-gray-100 text-gray-500"
                      )}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="space-y-2.5 p-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex gap-3 rounded-2xl border border-gray-100 bg-white p-3.5">
                      <div className="size-9 shrink-0 animate-pulse rounded-xl bg-gray-100" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-2/3 animate-pulse rounded bg-gray-100" />
                        <div className="h-2.5 w-full animate-pulse rounded bg-gray-100" />
                        <div className="h-2.5 w-1/2 animate-pulse rounded bg-gray-100" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : visible.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-purple-50">
                    <Bell className="size-7 text-purple-300" />
                  </div>
                  <p className="text-sm font-bold text-gray-700">
                    {filter === "unread" ? "All caught up!" : "No notifications yet"}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Order updates and offers will appear here.
                  </p>
                </div>
              ) : (
                <div className="p-3 space-y-1.5">
                  <AnimatePresence initial={false}>
                    {visible.map((n) => {
                      const Icon = getNotificationIcon(n);
                      const tone = getNotificationTone(n);

                      return (
                        <motion.div
                          key={n._id}
                          initial={{ opacity: 0, y: -6, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, x: 20, scale: 0.96 }}
                          transition={{ duration: 0.18 }}
                          className={cn(
                            "group relative flex gap-3 rounded-xl border p-3.5 cursor-pointer transition-all duration-150",
                            n.read
                              ? "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/50"
                              : "border-purple-100 bg-purple-50/50 hover:bg-purple-50"
                          )}
                          onClick={() => markRead(n._id)}
                        >
                          {/* Unread dot */}
                          {!n.read && (
                            <span className={cn("absolute left-2 top-1/2 -translate-y-1/2 size-1.5 rounded-full", tone.dot)} />
                          )}

                          {/* Icon */}
                          <div
                            className={cn(
                              "flex size-9 shrink-0 items-center justify-center rounded-xl",
                              tone.bg
                            )}
                          >
                            <Icon className={cn("size-4", tone.icon)} />
                          </div>

                          {/* Content */}
                          <div className="min-w-0 flex-1 pr-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className={cn(
                                "text-xs leading-snug",
                                n.read ? "font-semibold text-gray-700" : "font-bold text-gray-900"
                              )}>
                                {n.title}
                              </p>
                              <span className="flex shrink-0 items-center gap-0.5 text-[10px] text-gray-400 font-medium mt-px">
                                <Clock className="size-2.5" />
                                {timeAgo(n.createdAt)}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-gray-500 break-words line-clamp-2">
                              {n.message}
                            </p>
                          </div>

                          {/* Delete button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              remove(n._id);
                            }}
                            title="Dismiss"
                            className="absolute right-2.5 top-2.5 flex size-5 items-center justify-center rounded-md text-gray-300 opacity-0 transition-all hover:text-rose-500 group-hover:opacity-100"
                          >
                            <X className="size-3.5" />
                          </button>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 bg-gray-50/60 px-5 py-3.5">
              <Link
                href="/notifications"
                onClick={onClose}
                className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-purple-700 hover:text-purple-900 transition-colors"
              >
                View all notifications
                <ExternalLink className="size-3" />
              </Link>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
