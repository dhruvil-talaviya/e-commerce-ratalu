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
  Ticket,
  Truck,
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
  Eye,
  X,
  ChevronRight,
  Globe,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccount, isAdminSession } from "@/components/account/account-provider";
import { apiFetchEnvelope } from "@/lib/api";
import { TRANSITION } from "@/components/admin/ui/tokens";

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
    heading: "Finance & Other Business",
    items: [
      { label: "My Other Business", href: "/admin/other-business", icon: Building2 },
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
      { label: "Logistics", href: "/admin/logistics", icon: Truck },
      { label: "Audit Logs", href: "/admin/dashboard?tab=audit-logs", icon: ScrollText },
      { label: "Settings", href: "/admin/settings", icon: SettingsIcon },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

function matchNav(pathname: string, tab: string | null, href: string): boolean {
  const [path, query] = href.split("?");
  if (pathname !== path && !pathname.startsWith(`${path}/`)) return false;
  const hrefTab = query ? new URLSearchParams(query).get("tab") : null;
  if (!hrefTab) return true;
  return (tab ?? "dashboard") === hrefTab;
}

const COLLAPSE_KEY = "yamora.admin.sidebar.collapsed";

// Sidebar widths
const DESKTOP_EXPANDED = "w-60";   // 240px — desktop expanded
const DESKTOP_COLLAPSED = "w-16";  // 64px  — desktop collapsed / mobile always

export function AdminShell(props: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-[#F8FAFC]" />}>
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

  // Desktop: collapsible. Mobile: always icon-only (no toggle needed)
  const [collapsed, setCollapsed] = React.useState(false);
  const [unread, setUnread] = React.useState(0);
  const [newOrdersCount, setNewOrdersCount] = React.useState(0);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const searchRef = React.useRef<HTMLInputElement>(null);

  const isAdmin = isAdminSession(user);

  // Poll for pending orders count
  React.useEffect(() => {
    if (!isAdmin) return;
    const check = async () => {
      try {
        const env = await apiFetchEnvelope<unknown>(
          "/admin/orders?status=Pending,Pending Confirmation,Confirmed,Preparing&limit=1"
        );
        const meta = env.meta as { total?: number } | undefined;
        setNewOrdersCount(meta?.total ?? 0);
      } catch { /* ignore */ }
    };
    check();
    const t = setInterval(check, 5000);
    return () => clearInterval(t);
  }, [isAdmin]);

  // Restore desktop collapsed state from localStorage
  React.useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      localStorage.setItem(COLLAPSE_KEY, prev ? "0" : "1");
      return !prev;
    });
  };

  // Auth guard
  React.useEffect(() => {
    if (!hydrated) return;
    if (!isLoggedIn || !isAdmin) router.replace("/admin/login");
  }, [hydrated, isLoggedIn, isAdmin, router]);

  // Poll unread notifications
  React.useEffect(() => {
    if (!isAdmin) return;
    const load = async () => {
      try {
        const env = await apiFetchEnvelope<unknown>("/admin/notifications?limit=1");
        const meta = env.meta as { unread?: number } | undefined;
        setUnread(meta?.unread ?? 0);
      } catch { /* ignore */ }
    };
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [isAdmin]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close search overlay on navigation
  React.useEffect(() => {
    setSearchOpen(false);
  }, [pathname]);

  if (!hydrated || !isLoggedIn || !isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 animate-spin rounded-full border-4 border-[#E5E7EB] border-t-[#5B2C83]" />
          <p className="text-sm font-semibold text-[#6B7280]">Loading admin session…</p>
        </div>
      </div>
    );
  }

  const current = ALL_ITEMS.find((i) => matchNav(pathname ?? "", currentTab, i.href));

  /* ── Shared sidebar nav ─────────────────────────────────────────── */
  const SidebarNav = ({ iconOnly }: { iconOnly: boolean }) => (
    <nav className="flex h-full flex-col overflow-y-auto py-2">
      {NAV_GROUPS.map((group) => (
        <div key={group.heading}>
          {/* Section divider — only in expanded mode */}
          {!iconOnly && (
            <p className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              {group.heading}
            </p>
          )}
          {iconOnly && <div className="mx-auto my-0.5 h-px w-8 bg-gray-100" />}

          {group.items.map((item) => {
            const Icon = item.icon;
            const active = matchNav(pathname ?? "", currentTab, item.href);
            const isOrdersNav = item.href === "/admin/orders";
            const showBadge = isOrdersNav && newOrdersCount > 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                title={item.label}
                className={cn(
                  "relative flex items-center rounded-lg text-xs font-semibold",
                  TRANSITION,
                  iconOnly
                    ? "mx-1 my-0.5 justify-center p-2.5"
                    : "mx-2 my-0.5 gap-2.5 px-2.5 py-2",
                  active
                    ? "bg-[#5B2C83] text-white shadow-sm"
                    : "text-[#6B7280] hover:bg-gray-100 hover:text-[#111827]"
                )}
              >
                {/* Icon + badge */}
                <span className="relative shrink-0">
                  <Icon className="size-4" />
                  {showBadge && (
                    <span
                      className={cn(
                        "absolute flex min-w-[14px] items-center justify-center rounded-full bg-red-600 px-[3px] py-px text-[8px] font-black leading-none text-white ring-[1.5px] ring-white animate-pulse",
                        iconOnly ? "-right-2 -top-2" : "-right-1.5 -top-1.5"
                      )}
                    >
                      {newOrdersCount > 99 ? "99+" : newOrdersCount}
                    </span>
                  )}
                </span>

                {/* Label — hidden in icon-only mode */}
                {!iconOnly && <span className="truncate">{item.label}</span>}

                {/* Badge pill next to label in expanded mode */}
                {!iconOnly && showBadge && (
                  <span className="ml-auto shrink-0 rounded-full bg-red-600 px-1.5 py-px text-[9px] font-bold text-white">
                    {newOrdersCount > 99 ? "99+" : newOrdersCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}

      {/* Footer actions */}
      <div className="mt-auto pt-2 border-t border-gray-100">
        <Link
          href="/"
          target="_blank"
          title="View store"
          className={cn(
            "flex items-center rounded-lg text-xs font-semibold text-[#6B7280] hover:bg-gray-100 hover:text-[#111827]",
            TRANSITION,
            iconOnly ? "mx-1 my-0.5 justify-center p-2.5" : "mx-2 my-0.5 gap-2.5 px-2.5 py-2"
          )}
        >
          <Eye className="size-4 shrink-0" />
          {!iconOnly && "View Store"}
        </Link>

        <button
          onClick={async () => {
            await logout();
            router.push("/admin/login");
          }}
          title="Logout"
          className={cn(
            "flex w-full items-center rounded-lg text-xs font-semibold text-red-500 hover:bg-red-50 hover:text-red-700 cursor-pointer",
            TRANSITION,
            iconOnly ? "mx-1 my-0.5 justify-center p-2.5" : "mx-2 my-0.5 gap-2.5 px-2.5 py-2"
          )}
        >
          <LogOut className="size-4 shrink-0" />
          {!iconOnly && "Logout"}
        </button>
      </div>
    </nav>
  );

  /* ── Sidebar header (logo + label) ────────────────────────────── */
  const SidebarHeader = ({ iconOnly }: { iconOnly: boolean }) => (
    <div
      className={cn(
        "flex h-14 shrink-0 items-center border-b border-[#E5E7EB]",
        iconOnly ? "justify-center px-0" : "gap-2 px-3"
      )}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#5B2C83] text-xs font-black text-white">
        R
      </span>
      {!iconOnly && (
        <span className="truncate text-sm font-bold tracking-tight text-[#111827]">
          Ratalu Admin
        </span>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827]">

      {/* ── Mobile icon-only sidebar (always visible, 56px, lg:hidden) ── */}
      <aside className="fixed inset-y-0 left-0 z-30 flex w-14 flex-col border-r border-[#E5E7EB] bg-white lg:hidden">
        <SidebarHeader iconOnly />
        <SidebarNav iconOnly />
      </aside>

      {/* ── Desktop sidebar (collapsible, hidden on mobile) ─────────── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-[#E5E7EB] bg-white transition-all duration-300 lg:flex",
          collapsed ? DESKTOP_COLLAPSED : DESKTOP_EXPANDED
        )}
      >
        <SidebarHeader iconOnly={collapsed} />
        <SidebarNav iconOnly={collapsed} />
      </aside>

      {/* ── Mobile search overlay ───────────────────────────────────── */}
      {searchOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            onClick={() => setSearchOpen(false)}
          />
          <div className="absolute left-0 right-0 top-0 bg-white p-3 shadow-lg">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                <input
                  autoFocus
                  placeholder="Search orders, customers…"
                  onKeyDown={(e) => {
                    const q = (e.target as HTMLInputElement).value.trim();
                    if (e.key === "Enter" && q) {
                      router.push(`/admin/orders?search=${encodeURIComponent(q)}`);
                      setSearchOpen(false);
                    }
                  }}
                  className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] py-2.5 pl-9 pr-3 text-sm text-[#111827] placeholder:text-gray-400 focus:border-[#5B2C83] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5B2C83]/20"
                />
              </div>
              <button
                onClick={() => setSearchOpen(false)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div
        className={cn(
          "transition-all duration-300",
          // Mobile: offset by the 56px icon sidebar
          "pl-14",
          // Desktop: offset by expanded or collapsed sidebar
          collapsed ? "lg:pl-16" : "lg:pl-60"
        )}
      >

        {/* ── Topbar ──────────────────────────────────────────────── */}
        <header className="sticky top-0 z-20 border-b border-[#E5E7EB] bg-white/95 backdrop-blur">
          <div className="flex h-14 items-center gap-2 px-3 sm:px-4">

            {/* Desktop: collapse toggle (hidden on mobile — sidebar is always icon-only) */}
            <button
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden shrink-0 rounded-lg p-2 text-[#6B7280] hover:bg-gray-100 lg:block"
            >
              {collapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
            </button>

            {/* Desktop global search */}
            <div className="relative ml-1 hidden max-w-md flex-1 lg:block">
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

            {/* Mobile: page title */}
            <h1 className="min-w-0 flex-1 truncate text-sm font-bold text-[#111827] lg:hidden">
              {title}
            </h1>

            {/* Right side */}
            <div className="ml-auto flex shrink-0 items-center gap-1">
              {/* Mobile search icon */}
              <button
                onClick={() => setSearchOpen(true)}
                aria-label="Search"
                className="rounded-lg p-2 text-[#6B7280] hover:bg-gray-100 lg:hidden"
              >
                <Search className="size-5" />
              </button>

              {/* View shop (desktop only) */}
              <Link
                href="/"
                target="_blank"
                title="View shop"
                className="hidden rounded-lg p-2 text-[#6B7280] hover:bg-gray-100 hover:text-[#111827] lg:block"
              >
                <Eye className="size-4" />
              </Link>

              {/* Notifications */}
              <Link
                href="/admin/dashboard?tab=notifications"
                title="Notifications"
                className="relative rounded-lg p-2 text-[#6B7280] hover:bg-gray-100 hover:text-[#111827]"
              >
                <Bell className="size-5 lg:size-4" />
                {unread > 0 && (
                  <span className="absolute right-1 top-1 flex min-w-[14px] items-center justify-center rounded-full bg-[#EF4444] px-[3px] py-px text-[8px] font-bold leading-none text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>

              {/* Avatar & Topbar Logout */}
              <div className="ml-1 flex items-center gap-1.5 border-l border-gray-100 pl-2">
                <span className="grid size-7 place-items-center rounded-full bg-[#5B2C83] text-[10px] font-bold text-white">
                  {(user?.name || user?.username || "A")[0].toUpperCase()}
                </span>
                <div className="hidden leading-tight lg:block">
                  <p className="text-[11px] font-bold text-[#111827]">
                    {user?.name || user?.username || "Admin"}
                  </p>
                  <p className="text-[10px] capitalize text-[#6B7280]">{user?.role}</p>
                </div>
                <button
                  onClick={async () => {
                    await logout();
                    router.push("/admin/login");
                  }}
                  title="Logout"
                  className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 transition cursor-pointer"
                >
                  <LogOut className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* ── Page sub-header ──────────────────────────────────────── */}
        <div className="border-b border-[#E5E7EB] bg-white px-4 py-3 sm:px-6 sm:py-4">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[11px] text-[#6B7280]">
            <Link href="/admin/dashboard" className="transition-colors hover:text-[#5B2C83]">
              Admin
            </Link>
            {current && (
              <>
                <ChevronRight className="size-3" />
                <span className="font-semibold text-[#111827]">{current.label}</span>
              </>
            )}
          </nav>

          <div className="mt-1.5 flex flex-wrap items-start justify-between gap-3">
            {/* Desktop title */}
            <div className="hidden min-w-0 lg:block">
              <h1 className="text-lg font-bold tracking-tight text-[#111827] sm:text-xl">
                {title}
              </h1>
              {description && (
                <p className="mt-0.5 text-xs text-[#6B7280]">{description}</p>
              )}
            </div>
            {/* Mobile: description only (title is in topbar) */}
            {description && (
              <p className="text-xs text-[#6B7280] lg:hidden">{description}</p>
            )}
            {/* Actions */}
            {actions && (
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                {actions}
              </div>
            )}
          </div>
        </div>

        {/* ── Content ──────────────────────────────────────────────── */}
        <main className="px-3 py-4 sm:px-6 sm:py-6">{children}</main>
      </div>
    </div>
  );
}
