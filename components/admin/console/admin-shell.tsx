"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  RotateCcw,
  Package,
  FolderTree,
  Users,
  Boxes,
  Ticket,
  Truck,
  HelpCircle,
  LayoutTemplate,
  BarChart3,
  Gauge,
  Bell,
  Settings as SettingsIcon,
  ScrollText,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  Search,
  Plus,
  Eye,
  Menu,
  X,
  ChevronRight,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccount, isAdminSession } from "@/components/account/account-provider";
import { apiFetchEnvelope } from "@/lib/api";
import { TRANSITION } from "@/components/admin/ui/tokens";

/**
 * Only modules with a real backend appear here.
 *
 * Marketing, Staff, Roles & Permissions and traffic Analytics are deliberately
 * absent: they have no data model yet, and a sidebar link to an empty page is
 * exactly the "placeholder" the spec forbids. Each lands in the nav as its API
 * ships.
 */
export interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

export const NAV_GROUPS: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Overview",
    items: [
      { label: "Dashboard", href: "/admin/dashboard?tab=dashboard", icon: LayoutDashboard },
      { label: "Reach", href: "/admin/reach", icon: Gauge },
      { label: "Orders", href: "/admin/orders", icon: ShoppingCart },
      { label: "Refunds & Returns", href: "/admin/refunds", icon: RotateCcw },
    ],
  },
  {
    heading: "Catalogue",
    items: [
      { label: "Products", href: "/admin/products", icon: Package },
      { label: "Categories & Combos", href: "/admin/catalog", icon: FolderTree },
    ],
  },
  {
    heading: "Customers",
    items: [
      { label: "Customers", href: "/admin/customers", icon: Users },
      { label: "Coupons", href: "/admin/coupons", icon: Ticket },
    ],
  },
  {
    heading: "Content",
    items: [
      { label: "Website Builder", href: "/admin/website", icon: LayoutTemplate },
      { label: "Enterprise CMS & Marketing", href: "/admin/dashboard?tab=homepage", icon: Globe },
    ],
  },
  {
    heading: "System",
    items: [
      { label: "Reports", href: "/admin/dashboard?tab=reports", icon: BarChart3 },
      { label: "Logistics", href: "/admin/dashboard?tab=logistics", icon: Truck },
      { label: "Audit Logs", href: "/admin/dashboard?tab=audit-logs", icon: ScrollText },
      { label: "Settings", href: "/admin/settings", icon: SettingsIcon },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

/**
 * Which nav item is current.
 *
 * Modules not yet migrated to their own route still live as tabs inside the
 * dashboard page, so matching on pathname alone would light up "Dashboard" for
 * all of them. Compare the ?tab= too.
 */
function matchNav(pathname: string, tab: string | null, href: string): boolean {
  const [path, query] = href.split("?");
  if (pathname !== path && !pathname.startsWith(`${path}/`)) return false;

  const hrefTab = query ? new URLSearchParams(query).get("tab") : null;
  if (!hrefTab) return true;
  return (tab ?? "dashboard") === hrefTab;
}
const COLLAPSE_KEY = "ratalu.admin.sidebar.collapsed";

export function AdminShell(props: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  // useSearchParams needs a Suspense boundary during prerender.
  return (
    <React.Suspense
      fallback={<div className="min-h-screen bg-[#F8FAFC]" />}
    >
      <AdminShellInner {...props} />
    </React.Suspense>
  );
}

function AdminShellInner({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");
  const { user, isLoggedIn, logout, hydrated } = useAccount();

  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [unread, setUnread] = React.useState(0);
  const searchRef = React.useRef<HTMLInputElement>(null);

  const isAdmin = isAdminSession(user);

  // Restore the collapsed preference (client-only, so no hydration mismatch).
  React.useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      localStorage.setItem(COLLAPSE_KEY, prev ? "0" : "1");
      return !prev;
    });
  };

  // Route guard — role-based, and only once the stored session has loaded.
  React.useEffect(() => {
    if (!hydrated) return;
    if (!isLoggedIn || !isAdmin) router.replace("/account");
  }, [hydrated, isLoggedIn, isAdmin, router]);

  // Unread admin notification count for the topbar bell. The count rides in the
  // envelope's `meta`, which apiFetch drops — so read the envelope directly.
  React.useEffect(() => {
    if (!isAdmin) return;
    const load = async () => {
      try {
        const env = await apiFetchEnvelope<unknown>("/admin/notifications?limit=1");
        const meta = env.meta as { unread?: number } | undefined;
        setUnread(meta?.unread ?? 0);
      } catch {
        /* the bell is not worth interrupting the page for */
      }
    };
    load();
    const timer = setInterval(load, 60_000);
    return () => clearInterval(timer);
  }, [isAdmin]);

  // "/" focuses global search — the shortcut every console has.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close the mobile drawer on navigation.
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (!hydrated || !isLoggedIn || !isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#F8FAFC]">
        <p className="text-sm font-semibold text-[#6B7280]">Loading admin session…</p>
      </div>
    );
  }

  const current = ALL_ITEMS.find((i) => matchNav(pathname ?? "", currentTab, i.href));

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 overflow-y-auto px-3 py-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.heading} className="mb-1">
          {!collapsed && (
            <p className="px-2.5 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              {group.heading}
            </p>
          )}
          {group.items.map((item) => {
            const Icon = item.icon;
            const active = matchNav(pathname ?? "", currentTab, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold",
                  TRANSITION,
                  active
                    ? "bg-[#5B2C83] text-white shadow-sm"
                    : "text-[#6B7280] hover:bg-gray-100 hover:text-[#111827]",
                  collapsed && "justify-center px-0"
                )}
              >
                <Icon className="size-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </div>
      ))}

      <div className="mt-auto border-t border-gray-100 pt-3">
        <button
          onClick={async () => {
            router.push("/");
            await logout();
          }}
          title={collapsed ? "Logout" : undefined}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 cursor-pointer",
            TRANSITION,
            collapsed && "justify-center px-0"
          )}
        >
          <LogOut className="size-4 shrink-0" />
          {!collapsed && "Logout"}
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827]">
      {/* ─── Sidebar (desktop, sticky) ─────────────────────────────────────── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r border-[#E5E7EB] bg-white lg:flex lg:flex-col",
          TRANSITION,
          collapsed ? "w-16" : "w-60"
        )}
      >
        <div
          className={cn(
            "flex h-14 shrink-0 items-center gap-2 border-b border-[#E5E7EB] px-3",
            collapsed && "justify-center"
          )}
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#5B2C83] text-xs font-black text-white">
            R
          </span>
          {!collapsed && (
            <span className="truncate text-sm font-bold tracking-tight">Ratalu Admin</span>
          )}
        </div>
        {sidebar}
      </aside>

      {/* ─── Sidebar (mobile drawer) ───────────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-gray-900/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-white shadow-xl">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#E5E7EB] px-3">
              <span className="text-sm font-bold">Ratalu Admin</span>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="size-4" />
              </button>
            </div>
            {sidebar}
          </aside>
        </div>
      )}

      {/* ─── Main column ───────────────────────────────────────────────────── */}
      <div className={cn(TRANSITION, collapsed ? "lg:pl-16" : "lg:pl-60")}>
        {/* Topbar */}
        <header className="sticky top-0 z-20 border-b border-[#E5E7EB] bg-white/95 backdrop-blur">
          <div className="flex h-14 items-center gap-2 px-3 sm:px-5">
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="rounded-lg p-1.5 text-[#6B7280] hover:bg-gray-100 lg:hidden"
            >
              <Menu className="size-5" />
            </button>

            <button
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden rounded-lg p-1.5 text-[#6B7280] hover:bg-gray-100 lg:block"
            >
              {collapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
            </button>

            {/* Global search */}
            <div className="relative ml-1 max-w-md flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchRef}
                placeholder="Search orders, customers…  ( / )"
                onKeyDown={(e) => {
                  const q = (e.target as HTMLInputElement).value.trim();
                  if (e.key === "Enter" && q) {
                    router.push(`/admin/orders?search=${encodeURIComponent(q)}`);
                  }
                }}
                className="w-full rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] py-1.5 pl-8 pr-3 text-xs text-[#111827] placeholder:text-gray-400 focus:border-[#5B2C83] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5B2C83]/15"
              />
            </div>

            <div className="ml-auto flex items-center gap-1">
              <Link
                href="/"
                target="_blank"
                title="View shop"
                className="hidden rounded-lg p-1.5 text-[#6B7280] hover:bg-gray-100 hover:text-[#111827] sm:block"
              >
                <Eye className="size-4" />
              </Link>

              <Link
                href="/admin/orders"
                title="Quick add"
                className="hidden rounded-lg p-1.5 text-[#6B7280] hover:bg-gray-100 hover:text-[#111827] sm:block"
              >
                <Plus className="size-4" />
              </Link>

              <Link
                href="/admin/dashboard?tab=notifications"
                title="Notifications"
                className="relative rounded-lg p-1.5 text-[#6B7280] hover:bg-gray-100 hover:text-[#111827]"
              >
                <Bell className="size-4" />
                {unread > 0 && (
                  <span className="absolute right-0.5 top-0.5 grid min-w-3.5 place-items-center rounded-full bg-[#EF4444] px-1 text-[8px] font-bold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>

              <div className="ml-1 flex items-center gap-2 border-l border-gray-100 pl-2">
                <span className="grid size-7 place-items-center rounded-full bg-[#5B2C83] text-[10px] font-bold text-white">
                  {(user?.name || user?.username || "A")[0].toUpperCase()}
                </span>
                <div className="hidden leading-tight sm:block">
                  <p className="text-[11px] font-bold text-[#111827]">
                    {user?.name || user?.username || "Admin"}
                  </p>
                  <p className="text-[10px] text-[#6B7280]">{user?.role}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Breadcrumbs + page title */}
        <div className="border-b border-[#E5E7EB] bg-white px-4 py-4 sm:px-6">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[11px] text-[#6B7280]">
            <Link href="/admin/dashboard" className="hover:text-[#5B2C83]">
              Admin
            </Link>
            {current && (
              <>
                <ChevronRight className="size-3" />
                <span className="font-semibold text-[#111827]">{current.label}</span>
              </>
            )}
          </nav>

          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight text-[#111827] sm:text-xl">
                {title}
              </h1>
              {description && (
                <p className="mt-0.5 text-xs text-[#6B7280]">{description}</p>
              )}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
          </div>
        </div>

        <main className="px-4 py-5 sm:px-6 sm:py-6">{children}</main>
      </div>
    </div>
  );
}
