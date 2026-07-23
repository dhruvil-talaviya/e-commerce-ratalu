"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShoppingBag,
  Users,
  Truck,
  Plus,
  Edit2,
  Trash2,
  Settings,
  LogOut,
  ShieldCheck,
  CheckCircle,
  Eye,
  EyeOff,
  TrendingUp,
  Package,
  DollarSign,
  AlertTriangle,
  FolderTree,
  Tag,
  Gift,
  FileText,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  Printer,
  Download,
  Info,
  Calendar,
  Layers,
  ChevronDown,
  Menu,
  X,
  FileSpreadsheet,
  RefreshCw,
  SlidersHorizontal,
  Bell,
  MapPin,
  Upload,
  Globe,
  Lock,
  Copy,
  Check,
  CheckCheck,
  Percent,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useProducts } from "@/components/shop/product-provider";
import { useOrders, type AdminOrderQuery, type Order, type OrderFilterOptions, type OrderStatus } from "@/components/shop/order-provider";
import { useAccount, isAdminSession, type UserProfile } from "@/components/account/account-provider";
import { AdminShell } from "@/components/admin/console/admin-shell";
import { useStoreSettings, type StoreSettings } from "@/components/common/settings-provider";
import { toast } from "@/components/ui/toast";
import { formatINR, cn } from "@/lib/utils";
import type { Flavor, HeatLevel } from "@/lib/types";
import { apiFetch, apiFetchEnvelope, getTokens } from "@/lib/api";
import { useLiveRefresh } from "@/lib/hooks/use-live-refresh";
import type { ApiPagination } from "@/lib/api";
import { CustomersPanel } from "@/components/admin/customers-panel";
import { getPolicy } from "@/lib/data/policies";

type AdminTab =
  | "dashboard"
  | "products"
  | "categories"
  | "orders"
  | "customers"
  | "coupons"
  | "reports"
  | "homepage"
  | "audit-logs"
  | "notifications"
  | "logistics"
  | "gst";

const TABS: { key: AdminTab; label: string; desc?: string; icon: React.ElementType }[] = [
  { key: "dashboard", label: "Dashboard", icon: TrendingUp },
  { key: "products", label: "Products", icon: ShoppingBag },
  { key: "categories", label: "Categories & Combos", icon: FolderTree },
  { key: "orders", label: "Orders", icon: Truck },
  { key: "customers", label: "Customers", icon: Users },
  { key: "coupons", label: "Coupons", icon: Tag },
  { key: "reports", label: "Reports", icon: FileSpreadsheet },
  { key: "homepage", label: "Website Builder", icon: Globe },
  { key: "audit-logs", label: "Audit Logs", icon: Clock },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "logistics", label: "Logistics", icon: MapPin },
  { key: "gst", label: "Settings", icon: Percent },
];

export default function AdminDashboardPage() {
  // useSearchParams needs a Suspense boundary during prerender.
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-[#F8FAFC]" />}>
      <AdminDashboardView />
    </React.Suspense>
  );
}

function AdminDashboardView() {
  const { user, isLoggedIn, logout, hydrated } = useAccount();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAdmin = isAdminSession(user);
  const { settings, updateSettings } = useStoreSettings();
  const { flavors, addProduct, updateProduct, deleteProduct } = useProducts();
  const {
    orders,
    updateOrderStatus,
    cancelOrder,
    assignCourier,
    loadAdminOrders,
    refreshOrders,
    ordersLoading,
    ordersPagination,
    orderFilterOptions,
    ordersLastSyncedAt,
  } = useOrders();

  /**
   * The active module comes from the URL, so the unified sidebar can deep-link
   * into modules that haven't been split into their own routes yet — and so a
   * refresh or shared link lands where you expect.
   */
  const tabParam = searchParams.get("tab") as AdminTab | null;
  const activeTab: AdminTab = TABS.some((t) => t.key === tabParam)
    ? (tabParam as AdminTab)
    : "dashboard";
  const [customers, setCustomers] = React.useState<UserProfile[]>([]);

  // Pagination, search, sort states
  const [searchTerm, setSearchTerm] = React.useState("");
  const [sortField, setSortField] = React.useState("id");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  // Admin Notification states
  const [adminNotifications, setAdminNotifications] = React.useState<AdminNotification[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = React.useState(0);
  const [notificationsLoading, setNotificationsLoading] = React.useState(false);
  const [notificationsPagination, setNotificationsPagination] = React.useState<ApiPagination | null>(null);

  const fetchAdminNotifications = React.useCallback(async (query: Record<string, string | number> = {}) => {
    setNotificationsLoading(true);
    try {
      const qParams = new URLSearchParams();
      Object.entries(query).forEach(([key, val]) => {
        if (val !== undefined && val !== null && String(val) !== "") {
          qParams.set(key, String(val));
        }
      });
      const res = (await apiFetchEnvelope<any[]>(`/admin/notifications?${qParams.toString()}`)) as any;
      setAdminNotifications(res.data || []);
      setUnreadNotificationsCount(res.meta?.unread || 0);
      setNotificationsPagination(res.pagination || null);
    } catch (err: any) {
      if (err?.status !== 401 && err?.status !== 403) {
        console.error("Failed to load admin notifications:", err);
      }
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  const markAdminNotificationRead = async (id: string) => {
    try {
      await apiFetch(`/admin/notifications/${id}/read`, { method: "PATCH" });
      setAdminNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadNotificationsCount((c) => Math.max(c - 1, 0));
      toast.success("Notification marked as read");
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const markAllAdminNotificationsRead = async () => {
    try {
      await apiFetch("/admin/notifications/read-all", { method: "PATCH" });
      setAdminNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadNotificationsCount(0);
      toast.success("All notifications marked as read");
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  };

  const deleteAdminNotification = async (id: string) => {
    try {
      await apiFetch(`/admin/notifications/${id}`, { method: "DELETE" });
      setAdminNotifications((prev) => prev.filter((n) => n._id !== id));
      fetchAdminNotifications({ page: 1, limit: 10 });
      toast.success("Notification deleted");
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  React.useEffect(() => {
    if (isLoggedIn && isAdmin) {
      fetchAdminNotifications({ page: 1, limit: 10 });
    }
  }, [isLoggedIn, isAdmin, fetchAdminNotifications]);

  useLiveRefresh(() => {
    if (isLoggedIn && isAdmin) {
      fetchAdminNotifications({ page: 1, limit: 10 });
    }
  }, { minIntervalMs: 5000 });

  /**
   * Security route guard — keyed on the session's role, not a hardcoded phone
   * number. Anyone who isn't the admin is sent to /account, where the login
   * gate opens; signing in with the admin number returns them here.
   */

  React.useEffect(() => {
    // Don't bounce before the stored session has loaded.
    if (!hydrated) return;
    if (!isLoggedIn || !isAdmin) {
      router.replace("/account");
    }
  }, [hydrated, isLoggedIn, isAdmin, router]);

  // Reset pagination and search when changing tabs
  React.useEffect(() => {
    setCurrentPage(1);
    setSearchTerm("");
  }, [activeTab]);

  // Live customer count for the dashboard KPI (was localStorage/mock).
  const [customerCount, setCustomerCount] = React.useState(0);
  const refreshCustomerCount = React.useCallback(() => {
    apiFetch<{ total: number }>("/admin/customers/stats")
      .then((s) => setCustomerCount(s?.total ?? 0))
      .catch(() => setCustomerCount(0));
  }, []);

  React.useEffect(() => {
    refreshCustomerCount();
  }, [refreshCustomerCount]);

  React.useEffect(() => {
    if (activeTab === "dashboard") {
      refreshOrders();
      refreshCustomerCount();
    }
  }, [activeTab, refreshOrders, refreshCustomerCount]);

  useLiveRefresh(refreshCustomerCount, { minIntervalMs: 5000 });

  if (!hydrated || !isLoggedIn || !isAdmin) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center text-sm font-semibold text-gray-500">
          Loading Admin Session...
        </div>
      </div>
    );
  }

  // Count orders by status
  const orderCounts = orders.reduce(
    (acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const totalSales = orders
    .filter((o) => o.status !== "Cancelled")
    .reduce((sum, o) => sum + o.totals.total, 0);

  const lowStockFlavors = 0; // Fetched inside DashboardTab from reports API

  const activeNav = TABS.find((t) => t.key === activeTab);

  return (
    <AdminShell
      title={activeNav?.label ?? "Dashboard"}
      description={activeNav?.desc ?? "Live store operations, sourced from the database."}
    >
      <div>
            {activeTab === "dashboard" && (
              <DashboardTab
                orders={orders}
                totalSales={totalSales}
                orderCounts={orderCounts}
                customersCount={customerCount}
                lowStock={lowStockFlavors}
                refreshKey={ordersLastSyncedAt}
              />
            )}
            {activeTab === "products" && (
              <ProductsTab
                flavors={flavors}
                onAdd={addProduct}
                onEdit={updateProduct}
                onDelete={deleteProduct}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                rowsPerPage={rowsPerPage}
              />
            )}
            {activeTab === "categories" && <CategoriesTab />}
            {activeTab === "orders" && (
              <OrdersTab
                orders={orders}
                onUpdateStatus={updateOrderStatus}
                onCancelOrder={cancelOrder}
                onAssignCourier={assignCourier}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                rowsPerPage={rowsPerPage}
                setRowsPerPage={setRowsPerPage}
                onLoadOrders={loadAdminOrders}
                onRefreshOrders={refreshOrders}
                loading={ordersLoading}
                pagination={ordersPagination}
                filterOptions={orderFilterOptions}
                lastSyncedAt={ordersLastSyncedAt}
              />
            )}
            {activeTab === "customers" && <CustomersPanel />}
            {activeTab === "coupons" && <CouponsTab />}
            {activeTab === "reports" && <ReportsTab orders={orders} />}
            {activeTab === "homepage" && (
              <HomepageTab settings={settings} onUpdate={updateSettings} />
            )}
            {activeTab === "audit-logs" && <AuditLogsTab />}
            {activeTab === "notifications" && (
              <NotificationsTab
                notifications={adminNotifications}
                onMarkRead={markAdminNotificationRead}
                onMarkAllRead={markAllAdminNotificationsRead}
                onDelete={deleteAdminNotification}
                onLoad={fetchAdminNotifications}
                pagination={notificationsPagination}
                loading={notificationsLoading}
              />
            )}
            {activeTab === "logistics" && <LogisticsTab />}
            {activeTab === "gst" && <GstTab orders={orders} />}
      </div>
    </AdminShell>
  );
}

/* ================================================================== */
/* MODULE 1: DASHBOARD OVERVIEW & CHARTS                              */
/* ================================================================== */

// ── Date filter options ─────────────────────────────────────────────────────
const DATE_FILTERS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "last7days", label: "Last 7 Days" },
  { key: "last30days", label: "Last 30 Days" },
  { key: "thisMonth", label: "This Month" },
  { key: "lastMonth", label: "Last Month" },
  { key: "thisQuarter", label: "This Quarter" },
  { key: "thisYear", label: "This Year" },
  { key: "allTime", label: "All Time" },
] as const;

type DateFilterKey = (typeof DATE_FILTERS)[number]["key"];

// ── Types ───────────────────────────────────────────────────────────────────
interface DashboardKPIs {
  financial: { grossSales: number; refundAmount: number; netSales: number; deliveredRevenue: number; pendingRevenue: number; aov: number; totalDiscount: number; totalGst: number; totalShipping: number };
  orders: { total: number; pending: number; confirmed: number; preparing: number; packed: number; shipped: number; delivered: number; cancelled: number; customerCancelled: number; adminCancelled: number; customerCancelledAmount: number; adminCancelledAmount: number; highestOrder: number; lowestOrder: number; avgItemsPerOrder: number; avgProcessingHours: number };
  payments: { successful: number; pending: number; failed: number; refunded: number; cancelled: number; successRate: number; failureRate: number; refundRate: number };
  customers: { total: number; newToday: number; newInRange: number; active: number; inactive: number; returning: number; repeatRate: number; avgRevenuePerCustomer: number; lifetimeValue: number };
  products: { total: number; active: number; inactive: number; outOfStock: number; topSelling: { name: string; quantitySold: number; revenue: number }[]; leastSelling: { name: string; quantitySold: number; revenue: number }[] };
  inventory: { totalValue: number; availableStock: number; reservedStock: number; lowStock: number; outOfStock: number };
  business: { cancellationRate: number; fulfillmentRate: number; avgBasketSize: number };
  refunds: { submitted: number; underReview: number; approved: number; processing: number; completed: number; failed: number; rejected: number; avgRefundHours: number; totalRefunded: number; refundedCount: number };
}

interface ChartPoint { date: string; [key: string]: number | string }
interface StatusDist { status: string; count: number }

interface DashboardData {
  kpis: DashboardKPIs;
  charts: {
    revenueTrend: ChartPoint[];
    orderTrend: ChartPoint[];
    refundTrend: ChartPoint[];
    customerGrowth: ChartPoint[];
    hourlyOrders: { hour: number; orders: number; revenue: number }[];
    orderStatusDist: StatusDist[];
    paymentStatusDist: StatusDist[];
  };
}

// ── Small SVG Line Chart ────────────────────────────────────────────────────
function MiniLineChart({
  data,
  dataKey,
  color = "#7c3aed",
  height = 150,
  isCurrency = false,
}: {
  data: ChartPoint[];
  dataKey: string;
  color?: string;
  height?: number;
  isCurrency?: boolean;
}) {
  if (!data || !data.length) {
    return (
      <div className="flex items-center justify-center text-xs font-semibold text-gray-400" style={{ height }}>
        <span>No chart data</span>
      </div>
    );
  }

  const W = 500, PL = 55, PR = 20;
  const values = data.map((d) => (typeof d[dataKey] === "number" ? d[dataKey] : 0) as number);
  const max = Math.max(...values, 1);
  const minHeightPadding = 10;
  const innerHeight = height - minHeightPadding;

  const pts = data.map((d, i) => ({
    x: PL + (i / Math.max(data.length - 1, 1)) * W,
    y: innerHeight - (values[i] / max) * innerHeight + minHeightPadding / 2,
    val: values[i],
    ...d,
  }));

  const poly = pts.map((p) => `${p.x},${p.y}`).join(" ");

  const formatTick = (v: number) => {
    if (!isCurrency) return Math.round(v).toLocaleString("en-IN");
    if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
    if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
    if (v >= 1000) return `₹${(v / 1000).toFixed(1)}k`;
    return `₹${v.toLocaleString("en-IN")}`;
  };

  const step = Math.max(Math.ceil(data.length / 8), 1);

  return (
    <svg viewBox={`0 0 ${W + PL + PR} ${height + 35}`} preserveAspectRatio="xMidYMid meet" className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`ag-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {[0, 0.25, 0.5, 0.75, 1].map((f) => {
        const y = innerHeight * f + minHeightPadding / 2;
        const tickVal = Math.round(max * (1 - f));
        return (
          <g key={f}>
            <line x1={PL} y1={y} x2={W + PL} y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray={f === 1 ? undefined : "3 3"} />
            <text x={PL - 8} y={y + 3.5} textAnchor="end" fontSize="10" fontWeight="600" fill="#64748b">
              {formatTick(tickVal)}
            </text>
          </g>
        );
      })}

      {pts.length > 1 && (
        <polygon points={`${pts[0].x},${height} ${poly} ${pts[pts.length - 1].x},${height}`} fill={`url(#ag-${dataKey})`} />
      )}

      {pts.length > 1 && (
        <polyline points={poly} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      )}

      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={color} stroke="#ffffff" strokeWidth="2" />
      ))}

      {pts.map((p, i) => {
        if (i % step !== 0 && i !== pts.length - 1) return null;
        return (
          <text key={`l${i}`} x={p.x} y={height + 20} textAnchor="middle" fontSize="10" fontWeight="600" fill="#64748b">
            {String(p.date).slice(5)}
          </text>
        );
      })}
    </svg>
  );
}

// ── Hourly Orders Bar Chart ─────────────────────────────────────────────────
function HourlyOrdersBarChart({ data }: { data: { hour: number; orders: number; revenue: number }[] }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">No orders recorded today yet</p>;
  }

  const maxOrders = Math.max(...data.map((d) => d.orders), 1);

  return (
    <div className="flex flex-col gap-2 pt-2">
      <div className="flex items-end gap-1.5 h-36 border-b border-gray-100 pb-1 px-1">
        {data.map((h) => {
          const heightPercent = h.orders > 0 ? Math.max((h.orders / maxOrders) * 88, 12) : 4;
          return (
            <div key={h.hour} className="flex-1 flex flex-col items-center h-full justify-end group relative">
              <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] font-bold py-1 px-2 rounded shadow-lg pointer-events-none whitespace-nowrap z-30">
                {h.hour}:00 — {h.orders} order{h.orders === 1 ? "" : "s"} ({formatINR(h.revenue)})
              </div>

              {h.orders > 0 && (
                <span className="text-[9px] font-extrabold text-purple-700 mb-1">
                  {h.orders}
                </span>
              )}

              <div
                className={cn(
                  "w-full rounded-t-md transition-all duration-300",
                  h.orders > 0
                    ? "bg-[#5B2C83] group-hover:bg-purple-700 shadow-2xs"
                    : "bg-gray-100 group-hover:bg-gray-200"
                )}
                style={{ height: `${heightPercent}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 px-1 pt-1">
        <span>12 AM</span>
        <span>6 AM</span>
        <span>12 PM</span>
        <span>6 PM</span>
        <span>11 PM</span>
      </div>
    </div>
  );
}

// ── Small Donut Chart ───────────────────────────────────────────────────────
const DONUT_COLORS = ["#7c3aed", "#f59e0b", "#ef4444", "#10b981", "#3b82f6", "#ec4899", "#6366f1", "#14b8a6"];
function MiniDonut({ data, size = 110 }: { data: StatusDist[]; size?: number }) {
  if (!data.length) return <div className="flex items-center justify-center text-xs text-gray-400" style={{ width: size, height: size }}>No data</div>;
  const total = data.reduce((s, d) => s + d.count, 0);
  const r = size / 2 - 8, cx = size / 2, cy = size / 2;
  let cum = 0;
  const arcs = data.map((d, i) => {
    const start = cum; cum += d.count / total;
    const s = start * 2 * Math.PI - Math.PI / 2, e = cum * 2 * Math.PI - Math.PI / 2;
    const large = cum - start > 0.5 ? 1 : 0;
    const path = `M ${cx + r * Math.cos(s)} ${cy + r * Math.sin(s)} A ${r} ${r} 0 ${large} 1 ${cx + r * Math.cos(e)} ${cy + r * Math.sin(e)}`;
    return <path key={i} d={path} fill="none" stroke={DONUT_COLORS[i % DONUT_COLORS.length]} strokeWidth="14" strokeLinecap="round" />;
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {arcs}
      <text x={cx} y={cy} textAnchor="middle" dy="4" fontSize="14" fontWeight="800" fill="#374151">{total}</text>
    </svg>
  );
}

function DashboardTab({
  refreshKey,
}: {
  orders: Order[];
  totalSales: number;
  orderCounts: Record<string, number>;
  customersCount: number;
  lowStock: number;
  refreshKey: number;
}) {
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [dateFilter, setDateFilter] = React.useState<DateFilterKey>("allTime");
  const [filterOpen, setFilterOpen] = React.useState(false);

  const loadData = React.useCallback(async () => {
    try {
      const res = await apiFetch<DashboardData>(`/admin/reports?filter=${dateFilter}`);
      setData(res || null);
    } catch (err) {
      console.error("Dashboard reports fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  React.useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData, refreshKey]);

  // Background polling every 30 seconds for live real-time metrics
  React.useEffect(() => {
    const interval = setInterval(() => {
      loadData();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const k = data?.kpis;
  const charts = data?.charts;

  const filterLabel = DATE_FILTERS.find(f => f.key === dateFilter)?.label || "All Time";

  // ── KPI Card Helper ─────────────────────────────────────────────────────
  const KPI = ({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub?: string; icon: React.ElementType; color: string }) => (
    <div className="bg-white border border-gray-200/90 rounded-2xl p-4 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-200 min-h-[105px]">
      <div className="flex items-center justify-between gap-2">
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl border text-base font-semibold shadow-2xs", color)}>
          <Icon className="size-4.5" />
        </span>
        {sub && !loading && (
          <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-100/70 truncate max-w-[130px] shadow-2xs">
            {sub}
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-xl font-extrabold text-gray-900 mt-0.5 tracking-tight">
          {loading ? <span className="inline-block h-6 w-16 animate-pulse rounded bg-gray-100" /> : value}
        </p>
      </div>
    </div>
  );

  const SectionTitle = ({ title }: { title: string }) => (
    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 mt-6 flex items-center gap-2">
      <span className="inline-block w-1 h-4 rounded-full bg-purple-500" />
      {title}
    </h3>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header + Date Filter ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-gray-800">Enterprise Dashboard</h2>
          <p className="text-xs text-gray-400">Live financial analytics · {filterLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Filter Presets */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setDateFilter("today")}
              className={cn(
                "px-2.5 py-1 text-xs font-bold rounded-lg transition-colors",
                dateFilter === "today" ? "bg-white text-purple-700 shadow-sm" : "text-gray-600 hover:text-gray-900"
              )}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter("last7days")}
              className={cn(
                "px-2.5 py-1 text-xs font-bold rounded-lg transition-colors",
                dateFilter === "last7days" ? "bg-white text-purple-700 shadow-sm" : "text-gray-600 hover:text-gray-900"
              )}
            >
              7 Days
            </button>
            <button
              onClick={() => setDateFilter("allTime")}
              className={cn(
                "px-2.5 py-1 text-xs font-bold rounded-lg transition-colors",
                dateFilter === "allTime" ? "bg-white text-purple-700 shadow-sm" : "text-gray-600 hover:text-gray-900"
              )}
            >
              All Time
            </button>
          </div>

          <div className="relative">
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 shadow-sm hover:bg-gray-50 transition-colors"
            >
              <Calendar className="size-3.5 text-purple-500" />
              {filterLabel}
              <ChevronDown className="size-3" />
            </button>
            {filterOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-xl border border-gray-200 bg-white shadow-xl py-1">
                {DATE_FILTERS.map(f => (
                  <button
                    key={f.key}
                    onClick={() => { setDateFilter(f.key); setFilterOpen(false); }}
                    className={cn(
                      "block w-full text-left px-4 py-2 text-xs font-semibold hover:bg-purple-50 transition-colors",
                      dateFilter === f.key ? "text-purple-700 bg-purple-50" : "text-gray-600"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── FINANCIAL KPIs ──────────────────────────────────────────────── */}
      <SectionTitle title="Financial Overview" />
      <div className="space-y-4">
        {/* Upper Side: Primary Sales & Revenue */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KPI label="Gross Sales" value={formatINR(k?.financial.grossSales ?? 0)} icon={DollarSign} color="text-purple-600 bg-purple-50 border-purple-100" sub={`Discount: ${formatINR(k?.financial.totalDiscount ?? 0)}`} />
          <KPI label="Net Sales" value={formatINR(k?.financial.netSales ?? 0)} icon={TrendingUp} color="text-emerald-600 bg-emerald-50 border-emerald-100" sub={`GST: ${formatINR(k?.financial.totalGst ?? 0)}`} />
          <KPI label="Delivered Revenue" value={formatINR(k?.financial.deliveredRevenue ?? 0)} icon={CheckCircle} color="text-green-600 bg-green-50 border-green-100" />
        </div>
        {/* Below: Refunds, Pending & AOV */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KPI label="Refund Amount" value={formatINR(k?.financial.refundAmount ?? 0)} icon={AlertTriangle} color="text-red-600 bg-red-50 border-red-100" sub={`${k?.refunds.refundedCount ?? 0} refunds completed`} />
          <KPI label="Pending Revenue" value={formatINR(k?.financial.pendingRevenue ?? 0)} icon={Clock} color="text-yellow-600 bg-yellow-50 border-yellow-100" />
          <KPI label="Avg Order Value" value={formatINR(k?.financial.aov ?? 0)} icon={Package} color="text-blue-600 bg-blue-50 border-blue-100" />
        </div>
      </div>

      {/* ── ORDER KPIs ─────────────────────────────────────────────────── */}
      <SectionTitle title="Orders" />
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        <KPI label="Total Orders" value={String(k?.orders.total ?? 0)} icon={Package} color="text-gray-700 bg-gray-50 border-gray-200" />
        <KPI label="Pending" value={String(k?.orders.pending ?? 0)} icon={Clock} color="text-yellow-600 bg-yellow-50 border-yellow-100" />
        <KPI label="Confirmed" value={String(k?.orders.confirmed ?? 0)} icon={CheckCircle} color="text-blue-600 bg-blue-50 border-blue-100" />
        <KPI label="Preparing / Packed" value={String((k?.orders.preparing ?? 0) + (k?.orders.packed ?? 0))} icon={Package} color="text-orange-600 bg-orange-50 border-orange-100" />
        <KPI label="Shipped" value={String(k?.orders.shipped ?? 0)} icon={Truck} color="text-indigo-600 bg-indigo-50 border-indigo-100" />
        <KPI label="Delivered" value={String(k?.orders.delivered ?? 0)} icon={CheckCircle} color="text-emerald-600 bg-emerald-50 border-emerald-100" />
        <KPI label="Customer Cancelled" value={String(k?.orders.customerCancelled ?? 0)} icon={X} color="text-red-500 bg-red-50 border-red-100" sub={`₹${(k?.orders.customerCancelledAmount ?? 0).toLocaleString("en-IN")}`} />
        <KPI label="Admin Cancelled" value={String(k?.orders.adminCancelled ?? 0)} icon={X} color="text-red-600 bg-red-50 border-red-100" sub={`₹${(k?.orders.adminCancelledAmount ?? 0).toLocaleString("en-IN")}`} />
        <KPI label="Highest Order" value={formatINR(k?.orders.highestOrder ?? 0)} icon={TrendingUp} color="text-purple-600 bg-purple-50 border-purple-100" />
        <KPI label="Avg Items/Order" value={String(k?.orders.avgItemsPerOrder ?? 0)} icon={Layers} color="text-teal-600 bg-teal-50 border-teal-100" sub={`Avg processing: ${k?.orders.avgProcessingHours ?? 0}h`} />
      </div>

      {/* ── PAYMENT KPIs ───────────────────────────────────────────────── */}
      <SectionTitle title="Payments" />
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        <KPI label="Successful" value={String(k?.payments.successful ?? 0)} icon={CheckCircle} color="text-green-600 bg-green-50 border-green-100" sub={`Rate: ${k?.payments.successRate ?? 0}%`} />
        <KPI label="Pending" value={String(k?.payments.pending ?? 0)} icon={Clock} color="text-yellow-600 bg-yellow-50 border-yellow-100" />
        <KPI label="Failed" value={String(k?.payments.failed ?? 0)} icon={AlertTriangle} color="text-red-600 bg-red-50 border-red-100" sub={`Rate: ${k?.payments.failureRate ?? 0}%`} />
        <KPI label="Refunded" value={String(k?.payments.refunded ?? 0)} icon={FileText} color="text-blue-600 bg-blue-50 border-blue-100" sub={`Rate: ${k?.payments.refundRate ?? 0}%`} />
        <KPI label="Refund Avg Time" value={`${k?.refunds.avgRefundHours ?? 0}h`} icon={Clock} color="text-indigo-600 bg-indigo-50 border-indigo-100" />
      </div>

      {/* ── CUSTOMER KPIs ──────────────────────────────────────────────── */}
      <SectionTitle title="Customers" />
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        <KPI label="Total Customers" value={String(k?.customers.total ?? 0)} icon={Users} color="text-purple-600 bg-purple-50 border-purple-100" />
        <KPI label="New Today" value={String(k?.customers.newToday ?? 0)} icon={Plus} color="text-green-600 bg-green-50 border-green-100" />
        <KPI label="Returning" value={String(k?.customers.returning ?? 0)} icon={Users} color="text-blue-600 bg-blue-50 border-blue-100" sub={`Rate: ${k?.customers.repeatRate ?? 0}%`} />
        <KPI label="Active (30d)" value={String(k?.customers.active ?? 0)} icon={CheckCircle} color="text-emerald-600 bg-emerald-50 border-emerald-100" />
        <KPI label="Avg Revenue/Customer" value={formatINR(k?.customers.avgRevenuePerCustomer ?? 0)} icon={DollarSign} color="text-orange-600 bg-orange-50 border-orange-100" />
      </div>

      {/* ── INVENTORY + PRODUCTS KPIs ──────────────────────────────────── */}
      <SectionTitle title="Products & Inventory" />
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        <KPI label="Total Products" value={String(k?.products.total ?? 0)} icon={ShoppingBag} color="text-purple-600 bg-purple-50 border-purple-100" sub={`Active: ${k?.products.active ?? 0}`} />
        <KPI label="Out of Stock" value={String(k?.products.outOfStock ?? 0)} icon={AlertTriangle} color="text-red-600 bg-red-50 border-red-100" />
        <KPI label="Low Stock" value={String(k?.inventory.lowStock ?? 0)} icon={AlertTriangle} color="text-yellow-600 bg-yellow-50 border-yellow-100" />
        <KPI label="Inventory Value" value={formatINR(k?.inventory.totalValue ?? 0)} icon={DollarSign} color="text-emerald-600 bg-emerald-50 border-emerald-100" sub={`Available: ${k?.inventory.availableStock ?? 0} units`} />
        <KPI label="Reserved Stock" value={String(k?.inventory.reservedStock ?? 0)} icon={Lock} color="text-blue-600 bg-blue-50 border-blue-100" />
      </div>

      {/* ── BUSINESS KPIs ──────────────────────────────────────────────── */}
      <SectionTitle title="Business Metrics" />
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-2 md:grid-cols-4">
        <KPI label="Fulfillment Rate" value={`${k?.business.fulfillmentRate ?? 0}%`} icon={CheckCircle} color="text-green-600 bg-green-50 border-green-100" />
        <KPI label="Cancellation Rate" value={`${k?.business.cancellationRate ?? 0}%`} icon={X} color="text-red-600 bg-red-50 border-red-100" />
        <KPI label="Avg Basket Size" value={String(k?.business.avgBasketSize ?? 0)} icon={ShoppingBag} color="text-purple-600 bg-purple-50 border-purple-100" sub="items per order" />
        <KPI label="Refund Rate" value={`${k?.payments.refundRate ?? 0}%`} icon={FileText} color="text-orange-600 bg-orange-50 border-orange-100" />
      </div>

      {/* ── CHARTS ────────────────────────────────────────────────────── */}
      <SectionTitle title="Analytics Charts" />
      <div className="grid gap-5 md:grid-cols-2">
        {/* Revenue Trend */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Revenue Trend</h4>
          <MiniLineChart data={charts?.revenueTrend || []} dataKey="revenue" color="#7c3aed" isCurrency={true} />
        </div>

        {/* Order Trend */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Order Trend</h4>
          <MiniLineChart data={charts?.orderTrend || []} dataKey="orders" color="#f59e0b" isCurrency={false} />
        </div>

        {/* Refund Trend */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Refund Trend</h4>
          <MiniLineChart data={charts?.refundTrend || []} dataKey="amount" color="#ef4444" isCurrency={true} />
        </div>

        {/* Customer Growth */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Customer Growth</h4>
          <MiniLineChart data={charts?.customerGrowth || []} dataKey="newCustomers" color="#10b981" isCurrency={false} />
        </div>

        {/* Order Status Distribution */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Order Status Distribution</h4>
          <div className="flex items-center gap-6">
            <MiniDonut data={charts?.orderStatusDist || []} />
            <div className="flex flex-col gap-1.5 min-w-0 flex-1">
              {(charts?.orderStatusDist || []).slice(0, 6).map((d, i) => (
                <div key={d.status} className="flex items-center gap-2 text-[10px]">
                  <span className="size-2.5 rounded-full shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                  <span className="text-gray-600 truncate">{d.status}</span>
                  <span className="font-bold text-gray-800 ml-auto">{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Payment Status Distribution */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Payment Status Distribution</h4>
          <div className="flex items-center gap-6">
            <MiniDonut data={charts?.paymentStatusDist || []} />
            <div className="flex flex-col gap-1.5 min-w-0 flex-1">
              {(charts?.paymentStatusDist || []).map((d, i) => (
                <div key={d.status} className="flex items-center gap-2 text-[10px]">
                  <span className="size-2.5 rounded-full shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                  <span className="text-gray-600 truncate">{d.status}</span>
                  <span className="font-bold text-gray-800 ml-auto">{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── TOP PRODUCTS ─────────────────────────────────────────────── */}
      <div className="grid gap-5 md:grid-cols-2">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-4">Top Selling Products</h4>
            {loading ? (
              <div className="flex flex-col gap-3">{[1, 2, 3].map((i) => <div key={i} className="h-8 animate-pulse rounded bg-gray-50" />)}</div>
            ) : (
              (() => {
                const rawTop = k?.products.topSelling || [];
                const mergedMap = new Map<string, { name: string; revenue: number; quantitySold: number }>();
                rawTop.forEach((p) => {
                  const nameKey = (p.name || "Unknown Product").trim();
                  const existing = mergedMap.get(nameKey);
                  if (existing) {
                    existing.revenue += p.revenue || 0;
                    existing.quantitySold += p.quantitySold || 0;
                  } else {
                    mergedMap.set(nameKey, {
                      name: nameKey,
                      revenue: p.revenue || 0,
                      quantitySold: p.quantitySold || 0,
                    });
                  }
                });
                const topList = Array.from(mergedMap.values()).sort((a, b) => b.quantitySold - a.quantitySold);

                if (topList.length === 0) {
                  return <p className="text-sm text-gray-400 text-center py-6">No product sales recorded yet</p>;
                }

                return (
                  <div className="flex flex-col gap-2.5">
                    {topList.slice(0, 5).map((p, i) => (
                      <div key={p.name} className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-purple-50/40 transition-colors">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-purple-100 text-[11px] font-extrabold text-[#5B2C83]">
                            {i + 1}
                          </span>
                          <span className="truncate text-xs font-bold text-gray-800">{p.name}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-[#5B2C83]">{formatINR(p.revenue)}</p>
                          <p className="text-[10px] font-medium text-gray-400">{p.quantitySold} units sold</p>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()
            )}
          </div>
        </div>

        {/* Hourly Orders */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Today&apos;s Hourly Orders</h4>
            <HourlyOrdersBarChart data={charts?.hourlyOrders || []} />
          </div>
        </div>
      </div>
    </div>
  );
}


/* ================================================================== */
/* MODULE 2: PRODUCT MANAGEMENT                                       */
/* ================================================================== */

function ProductsTab({
  flavors,
  onAdd,
  onEdit,
  onDelete,
  searchTerm,
  setSearchTerm,
  currentPage,
  setCurrentPage,
  rowsPerPage,
}: {
  flavors: Flavor[];
  onAdd: (flavor: Omit<Flavor, "id" | "slug">) => void;
  onEdit: (id: string, updated: Omit<Flavor, "id" | "slug">) => void;
  onDelete: (id: string) => void;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  currentPage: number;
  setCurrentPage: (p: number) => void;
  rowsPerPage: number;
}) {
  const [showForm, setShowForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  
  const { settings, updateSettings } = useStoreSettings();
  const [globalLimit, setGlobalLimit] = React.useState(settings.maxOrderLimit);
  const [savingGlobalLimit, setSavingGlobalLimit] = React.useState(false);

  React.useEffect(() => {
    setGlobalLimit(settings.maxOrderLimit);
  }, [settings.maxOrderLimit]);

  const handleSaveGlobalLimit = async () => {
    setSavingGlobalLimit(true);
    try {
      await updateSettings({ maxOrderLimit: globalLimit });
      toast.success("Store-wide cart limit updated successfully!");
    } catch {
      toast.error("Failed to update store-wide cart limit.");
    } finally {
      setSavingGlobalLimit(false);
    }
  };

  const [form, setForm] = React.useState({
    name: "",
    tagline: "",
    description: "",
    heat: 1,
    badge: "None",
    bestSeller: false,
    ingredients: "Fresh Ratalu, Cold-pressed sunflower oil, spices",
    maxQtyPerCheckout: "",
    image: "",
    inStock: true,
  });

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = React.useState(false);

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.warning("File is too large. Max size is 10MB.");
      return;
    }

    setUploadingImage(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await apiFetchEnvelope<{ url: string }>("/media/upload", {
        method: "POST",
        body: formData,
      });

      if (res.success && res.data?.url) {
        setForm((prev) => ({ ...prev, image: res.data.url }));
        toast.success("Product image uploaded successfully!");
      } else {
        toast.error("Failed to upload product image.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  };

  const filtered = flavors.filter((f) =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / rowsPerPage) || 1;
  const paginated = filtered.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const handleEditClick = (f: Flavor) => {
    setForm({
      name: f.name,
      tagline: f.tagline,
      description: f.description,
      heat: f.heat,
      badge: f.badge || "None",
      bestSeller: !!f.bestSeller,
      ingredients: f.ingredients.join(", "),
      maxQtyPerCheckout: f.maxQtyPerCheckout !== undefined ? String(f.maxQtyPerCheckout) : "",
      image: f.image || "",
      inStock: f.inStock !== false,
    });
    setEditingId(f.id);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      tagline: form.tagline,
      description: form.description,
      heat: Number(form.heat) as HeatLevel,
      badge: form.badge === "None" ? undefined : form.badge,
      bestSeller: form.bestSeller,
      gradient: { from: "#7a3f9c", via: "#5b2c6f", to: "#3d1d4c" },
      accent: "#f4b400",
      ingredients: form.ingredients.split(",").map((x) => x.trim()),
      maxQtyPerCheckout: form.maxQtyPerCheckout !== "" ? Number(form.maxQtyPerCheckout) : null,
      image: form.image !== "" ? form.image : null,
      inStock: form.inStock,
    };

    // Awaited: this used to report success before the write had even returned,
    // so a rejected save still congratulated the admin.
    try {
      if (editingId) {
        await onEdit(editingId, payload);
        toast.success("Product Updated");
      } else {
        await onAdd(payload);
        toast.success("Product Added Successfully");
      }
    } catch (err) {
      toast.error("Could not save the product", {
        description: err instanceof Error ? err.message : undefined,
      });
      return;
    }

    setShowForm(false);
    setEditingId(null);
    setForm({
      name: "",
      tagline: "",
      description: "",
      heat: 1,
      badge: "None",
      bestSeller: false,
      ingredients: "Fresh Ratalu, Cold-pressed sunflower oil, spices",
      maxQtyPerCheckout: "",
      image: "",
      inStock: true,
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-end gap-4 border-b border-gray-100 pb-4">
        {!showForm && (
          <button
            onClick={() => {
              setEditingId(null);
              setShowForm(true);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-sm focus:outline-none"
          >
            <Plus className="size-4" /> Add Flavor Variant
          </button>
        )}
      </div>

      {showForm ? (
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Left Column: Form */}
          <form onSubmit={handleSave} className="lg:col-span-7 border border-gray-200 rounded-xl p-5 bg-gray-50 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-purple-700 uppercase tracking-wider">
              {editingId ? "Modify Product Details" : "Create New Flavour"}
            </h3>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500">Wafer Name</label>
                <Input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="bg-white"
                  placeholder="e.g. Spicy Masala"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500">Flavor Tagline</label>
                <Input
                  required
                  value={form.tagline}
                  onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                  className="bg-white"
                  placeholder="e.g. Thin-cut & fiery spices"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500">Description</label>
              <textarea
                required
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600/20"
                placeholder="Describe the crunch, seasoning profiles, and experience..."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500">Heat Intensity (0-3)</label>
                <Input
                  type="number"
                  min={0}
                  max={3}
                  value={form.heat}
                  onChange={(e) => setForm({ ...form, heat: Number(e.target.value) })}
                  className="bg-white"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500">Promo Badge</label>
                <select
                  value={form.badge}
                  onChange={(e) => setForm({ ...form, badge: e.target.value })}
                  className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm"
                >
                  <option value="None">None</option>
                  <option value="Signature">Signature</option>
                  <option value="New">New</option>
                  <option value="Hot">Hot 🔥</option>
                </select>
              </div>
              <div className="flex items-center gap-6 pt-6">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="bestSeller"
                    checked={form.bestSeller}
                    onChange={(e) => setForm({ ...form, bestSeller: e.target.checked })}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <label htmlFor="bestSeller" className="text-xs font-semibold text-gray-600 cursor-pointer select-none">
                    Featured Best Seller
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="inStock"
                    checked={form.inStock}
                    onChange={(e) => setForm({ ...form, inStock: e.target.checked })}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <label htmlFor="inStock" className="text-xs font-semibold text-gray-600 cursor-pointer select-none">
                    In Stock
                  </label>
                </div>
              </div>
            </div>

            {/* Custom Image Upload & URL input */}
            <div className="flex flex-col gap-1.5 border border-gray-200/60 rounded-xl p-4 bg-white/50">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Product Photography (Optional)</label>
              <div className="grid gap-4 sm:grid-cols-2 mt-1">
                {/* Upload Zone */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="relative border-2 border-dashed border-gray-200 hover:border-purple-400 rounded-xl p-4 bg-white flex flex-col items-center justify-center min-h-[140px] transition-all cursor-pointer group"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleUploadImage}
                    accept="image/*"
                    className="hidden"
                  />
                  {uploadingImage ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="size-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs text-gray-500 font-semibold">Uploading...</span>
                    </div>
                  ) : form.image ? (
                    <div className="relative w-full h-full min-h-[110px] flex items-center justify-center">
                      <img
                        src={form.image}
                        alt="Uploaded preview"
                        className="max-h-[110px] rounded-lg object-contain"
                      />
                      <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1.5">
                        <span className="text-[10px] font-bold text-white bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded-md shadow-sm">Change</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setForm((prev) => ({ ...prev, image: "" }));
                          }}
                          className="text-[10px] font-bold text-white bg-red-600 hover:bg-red-700 px-2 py-1 rounded-md shadow-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-center">
                      <Upload className="size-7 text-gray-400 group-hover:text-purple-600 transition-colors" />
                      <div>
                        <p className="text-xs font-bold text-purple-600">Upload product image</p>
                        <p className="text-[9px] text-gray-400 mt-0.5">Drag & drop or click (PNG, JPG, WebP)</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* URL input */}
                <div className="flex flex-col justify-center gap-2.5 border border-gray-150 rounded-xl p-4 bg-white">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase text-gray-400">Or Paste Image URL</label>
                    <Input
                      type="url"
                      value={form.image}
                      onChange={(e) => setForm({ ...form, image: e.target.value })}
                      placeholder="https://example.com/flavor-photo.png"
                      className="bg-gray-50/50 text-xs border-gray-200"
                    />
                  </div>
                  <p className="text-[9px] text-gray-400 leading-normal">
                    Enter any direct link to Cloudinary, Imgur, or your asset storage.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500">Per-Product Max Limit (Checkout)</label>
                <Input
                  type="number"
                  min={1}
                  value={form.maxQtyPerCheckout}
                  onChange={(e) => setForm({ ...form, maxQtyPerCheckout: e.target.value })}
                  className="bg-white font-numbers"
                  placeholder={`Overrides global limit (${globalLimit})`}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500">Ingredients (Comma Separated)</label>
                <Input
                  value={form.ingredients}
                  onChange={(e) => setForm({ ...form, ingredients: e.target.value })}
                  className="bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 mt-2 border-t border-gray-100 pt-4">
              <Button type="button" variant="ghost" onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}>
                Cancel
              </Button>
              <Button type="submit">Save Product</Button>
            </div>
          </form>

          {/* Right Column: Live Sticky Preview */}
          <div className="lg:col-span-5 lg:sticky lg:top-6 flex flex-col gap-4">
            <div className="bg-gradient-to-r from-purple-800 to-indigo-900 text-white rounded-2xl p-4.5 shadow-sm flex items-center justify-between">
              <div>
                <h4 className="text-[10px] uppercase font-extrabold tracking-wider text-purple-200">Interactive Preview</h4>
                <p className="text-[11px] text-purple-100/90 mt-0.5">Real-time mock of the storefront card</p>
              </div>
              <span className="text-[9px] bg-green-500/20 text-green-300 font-bold border border-green-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                Live
              </span>
            </div>

            {/* Product Card Container */}
            <div className="border border-gray-200/70 rounded-3xl overflow-hidden shadow-sm bg-white/80 backdrop-blur-sm">
              <div
                className="relative aspect-[4/3] w-full flex items-center justify-center p-6 bg-gray-50"
                style={{
                  background: `radial-gradient(130% 130% at 50% 10%, #7a3f9c22, transparent 62%)`,
                }}
              >
                <div className="h-full w-full flex items-center justify-center">
                  {form.image ? (
                    <img
                      src={form.image}
                      alt="Preview photo"
                      className="h-full w-auto object-contain max-h-full rounded-2xl drop-shadow-md transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center gap-1.5 opacity-60">
                      <div className="size-16 rounded-full bg-purple-100 flex items-center justify-center">
                        <ShoppingBag className="size-7 text-purple-600 animate-bounce" />
                      </div>
                      <span className="text-xs font-bold text-purple-700">Generative SVG Wafer Stack</span>
                      <span className="text-[9px] text-gray-400 max-w-[160px]">SVG layers will render automatically on storefront</span>
                    </div>
                  )}
                </div>

                {/* Badges */}
                <div className="absolute left-4 top-4 flex flex-col gap-1.5">
                  {form.bestSeller && (
                    <Badge variant="gold" size="sm">★ Best seller</Badge>
                  )}
                  {form.badge !== "None" && (
                    <Badge variant={form.badge === "Signature" ? "primary" : form.badge === "New" ? "gold" : "orange"} size="sm">
                      {form.badge}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Info Body */}
              <div className="p-5 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="truncate font-serif text-xl font-bold text-charcoal-muted">
                    {form.name || "Wafer Flavour Name"}
                  </h3>
                  <div className="flex items-center gap-0.5 mt-1.5 shrink-0">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <span
                        key={i}
                        className={cn(
                          "size-2.5 rounded-full border border-red-500/20",
                          i < form.heat ? "bg-red-500" : "bg-gray-200"
                        )}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-charcoal-soft font-semibold italic">{form.tagline || "Your premium crunch flavor tagline"}</p>
                <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                  {form.description || "The product description details go here. Type above to populate."}
                </p>

                <div className="h-px bg-gray-100 my-2" />

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-gray-400 font-bold uppercase">Enforced limits</span>
                    <span className="font-semibold text-purple-700 mt-0.5">
                      {form.maxQtyPerCheckout ? `Max ${form.maxQtyPerCheckout} packs` : `Global: max ${globalLimit} packs`}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md">
                    Storefront Card
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Store-wide Cart limits card */}
          <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm mb-1 flex flex-wrap items-center justify-between gap-4">
            <div className="max-w-md">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <ShoppingBag className="size-4.5 text-purple-600" /> Store-wide Cart Order Limits
              </h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Control the maximum total package count a user can purchase in a single checkout. 
                Individual product limits configured inside each wafer variant override this value.
              </p>
            </div>
            <div className="flex items-end gap-3 shrink-0">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase text-gray-400">Global Cart Max Items</label>
                <Input
                  type="number"
                  min={1}
                  value={globalLimit}
                  onChange={(e) => setGlobalLimit(Number(e.target.value))}
                  className="w-36 bg-gray-50/50 border-gray-200 text-sm font-semibold"
                />
              </div>
              <button
                onClick={handleSaveGlobalLimit}
                disabled={savingGlobalLimit}
                className="h-11 rounded-xl bg-purple-600 hover:bg-purple-700 px-5 text-xs font-bold text-white transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {savingGlobalLimit ? "Saving..." : "Update Limit"}
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input
              placeholder="Search flavours catalog..."
              className="pl-10 h-10 border-gray-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto border border-gray-100 rounded-xl shadow-sm">
            <table className="w-full min-w-[650px] text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 font-bold text-xs uppercase tracking-wider">
                  <th className="p-4">Variant</th>
                  <th className="p-4">Spice Level</th>
                  <th className="p-4">Highlight Badge</th>
                  <th className="p-4">Order Limit</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {paginated.map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {/* Tiny thumbnail preview in catalog table */}
                        <div className="size-10 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center border border-gray-100 shrink-0">
                          {f.image ? (
                            <img src={f.image} alt={f.name} className="size-full object-contain" />
                          ) : (
                            <div className="size-8 rounded-full bg-purple-50 flex items-center justify-center">
                              <ShoppingBag className="size-4 text-purple-600" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">{f.name}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{f.tagline}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant="soft">Spice: {f.heat}/3</Badge>
                    </td>
                    <td className="p-4">
                      {f.badge ? <Badge variant="primary">{f.badge}</Badge> : "—"}
                    </td>
                    <td className="p-4">
                      {f.maxQtyPerCheckout ? (
                        <Badge variant="soft" className="border-red-150 bg-red-50 text-red-700 font-numbers font-semibold">
                          Max {f.maxQtyPerCheckout} packs
                        </Badge>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Global Limit ({globalLimit})</span>
                      )}
                    </td>
                    <td className="p-4">
                      {f.inStock !== false ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700">
                          <span className="size-2 rounded-full bg-green-500" /> In Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 animate-pulse">
                          <span className="size-2 rounded-full bg-red-500" /> Out of Stock
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => handleEditClick(f)}
                          className="p-2 rounded-lg hover:bg-gray-100 text-purple-600 transition-colors"
                        >
                          <Edit2 className="size-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete flavor: ${f.name}?`)) {
                              onDelete(f.id);
                              toast.success("Flavour Deleted");
                            }
                          }}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          <div className="flex items-center justify-between border-t border-gray-100 pt-4 text-xs font-semibold text-gray-500">
            <span>Page {currentPage} of {totalPages}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="size-4" /> Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ================================================================== */
/* MODULE 3: CATEGORY GRID                                            */
/* ================================================================== */

function CategoriesTab() {
  const [categories, setCategories] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchCategories = React.useCallback(async () => {
    try {
      const data = await apiFetch("/categories");
      setCategories(data);
    } catch {
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-end border-b border-gray-100 pb-4">
        <button
          onClick={async () => {
            const name = prompt("Enter Category name:");
            if (name) {
              try {
                await apiFetch("/categories", {
                  method: "POST",
                  body: { name, status: "Active" }
                });
                toast.success("Category Created");
                fetchCategories();
              } catch {
                toast.error("Failed to create category");
              }
            }
          }}
          className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-sm focus:outline-none"
        >
          <Plus className="size-4" /> Create Category
        </button>
      </div>

      <div className="overflow-x-auto border border-gray-100 rounded-xl shadow-sm">
        <table className="w-full min-w-[600px] text-left border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 font-bold text-xs uppercase tracking-wider">
              <th className="p-4">Category Name</th>
              <th className="p-4">Linked Products</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {categories.map((c) => (
              <tr key={c._id || c.id} className="hover:bg-gray-50/50">
                <td className="p-4 font-bold text-gray-800">{c.name}</td>
                <td className="p-4 text-xs font-semibold text-gray-500">{c.count || 0} items</td>
                <td className="p-4">
                  <Badge variant={c.status === "Active" ? "primary" : "cream"}>{c.status}</Badge>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={async () => {
                      try {
                        await apiFetch(`/categories/${c._id || c.id}`, { method: "DELETE" });
                        toast.success("Category deleted");
                        fetchCategories();
                      } catch {
                        toast.error("Failed to delete category");
                      }
                    }}
                    className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================================================================== */
/* MODULE 4: LOGISTICS & ORDER WORKFLOW                               */
/* ================================================================== */

function OrdersTab({
  orders,
  onUpdateStatus,
  onCancelOrder,
  onAssignCourier,
  searchTerm,
  setSearchTerm,
  currentPage,
  setCurrentPage,
  rowsPerPage,
  setRowsPerPage,
  onLoadOrders,
  onRefreshOrders,
  loading,
  pagination,
  filterOptions,
  lastSyncedAt,
}: {
  orders: Order[];
  onUpdateStatus: (
    orderId: string,
    status: OrderStatus | null,
    details?: {
      note?: string;
      internalNotes?: string;
      customerNotes?: string;
      paymentStatus?: string;
    }
  ) => Promise<void>;
  onCancelOrder: (orderId: string) => Promise<void>;
  onAssignCourier: (orderId: string, details: { courierName: string; trackingNumber: string }) => Promise<void>;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  currentPage: number;
  setCurrentPage: (p: number) => void;
  rowsPerPage: number;
  setRowsPerPage: (p: number) => void;
  onLoadOrders: (query?: AdminOrderQuery) => Promise<void>;
  onRefreshOrders: () => Promise<void>;
  loading: boolean;
  pagination: ApiPagination | null;
  filterOptions: OrderFilterOptions;
  lastSyncedAt: number;
}) {
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);
  
  // Logistics Assignment Form
  const [courier, setCourier] = React.useState("");
  const [trackingId, setTrackingId] = React.useState("");

  // Reusable Table states
  const [visibleColumns, setVisibleColumns] = React.useState<string[]>([
    "id",
    "customer",
    "payment",
    "status",
    "review",
  ]);
  const [selectedOrderIds, setSelectedOrderIds] = React.useState<string[]>([]);
  const [colDropdownOpen, setColDropdownOpen] = React.useState(false);

  const paginated = orders || [];

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedOrderIds(paginated.map((o) => o.id));
    } else {
      setSelectedOrderIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkCancel = async () => {
    if (!confirm(`Cancel ${selectedOrderIds.length} orders?`)) return;
    try {
      await Promise.all(selectedOrderIds.map((id) => onCancelOrder(id)));
      toast.success(`Successfully cancelled ${selectedOrderIds.length} orders`);
      setSelectedOrderIds([]);
    } catch {
      toast.error("Failed to cancel some orders");
    }
  };

  const handleBulkStatusChange = async (status: OrderStatus) => {
    if (!confirm(`Update status of ${selectedOrderIds.length} orders to ${status}?`)) return;
    try {
      await Promise.all(selectedOrderIds.map((id) => onUpdateStatus(id, status)));
      toast.success(`Updated status of ${selectedOrderIds.length} orders`);
      setSelectedOrderIds([]);
    } catch {
      toast.error("Failed to update some orders");
    }
  };

  const handleBulkCsvExport = () => {
    const selected = orders.filter((o) => selectedOrderIds.includes(o.id));
    const headers = ["Order", "Customer", "Phone", "Items", "Quantity", "Amount", "Payment", "Status", "Partner", "Tracking", "Date"];
    const rows = selected.map((o) => [
      o.displayId || o.id,
      o.userName,
      o.userPhone,
      o.items.map((item) => `${item.flavorName} ${item.packLabel}`).join("; "),
      String(o.items.reduce((sum, item) => sum + item.quantity, 0)),
      String(o.totals.total),
      `${o.payment?.method || o.method} ${o.payment?.status || "Pending"}`,
      o.status,
      o.courierName || "",
      o.trackingNumber || "",
      new Date(o.createdAt).toISOString(),
    ]);
    const esc = (value: string) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map(esc).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bulk-orders-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Editable Internal Notes Form
  const [internalNotes, setInternalNotes] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState(searchTerm);
  const [statusFilter, setStatusFilter] = React.useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = React.useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = React.useState("");
  const [partnerFilter, setPartnerFilter] = React.useState("");
  const [cityFilter, setCityFilter] = React.useState("");
  const [stateFilter, setStateFilter] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [minAmount, setMinAmount] = React.useState("");
  const [maxAmount, setMaxAmount] = React.useState("");
  const [sortBy, setSortBy] = React.useState<AdminOrderQuery["sortBy"]>("createdAt");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");

  React.useEffect(() => {
    if (selectedOrder) {
      setInternalNotes(selectedOrder.internalNotes || "");
    }
  }, [selectedOrder]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setCurrentPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchTerm, setCurrentPage]);

  const query = React.useMemo<AdminOrderQuery>(() => ({
    search: debouncedSearch,
    status: statusFilter,
    paymentStatus: paymentStatusFilter,
    paymentMethod: paymentMethodFilter,
    partner: partnerFilter,
    city: cityFilter,
    state: stateFilter,
    dateFrom,
    dateTo,
    minAmount,
    maxAmount,
    sortBy,
    sortOrder,
    page: currentPage,
    limit: rowsPerPage,
  }), [
    debouncedSearch,
    statusFilter,
    paymentStatusFilter,
    paymentMethodFilter,
    partnerFilter,
    cityFilter,
    stateFilter,
    dateFrom,
    dateTo,
    minAmount,
    maxAmount,
    sortBy,
    sortOrder,
    currentPage,
    rowsPerPage,
  ]);

  React.useEffect(() => {
    onLoadOrders(query);
  }, [onLoadOrders, query]);

  React.useEffect(() => {
    if (!selectedOrder) return;
    const latest = orders.find((order) => order.id === selectedOrder.id);
    if (latest) setSelectedOrder(latest);
  }, [orders, selectedOrder]);

  const totalPages = pagination?.totalPages || pagination?.pages || 1;
  const totalRecords = pagination?.totalRecords ?? pagination?.total ?? orders.length;
  const lastSyncedText = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "Not synced";
  const hasFilters = Boolean(
    searchTerm ||
    statusFilter ||
    paymentStatusFilter ||
    paymentMethodFilter ||
    partnerFilter ||
    cityFilter ||
    stateFilter ||
    dateFrom ||
    dateTo ||
    minAmount ||
    maxAmount
  );

  const resetFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setStatusFilter("");
    setPaymentStatusFilter("");
    setPaymentMethodFilter("");
    setPartnerFilter("");
    setCityFilter("");
    setStateFilter("");
    setDateFrom("");
    setDateTo("");
    setMinAmount("");
    setMaxAmount("");
    setSortBy("createdAt");
    setSortOrder("desc");
    setCurrentPage(1);
  };

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    try {
      await onUpdateStatus(orderId, status);
      toast.success(`Order #${orderId} status updated to ${status}`);
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status });
      }
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleSaveInternalNotes = async () => {
    if (!selectedOrder) return;
    try {
      await onUpdateStatus(selectedOrder.id, null, { internalNotes });
      toast.success("Internal notes saved successfully");
      // Update local copy
      selectedOrder.internalNotes = internalNotes;
    } catch {
      toast.error("Failed to save internal notes");
    }
  };

  const handlePaymentStatusChange = async (paymentStatus: string) => {
    if (!selectedOrder) return;
    try {
      await onUpdateStatus(selectedOrder.id, null, { paymentStatus });
      toast.success(`Payment status updated to ${paymentStatus}`);
      setSelectedOrder({
        ...selectedOrder,
        payment: {
          ...(selectedOrder.payment || { method: "COD", status: "Pending" }),
          status: paymentStatus
        }
      });
    } catch {
      toast.error("Failed to update payment status");
    }
  };

  const handleCancelClick = async (orderId: string) => {
    try {
      await onCancelOrder(orderId);
      toast.success(`Order #${orderId} cancelled`);
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: "Cancelled" });
      }
    } catch {
      toast.error("Failed to cancel order");
    }
  };

  const handleAssignLogistics = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      await onAssignCourier(selectedOrder.id, { courierName: courier, trackingNumber: trackingId });
      toast.success("Courier Assigned", {
        description: `Courier ${courier} with tracking ID ${trackingId} assigned successfully.`,
      });
      setSelectedOrder({
        ...selectedOrder,
        courierName: courier,
        trackingNumber: trackingId,
        // Matches the server: dispatch hands the parcel to logistics.
        status: "Assigned to Logistics"
      });
      setCourier("");
      setTrackingId("");
    } catch {
      toast.error("Failed to assign courier partner.");
    }
  };

  const downloadInvoice = async (order: Order) => {
    try {
      const tokens = getTokens();
      const headers: Record<string, string> = {};
      if (tokens?.accessToken) headers.Authorization = `Bearer ${tokens.accessToken}`;
      const res = await fetch(`/api/v1/admin/orders/${order.id}/invoice`, { headers, cache: "no-store" });
      if (!res.ok) throw new Error("Invoice download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${order.displayId || order.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Invoice downloaded");
    } catch {
      toast.error("Failed to download invoice");
    }
  };

  const exportCurrentPageCsv = () => {
    const headers = ["Order", "Customer", "Phone", "Items", "Quantity", "Amount", "Payment", "Status", "Partner", "Tracking", "Date"];
    const rows = orders.map((o) => [
      o.displayId || o.id,
      o.userName,
      o.userPhone,
      o.items.map((item) => `${item.flavorName} ${item.packLabel}`).join("; "),
      String(o.items.reduce((sum, item) => sum + item.quantity, 0)),
      String(o.totals.total),
      `${o.payment?.method || o.method} ${o.payment?.status || "Pending"}`,
      o.status,
      o.courierName || "",
      o.trackingNumber || "",
      new Date(o.createdAt).toISOString(),
    ]);
    const esc = (value: string) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map(esc).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-page-${currentPage}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusOptions = filterOptions.statuses.length
    ? filterOptions.statuses
    : ["Pending", "Confirmed", "Packed", "Ready for Dispatch", "In Transit", "Out for Delivery", "Delivered", "Cancelled", "Refund Requested", "Refund Approved", "Refund Completed", "Returned", "Return Requested", "Return Approved"];
  const paymentStatusOptions = filterOptions.paymentStatuses.length
    ? filterOptions.paymentStatuses
    : ["Pending", "Paid", "Failed", "Refunded"];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-end gap-3 border-b border-gray-100 pb-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              const todayStr = new Date().toISOString().split("T")[0];
              if (dateFrom === todayStr && dateTo === todayStr) {
                setDateFrom("");
                setDateTo("");
              } else {
                setDateFrom(todayStr);
                setDateTo(todayStr);
              }
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors",
              dateFrom === new Date().toISOString().split("T")[0]
                ? "bg-purple-100 border-purple-300 text-purple-800 shadow-sm"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            )}
          >
            <Calendar className="size-3.5 text-purple-600" />
            Today's Orders
          </button>
          <button
            type="button"
            onClick={() => onRefreshOrders()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            Synced {lastSyncedText}
          </button>
          <button
            type="button"
            onClick={exportCurrentPageCsv}
            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-purple-700"
          >
            <Download className="size-3.5" /> Export Page
          </button>

          {/* Column Visibility Toggler */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setColDropdownOpen(!colDropdownOpen)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50 focus:outline-none h-8"
            >
              <SlidersHorizontal className="size-3.5" /> Columns
            </button>
            {colDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl border border-gray-200 bg-white p-3 shadow-lg z-50 flex flex-col gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Toggle Columns</span>
                {[
                  { key: "id", label: "Order Details" },
                  { key: "customer", label: "Customer" },
                  { key: "payment", label: "Payment Details" },
                  { key: "status", label: "Workflow Status" },
                  { key: "review", label: "Inspect Action" },
                ].map((col) => (
                  <label key={col.key} className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={visibleColumns.includes(col.key)}
                      onChange={() => {
                        setVisibleColumns((prev) =>
                          prev.includes(col.key)
                            ? prev.filter((k) => k !== col.key)
                            : [...prev, col.key]
                        );
                      }}
                      className="rounded text-purple-600 focus:ring-purple-650"
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
            <SlidersHorizontal className="size-4" /> Filters
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-bold text-purple-600 hover:text-purple-700"
            >
              Clear all
            </button>
          )}
        </div>

        <div className="grid gap-3 xl:grid-cols-12">
          <div className="relative xl:col-span-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input
              placeholder="Order, customer, phone, tracking, city..."
              className="h-10 border-gray-200 bg-white pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }} className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-600 outline-none xl:col-span-2">
            <option value="">All statuses</option>
            {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select value={paymentStatusFilter} onChange={(e) => { setPaymentStatusFilter(e.target.value); setCurrentPage(1); }} className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-600 outline-none xl:col-span-2">
            <option value="">All payments</option>
            {paymentStatusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select value={paymentMethodFilter} onChange={(e) => { setPaymentMethodFilter(e.target.value); setCurrentPage(1); }} className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-600 outline-none xl:col-span-2">
            <option value="">All methods</option>
            {filterOptions.paymentMethods.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>

          <select value={partnerFilter} onChange={(e) => { setPartnerFilter(e.target.value); setCurrentPage(1); }} className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-600 outline-none xl:col-span-2">
            <option value="">All partners</option>
            {filterOptions.partners.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>

          <select value={cityFilter} onChange={(e) => { setCityFilter(e.target.value); setCurrentPage(1); }} className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-600 outline-none xl:col-span-2">
            <option value="">All cities</option>
            {filterOptions.cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={stateFilter} onChange={(e) => { setStateFilter(e.target.value); setCurrentPage(1); }} className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-600 outline-none xl:col-span-2">
            <option value="">All states</option>
            {filterOptions.states.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }} className="h-10 border-gray-200 bg-white xl:col-span-2" />
          <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }} className="h-10 border-gray-200 bg-white xl:col-span-2" />
          <Input type="number" min={0} placeholder="Min ₹" value={minAmount} onChange={(e) => { setMinAmount(e.target.value); setCurrentPage(1); }} className="h-10 border-gray-200 bg-white xl:col-span-2" />
          <Input type="number" min={0} placeholder="Max ₹" value={maxAmount} onChange={(e) => { setMaxAmount(e.target.value); setCurrentPage(1); }} className="h-10 border-gray-200 bg-white xl:col-span-2" />

          <select value={sortBy} onChange={(e) => { setSortBy(e.target.value as AdminOrderQuery["sortBy"]); setCurrentPage(1); }} className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-600 outline-none xl:col-span-2">
            <option value="createdAt">Date</option>
            <option value="orderNumber">Order #</option>
            <option value="total">Amount</option>
            <option value="status">Status</option>
            <option value="userName">Customer</option>
          </select>

          <select value={sortOrder} onChange={(e) => { setSortOrder(e.target.value as "asc" | "desc"); setCurrentPage(1); }} className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-600 outline-none xl:col-span-2">
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>

          <select value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-600 outline-none xl:col-span-2">
            {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
          </select>
        </div>
      </div>

      {/* Bulk Actions Panel */}
      {selectedOrderIds.length > 0 && (
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-sm animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-purple-950">
              Selected {selectedOrderIds.length} orders
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleBulkStatusChange(e.target.value as OrderStatus);
                  e.target.value = "";
                }
              }}
              className="rounded-xl border border-purple-200 bg-white px-3 py-1.5 text-xs font-bold text-purple-800 outline-none cursor-pointer"
            >
              <option value="">Update Status...</option>
              <option value="Confirmed">Mark Confirmed</option>
              <option value="Packed">Mark Packed</option>
              <option value="Ready for Dispatch">Ready for Dispatch</option>
              <option value="In Transit">In Transit</option>
              <option value="Delivered">Mark Delivered</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkCsvExport}
              className="text-xs font-bold border-purple-200 text-purple-800 hover:bg-purple-100"
            >
              Export CSV
            </Button>
            <button
              onClick={handleBulkCancel}
              className="text-xs font-bold text-red-600 hover:text-red-700 bg-white border border-red-100 hover:bg-red-50 rounded-xl px-3 py-1.5 transition-colors focus:outline-none"
            >
              Cancel Orders
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1.1fr]">
        {/* Orders Queue Table */}
        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto border border-gray-100 rounded-xl shadow-sm bg-white">
            <table className="w-full min-w-[700px] text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 font-bold text-xs uppercase tracking-wider">
                  <th className="p-4 w-10">
                    <input
                      type="checkbox"
                      checked={paginated.length > 0 && selectedOrderIds.length === paginated.length}
                      onChange={handleSelectAll}
                      className="rounded text-purple-600 focus:ring-purple-650"
                    />
                  </th>
                  {visibleColumns.includes("id") && <th className="p-4">Order Details</th>}
                  {visibleColumns.includes("customer") && <th className="p-4">Customer</th>}
                  {visibleColumns.includes("payment") && <th className="p-4">Payment</th>}
                  {visibleColumns.includes("status") && <th className="p-4">Status</th>}
                  {visibleColumns.includes("review") && <th className="p-4 text-right">Review</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {paginated.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50/50">
                    <td className="p-4 w-10">
                      <input
                        type="checkbox"
                        checked={selectedOrderIds.includes(o.id)}
                        onChange={() => handleSelectOne(o.id)}
                        className="rounded text-purple-600 focus:ring-purple-650"
                      />
                    </td>
                    {visibleColumns.includes("id") && (
                      <td className="p-4">
                        <p className="font-bold text-gray-800">#{o.id}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{o.items.length} items · {formatINR(o.totals.total)}</p>
                      </td>
                    )}
                    {visibleColumns.includes("customer") && (
                      <td className="p-4">
                        <p className="font-semibold text-gray-700">{o.userName}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{o.userPhone}</p>
                      </td>
                    )}
                    {visibleColumns.includes("payment") && (
                      <td className="p-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-semibold text-gray-600 uppercase">{o.payment?.method || o.method}</span>
                          <span className={cn(
                            "text-[9px] font-bold px-1 rounded w-fit",
                            o.payment?.status === "Paid" ? "bg-green-50 text-green-700" :
                            o.payment?.status === "Refunded" ? "bg-blue-50 text-blue-700" : "bg-yellow-50 text-yellow-750"
                          )}>
                            {o.payment?.status || "Pending"}
                          </span>
                        </div>
                      </td>
                    )}
                    {visibleColumns.includes("status") && (
                      <td className="p-4">
                        <Badge variant="soft">{o.status}</Badge>
                      </td>
                    )}
                    {visibleColumns.includes("review") && (
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="text-xs font-bold text-purple-600 hover:text-purple-700 transition-colors focus:outline-none"
                        >
                          Inspect
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>Page {currentPage} of {totalPages}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>

        {/* Detailed Inspector & Workflow Panel */}
        <div className="bg-gray-50 rounded-xl border border-gray-250 p-4 sm:p-5 flex flex-col gap-4 shadow-inner">
          {selectedOrder ? (
            <>
              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <h3 className="text-sm font-bold text-gray-900">Inspect Order #{selectedOrder.id}</h3>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-xs font-semibold text-gray-400 hover:text-gray-600"
                >
                  Clear Selection
                </button>
              </div>

              {/* Customer Notes */}
              {selectedOrder.customerNotes && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-orange-800 uppercase">Customer Placement Note</p>
                  <p className="text-xs text-orange-950 mt-1 italic">&ldquo;{selectedOrder.customerNotes}&rdquo;</p>
                </div>
              )}

              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Customer Details</p>
                <p className="text-sm font-bold text-gray-800 mt-1">{selectedOrder.userName} ({selectedOrder.userPhone})</p>
                <p className="text-xs text-gray-500 mt-0.5">{selectedOrder.address.addressLine}, {selectedOrder.address.city} - {selectedOrder.address.pincode}</p>
              </div>

              {/* Status Update Form */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Update Status Workflow</label>
                <select
                  value={selectedOrder.status}
                  onChange={(e) => handleStatusChange(selectedOrder.id, e.target.value as OrderStatus)}
                  className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-xs"
                >
                  <option value="Pending">Pending</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Packed">Packed</option>
                  <option value="Ready for Dispatch">Ready for Dispatch</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Out for Delivery">Out for Delivery</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Refund Requested">Refund Requested</option>
                  <option value="Refund Completed">Refund Completed</option>
                  <option value="Return Requested">Return Requested</option>
                  <option value="Return Approved">Return Approved</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              {/* Refund / Payment Status Select */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Update Payment & Refund Status</label>
                <select
                  value={selectedOrder.payment?.status || "Pending"}
                  onChange={(e) => handlePaymentStatusChange(e.target.value)}
                  className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-xs"
                >
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                  <option value="Failed">Failed</option>
                  <option value="Refunded">Refunded</option>
                </select>
              </div>

              {/* Internal Notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Internal Notes (Staff Only)</label>
                <textarea
                  rows={2}
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-gray-200 bg-white focus:outline-purple-500"
                  placeholder="Add administrative notes about this order..."
                />
                <Button size="sm" variant="outline" onClick={handleSaveInternalNotes} className="w-fit self-end">
                  Save Notes
                </Button>
              </div>

              {/* Logistics Assignment Form */}
              <form onSubmit={handleAssignLogistics} className="border-t border-gray-200 pt-3.5 flex flex-col gap-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Assign Logistics Partner</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase">Courier Partner</label>
                    <Input
                      placeholder="e.g. Delhivery"
                      value={courier}
                      onChange={(e) => setCourier(e.target.value)}
                      className="bg-white h-9 text-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase">Tracking ID</label>
                    <Input
                      placeholder="e.g. DL18392"
                      value={trackingId}
                      onChange={(e) => setTrackingId(e.target.value)}
                      className="bg-white h-9 text-xs"
                    />
                  </div>
                </div>
                <Button type="submit" size="sm" className="w-full">Assign Partner & Track</Button>
              </form>

              {/* Timeline display */}
              {selectedOrder.timeline && selectedOrder.timeline.length > 0 && (
                <div className="flex flex-col gap-2 border-t border-gray-200 pt-3.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Order Timeline</p>
                  <div className="flex flex-col gap-2.5 mt-1 max-h-32 overflow-y-auto pr-1">
                    {selectedOrder.timeline.map((t, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-left">
                        <div className="size-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between items-baseline gap-2">
                            <span className="text-[11px] font-bold text-gray-800">{t.status}</span>
                            <span className="text-[9px] text-gray-400">{new Date(t.time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                          </div>
                          {t.note && <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">{t.note}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cancel Option (Admin can cancel any time BEFORE Delivered) */}
              {selectedOrder.status !== "Delivered" && selectedOrder.status !== "Cancelled" && (
                <button
                  onClick={() => handleCancelClick(selectedOrder.id)}
                  className="w-full text-center text-xs font-bold text-red-650 hover:text-red-750 bg-red-50 hover:bg-red-100/70 rounded-lg py-2 transition-colors border border-red-200 mt-2"
                >
                  Cancel Order (Force Administrative Cancel)
                </button>
              )}
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-20 text-center">
              <Truck className="size-8 text-gray-300" />
              <p className="text-xs font-bold text-gray-400 mt-3">Select an order from the queue to process workflow</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
/* ================================================================== */
/* MODULE 5: CUSTOMER MANAGEMENT                                      */
/* ================================================================== */

function CustomersTab({
  customers,
  setCustomers,
  orders,
  searchTerm,
  setSearchTerm,
  currentPage,
  setCurrentPage,
  rowsPerPage,
}: {
  customers: UserProfile[];
  setCustomers: React.Dispatch<React.SetStateAction<UserProfile[]>>;
  orders: Order[];
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  currentPage: number;
  setCurrentPage: (p: number) => void;
  rowsPerPage: number;
}) {
  const [selectedCust, setSelectedCust] = React.useState<UserProfile | null>(null);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
  );

  const totalPages = Math.ceil(filtered.length / rowsPerPage) || 1;
  const paginated = filtered.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const getCustTotals = React.useCallback((phone: string) => {
    const custOrders = orders.filter((o) => o.userPhone === phone);
    const completedOrders = custOrders.filter((o) => o.status !== "Cancelled");
    const count = completedOrders.length;
    const spent = completedOrders.reduce((sum, o) => sum + o.totals.total, 0);

    const lastOrderDate = custOrders.length > 0
      ? new Date(Math.max(...custOrders.map(o => new Date(o.createdAt).getTime()))).toLocaleDateString("en-IN")
      : "No orders";

    return { count, spent, lastOrderDate, allOrders: custOrders };
  }, [orders]);

  const handleStatusToggle = (phone: string, currentStatus?: "Active" | "Blocked") => {
    const nextStatus: "Active" | "Blocked" = currentStatus === "Blocked" ? "Active" : "Blocked";
    
    // Update state & localStorage
    setCustomers((prev) => {
      const copy = prev.map((c) => {
        if (c.phone === phone) {
          const updated = { ...c, status: nextStatus };
          if (selectedCust && selectedCust.phone === phone) {
            setSelectedCust(updated);
          }
          return updated;
        }
        return c;
      });
      localStorage.setItem("ratalu.accounts", JSON.stringify(copy));
      return copy;
    });

    toast.success(`Customer status updated to ${nextStatus}`);
  };

  return (
    <div className="flex flex-col gap-5">

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
        <Input
          placeholder="Search customers by name or phone..."
          className="pl-10 h-10 border-gray-200"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Customer list table */}
        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto border border-gray-100 rounded-xl shadow-sm">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 font-bold text-xs uppercase tracking-wider">
                  <th className="p-4">Customer</th>
                  <th className="p-4">Total Orders</th>
                  <th className="p-4">Lifetime Spent</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {paginated.map((c) => {
                  const { count, spent } = getCustTotals(c.phone);
                  const isBlocked = c.status === "Blocked";
                  return (
                    <tr key={c.phone} className="hover:bg-gray-50/50">
                      <td className="p-4">
                        <p className="font-bold text-gray-800">{c.name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">+91 {c.phone}</p>
                      </td>
                      <td className="p-4 font-semibold text-gray-650">{count} orders</td>
                      <td className="p-4 font-bold text-purple-650">{formatINR(spent)}</td>
                      <td className="p-4">
                        <Badge variant={isBlocked ? "red" : "soft"}>
                          {c.status || "Active"}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedCust(c)}
                          className="text-xs font-bold text-purple-600 hover:text-purple-700 transition-colors focus:outline-none"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>Page {currentPage} of {totalPages}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>

        {/* Detailed customer panel */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 flex flex-col gap-4">
          {selectedCust ? (
            (() => {
              const { count, spent, lastOrderDate, allOrders } = getCustTotals(selectedCust.phone);
              const isBlocked = selectedCust.status === "Blocked";
              return (
                <>
                  <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                    <h3 className="text-sm font-bold text-gray-900">Customer Profile</h3>
                    <button
                      onClick={() => setSelectedCust(null)}
                      className="text-xs font-semibold text-gray-400 hover:text-gray-600"
                    >
                      Close
                    </button>
                  </div>

                  {/* Profile Header & Blocking CTA */}
                  <div className="flex items-start justify-between gap-3 bg-white p-3.5 border border-gray-150 rounded-xl shadow-sm">
                    <div>
                      <p className="text-base font-bold text-gray-800">{selectedCust.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Mobile: +91 {selectedCust.phone}</p>
                      <div className="mt-1">
                        <Badge variant={isBlocked ? "red" : "soft"}>
                          Account: {selectedCust.status || "Active"}
                        </Badge>
                      </div>
                    </div>
                    <button
                      onClick={() => handleStatusToggle(selectedCust.phone, selectedCust.status)}
                      className={cn(
                        "text-[10px] font-bold rounded-lg px-2.5 py-1.5 transition-colors border",
                        isBlocked
                          ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                          : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                      )}
                    >
                      {isBlocked ? "Activate Profile" : "Block Customer"}
                    </button>
                  </div>

                  {/* Operational Metrics */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-xs">
                      <p className="text-[9px] font-bold text-gray-405 uppercase">Lifetime Spent</p>
                      <p className="text-sm font-extrabold text-purple-700 mt-0.5">{formatINR(spent)}</p>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-xs">
                      <p className="text-[9px] font-bold text-gray-405 uppercase">Total Orders</p>
                      <p className="text-sm font-extrabold text-gray-800 mt-0.5">{count} orders</p>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-xs col-span-2">
                      <p className="text-[9px] font-bold text-gray-405 uppercase">Last Order Date</p>
                      <p className="text-xs font-bold text-gray-700 mt-0.5">{lastOrderDate}</p>
                    </div>
                  </div>

                  {/* Saved Delivery Addresses */}
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Saved Delivery Addresses</p>
                    <div className="flex flex-col gap-2 max-h-[120px] overflow-y-auto pr-1">
                      {selectedCust.addresses.length ? (
                        selectedCust.addresses.map((a) => (
                          <div key={a.id} className="text-xs border border-gray-150 rounded-lg p-2.5 bg-white shadow-xs">
                            <span className="font-bold text-purple-600 text-[9px] uppercase">{a.tag}</span>
                            <p className="text-gray-650 mt-0.5 leading-normal">{a.addressLine}, {a.city} - {a.pincode}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-450 italic">No saved delivery addresses.</p>
                      )}
                    </div>
                  </div>

                  {/* Complete Order History logs */}
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Complete Order History</p>
                    {allOrders.length ? (
                      <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
                        {allOrders.map((o) => (
                          <div key={o.id} className="text-xs border border-gray-150 rounded-lg p-2 bg-white flex justify-between items-center shadow-xs">
                            <div>
                              <p className="font-bold text-gray-800">#{o.id}</p>
                              <p className="text-[9px] text-gray-450 font-semibold">{new Date(o.createdAt).toLocaleDateString("en-IN")} · {o.items.length} items</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-purple-700">{formatINR(o.totals.total)}</p>
                              <Badge variant="soft" className="text-[8px] px-1.5 py-0 mt-0.5">{o.status}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-450 italic">No order history found.</p>
                    )}
                  </div>
                </>
              );
            })()
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-20 text-center">
              <Users className="size-8 text-gray-300" />
              <p className="text-xs font-bold text-gray-400 mt-3">Select a customer profile to view metrics</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* MODULE 6: COUPONS MANAGER                                          */
/* ================================================================== */

function CouponsTab() {
  const [coupons, setCoupons] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showModal, setShowModal] = React.useState(false);
  const [editingCoupon, setEditingCoupon] = React.useState<any | null>(null);

  // Form Fields
  const [code, setCode] = React.useState("");
  const [type, setType] = React.useState("percent");
  const [value, setValue] = React.useState(0);
  const [minSubtotal, setMinSubtotal] = React.useState(0);
  const [description, setDescription] = React.useState("");
  const [usageLimit, setUsageLimit] = React.useState(100);
  const [expiryDate, setExpiryDate] = React.useState("");
  const [status, setStatus] = React.useState("Active");
  const [submitting, setSubmitting] = React.useState(false);

  const fetchCoupons = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/admin/coupons");
      if (res && res.data) {
        setCoupons(res.data);
      } else if (Array.isArray(res)) {
        setCoupons(res);
      }
    } catch {
      toast.error("Failed to load coupons");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleOpenCreate = () => {
    setEditingCoupon(null);
    setCode("");
    setType("percent");
    setValue(0);
    setMinSubtotal(0);
    setDescription("");
    setUsageLimit(100);
    setExpiryDate("");
    setStatus("Active");
    setShowModal(true);
  };

  const handleOpenEdit = (c: any) => {
    setEditingCoupon(c);
    setCode(c.code);
    setType(c.type);
    setValue(c.value);
    setMinSubtotal(c.minSubtotal || 0);
    setDescription(c.description || "");
    setUsageLimit(c.usageLimit || 100);
    setExpiryDate(c.expiryDate ? new Date(c.expiryDate).toISOString().split("T")[0] : "");
    setStatus(c.status || "Active");
    setShowModal(true);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !description.trim() || value <= 0) {
      toast.error("Please fill all required fields");
      return;
    }
    setSubmitting(true);

    try {
      const body = {
        code: code.toUpperCase().trim(),
        type,
        value,
        minSubtotal,
        description,
        usageLimit,
        expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
        status
      };

      if (editingCoupon) {
        await apiFetch(`/admin/coupons/${editingCoupon._id || editingCoupon.id}`, {
          method: "PUT",
          body
        });
        toast.success("Coupon code updated successfully");
      } else {
        await apiFetch("/admin/coupons", {
          method: "POST",
          body
        });
        toast.success("Coupon code created successfully");
      }
      setShowModal(false);
      fetchCoupons();
    } catch (err: any) {
      toast.error(err.message || "Failed to save coupon");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this coupon? This cannot be undone.")) return;
    try {
      await apiFetch(`/admin/coupons/${id}`, { method: "DELETE" });
      toast.success("Coupon deleted successfully");
      fetchCoupons();
    } catch {
      toast.error("Failed to delete coupon");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-end border-b border-gray-100 pb-4">
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-sm focus:outline-none"
        >
          <Plus className="size-4" /> Design Promo Code
        </button>
      </div>

      {loading ? (
        <div className="h-40 flex items-center justify-center text-xs font-semibold text-gray-400">Syncing promo codes catalog...</div>
      ) : (
        <div className="overflow-x-auto border border-gray-100 rounded-xl shadow-sm bg-white">
          <table className="w-full min-w-[600px] text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 font-bold text-xs uppercase tracking-wider">
                <th className="p-4">Promo Code</th>
                <th className="p-4">Discount Value</th>
                <th className="p-4">Usage Claims</th>
                <th className="p-4">Expiry Date</th>
                <th className="p-4">Visibility Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {coupons.map((c) => {
                const isExhausted = c.usageLimit && c.usageCount >= c.usageLimit;
                const isExpired = c.expiryDate && new Date(c.expiryDate) < new Date();
                
                return (
                  <tr key={c._id || c.id} className="hover:bg-gray-50/50">
                    <td className="p-4">
                      <p className="font-bold text-gray-900">{c.code}</p>
                      <p className="text-[10px] text-gray-450 mt-0.5">{c.description}</p>
                    </td>
                    <td className="p-4 font-bold text-purple-700">
                      {c.type === "percent" ? `${c.value}% OFF` : `₹${c.value} OFF`}
                      {c.minSubtotal > 0 && <span className="block text-[9px] font-normal text-gray-400 mt-0.5">Min spend: ₹{c.minSubtotal}</span>}
                    </td>
                    <td className="p-4">
                      <span className="font-semibold text-gray-700">{c.usageCount || 0}</span>
                      <span className="text-gray-400 text-xs"> / {c.usageLimit || "∞"} used</span>
                    </td>
                    <td className="p-4 text-xs font-semibold text-gray-600">
                      {c.expiryDate ? new Date(c.expiryDate).toLocaleDateString("en-IN") : "Never Expires"}
                    </td>
                    <td className="p-4">
                      {c.status === "Inactive" ? (
                        <Badge variant="red">Inactive (Hidden)</Badge>
                      ) : isExpired ? (
                        <Badge variant="red">Expired (Hidden)</Badge>
                      ) : isExhausted ? (
                        <Badge variant="cream">Exhausted (Hidden)</Badge>
                      ) : (
                        <Badge variant="green">Active (Visible)</Badge>
                      )}
                    </td>
                    <td className="p-4 text-right flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="text-xs font-bold text-purple-600 hover:text-purple-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(c._id || c.id)}
                        className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modern Dialog/Modal for Creating/Editing Coupons */}
      {showModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-gray-900/50 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSaveCoupon}
            className="w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-2xl flex flex-col gap-4"
          >
            <div className="flex items-center justify-between border-b border-gray-150 pb-2.5">
              <h3 className="text-sm font-bold text-gray-900">{editingCoupon ? "Edit Promo Code" : "Design Promo Code"}</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-xs font-semibold text-gray-400 hover:text-gray-600"
              >
                Close
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Coupon Code (Uppercase)</label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
                className="bg-white text-xs h-9 border-gray-200"
                placeholder="e.g. CRISPY20"
                required
                disabled={!!editingCoupon} // Code shouldn't be changed after creation to keep references safe
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Discount Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="h-9 rounded-lg border border-gray-200 bg-white px-2.5 text-xs focus:outline-purple-500"
                >
                  <option value="percent">Percentage (%)</option>
                  <option value="flat">Flat Amount (₹)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Discount Value</label>
                <Input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="bg-white text-xs h-9 border-gray-200"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Min Order Subtotal (₹)</label>
                <Input
                  type="number"
                  value={minSubtotal}
                  onChange={(e) => setMinSubtotal(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="bg-white text-xs h-9 border-gray-200"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Usage Claim Limit</label>
                <Input
                  type="number"
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="bg-white text-xs h-9 border-gray-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Expiry Date (Optional)</label>
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="bg-white text-xs h-9 border-gray-200"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Visibility Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="h-9 rounded-lg border border-gray-200 bg-white px-2.5 text-xs focus:outline-purple-500"
                >
                  <option value="Active">Active (Visible)</option>
                  <option value="Inactive">Inactive (Hidden)</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Description / Promo Message</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-gray-200 bg-white focus:outline-purple-500"
                placeholder="Explain details e.g. 10% off your first purple yam crisp order"
                required
              />
            </div>

            <Button type="submit" size="sm" className="w-full mt-2" disabled={submitting}>
              {submitting ? "Saving Code…" : "Save Promo Code Settings"}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/* MODULE 7: PROMOTIONS & OFFERS                                      */
/* ================================================================== */

function OffersTab() {
  const [offers, setOffers] = React.useState<any[]>([]);

  const fetchOffers = React.useCallback(async () => {
    try {
      const data = await apiFetch("/offers");
      setOffers(data);
    } catch {
      toast.error("Failed to load offers");
    }
  }, []);

  React.useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-end border-b border-gray-100 pb-4">
        <button
          onClick={async () => {
            const name = prompt("Enter promotion name:");
            const discount = prompt("Discount details:");
            if (name && discount) {
              try {
                await apiFetch("/admin/offers", {
                  method: "POST",
                  body: { name, discount }
                });
                toast.success("Offer campaign launched");
                fetchOffers();
              } catch {
                toast.error("Failed to launch offer campaign");
              }
            }
          }}
          className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-sm focus:outline-none"
        >
          <Plus className="size-4" /> Create Offer Campaign
        </button>
      </div>

      <div className="overflow-x-auto border border-gray-100 rounded-xl shadow-sm">
        <table className="w-full min-w-[600px] text-left border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 font-bold text-xs uppercase tracking-wider">
              <th className="p-4">Campaign Name</th>
              <th className="p-4">Promotion Details</th>
              <th className="p-4">Banner Section</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {offers.map((o) => (
              <tr key={o._id || o.id} className="hover:bg-gray-50/50">
                <td className="p-4 font-bold text-gray-800">{o.name}</td>
                <td className="p-4 font-semibold text-orange-600">{o.discount}</td>
                <td className="p-4 text-xs text-gray-500">{o.banner || "Homepage"}</td>
                <td className="p-4">
                  <Badge variant="primary">{o.status}</Badge>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={async () => {
                      try {
                        await apiFetch(`/admin/offers/${o._id || o.id}`, { method: "DELETE" });
                        toast.success("Offer Deleted");
                        fetchOffers();
                      } catch {
                        toast.error("Failed to delete offer campaign");
                      }
                    }}
                    className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================================================================== */
/* MODULE 8: STOCK INVENTORY                                         */
/* ================================================================== */

interface InventoryItem {
  _id: string;
  flavorId: string;
  packId: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  lowStockAlertLimit: number;
  costPrice: number;
  warehouseLocation: string;
  isLowStock: boolean;
  flavorName: string;
  packLabel: string;
  packPrice: number;
  inventoryValue: number;
  updatedAt: string;
}

interface StockHistoryLog {
  flavorId: string;
  packId: string;
  type: "In" | "Out";
  quantity: number;
  referenceId?: string;
  note?: string;
  timestamp: string;
}

function InventoryTab({ flavors }: { flavors: Flavor[] }) {
  const [inventory, setInventory] = React.useState<InventoryItem[]>([]);
  const [history, setHistory] = React.useState<StockHistoryLog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedItem, setSelectedItem] = React.useState<InventoryItem | null>(null);

  // Edit fields
  const [currentStock, setCurrentStock] = React.useState(0);
  const [reservedStock, setReservedStock] = React.useState(0);
  const [lowStockLimit, setLowStockLimit] = React.useState(10);
  const [costPrice, setCostPrice] = React.useState(0);
  const [warehouseLocation, setWarehouseLocation] = React.useState("");
  const [adjustType, setAdjustType] = React.useState("Correction");
  const [adjustNote, setAdjustNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const loadData = React.useCallback(async () => {
    try {
      const [invRes, histRes] = await Promise.all([
        apiFetch<{ data: InventoryItem[] }>("/admin/inventory"),
        apiFetch<{ data: StockHistoryLog[] }>("/admin/inventory/history?limit=15")
      ]);
      if (invRes?.data) setInventory(invRes.data);
      if (histRes?.data) setHistory(histRes.data);
    } catch {
      toast.error("Failed to load inventory logs");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectEdit = (item: InventoryItem) => {
    setSelectedItem(item);
    setCurrentStock(item.currentStock);
    setReservedStock(item.reservedStock);
    setLowStockLimit(item.lowStockAlertLimit);
    setCostPrice(item.costPrice || 0);
    setWarehouseLocation(item.warehouseLocation || "");
    setAdjustType("Correction");
    setAdjustNote("");
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setSubmitting(true);

    try {
      await apiFetch(`/admin/inventory/${selectedItem._id}`, {
        method: "PUT",
        body: {
          currentStock,
          reservedStock,
          lowStockAlertLimit: lowStockLimit,
          costPrice,
          warehouseLocation,
          adjustType,
          note: adjustNote
        }
      });
      toast.success("Inventory adjusted successfully");
      setSelectedItem(null);
      loadData();
    } catch {
      toast.error("Failed to update inventory record");
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickRestock = async (item: InventoryItem, qty: number) => {
    try {
      await apiFetch(`/admin/inventory/${item._id}`, {
        method: "PUT",
        body: {
          currentStock: item.currentStock + qty,
          adjustType: "Restock",
          note: `Quick bulk restock of +${qty} units`
        }
      });
      toast.success(`Restocked +${qty} boxes successfully`);
      loadData();
    } catch {
      toast.error("Failed to restock items");
    }
  };

  if (loading) {
    return <div className="h-60 flex items-center justify-center text-xs text-gray-500 font-bold">Syncing stock levels...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto border border-gray-100 rounded-xl shadow-sm bg-white">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 font-bold text-xs uppercase tracking-wider">
                  <th className="p-4">Wafer Flavour</th>
                  <th className="p-4">Total Stock</th>
                  <th className="p-4">Reserved</th>
                  <th className="p-4">Available</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {inventory.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50/50">
                    <td className="p-4">
                      <p className="font-bold text-gray-800">{item.flavorName}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{item.packLabel} · ₹{item.packPrice}</p>
                    </td>
                    <td className="p-4 font-semibold text-gray-700">{item.currentStock} units</td>
                    <td className="p-4 text-gray-500 font-medium">{item.reservedStock || 0}</td>
                    <td className="p-4 font-bold text-purple-700">{item.availableStock}</td>
                    <td className="p-4">
                      {item.currentStock === 0 ? (
                        <Badge variant="red">Out of stock</Badge>
                      ) : item.isLowStock ? (
                        <Badge variant="gold">Low Stock Alert</Badge>
                      ) : (
                        <Badge variant="green">Healthy Stock</Badge>
                      )}
                    </td>
                    <td className="p-4 text-right flex items-center justify-end gap-2.5">
                      <button
                        onClick={() => handleQuickRestock(item, 50)}
                        className="text-xs font-bold text-green-600 hover:text-green-700"
                      >
                        +50
                      </button>
                      <button
                        onClick={() => handleSelectEdit(item)}
                        className="text-xs font-bold text-purple-600 hover:text-purple-700"
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Stock History Sub-panel */}
          <div className="border border-gray-100 rounded-xl p-4 bg-white shadow-sm">
            <h3 className="text-xs font-bold text-gray-450 uppercase tracking-wider mb-3">Warehouse Stock History</h3>
            <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto pr-1">
              {history.map((log, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs gap-3">
                  <div>
                    <p className="font-bold text-gray-800">
                      {log.type === "In" ? "📈 Restock" : "📉 Dispatch"} : {flavors.find(f => f.id === log.flavorId)?.name || log.flavorId} ({log.packId})
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{log.note || "Adjustment note"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={cn("font-extrabold", log.type === "In" ? "text-green-600" : "text-red-500")}>
                      {log.type === "In" ? "+" : "-"}{log.quantity}
                    </span>
                    <p className="text-[9px] text-gray-400 mt-0.5">{new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Adjust Stock Audit Panel */}
        <div className="bg-gray-50 rounded-xl border border-gray-250 p-4 sm:p-5 flex flex-col gap-4 shadow-inner">
          {selectedItem ? (
            <form onSubmit={handleSaveAdjustment} className="flex flex-col gap-3.5">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2.5">
                <h3 className="text-xs font-bold text-purple-700 uppercase">Audit {selectedItem.flavorName}</h3>
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="text-xs font-semibold text-gray-400 hover:text-gray-600"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Current On-Hand Stock</label>
                  <Input
                    type="number"
                    value={currentStock}
                    onChange={(e) => setCurrentStock(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="bg-white text-xs h-9"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Reserved Stock</label>
                  <Input
                    type="number"
                    value={reservedStock}
                    onChange={(e) => setReservedStock(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="bg-white text-xs h-9"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Low Stock Alert Limit</label>
                  <Input
                    type="number"
                    value={lowStockLimit}
                    onChange={(e) => setLowStockLimit(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="bg-white text-xs h-9"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Cost Price (₹)</label>
                  <Input
                    type="number"
                    value={costPrice}
                    onChange={(e) => setCostPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="bg-white text-xs h-9"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Warehouse Shelf Location</label>
                <Input
                  value={warehouseLocation}
                  onChange={(e) => setWarehouseLocation(e.target.value)}
                  className="bg-white text-xs h-9"
                  placeholder="e.g. Shelf A4"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Adjustment Reason Type</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value)}
                  className="h-9 rounded-lg border border-gray-200 bg-white px-2.5 text-xs focus:outline-purple-500"
                >
                  <option value="Restock">Restock</option>
                  <option value="Damage">Damage Loss</option>
                  <option value="Correction">Stock Count Correction</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Audit / Movement Log Note</label>
                <textarea
                  rows={2}
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-gray-200 bg-white focus:outline-purple-500"
                  placeholder="Why are you adjusting this stock level?"
                  required
                />
              </div>

              <Button type="submit" size="sm" className="w-full" disabled={submitting}>
                {submitting ? "Processing Audit…" : "Apply Stock Adjustments"}
              </Button>
            </form>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-20 text-center">
              <Layers className="size-8 text-gray-300 animate-pulse" />
              <p className="text-xs font-bold text-gray-400 mt-3">Select an item to run audit adjustments</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* MODULE 9: SALES REPORTS & EXPORT                                   */
/* ================================================================== */

function ReportsTab({ orders }: { orders: Order[] }) {
  const [reportType, setReportType] = React.useState("orders");
  const [format, setFormat] = React.useState("excel");
  const [exporting, setExporting] = React.useState(false);

  const handleRunExport = async () => {
    setExporting(true);
    try {
      const tokens = getTokens();
      const headers: Record<string, string> = {};
      if (tokens?.accessToken) {
        headers["Authorization"] = `Bearer ${tokens.accessToken}`;
      }

      const res = await fetch(`/api/v1/admin/reports/export?type=${reportType}&format=${format}`, {
        headers
      });

      if (!res.ok) throw new Error();

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      const fileExts: Record<string, string> = { excel: "xlsx", pdf: "pdf", csv: "csv" };
      a.download = `${reportType}-report-${Date.now()}.${fileExts[format] || "xlsx"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Report downloaded successfully");
    } catch {
      toast.error("Failed to generate and download report file");
    } finally {
      setExporting(false);
    }
  };

  const activeOrders = orders.filter((o) => o.status !== "Cancelled");
  
  // Calculate monthly sales
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const monthlySales = activeOrders
    .filter((o) => {
      const date = new Date(o.createdAt);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    })
    .reduce((sum, o) => sum + (o.totals?.total || 0), 0);

  // Calculate yearly sales
  const yearlySales = activeOrders
    .filter((o) => new Date(o.createdAt).getFullYear() === currentYear)
    .reduce((sum, o) => sum + (o.totals?.total || 0), 0);

  // Logistics Costs calculations
  const totalDispatchedCount = orders.filter((o) => 
    ["Shipped", "Delivered", "Out for Delivery", "Ready to Ship", "Assigned to Logistics"].includes(o.status)
  ).length;
  
  const totalReturnedCount = orders.filter((o) => 
    ["Returned", "Refund Completed", "Refund Approved"].includes(o.status)
  ).length;

  const baseShippingRate = 50; // average domestic dispatch fee
  const packagingRate = 15; // premium cardboard box + tape + bubble wrap
  const rtoHandlingRate = 80; // return surcharge

  const totalBaseLogistics = totalDispatchedCount * baseShippingRate;
  const totalPackagingLogistics = totalDispatchedCount * packagingRate;
  const totalRtoLogistics = totalReturnedCount * rtoHandlingRate;
  const totalLogisticsCosts = totalBaseLogistics + totalPackagingLogistics + totalRtoLogistics;

  // Average Order Value
  const aov = activeOrders.length > 0 
    ? activeOrders.reduce((sum, o) => sum + (o.totals?.total || 0), 0) / activeOrders.length 
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* Report configuration panel */}
        <div className="border border-gray-200 bg-gray-50 rounded-xl p-5 shadow-inner flex flex-col gap-4 h-fit">
          <h3 className="text-xs font-bold text-purple-700 uppercase tracking-wider">Report Builder</h3>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500">Report Focus Dataset</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-xs focus:outline-purple-500"
            >
              <option value="orders">Orders Listing & Logistics</option>
              <option value="sales">Sales Ledger Trends</option>
              <option value="customers">Customers Registry</option>
              <option value="inventory">Warehouse Inventory Audits</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500">Export File Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-xs focus:outline-purple-500"
            >
              <option value="excel">Excel Spreadsheet (.xlsx)</option>
              <option value="pdf">Structured Document (.pdf)</option>
              <option value="csv">Comma Separated Values (.csv)</option>
            </select>
          </div>

          <Button onClick={handleRunExport} disabled={exporting} className="w-full mt-2">
            <Download className="size-4 mr-2" />
            {exporting ? "Generating Report File…" : "Build & Download Export"}
          </Button>
        </div>

        {/* Dynamic Financial Reports Dashboard */}
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm flex flex-col justify-between">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Monthly Sales</h4>
              <p className="text-2xl font-extrabold text-purple-600 mt-1">₹{monthlySales.toLocaleString("en-IN")}</p>
              <p className="text-[9px] text-gray-500 mt-1">Sales in {new Date().toLocaleString("default", { month: "long" })}</p>
            </div>
            <div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm flex flex-col justify-between">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Yearly Sales</h4>
              <p className="text-2xl font-extrabold text-purple-650 mt-1">₹{yearlySales.toLocaleString("en-IN")}</p>
              <p className="text-[9px] text-gray-500 mt-1">Calendar year {currentYear}</p>
            </div>
            <div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm flex flex-col justify-between">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Avg Order Value (AOV)</h4>
              <p className="text-2xl font-extrabold text-gray-800 mt-1">₹{Math.round(aov).toLocaleString("en-IN")}</p>
              <p className="text-[9px] text-gray-500 mt-1">From {activeOrders.length} active checkouts</p>
            </div>
          </div>

          {/* Logistics Cost Breakdown Card */}
          <div className="border border-gray-200 bg-white rounded-xl p-5 shadow-sm">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-3">
              <Truck className="size-4 text-purple-650" /> Logistics Cost & Dispatch Summary
            </h4>
            
            <div className="grid gap-5 sm:grid-cols-4 mt-4">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 uppercase font-semibold">Total Dispatches</span>
                <span className="text-xl font-bold text-gray-700 mt-1">{totalDispatchedCount} packages</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 uppercase font-semibold">RTO Returned</span>
                <span className="text-xl font-bold text-red-650 mt-1">{totalReturnedCount} returns</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 uppercase font-semibold">Logistics Expenses</span>
                <span className="text-xl font-bold text-gray-800 mt-1">₹{totalLogisticsCosts.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 uppercase font-semibold">Avg cost/order</span>
                <span className="text-xl font-bold text-gray-800 mt-1">
                  ₹{totalDispatchedCount > 0 ? Math.round(totalLogisticsCosts / totalDispatchedCount) : 0}
                </span>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-150 text-gray-400 uppercase font-semibold">
                    <th className="pb-2">Expense Component</th>
                    <th className="pb-2">Unit Rate</th>
                    <th className="pb-2">Volume</th>
                    <th className="pb-2 text-right">Computed Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-600">
                  <tr>
                    <td className="py-2.5">Courier Partner Delivery Fees</td>
                    <td className="py-2.5">₹{baseShippingRate}/order</td>
                    <td className="py-2.5">{totalDispatchedCount} dispatches</td>
                    <td className="py-2.5 text-right font-semibold">₹{totalBaseLogistics.toLocaleString("en-IN")}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5">Packaging materials (box, wrap, tapes)</td>
                    <td className="py-2.5">₹{packagingRate}/box</td>
                    <td className="py-2.5">{totalDispatchedCount} packages</td>
                    <td className="py-2.5 text-right font-semibold">₹{totalPackagingLogistics.toLocaleString("en-IN")}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5">RTO Return Surcharges & Restock loss</td>
                    <td className="py-2.5">₹{rtoHandlingRate}/return</td>
                    <td className="py-2.5">{totalReturnedCount} returned</td>
                    <td className="py-2.5 text-right font-semibold text-red-600">₹{totalRtoLogistics.toLocaleString("en-IN")}</td>
                  </tr>
                  <tr className="font-bold text-gray-800 bg-gray-50/50">
                    <td className="py-2.5 px-2" colSpan={3}>Estimated Logistics Expense</td>
                    <td className="py-2.5 px-2 text-right">₹{totalLogisticsCosts.toLocaleString("en-IN")}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FileUploaderField({
  label,
  value,
  onChange,
  placeholder,
  accept = "image/*,video/*",
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  accept?: string;
}) {
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await apiFetchEnvelope<{ url: string }>("/media/upload", {
        method: "POST",
        body: formData,
      });

      if (res.success && res.data?.url) {
        onChange(res.data.url);
        toast.success(`${label} uploaded successfully!`);
      } else {
        toast.error(`Failed to upload ${label}.`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const isVideo = /\.(mp4|webm|ogg)(\?|$)/i.test(value);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-gray-50/50 p-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</label>
        {value && (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-purple-650 hover:underline"
          >
            Open Original
          </a>
        )}
      </div>
      <div className="flex items-center gap-3">
        {value && (
          <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white flex items-center justify-center shadow-sm">
            {isVideo ? (
              <video src={value} className="size-full object-cover" autoPlay loop muted playsInline />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value} alt="" className="size-full object-cover" />
            )}
          </div>
        )}
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex gap-2">
            <Input
              value={value}
              onChange={(e: any) => onChange(e.target.value)}
              placeholder={placeholder || "File URL"}
              className="text-sm h-10 flex-1 px-4 bg-white"
            />
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept={accept}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 text-sm px-4 h-10 border-gray-200"
            >
              {uploading ? "Uploading..." : "Upload File"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HomepageTab({
  settings,
  onUpdate,
}: {
  settings: StoreSettings;
  onUpdate: (updated: Partial<StoreSettings>) => void;
}) {
  const [subTab, setSubTab] = React.useState<"general" | "whatsapp" | "social" | "pages" | "videos" | "media" | "inquiries" | "notifications" | "security">("general");

  // Admin Security Settings States
  const { user } = useAccount();
  const [securityLoading, setSecurityLoading] = React.useState(false);
  const [passwordEnabled, setPasswordEnabled] = React.useState(false);
  const [newlyGeneratedPassword, setNewlyGeneratedPassword] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const [customPassword, setCustomPassword] = React.useState("");
  const [confirmCustomPassword, setConfirmCustomPassword] = React.useState("");
  const [showCustomPassword, setShowCustomPassword] = React.useState(false);

  React.useEffect(() => {
    if (user) {
      setPasswordEnabled(!!user.passwordLoginEnabled);
    }
  }, [user]);

  const handleGeneratePassword = async () => {
    setSecurityLoading(true);
    setNewlyGeneratedPassword(null);
    setCopied(false);
    try {
      const res = await apiFetch<any>("/admin/security", {
        method: "PUT",
        body: { generateNewPassword: true },
      });
      if (res && res.success) {
        setNewlyGeneratedPassword(res.data.generatedPassword);
        setPasswordEnabled(res.data.passwordLoginEnabled);
        if (user) {
          user.passwordLoginEnabled = res.data.passwordLoginEnabled;
        }
        toast.success("New password generated successfully!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate password.");
    } finally {
      setSecurityLoading(false);
    }
  };

  const handleTogglePasswordLogin = async (enabled: boolean) => {
    setSecurityLoading(true);
    setCopied(false);
    try {
      const res = await apiFetch<any>("/admin/security", {
        method: "PUT",
        body: { passwordLoginEnabled: enabled },
      });
      if (res && res.success) {
        setPasswordEnabled(res.data.passwordLoginEnabled);
        if (user) {
          user.passwordLoginEnabled = res.data.passwordLoginEnabled;
        }
        toast.success(enabled ? "Password login enabled." : "Password login disabled. OTP login will be used.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update security settings.");
    } finally {
      setSecurityLoading(false);
    }
  };

  const handleSaveCustomPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPassword) {
      toast.error("Please enter a new password.");
      return;
    }
    if (customPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    if (customPassword !== confirmCustomPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setSecurityLoading(true);
    try {
      const res = await apiFetch<any>("/admin/security", {
        method: "PUT",
        body: { customPassword },
      });
      if (res && res.success) {
        setPasswordEnabled(res.data.passwordLoginEnabled);
        if (user) {
          user.passwordLoginEnabled = res.data.passwordLoginEnabled;
        }
        setCustomPassword("");
        setConfirmCustomPassword("");
        toast.success("Secure password updated successfully!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update security settings.");
    } finally {
      setSecurityLoading(false);
    }
  };

  // Global settings state
  const [storeName, setStoreName] = React.useState(settings.storeName || "");
  const [storeTagline, setStoreTagline] = React.useState(settings.storeTagline || "");
  const [storeDescription, setStoreDescription] = React.useState(settings.storeDescription || "");
  const [storeLogo, setStoreLogo] = React.useState(settings.storeLogo || "");
  const [storeLogoDark, setStoreLogoDark] = React.useState(settings.storeLogoDark || "");
  const [storeFavicon, setStoreFavicon] = React.useState(settings.storeFavicon || "");
  const [gstNumber, setGstNumber] = React.useState(settings.gstNumber || "");
  const [companyRegistration, setCompanyRegistration] = React.useState(settings.companyRegistration || "");
  const [supportEmail, setSupportEmail] = React.useState(settings.supportEmail || "");
  const [salesEmail, setSalesEmail] = React.useState(settings.salesEmail || "");
  const [customerCareNumber, setCustomerCareNumber] = React.useState(settings.customerCareNumber || "");
  const [businessWorkingHours, setBusinessWorkingHours] = React.useState(settings.businessWorkingHours || "");
  const [timeZone, setTimeZone] = React.useState(settings.timeZone || "Asia/Kolkata");
  const [currency, setCurrency] = React.useState(settings.currency || "INR");
  const [language, setLanguage] = React.useState(settings.language || "en");

  // SEO states
  const [seoTitle, setSeoTitle] = React.useState(settings.seoTitle || "");
  const [seoDescription, setSeoDescription] = React.useState(settings.seoDescription || "");
  const [seoKeywords, setSeoKeywords] = React.useState(settings.seoKeywords || "");

  // Tracking scripts state
  const [googleAnalyticsId, setGoogleAnalyticsId] = React.useState(settings.googleAnalyticsId || "");
  const [googleTagManagerId, setGoogleTagManagerId] = React.useState(settings.googleTagManagerId || "");
  const [facebookPixelId, setFacebookPixelId] = React.useState(settings.facebookPixelId || "");
  const [metaVerification, setMetaVerification] = React.useState(settings.metaVerification || "");
  const [googleSearchConsoleVerification, setGoogleSearchConsoleVerification] = React.useState(settings.googleSearchConsoleVerification || "");
  const [robotsTxt, setRobotsTxt] = React.useState(settings.robotsTxt || "");
  const [sitemapXml, setSitemapXml] = React.useState(settings.sitemapXml || "");

  // Maintenance states
  const [maintenanceOn, setMaintenanceOn] = React.useState(settings.maintenanceMode ?? false);
  const [maintenanceTitle, setMaintenanceTitle] = React.useState(settings.maintenanceTitle || "");
  const [maintenanceMessage, setMaintenanceMessage] = React.useState(settings.maintenanceMessage || "");

  // WhatsApp Business Integration
  const [whatsappEnabled, setWhatsappEnabled] = React.useState(settings.whatsappEnabled ?? true);
  const [whatsappCountryCode, setWhatsappCountryCode] = React.useState(settings.whatsappCountryCode || "91");
  const [whatsappNumber, setWhatsappNumber] = React.useState(settings.whatsappNumber || "9825000000");
  const [whatsappButtonText, setWhatsappButtonText] = React.useState(settings.whatsappButtonText || "Chat with us");
  const [whatsappButtonPosition, setWhatsappButtonPosition] = React.useState(settings.whatsappButtonPosition || "bottom-right");
  const [whatsappShowOnDesktop, setWhatsappShowOnDesktop] = React.useState(settings.whatsappShowOnDesktop ?? true);
  const [whatsappShowOnMobile, setWhatsappShowOnMobile] = React.useState(settings.whatsappShowOnMobile ?? true);

  // Message template overrides
  const [defaultGreetingMessage, setDefaultGreetingMessage] = React.useState(settings.defaultGreetingMessage || "");
  const [defaultSupportMessage, setDefaultSupportMessage] = React.useState(settings.defaultSupportMessage || "");
  const [defaultOrderInquiryMessage, setDefaultOrderInquiryMessage] = React.useState(settings.defaultOrderInquiryMessage || "");
  const [defaultProductInquiryMessage, setDefaultProductInquiryMessage] = React.useState(settings.defaultProductInquiryMessage || "");
  const [defaultBulkOrderMessage, setDefaultBulkOrderMessage] = React.useState(settings.defaultBulkOrderMessage || "");
  const [defaultRefundMessage, setDefaultRefundMessage] = React.useState(settings.defaultRefundMessage || "");

  // Video states
  const [homepageHeroVideo, setHomepageHeroVideo] = React.useState(settings.homepageHeroVideo || "");
  const [ourStoryVideo, setOurStoryVideo] = React.useState(settings.ourStoryVideo || "");
  const [whyUsVideo, setWhyUsVideo] = React.useState(settings.whyUsVideo || "");
  const [manufacturingProcessVideo, setManufacturingProcessVideo] = React.useState(settings.manufacturingProcessVideo || "");
  const [customerTestimonialsVideo, setCustomerTestimonialsVideo] = React.useState(settings.customerTestimonialsVideo || "");
  const [brandStoryVideo, setBrandStoryVideo] = React.useState(settings.brandStoryVideo || "");
  const [autoplayVideo, setAutoplayVideo] = React.useState(settings.autoplayVideo ?? true);
  const [muteVideo, setMuteVideo] = React.useState(settings.muteVideo ?? true);
  const [loopVideo, setLoopVideo] = React.useState(settings.loopVideo ?? true);

  // Announcement Bar States
  const [announcementEnabled, setAnnouncementEnabled] = React.useState(settings.announcementEnabled ?? true);
  const [announcementText, setAnnouncementText] = React.useState(settings.announcementText || "");
  const [announcementBgColor, setAnnouncementBgColor] = React.useState(settings.announcementBgColor || "#7c3aed");
  const [announcementTextColor, setAnnouncementTextColor] = React.useState(settings.announcementTextColor || "#ffffff");

  // Dynamic social links database sync
  const [socialLinks, setSocialLinks] = React.useState<any[]>([]);
  const [editingSocialId, setEditingSocialId] = React.useState<string | null>(null);
  const [socialForm, setSocialForm] = React.useState<{ url: string; username: string; sortOrder: number; openInNewTab: boolean; enabled: boolean } | null>(null);
  // Contact inquiries database list
  const [inquiries, setInquiries] = React.useState<any[]>([]);
  const [inquiryFilter, setInquiryFilter] = React.useState("All");
  const [inquiryPage, setInquiryPage] = React.useState(1);
  // Media library database list
  const [mediaList, setMediaList] = React.useState<any[]>([]);
  const [mediaFolderFilter, setMediaFolderFilter] = React.useState("All");
  const [mediaSearchQuery, setMediaSearchQuery] = React.useState("");
  const [mediaAltTexts, setMediaAltTexts] = React.useState<Record<string, string>>({});
  const [mediaFolders, setMediaFolders] = React.useState<Record<string, string>>({});
  const [uploadingMedia, setUploadingMedia] = React.useState(false);

  // Static visual pages editable content (Home, About, Our Story, Why Us, Policies, Careers)
  const [pagesList] = React.useState([
    { key: "home", label: "Homepage Hero & Banners" },
    { key: "about", label: "About Us Details" },
    { key: "story", label: "Our Story Content" },
    { key: "whyus", label: "Why Choose Us" },
    { key: "careers", label: "Careers & Jobs Content" },
    { key: "privacy", label: "Privacy Policy Document" },
    { key: "terms", label: "Terms of Service" },
    { key: "shipping", label: "Shipping Policy" },
    { key: "refund", label: "Refunds Policy" }
  ]);
  const [editingPage, setEditingPage] = React.useState<string | null>(null);
  const [pageTitle, setPageTitle] = React.useState("");
  const [pageSub, setPageSub] = React.useState("");
  const [pageBody, setPageBody] = React.useState("");
  const [pagePublish, setPagePublish] = React.useState(true);
  const [pageMetaTitle, setPageMetaTitle] = React.useState("");
  const [pageMetaDesc, setPageMetaDesc] = React.useState("");
  const [sectionsList, setSectionsList] = React.useState<{ heading: string; content: string }[]>([]);

  // Notification templates states
  const [msgTemplates, setMsgTemplates] = React.useState<any[]>([]);

  // Fetch social, inquiries, media, and templates logs
  const refreshSubData = React.useCallback(async () => {
    try {
      if (subTab === "social") {
        const res = await apiFetch<any[]>("/admin/social-links");
        if (res) setSocialLinks(Array.isArray(res) ? res : (res as any).data || []);
      } else if (subTab === "inquiries") {
        const res = await apiFetch<any[]>("/admin/inquiries");
        if (res) setInquiries(Array.isArray(res) ? res : (res as any).data || []);
      } else if (subTab === "media") {
        const res = await apiFetch<any[]>("/admin/media");
        if (res) {
          const list = Array.isArray(res) ? res : (res as any).data || [];
          setMediaList(list);
          const alts: Record<string, string> = {};
          const flds: Record<string, string> = {};
          list.forEach((m: any) => {
            alts[m._id] = m.altText || "";
            flds[m._id] = m.folder || "General";
          });
          setMediaAltTexts(alts);
          setMediaFolders(flds);
        }
      } else if (subTab === "notifications") {
        const res = await apiFetch<any[]>("/admin/templates");
        if (res) setMsgTemplates(Array.isArray(res) ? res : (res as any).data || []);
      }
    } catch (err) {
      console.error("Failed to load subtab data:", err);
    }
  }, [subTab]);

  React.useEffect(() => {
    refreshSubData();
  }, [refreshSubData, subTab]);

  // Sync settings when modified upstream
  React.useEffect(() => {
    setStoreName(settings.storeName || "");
    setStoreTagline(settings.storeTagline || "");
    setStoreDescription(settings.storeDescription || "");
    setStoreLogo(settings.storeLogo || "");
    setStoreLogoDark(settings.storeLogoDark || "");
    setStoreFavicon(settings.storeFavicon || "");
    setGstNumber(settings.gstNumber || "");
    setCompanyRegistration(settings.companyRegistration || "");
    setSupportEmail(settings.supportEmail || "");
    setSalesEmail(settings.salesEmail || "");
    setCustomerCareNumber(settings.customerCareNumber || "");
    setBusinessWorkingHours(settings.businessWorkingHours || "");
    setTimeZone(settings.timeZone || "Asia/Kolkata");
    setCurrency(settings.currency || "INR");
    setLanguage(settings.language || "en");
    setSeoTitle(settings.seoTitle || "");
    setSeoDescription(settings.seoDescription || "");
    setSeoKeywords(settings.seoKeywords || "");
    setGoogleAnalyticsId(settings.googleAnalyticsId || "");
    setGoogleTagManagerId(settings.googleTagManagerId || "");
    setFacebookPixelId(settings.facebookPixelId || "");
    setMetaVerification(settings.metaVerification || "");
    setGoogleSearchConsoleVerification(settings.googleSearchConsoleVerification || "");
    setRobotsTxt(settings.robotsTxt || "");
    setSitemapXml(settings.sitemapXml || "");
    setMaintenanceOn(settings.maintenanceMode ?? false);
    setMaintenanceTitle(settings.maintenanceTitle || "");
    setMaintenanceMessage(settings.maintenanceMessage || "");
    setWhatsappEnabled(settings.whatsappEnabled ?? true);
    setWhatsappCountryCode(settings.whatsappCountryCode || "91");
    setWhatsappNumber(settings.whatsappNumber || "9825000000");
    setWhatsappButtonText(settings.whatsappButtonText || "Chat with us");
    setWhatsappButtonPosition(settings.whatsappButtonPosition || "bottom-right");
    setWhatsappShowOnDesktop(settings.whatsappShowOnDesktop ?? true);
    setWhatsappShowOnMobile(settings.whatsappShowOnMobile ?? true);
    setDefaultGreetingMessage(settings.defaultGreetingMessage || "");
    setDefaultSupportMessage(settings.defaultSupportMessage || "");
    setDefaultOrderInquiryMessage(settings.defaultOrderInquiryMessage || "");
    setDefaultProductInquiryMessage(settings.defaultProductInquiryMessage || "");
    setDefaultBulkOrderMessage(settings.defaultBulkOrderMessage || "");
    setDefaultRefundMessage(settings.defaultRefundMessage || "");
    setHomepageHeroVideo(settings.homepageHeroVideo || "");
    setOurStoryVideo(settings.ourStoryVideo || "");
    setWhyUsVideo(settings.whyUsVideo || "");
    setManufacturingProcessVideo(settings.manufacturingProcessVideo || "");
    setCustomerTestimonialsVideo(settings.customerTestimonialsVideo || "");
    setBrandStoryVideo(settings.brandStoryVideo || "");
    setAutoplayVideo(settings.autoplayVideo ?? true);
    setMuteVideo(settings.muteVideo ?? true);
    setLoopVideo(settings.loopVideo ?? true);
    setAnnouncementEnabled(settings.announcementEnabled ?? true);
    setAnnouncementText(settings.announcementText || "");
    setAnnouncementBgColor(settings.announcementBgColor || "#7c3aed");
    setAnnouncementTextColor(settings.announcementTextColor || "#ffffff");
  }, [settings]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onUpdate({
      storeName,
      storeTagline,
      storeDescription,
      storeLogo,
      storeLogoDark,
      storeFavicon,
      gstNumber,
      companyRegistration,
      supportEmail,
      salesEmail,
      customerCareNumber,
      businessWorkingHours,
      timeZone,
      currency,
      language,
      googleAnalyticsId,
      googleTagManagerId,
      facebookPixelId,
      metaVerification,
      googleSearchConsoleVerification,
      robotsTxt,
      sitemapXml,
      announcementEnabled,
      announcementText,
      announcementBgColor,
      announcementTextColor,
      seoTitle,
      seoDescription,
      seoKeywords,
    });
      toast.success("Global website settings saved successfully");
    } catch (err) {
      toast.error("Could not save", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleSaveWhatsapp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onUpdate({
      whatsappEnabled,
      whatsappCountryCode,
      whatsappNumber,
      whatsappButtonText,
      whatsappButtonPosition: whatsappButtonPosition as any,
      whatsappShowOnDesktop,
      whatsappShowOnMobile,
      defaultGreetingMessage,
      defaultSupportMessage,
      defaultOrderInquiryMessage,
      defaultProductInquiryMessage,
      defaultBulkOrderMessage,
      defaultRefundMessage,
    });
      toast.success("WhatsApp Business settings saved successfully");
    } catch (err) {
      toast.error("Could not save", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleUpdateSocialLink = async (id: string, updatedFields: any) => {
    try {
      await apiFetch(`/admin/social-links/${id}`, {
        method: "PUT",
        body: updatedFields,
      });
      toast.success("Social link updated successfully");
      refreshSubData();
    } catch (err) {
      toast.error("Failed to update social link");
    }
  };

  const handleSaveVideos = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onUpdate({
      homepageHeroVideo,
      ourStoryVideo,
      whyUsVideo,
      manufacturingProcessVideo,
      customerTestimonialsVideo,
      brandStoryVideo,
      autoplayVideo,
      muteVideo,
      loopVideo,
    });
      toast.success("Video library settings updated successfully");
    } catch (err) {
      toast.error("Could not save", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handlePreviewPage = async () => {
    if (!editingPage) return;
    try {
      await apiFetch(`/admin/content/${editingPage}/details/draft`, {
        method: "PUT",
        body: {
          content: {
            title: pageTitle,
            subtitle: pageSub,
            body: pageBody,
            metaTitle: pageMetaTitle,
            metaDescription: pageMetaDesc,
          },
          enabled: pagePublish,
        },
      });
      toast.success("Draft changes saved successfully!");

      let previewUrl = "/";
      if (editingPage === "story" || editingPage === "about") {
        previewUrl = "/our-story?preview=1";
      } else if (editingPage === "whyus") {
        previewUrl = "/why-us?preview=1";
      } else if (editingPage === "contact") {
        previewUrl = "/contact?preview=1";
      } else if (editingPage === "privacy" || editingPage === "terms" || editingPage === "shipping" || editingPage === "refund") {
        previewUrl = `/policies/${editingPage === "privacy" ? "privacy" : editingPage === "terms" ? "terms" : editingPage === "shipping" ? "shipping" : "refunds"}?preview=1`;
      }
      window.open(previewUrl, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Failed to save draft for preview.");
    }
  };

  // Visual Page CMS Save Handler
  const handleSavePageCms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPage) return;
    try {
      // 1. Save draft first
      await apiFetch(`/admin/content/${editingPage}/details/draft`, {
        method: "PUT",
        body: {
          content: {
            title: pageTitle,
            subtitle: pageSub,
            body: pageBody,
            metaTitle: pageMetaTitle,
            metaDescription: pageMetaDesc,
          },
          enabled: pagePublish,
        },
      });
      
      // 2. Publish ONLY if pagePublish is checked
      if (pagePublish) {
        await apiFetch(`/admin/content/${editingPage}/details/publish`, { method: "POST" });
        toast.success(`Visual Page CMS for ${editingPage} saved and published live!`);
      } else {
        toast.success(`Visual Page CMS for ${editingPage} saved as draft (Preview active).`);
      }
      setEditingPage(null);
    } catch (err) {
      // Fallback update on StoreSettings for backward compatibility
      if (editingPage === "story") {
        onUpdate({
          ourStoryTitle: pageTitle,
          ourStoryDescription: pageSub,
          ourStoryMainText: pageBody,
        });
      } else if (editingPage === "whyus") {
        onUpdate({
          whyUsTitle: pageTitle,
          whyUsDescription: pageBody,
        });
      } else if (editingPage === "about") {
        onUpdate({
          aboutTitle: pageTitle,
          aboutDescription: pageBody,
        });
      } else if (editingPage === "contact") {
        onUpdate({
          contactTitle: pageTitle,
          contactDescription: pageSub,
          contactSupportHours: pageBody,
        });
      }
      toast.success(`Page details for "${editingPage}" updated successfully`);
      setEditingPage(null);
    }
  };

  // Media Library upload, update and delete
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMedia(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await apiFetch("/media/upload", {
        method: "POST",
        body: formData,
      });
      toast.success("File uploaded to media library successfully");
      refreshSubData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload file");
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleUpdateMediaDetails = async (id: string) => {
    try {
      await apiFetch(`/admin/media/${id}`, {
        method: "PUT",
        body: {
          altText: mediaAltTexts[id] || "",
          folder: mediaFolders[id] || "General",
        },
      });
      toast.success("Media properties updated successfully");
      refreshSubData();
    } catch (err) {
      toast.error("Failed to update media details");
    }
  };

  const handleDeleteMediaItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this media item permanently from storage?")) return;
    try {
      await apiFetch(`/admin/media/${id}`, {
        method: "DELETE",
      });
      toast.success("Media deleted from storage");
      refreshSubData();
    } catch (err) {
      toast.error("Failed to delete media");
    }
  };

  // Customer Inquiries inbox handlers
  const handleUpdateInquiry = async (id: string, fields: any) => {
    try {
      await apiFetch(`/admin/inquiries/${id}`, {
        method: "PUT",
        body: fields,
      });
      toast.success("Inquiry updated successfully");
      refreshSubData();
    } catch (err) {
      toast.error("Failed to update inquiry");
    }
  };

  const handleExportInquiriesCSV = () => {
    if (inquiries.length === 0) return toast.error("No inquiries to export");
    const headers = ["Date", "Name", "Email", "Phone", "Type", "Message", "Status", "Notes", "Assigned Staff"];
    const rows = inquiries.map((i) => [
      new Date(i.createdAt).toLocaleDateString(),
      i.name,
      i.email,
      i.phone,
      i.inquiryType || "General",
      i.message.replace(/,/g, " "),
      i.status,
      (i.resolverNotes || "").replace(/,/g, " "),
      i.assignedTo || "Unassigned",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `customer_inquiries_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Notifications templates save
  const handleSaveNotificationTemplate = async (id: string, fields: any) => {
    try {
      await apiFetch(`/admin/templates/${id}`, {
        method: "PUT",
        body: fields,
      });
      toast.success("Notification template updated successfully");
      refreshSubData();
    } catch (err) {
      toast.error("Failed to update template");
    }
  };

  // Maintenance Toggle
  const handleMaintenanceToggle = (next: boolean) => {
    setMaintenanceOn(next);
    onUpdate({
      maintenanceMode: next,
      maintenanceTitle,
      maintenanceMessage,
    });
    toast[next ? "warning" : "success"](
      next ? "Storefront is now in maintenance mode" : "Storefront is back online",
      {
        description: next
          ? "Customers now see the maintenance screen. The admin dashboard stays available."
          : "Customers can browse and order again.",
      }
    );
  };

  // Filters for media list and contact inquiries
  const filteredInquiries = inquiries.filter((i) => inquiryFilter === "All" || i.inquiryType === inquiryFilter);
  const filteredMedia = mediaList.filter((m) => {
    const matchesFolder = mediaFolderFilter === "All" || m.folder === mediaFolderFilter;
    const matchesSearch = !mediaSearchQuery || m.name.toLowerCase().includes(mediaSearchQuery.toLowerCase()) || (m.altText || "").toLowerCase().includes(mediaSearchQuery.toLowerCase());
    return matchesFolder && matchesSearch;
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Sub-tab selection */}
      <div className="flex flex-wrap gap-1.5 border-b border-gray-200 pb-4">
        {[
          { key: "general", label: "Global Settings & SEO" },
          { key: "whatsapp", label: "WhatsApp Widget & Templates" },
          { key: "social", label: "Social Media Channels" },
          { key: "pages", label: "Website Pages CMS" },
          { key: "media", label: "Media Library Gallery" },
          { key: "inquiries", label: "Customer Inquiries Inbox" },
          { key: "notifications", label: "Notification Templates" }
          // Admin security moved to its own page: /admin/settings
        ].map((st) => (
          <button
            key={st.key}
            type="button"
            onClick={() => setSubTab(st.key as any)}
            className={cn(
              "rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-600/50",
              subTab === st.key
                ? "bg-purple-600 text-white shadow-sm shadow-purple-600/10"
                : "text-gray-600 bg-gray-50 border border-gray-200/50 hover:bg-gray-100 hover:text-gray-900"
            )}
          >
            {st.label}
          </button>
        ))}
      </div>

      {/* 1. Global Settings & SEO Tab */}
      {subTab === "general" && (
        <div className="flex flex-col gap-6">
          {/* Maintenance Settings */}
          <div className={cn("rounded-xl border p-5 transition-colors", maintenanceOn ? "border-red-200 bg-red-50/65" : "border-gray-200 bg-gray-50")}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-gray-800">Maintenance Mode</h3>
                  <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider", maintenanceOn ? "bg-red-600 text-white" : "bg-green-100 text-green-700")}>
                    {maintenanceOn ? "Store Offline" : "Store Live"}
                  </span>
                </div>
                <p className="mt-1 max-w-md text-xs text-gray-500">
                  {maintenanceOn
                    ? "Customers see the maintenance screen and cannot browse or order. The admin dashboard remains reachable."
                    : "Turn this on to close the storefront during updates. Customers see a maintenance screen instead of errors."}
                </p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => handleMaintenanceToggle(!maintenanceOn)} className={cn("shrink-0 font-bold text-xs rounded-xl cursor-pointer", maintenanceOn ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50" : "border-rose-300 text-rose-700 hover:bg-rose-50")}>
                {maintenanceOn ? "Bring Store Online" : "Take Store Offline"}
              </Button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 border-t border-gray-100 pt-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase text-gray-500">Headline shown to customers</label>
                <Input value={maintenanceTitle} onChange={(e: any) => setMaintenanceTitle(e.target.value)} placeholder="We'll be right back" className="bg-white border-gray-200 text-xs rounded-xl" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase text-gray-500">Message</label>
                <Input value={maintenanceMessage} onChange={(e: any) => setMaintenanceMessage(e.target.value)} placeholder="We're doing a little kitchen upkeep…" className="bg-white border-gray-200 text-xs rounded-xl" />
              </div>
            </div>
          </div>

          {/* Form settings with Sticky Action Header */}
          <form onSubmit={handleSaveSettings} className="flex flex-col gap-6">
            <div className="sticky top-2 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-purple-200 bg-white/95 p-4 shadow-md backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-purple-100 text-[#5B2C83]">
                  <Globe className="size-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Global Website Configurations</h3>
                  <p className="text-[10px] text-gray-500">Brand profile, live announcement marquee, and SEO metadata</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant={maintenanceOn ? "red" : "green"} className="font-bold text-xs">
                  {maintenanceOn ? "Maintenance Mode Active" : "Storefront Online"}
                </Badge>
                <Button type="submit" className="bg-[#5B2C83] hover:bg-[#4a236c] text-white font-bold text-xs px-5 py-2 rounded-xl transition-all shadow-sm cursor-pointer">
                  Save All Configurations
                </Button>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Card 1: Company & Brand Profile */}
              <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <h3 className="text-xs font-bold text-purple-700 uppercase tracking-wider">Company &amp; Brand Profile</h3>
                  <span className="text-[10px] font-extrabold uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">Public Branding</span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700">Business Name *</label>
                    <Input value={storeName} onChange={(e: any) => setStoreName(e.target.value)} className="text-xs rounded-xl" required />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700">Brand Tagline</label>
                    <Input value={storeTagline} onChange={(e: any) => setStoreTagline(e.target.value)} className="text-xs rounded-xl" />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700">Business Description</label>
                  <textarea rows={2} value={storeDescription} onChange={(e: any) => setStoreDescription(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-900 outline-none focus:ring-2 focus:ring-purple-600/20" />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700">Support Email</label>
                    <Input type="email" value={supportEmail} onChange={(e: any) => setSupportEmail(e.target.value)} className="text-xs rounded-xl" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700">Sales Email</label>
                    <Input type="email" value={salesEmail} onChange={(e: any) => setSalesEmail(e.target.value)} className="text-xs rounded-xl" />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700">Care Number</label>
                    <Input value={customerCareNumber} onChange={(e: any) => setCustomerCareNumber(e.target.value)} className="text-xs rounded-xl" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700">GST Number</label>
                    <Input value={gstNumber} onChange={(e: any) => setGstNumber(e.target.value)} placeholder="e.g. 24AAAAA0000A1Z5" className="text-xs rounded-xl" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700">Company Reg Details</label>
                    <Input value={companyRegistration} onChange={(e: any) => setCompanyRegistration(e.target.value)} placeholder="Registration No" className="text-xs rounded-xl" />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700">Time Zone</label>
                    <Input value={timeZone} onChange={(e: any) => setTimeZone(e.target.value)} className="text-xs rounded-xl" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700">Currency</label>
                    <Input value={currency} onChange={(e: any) => setCurrency(e.target.value)} className="text-xs rounded-xl" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700">Language</label>
                    <Input value={language} onChange={(e: any) => setLanguage(e.target.value)} className="text-xs rounded-xl" />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700">Working Hours</label>
                  <Input value={businessWorkingHours} onChange={(e: any) => setBusinessWorkingHours(e.target.value)} placeholder="e.g. Mon - Sat: 9:00 AM - 7:00 PM" className="text-xs rounded-xl" />
                </div>

                <div className="grid gap-3 sm:grid-cols-1 pt-2 border-t border-gray-100">
                  <FileUploaderField
                    label="Brand Logo (Light Header)"
                    value={storeLogo}
                    onChange={setStoreLogo}
                    placeholder="Logo URL"
                  />
                  <FileUploaderField
                    label="Brand Logo (Dark Footer)"
                    value={storeLogoDark}
                    onChange={setStoreLogoDark}
                    placeholder="Dark Logo URL"
                  />
                  <FileUploaderField
                    label="Favicon"
                    value={storeFavicon}
                    onChange={setStoreFavicon}
                    placeholder="Favicon URL"
                  />
                </div>
              </div>

              {/* Card 2: Homepage Announcement Bar */}
              <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <h3 className="text-xs font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span>📢</span> Homepage Announcement Bar
                  </h3>
                  <span className="text-[10px] font-extrabold uppercase text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Header Banner</span>
                </div>
                
                <div className="flex items-center justify-between gap-4 rounded-xl border border-purple-100 bg-purple-50/40 p-3.5">
                  <div>
                    <p className="text-xs font-bold text-purple-950">Show Announcement Bar</p>
                    <p className="text-[10px] text-purple-750/70 mt-0.5">Toggle visual announcement banner at the top of the storefront</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={announcementEnabled}
                    onChange={(e) => setAnnouncementEnabled(e.target.checked)}
                    className="size-5 accent-[#5B2C83] cursor-pointer"
                  />
                </div>

                {/* Live Banner Preview Box */}
                <div className="flex flex-col gap-1.5 rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <span className="text-[10px] font-extrabold uppercase text-gray-400">Live Banner Preview</span>
                  <div
                    style={{ backgroundColor: announcementBgColor || "#7c3aed", color: announcementTextColor || "#ffffff" }}
                    className="flex items-center justify-center rounded-lg px-4 py-2 text-xs font-bold text-center shadow-2xs transition-all"
                  >
                    {announcementText || "Free shipping on orders above ₹599!"}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700">Announcement Message</label>
                  <Input
                    value={announcementText}
                    onChange={(e: any) => setAnnouncementText(e.target.value)}
                    placeholder="e.g. Free shipping on orders above ₹599!"
                    className="text-xs rounded-xl"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700">Background Color</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={announcementBgColor || "#7c3aed"}
                        onChange={(e) => setAnnouncementBgColor(e.target.value)}
                        className="size-9 rounded-xl border border-gray-200 cursor-pointer shrink-0 p-0.5"
                      />
                      <Input
                        value={announcementBgColor}
                        onChange={(e: any) => setAnnouncementBgColor(e.target.value)}
                        className="text-xs flex-1 rounded-xl font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700">Text Color</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={announcementTextColor || "#ffffff"}
                        onChange={(e) => setAnnouncementTextColor(e.target.value)}
                        className="size-9 rounded-xl border border-gray-200 cursor-pointer shrink-0 p-0.5"
                      />
                      <Input
                        value={announcementTextColor}
                        onChange={(e: any) => setAnnouncementTextColor(e.target.value)}
                        className="text-xs flex-1 rounded-xl font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Preset Color Swatches */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-extrabold uppercase text-gray-400">Quick Palette Presets</span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { bg: "#7c3aed", text: "#ffffff", label: "Brand Purple" },
                      { bg: "#ea580c", text: "#ffffff", label: "Warm Orange" },
                      { bg: "#059669", text: "#ffffff", label: "Emerald Green" },
                      { bg: "#1e293b", text: "#ffffff", label: "Slate Dark" },
                      { bg: "#dc2626", text: "#ffffff", label: "Crimson Red" },
                    ].map((preset) => (
                      <button
                        key={preset.bg}
                        type="button"
                        onClick={() => {
                          setAnnouncementBgColor(preset.bg);
                          setAnnouncementTextColor(preset.text);
                        }}
                        className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold text-gray-700 hover:bg-gray-50 transition-all cursor-pointer"
                      >
                        <span className="size-3.5 rounded-full border border-black/10" style={{ backgroundColor: preset.bg }} />
                        <span>{preset.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 3: SEO & Analytics */}
              <div className="col-span-full flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <h3 className="text-xs font-bold text-orange-600 uppercase tracking-wider">SEO, Crawlers &amp; Analytical Integrations</h3>
                  <span className="text-[10px] font-extrabold uppercase text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">Search Engine Indexing</span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700">SEO Default Title</label>
                    <Input value={seoTitle} onChange={(e: any) => setSeoTitle(e.target.value)} className="text-xs rounded-xl" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700">SEO Keywords</label>
                    <Input value={seoKeywords} onChange={(e: any) => setSeoKeywords(e.target.value)} placeholder="ratalu chips, purple yam wafers..." className="text-xs rounded-xl" />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700">SEO Default Meta Description</label>
                  <textarea rows={2} value={seoDescription} onChange={(e: any) => setSeoDescription(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-900 outline-none focus:ring-2 focus:ring-purple-600/20" />
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700">Google Analytics ID</label>
                    <Input value={googleAnalyticsId} onChange={(e: any) => setGoogleAnalyticsId(e.target.value)} placeholder="G-XXXXX" className="text-xs rounded-xl" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700">Tag Manager ID</label>
                    <Input value={googleTagManagerId} onChange={(e: any) => setGoogleTagManagerId(e.target.value)} placeholder="GTM-XXXXX" className="text-xs rounded-xl" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700">Facebook Pixel ID</label>
                    <Input value={facebookPixelId} onChange={(e: any) => setFacebookPixelId(e.target.value)} placeholder="1234567890" className="text-xs rounded-xl" />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700">Meta Tag Verification</label>
                    <Input value={metaVerification} onChange={(e: any) => setMetaVerification(e.target.value)} placeholder="meta-key" className="text-xs rounded-xl" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700">Google Search Console Key</label>
                    <Input value={googleSearchConsoleVerification} onChange={(e: any) => setGoogleSearchConsoleVerification(e.target.value)} placeholder="google-site-verification" className="text-xs rounded-xl" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700">robots.txt Rules</label>
                    <textarea rows={3} value={robotsTxt} onChange={(e: any) => setRobotsTxt(e.target.value)} className="w-full font-mono rounded-xl border border-gray-200 bg-white p-3 text-xs outline-none focus:ring-2 focus:ring-purple-600/20" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700">Sitemap Configuration XML</label>
                    <textarea rows={3} value={sitemapXml} onChange={(e: any) => setSitemapXml(e.target.value)} placeholder="Optional customized dynamic override rules" className="w-full font-mono rounded-xl border border-gray-200 bg-white p-3 text-xs outline-none focus:ring-2 focus:ring-purple-600/20" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" className="bg-[#5B2C83] hover:bg-[#4a236c] text-white font-bold text-sm px-8 py-3 rounded-2xl shadow-md transition-all cursor-pointer">
                Save Global Website Configurations
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* 2. WhatsApp Widget & Integration */}
      {subTab === "whatsapp" && (
        <form onSubmit={handleSaveWhatsapp} className="flex flex-col gap-6">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-2">Floating Widget Behavior</h3>
              <div className="flex items-center gap-3 bg-purple-50 p-3 rounded-lg border border-purple-100">
                <input type="checkbox" id="waEnabled" checked={whatsappEnabled} onChange={(e) => setWhatsappEnabled(e.target.checked)} className="size-4" />
                <label htmlFor="waEnabled" className="text-xs font-bold text-purple-950">Enable Floating WhatsApp Button Widget</label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500">Country Code</label>
                  <Input value={whatsappCountryCode} onChange={(e: any) => setWhatsappCountryCode(e.target.value)} placeholder="e.g. 91" className="text-xs" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500">WhatsApp Number</label>
                  <Input value={whatsappNumber} onChange={(e: any) => setWhatsappNumber(e.target.value)} placeholder="e.g. 9825011111" className="text-xs" />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500">Widget Button Label Text</label>
                  <Input value={whatsappButtonText} onChange={(e: any) => setWhatsappButtonText(e.target.value)} placeholder="e.g. Chat with us" className="text-xs" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500">Widget Placement Position</label>
                  <select value={whatsappButtonPosition} onChange={(e) => setWhatsappButtonPosition(e.target.value as any)} className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-xs shadow-sm outline-none focus:ring-2 focus:ring-purple-200">
                    <option value="bottom-right">Bottom Right Corner</option>
                    <option value="bottom-left">Bottom Left Corner</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="waDesktop" checked={whatsappShowOnDesktop} onChange={(e) => setWhatsappShowOnDesktop(e.target.checked)} />
                  <label htmlFor="waDesktop" className="text-xs font-semibold text-gray-600">Display on Desktop screens</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="waMobile" checked={whatsappShowOnMobile} onChange={(e) => setWhatsappShowOnMobile(e.target.checked)} />
                  <label htmlFor="waMobile" className="text-xs font-semibold text-gray-600">Display on Mobile screens</label>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-2">Message Configurations</h3>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500">Floating Button Default Greeting Message</label>
                <textarea rows={2} value={defaultGreetingMessage} onChange={(e) => setDefaultGreetingMessage(e.target.value)} className="w-full rounded-xl border border-gray-200 p-2.5 text-xs outline-none focus:ring-2 focus:ring-purple-200" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 shadow-sm">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">WhatsApp API Sandbox Delivery History</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs text-gray-600">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-100 font-bold">
                    <th className="px-4 py-2">Broadcast Event</th>
                    <th className="px-4 py-2">Trigger Date</th>
                    <th className="px-4 py-2">Customer Recipient</th>
                    <th className="px-4 py-2">Official API Key</th>
                    <th className="px-4 py-2 text-right">Delivery Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { event: "Order Confirmation #1042", date: "July 14, 2026 09:22 AM", user: "+91 98250 11234", id: "meta_confirm_99", status: "Delivered" },
                    { event: "Shipping Update #1041", date: "July 13, 2026 04:12 PM", user: "+91 99042 55678", id: "meta_ship_84", status: "Read" },
                    { event: "OTP Auth Request #66", date: "July 12, 2026 11:05 AM", user: "+91 88661 22334", id: "meta_otp_66", status: "Sent" }
                  ].map((x, idx) => (
                    <tr key={idx} className="border-b border-gray-200 bg-white">
                      <td className="px-4 py-2.5 font-semibold text-gray-800">{x.event}</td>
                      <td className="px-4 py-2.5 text-gray-400">{x.date}</td>
                      <td className="px-4 py-2.5 font-semibold">{x.user}</td>
                      <td className="px-4 py-2.5 font-mono text-[10px]">{x.id}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-bold", x.status === "Read" ? "bg-blue-100 text-blue-700" : x.status === "Delivered" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700")}>{x.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <Button type="submit" className="bg-purple-650 hover:bg-purple-750 text-white font-bold px-6 py-2.5 rounded-xl">
              Save WhatsApp Settings
            </Button>
          </div>
        </form>
      )}

      {/* 3. Social Media Channels Tab */}
      {subTab === "social" && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-purple-700 uppercase tracking-wider">Storefront Social Channels Configuration</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-[#F9FAFB] text-gray-500 font-bold uppercase text-[10px]">
                    <th className="px-4 py-3.5">Platform</th>
                    <th className="px-4 py-3.5">Profile URL Address</th>
                    <th className="px-4 py-3.5">Username Handle</th>
                    <th className="px-4 py-3.5">Sort Order</th>
                    <th className="px-4 py-3.5">New Tab</th>
                    <th className="px-4 py-3.5">Active</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {socialLinks.map((s) => {
                    const isEditing = editingSocialId === s._id;
                    const brandColors: Record<string, string> = {
                      instagram: "text-pink-600 bg-pink-50/65 border-pink-200/50",
                      facebook: "text-blue-600 bg-blue-50/65 border-blue-200/50",
                      x: "text-gray-900 bg-gray-100 border-gray-200",
                      linkedin: "text-sky-700 bg-sky-50/65 border-sky-200/50",
                      youtube: "text-red-600 bg-red-50/65 border-red-200/50",
                      pinterest: "text-red-700 bg-red-50/65 border-red-200/50",
                      telegram: "text-cyan-600 bg-cyan-50/65 border-cyan-200/50",
                      threads: "text-black bg-gray-100 border-gray-200",
                      snapchat: "text-yellow-600 bg-yellow-50/65 border-yellow-200/50",
                      discord: "text-indigo-650 bg-indigo-50/65 border-indigo-200/50",
                      whatsapp: "text-green-600 bg-green-50/65 border-green-200/50",
                      email: "text-emerald-600 bg-emerald-50/65 border-emerald-200/50",
                      phone: "text-teal-600 bg-teal-50/65 border-teal-200/50",
                    };
                    const colorClass = brandColors[s.platform.toLowerCase()] || "text-gray-600 bg-gray-50 border-gray-250";

                    return (
                      <tr key={s._id} className={cn("border-b border-gray-100 transition-colors", isEditing ? "bg-purple-50/30" : "bg-white hover:bg-gray-50/40")}>
                        <td className="px-4 py-3.5">
                          <span className={cn("rounded-full border px-2.5 py-0.5 text-[10px] font-bold capitalize shadow-sm", colorClass)}>
                            {s.platform}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 max-w-xs truncate">
                          {isEditing ? (
                            <input
                              type="text"
                              value={socialForm?.url ?? ""}
                              onChange={(e) => setSocialForm(prev => prev ? { ...prev, url: e.target.value } : null)}
                              className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-800 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-600/15"
                              placeholder="https://..."
                            />
                          ) : s.url ? (
                            <a
                              href={s.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-purple-650 hover:underline hover:text-purple-800 text-[11px] truncate block"
                            >
                              {s.url}
                            </a>
                          ) : (
                            <span className="italic text-gray-350 text-[11px]">No link configured</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          {isEditing ? (
                            <input
                              type="text"
                              value={socialForm?.username ?? ""}
                              onChange={(e) => setSocialForm(prev => prev ? { ...prev, username: e.target.value } : null)}
                              className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-800 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-600/15"
                              placeholder="@handle"
                            />
                          ) : s.username ? (
                            <span className="rounded-lg bg-gray-100/80 px-2 py-1 font-mono text-[10px] text-gray-600 font-bold border border-gray-200/50">
                              {s.username.startsWith("@") ? s.username : `@${s.username}`}
                            </span>
                          ) : (
                            <span className="italic text-gray-350 text-[11px]">No handle</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 w-24">
                          {isEditing ? (
                            <input
                              type="number"
                              min={0}
                              value={socialForm?.sortOrder ?? 0}
                              onChange={(e) => setSocialForm(prev => prev ? { ...prev, sortOrder: parseInt(e.target.value) || 0 } : null)}
                              className="w-16 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-center text-gray-800 focus:border-purple-600 focus:outline-none"
                            />
                          ) : (
                            <span className="font-semibold text-gray-700 text-xs pl-2">{s.sortOrder}</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 w-24">
                          {isEditing ? (
                            <input
                              type="checkbox"
                              checked={socialForm?.openInNewTab ?? false}
                              onChange={(e) => setSocialForm(prev => prev ? { ...prev, openInNewTab: e.target.checked } : null)}
                              className="size-4 rounded border-gray-300 text-purple-600 accent-purple-600 cursor-pointer"
                            />
                          ) : (
                            <span className={cn("text-[10px] font-bold uppercase", s.openInNewTab ? "text-green-600" : "text-gray-400")}>
                              {s.openInNewTab ? "Yes" : "No"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 w-24">
                          {isEditing ? (
                            <input
                              type="checkbox"
                              checked={socialForm?.enabled ?? false}
                              onChange={(e) => setSocialForm(prev => prev ? { ...prev, enabled: e.target.checked } : null)}
                              className="size-4 rounded border-gray-300 text-purple-600 accent-purple-600 cursor-pointer"
                            />
                          ) : (
                            <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase border shadow-sm", s.enabled ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200")}>
                              {s.enabled ? "Live" : "Disabled"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right w-36">
                          {isEditing ? (
                            <div className="flex justify-end gap-1.5">
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setEditingSocialId(null);
                                  setSocialForm(null);
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="primary"
                                onClick={async () => {
                                  if (!socialForm) return;
                                  await handleUpdateSocialLink(s._id, socialForm);
                                  setEditingSocialId(null);
                                  setSocialForm(null);
                                }}
                              >
                                Save
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingSocialId(s._id);
                                setSocialForm({
                                  url: s.url || "",
                                  username: s.username || "",
                                  sortOrder: s.sortOrder || 0,
                                  openInNewTab: s.openInNewTab || false,
                                  enabled: s.enabled || false,
                                });
                              }}
                              className="border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-800"
                            >
                              Edit
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. Website Pages CMS Tab */}
      {subTab === "pages" && (
        <div className="flex flex-col gap-4">
          {!editingPage ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pagesList.map((p) => (
                <div key={p.key} className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 hover:border-purple-200 transition-all shadow-sm">
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">{p.label}</h3>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">Page Key: {p.key}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      setEditingPage(p.key);
                      // Pull existing saved CMS section details or default fallbacks
                      let initialTitle = "";
                      let initialSub = "";
                      let initialBody = "";
                      let initialMetaTitle = "";
                      let initialMetaDesc = "";
                      let initialEnabled = true;

                      try {
                        const res = await apiFetch<any>(`/admin/content/${p.key}/details`);
                        const draft = res?.data?.draft || res?.data?.published || res?.draft || res?.published;
                        if (draft && (draft.title || draft.body)) {
                          initialTitle = draft.title || "";
                          initialSub = draft.subtitle || "";
                          initialBody = draft.body || "";
                          initialMetaTitle = draft.metaTitle || "";
                          initialMetaDesc = draft.metaDescription || "";
                          initialEnabled = res?.data?.enabled ?? true;
                        }
                      } catch {
                        // Fallback below
                      }

                      if (!initialTitle && !initialBody) {
                        if (p.key === "privacy" || p.key === "terms" || p.key === "shipping" || p.key === "refund") {
                          const polKey = p.key === "refund" ? "returns" : p.key;
                          const policy = getPolicy(polKey);
                          if (policy) {
                            initialTitle = policy.title;
                            initialSub = policy.summary;
                            initialBody = policy.sections.map((s: any) => `## ${s.heading}\n\n${s.body.join("\n\n")}`).join("\n\n");
                            initialMetaTitle = `${policy.title} | ${settings.storeName || "Ratalu Wafers"}`;
                            initialMetaDesc = policy.summary;
                          }
                        } else if (p.key === "story") {
                          initialTitle = settings.ourStoryTitle || "Our Story";
                          initialSub = settings.ourStoryDescription || "Crafted with passion";
                          initialBody = settings.ourStoryMainText || "## The Beginning\n\nStarted in 2026 with a mission to bring authentic purple yam chips to every home.";
                        } else if (p.key === "whyus") {
                          initialTitle = settings.whyUsTitle || "Why Choose Us";
                          initialSub = "What makes Ratalu Wafers special";
                          initialBody = settings.whyUsDescription || "## Premium Quality\n\n100% real purple yam, vacuum fried in small batches.";
                        } else if (p.key === "about") {
                          initialTitle = settings.aboutTitle || "About Us";
                          initialSub = "India's finest purple yam snacks";
                          initialBody = settings.aboutDescription || "## Our Brand Story\n\nDelivering irresistible crunchy snacks nationwide.";
                        } else if (p.key === "contact") {
                          initialTitle = settings.contactTitle || "Get in Touch";
                          initialSub = settings.contactDescription || "We would love to hear from you";
                          initialBody = settings.contactSupportHours || "## Customer Support\n\nAvailable 9 AM - 6 PM IST, Monday to Saturday.";
                        } else {
                          initialTitle = p.label;
                          initialSub = "Page details and content";
                          initialBody = "## Section Title\n\nEnter your detailed content here.";
                        }
                      }

                      setPageTitle(initialTitle);
                      setPageSub(initialSub);
                      setPageBody(initialBody);
                      setPageMetaTitle(initialMetaTitle);
                      setPageMetaDesc(initialMetaDesc);
                      setPagePublish(initialEnabled);

                      // Parse body into structured sections
                      const parsedSections: { heading: string; content: string }[] = [];
                      const blocks = initialBody.split(/(?=^##\s+)/m);
                      blocks.forEach((block) => {
                        const trimmed = block.trim();
                        if (!trimmed) return;
                        const lines = trimmed.split("\n");
                        if (lines[0].startsWith("## ")) {
                          const heading = lines[0].replace(/^##\s+/, "").trim();
                          const content = lines.slice(1).join("\n").trim();
                          parsedSections.push({ heading, content });
                        } else {
                          parsedSections.push({ heading: "General Information", content: trimmed });
                        }
                      });
                      setSectionsList(parsedSections.length > 0 ? parsedSections : [{ heading: "Main Section", content: initialBody }]);
                    }}
                    className="mt-4 border-purple-200 text-purple-650 hover:bg-purple-50 text-xs py-1 font-bold"
                  >
                    Edit Page details
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <form onSubmit={handleSavePageCms} className="flex flex-col gap-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm max-w-3xl">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-gray-900 capitalize">Editing Page: {editingPage}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Edit title, subtitle, and add or manage custom paragraphs & policy sections.</p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => setEditingPage(null)} className="rounded-xl">Discard</Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700">Page Title</label>
                  <Input value={pageTitle} onChange={(e: any) => setPageTitle(e.target.value)} required className="bg-white" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700">Page Subtitle / Tagline</label>
                  <Input value={pageSub} onChange={(e: any) => setPageSub(e.target.value)} className="bg-white" />
                </div>
              </div>

              {/* Dynamic Paragraphs / Sections Manager */}
              <div className="flex flex-col gap-3 rounded-2xl border border-purple-100 bg-purple-50/30 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[#5B2C83] uppercase tracking-wider">Paragraphs & Policy Sections</h4>
                    <p className="text-[11px] text-gray-500">Add, edit, or reorder paragraphs. Changes update the page body automatically.</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      const updated = [...sectionsList, { heading: `New Section ${sectionsList.length + 1}`, content: "" }];
                      setSectionsList(updated);
                      const markdown = updated.map((s) => `## ${s.heading}\n\n${s.content}`).join("\n\n");
                      setPageBody(markdown);
                    }}
                    className="bg-[#5B2C83] hover:bg-[#4a236c] text-white text-xs font-bold rounded-xl"
                  >
                    <Plus className="size-3.5 mr-1" />
                    Add Paragraph
                  </Button>
                </div>

                <div className="flex flex-col gap-3.5 mt-2">
                  {sectionsList.map((sec, idx) => (
                    <div key={idx} className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-extrabold uppercase text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                          Paragraph #{idx + 1}
                        </span>
                        {sectionsList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = sectionsList.filter((_, i) => i !== idx);
                              setSectionsList(updated);
                              const markdown = updated.map((s) => `## ${s.heading}\n\n${s.content}`).join("\n\n");
                              setPageBody(markdown);
                            }}
                            className="text-gray-400 hover:text-red-600 text-xs font-bold p-1 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        value={sec.heading}
                        onChange={(e) => {
                          const updated = sectionsList.map((s, i) => (i === idx ? { ...s, heading: e.target.value } : s));
                          setSectionsList(updated);
                          const markdown = updated.map((s) => `## ${s.heading}\n\n${s.content}`).join("\n\n");
                          setPageBody(markdown);
                        }}
                        placeholder="Section Heading / Title"
                        className="w-full rounded-lg border border-gray-200 p-2 text-xs font-bold text-gray-900 outline-none focus:border-purple-600"
                      />

                      <textarea
                        rows={3}
                        value={sec.content}
                        onChange={(e) => {
                          const updated = sectionsList.map((s, i) => (i === idx ? { ...s, content: e.target.value } : s));
                          setSectionsList(updated);
                          const markdown = updated.map((s) => `## ${s.heading}\n\n${s.content}`).join("\n\n");
                          setPageBody(markdown);
                        }}
                        placeholder="Write paragraph content here..."
                        className="w-full rounded-lg border border-gray-200 p-2 text-xs text-gray-700 outline-none focus:border-purple-600 leading-relaxed"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-700">Full Raw Body Markdown (Auto-synced)</label>
                <textarea
                  rows={6}
                  value={pageBody}
                  onChange={(e) => setPageBody(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-3 text-xs outline-none focus:ring-2 focus:ring-purple-200 font-mono leading-relaxed"
                  placeholder="Insert HTML or Markdown text values here..."
                />
              </div>

              <div className="border-t border-gray-100 pt-3 grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700">SEO Meta Title</label>
                  <Input value={pageMetaTitle} onChange={(e: any) => setPageMetaTitle(e.target.value)} placeholder="Optional SEO override title" className="text-xs bg-white" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700">SEO Meta Description</label>
                  <Input value={pageMetaDesc} onChange={(e: any) => setPageMetaDesc(e.target.value)} placeholder="Optional SEO description" className="text-xs bg-white" />
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-xl border border-purple-100 bg-purple-50/40 p-3">
                <input type="checkbox" id="publishPage" checked={pagePublish} onChange={(e) => setPagePublish(e.target.checked)} className="size-4 accent-[#5B2C83]" />
                <label htmlFor="publishPage" className="text-xs font-bold text-gray-800 cursor-pointer">Set Publish status to Live (Draft if unchecked)</label>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <Button type="submit" className="bg-[#5B2C83] hover:bg-[#4a236c] text-white font-bold rounded-xl px-5">
                  Save & Publish Live
                </Button>
                <Button
                  type="button"
                  onClick={handlePreviewPage}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl px-5"
                >
                  Preview Changes
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditingPage(null)} className="rounded-xl">Cancel</Button>
              </div>
            </form>
          )}
        </div>
      )}



      {/* 6. Media Library Tab */}
      {subTab === "media" && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-col gap-1 w-32">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Folder Filter</label>
                <select value={mediaFolderFilter} onChange={(e) => setMediaFolderFilter(e.target.value)} className="h-8 rounded border border-gray-200 px-2 text-xs shadow-sm bg-white outline-none">
                  <option value="All">All Folders</option>
                  <option value="General">General</option>
                  <option value="Products">Products</option>
                  <option value="Banners">Banners</option>
                  <option value="Assets">Assets</option>
                </select>
              </div>

              <div className="flex flex-col gap-1 w-48">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Search Files</label>
                <Input value={mediaSearchQuery} onChange={(e: any) => setMediaSearchQuery(e.target.value)} placeholder="Search file name or alt..." className="h-8 text-xs" />
              </div>
            </div>

            <div>
              <label className="inline-flex items-center gap-2 rounded-lg bg-purple-650 hover:bg-purple-750 text-white font-semibold text-xs px-4 py-2 cursor-pointer shadow-sm">
                <Upload className="size-3.5" />
                {uploadingMedia ? "Uploading..." : "Upload New File"}
                <input type="file" onChange={handleMediaUpload} disabled={uploadingMedia} className="hidden" />
              </label>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredMedia.map((m) => (
              <div key={m._id} className="flex flex-col justify-between overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm hover:border-purple-200 transition-all">
                <div className="relative aspect-video bg-gray-50 flex items-center justify-center border-b border-gray-100">
                  {m.mimeType?.startsWith("image") ? (
                    <img src={m.url} alt={m.altText || m.name} className="size-full object-cover" />
                  ) : m.mimeType?.startsWith("video") ? (
                    <video src={m.url} className="size-full object-cover" controls />
                  ) : (
                    <FileText className="size-10 text-gray-300" />
                  )}
                  <span className="absolute left-2 top-2 rounded bg-purple-600/90 px-1.5 py-0.5 text-[8px] font-extrabold uppercase text-white tracking-wide">{m.folder || "General"}</span>
                </div>

                <div className="p-3 flex flex-col gap-2">
                  <p className="truncate font-semibold text-xs text-gray-700" title={m.name}>{m.name}</p>
                  <p className="text-[9px] text-gray-400 font-mono">{(m.size / 1024 / 1024).toFixed(2)} MB · {m.mimeType}</p>
                  
                  <div className="flex flex-col gap-1 pt-1 border-t border-gray-100">
                    <label className="text-[9px] font-bold text-gray-400 uppercase">Image Alt Text (SEO)</label>
                    <input
                      type="text"
                      value={mediaAltTexts[m._id] || ""}
                      onChange={(e) => setMediaAltTexts({ ...mediaAltTexts, [m._id]: e.target.value })}
                      onBlur={() => handleUpdateMediaDetails(m._id)}
                      placeholder="Alt text accessibility"
                      className="rounded border border-gray-200 px-2 py-0.5 text-[10px] w-full"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase">File Folder</label>
                    <select
                      value={mediaFolders[m._id] || "General"}
                      onChange={(e) => {
                        const next = e.target.value;
                        setMediaFolders({ ...mediaFolders, [m._id]: next });
                        apiFetch(`/admin/media/${m._id}`, { method: "PUT", body: { folder: next } }).then(refreshSubData);
                      }}
                      className="rounded border border-gray-200 px-2 py-0.5 text-[10px] w-full bg-white outline-none"
                    >
                      <option value="General">General</option>
                      <option value="Products">Products</option>
                      <option value="Banners">Banners</option>
                      <option value="Assets">Assets</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1 mt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(m.url);
                        toast.success("URL copied to clipboard");
                      }}
                      className="flex-1 py-1 h-7 border-gray-200 text-gray-600 text-[10px]"
                    >
                      Copy URL
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleDeleteMediaItem(m._id)}
                      className="py-1 h-7 border-red-200 text-red-600 hover:bg-red-50 text-[10px] px-2"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. Customer Inquiries Inbox Tab */}
      {subTab === "inquiries" && (() => {
        const INQUIRIES_PER_PAGE = 10;
        const totalInquiryPages = Math.ceil(filteredInquiries.length / INQUIRIES_PER_PAGE) || 1;
        const paginatedInquiries = filteredInquiries.slice(
          (inquiryPage - 1) * INQUIRIES_PER_PAGE,
          inquiryPage * INQUIRIES_PER_PAGE
        );

        return (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-col gap-1 w-44">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Filter Inquiry Type</label>
                  <select
                    value={inquiryFilter}
                    onChange={(e) => {
                      setInquiryFilter(e.target.value);
                      setInquiryPage(1);
                    }}
                    className="h-8 rounded border border-gray-200 px-2 text-xs shadow-sm bg-white outline-none"
                  >
                    <option value="All">All Types</option>
                    <option value="General">General Enquiry</option>
                    <option value="Product Inquiry">Product Inquiry</option>
                    <option value="Order Status">Order Status</option>
                    <option value="Bulk Order">Wholesale / Bulk Order</option>
                    <option value="Distributor">Distributor</option>
                    <option value="Franchise">Franchise</option>
                  </select>
                </div>
              </div>

              <Button type="button" onClick={handleExportInquiriesCSV} className="border-purple-200 hover:bg-purple-50 text-purple-650 bg-white text-xs h-8">
                <Download className="size-3.5 mr-1" />
                Export CSV Records
              </Button>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 font-bold uppercase text-[10px]">
                      <th className="px-4 py-3">Inquiry Date</th>
                      <th className="px-4 py-3">Customer Info</th>
                      <th className="px-4 py-3">Message Subject & Body</th>
                      <th className="px-4 py-3">Inquiry Type</th>
                      <th className="px-4 py-3">Assign staff</th>
                      <th className="px-4 py-3">Resolver comment notes</th>
                      <th className="px-4 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedInquiries.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-xs text-gray-400 bg-gray-50/50">
                          No inquiries found.
                        </td>
                      </tr>
                    ) : (
                      paginatedInquiries.map((i) => (
                        <tr key={i._id} className="border-b border-gray-150 bg-white hover:bg-gray-50/50">
                          <td className="px-4 py-3 text-gray-400 w-28">{new Date(i.createdAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3 w-48">
                            <p className="font-bold text-gray-900">{i.name}</p>
                            <p className="text-[10px] text-gray-500">{i.email}</p>
                            <p className="text-[10px] font-semibold text-gray-700 mt-0.5">{i.phone}</p>
                          </td>
                          <td className="px-4 py-3 max-w-sm">
                            <p className="text-gray-700 whitespace-pre-wrap">{i.message}</p>
                          </td>
                          <td className="px-4 py-3 w-32">
                            <span className="rounded bg-orange-50 px-2 py-0.5 text-[9px] font-extrabold text-orange-700 border border-orange-200 uppercase tracking-wide">{i.inquiryType || "General"}</span>
                          </td>
                          <td className="px-4 py-3 w-36">
                            <select
                              value={i.assignedTo || ""}
                              onChange={(e) => handleUpdateInquiry(i._id, { assignedTo: e.target.value })}
                              className="rounded border border-gray-200 px-2 py-1 text-xs bg-white outline-none w-full"
                            >
                              <option value="">Unassigned</option>
                              <option value="Admin">Admin</option>
                              <option value="Storeowner">Storeowner</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              defaultValue={i.resolverNotes}
                              onBlur={(e) => handleUpdateInquiry(i._id, { resolverNotes: e.target.value })}
                              placeholder="Resolution comments..."
                              className="rounded border border-gray-200 px-2 py-1 text-xs w-full"
                            />
                          </td>
                          <td className="px-4 py-3 text-right w-28">
                            <select
                              value={i.status}
                              onChange={(e) => handleUpdateInquiry(i._id, { status: e.target.value })}
                              className={cn(
                                "rounded px-2 py-0.5 text-[10px] font-bold border",
                                i.status === "Resolved"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : "bg-red-50 text-red-700 border-red-200"
                              )}
                            >
                              <option value="Pending">Pending</option>
                              <option value="Resolved">Resolved</option>
                            </select>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bottom Pagination Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/70 px-4 py-3 text-xs">
                <span className="font-semibold text-gray-500">
                  Showing {filteredInquiries.length > 0 ? (inquiryPage - 1) * INQUIRIES_PER_PAGE + 1 : 0} to{" "}
                  {Math.min(inquiryPage * INQUIRIES_PER_PAGE, filteredInquiries.length)} of {filteredInquiries.length} inquiries
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={inquiryPage <= 1}
                    onClick={() => setInquiryPage((p) => Math.max(p - 1, 1))}
                    className="h-8 text-xs font-bold rounded-lg"
                  >
                    <ChevronLeft className="size-3.5 mr-0.5" /> Prev
                  </Button>
                  {Array.from({ length: totalInquiryPages }, (_, idx) => idx + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setInquiryPage(p)}
                      className={cn(
                        "size-7 rounded-lg text-xs font-bold transition-all",
                        p === inquiryPage
                          ? "bg-[#5B2C83] text-white shadow-2xs"
                          : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={inquiryPage >= totalInquiryPages}
                    onClick={() => setInquiryPage((p) => Math.min(p + 1, totalInquiryPages))}
                    className="h-8 text-xs font-bold rounded-lg"
                  >
                    Next <ChevronRight className="size-3.5 ml-0.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 8. Notification Templates Tab */}
      {subTab === "notifications" && (
        <NotificationTemplatesTab
          templates={msgTemplates}
          onSave={handleSaveNotificationTemplate}
        />
      )}

      {/* 9. Security Tab */}
      {subTab === "security" && (
        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[var(--shadow-soft)]">
            <div className="flex items-center gap-3.5">
              <div className="grid size-12 place-items-center rounded-xl bg-purple-50 text-purple-750 border border-purple-100/60 shadow-sm">
                <Lock className="size-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Admin Authentication Security</h3>
                <p className="text-xs text-gray-500 mt-0.5">Control password policies and access settings for your admin account.</p>
              </div>
            </div>

            <div className="my-6 h-px bg-gray-150" />

            {/* Password protected switch banner */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-purple-100 bg-purple-50/20 p-5 shadow-sm">
              <div className="flex-1 min-w-[280px]">
                <p className="text-sm font-bold text-gray-800">Password Protected Login Status</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  When enabled, accessing the admin console with +91 {user?.phone} requires entering the security password. SMS/OTP validation will be skipped.
                </p>
              </div>
              <div className="flex items-center">
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={passwordEnabled}
                    disabled={securityLoading}
                    onChange={(e) => handleTogglePasswordLogin(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-purple-650 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 cursor-pointer" />
                </label>
              </div>
            </div>

            {/* Split Grid for Password Configuration */}
            <div className="mt-8 grid gap-8 md:grid-cols-2">
              {/* Left Side: Auto Password Generator */}
              <div className="flex flex-col justify-between rounded-xl border border-gray-150 bg-gray-50/30 p-5">
                <div>
                  <h4 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-purple-500 animate-pulse" />
                    Auto-Generate Password
                  </h4>
                  <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                    Instantly create a strong, cryptographically secure password. This replaces any existing password and is highly recommended for security.
                  </p>
                </div>

                <div className="mt-6">
                  <Button
                    onClick={handleGeneratePassword}
                    disabled={securityLoading}
                    className="w-full bg-purple-650 hover:bg-purple-750 text-white font-bold text-xs py-2.5 rounded-lg shadow-sm"
                  >
                    {securityLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <RefreshCw className="size-4 animate-spin" /> Generating...
                      </span>
                    ) : (
                      "Generate New Secure Password"
                    )}
                  </Button>
                </div>

                {newlyGeneratedPassword && (
                  <div className="mt-5 rounded-xl border border-yellow-250 bg-yellow-50/50 p-4 animate-in fade-in duration-300">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="size-4.5 shrink-0 text-yellow-600 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[11px] font-bold text-yellow-800 uppercase tracking-wider">Save Password Now</h4>
                        <p className="text-[10px] text-yellow-700 mt-0.5 leading-relaxed">
                          Shown once for security. Save it safely in a password manager.
                        </p>

                        <div className="mt-3 flex items-center gap-2 rounded-lg border border-yellow-250 bg-white p-2 shadow-sm">
                          <code className="flex-1 select-all font-mono text-xs font-bold text-gray-850 break-all px-1.5">
                            {newlyGeneratedPassword}
                          </code>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(newlyGeneratedPassword);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            }}
                            className="flex items-center justify-center size-8 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-650 transition-colors border border-gray-200/50"
                            title="Copy to clipboard"
                          >
                            {copied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Side: Set Custom Password Form */}
              <div className="rounded-xl border border-gray-150 p-5 bg-white shadow-sm flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 mb-1.5">
                    <span className="size-2 rounded-full bg-purple-500" />
                    Set Custom Password
                  </h4>
                  <p className="text-xs text-gray-500 leading-relaxed mb-5">
                    Enter your own custom security password below to override the existing credentials.
                  </p>
                </div>

                <form onSubmit={handleSaveCustomPassword} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">New Password</label>
                    <div className="relative">
                      <Input
                        type={showCustomPassword ? "text" : "password"}
                        value={customPassword}
                        onChange={(e: any) => setCustomPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        className="text-xs pr-10 rounded-lg border-gray-300 focus:ring-purple-600/15 focus:border-purple-600"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCustomPassword(!showCustomPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-650 focus:outline-none"
                      >
                        {showCustomPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Confirm Password</label>
                    <Input
                      type={showCustomPassword ? "text" : "password"}
                      value={confirmCustomPassword}
                      onChange={(e: any) => setConfirmCustomPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="text-xs rounded-lg border-gray-300 focus:ring-purple-600/15 focus:border-purple-600"
                      required
                    />
                  </div>

                  <div className="mt-2">
                    <Button
                      type="submit"
                      disabled={securityLoading}
                      className="w-full bg-purple-650 hover:bg-purple-755 text-white font-bold text-xs py-2.5 rounded-lg shadow-sm"
                    >
                      {securityLoading ? "Updating..." : "Update Security Password"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationTemplatesTab({
  templates,
  onSave,
}: {
  templates: any[];
  onSave: (id: string, fields: any) => Promise<void>;
}) {
  const [filterChannel, setFilterChannel] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [previewTemplate, setPreviewTemplate] = React.useState<any | null>(null);
  const [savingId, setSavingId] = React.useState<string | null>(null);

  const [editedFields, setEditedFields] = React.useState<Record<string, { subject?: string; body?: string; isActive?: boolean }>>({});

  const ITEMS_PER_PAGE = 6;

  const filtered = templates.filter((t) => {
    const matchesChannel = filterChannel === "all" || t.channel?.toLowerCase() === filterChannel.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      t.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.key?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.body?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesChannel && matchesSearch;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleFieldChange = (id: string, field: "subject" | "body" | "isActive", value: any) => {
    setEditedFields((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleSaveSingle = async (template: any) => {
    setSavingId(template._id);
    const updates = editedFields[template._id] || {};
    const payload = {
      subject: updates.subject !== undefined ? updates.subject : template.subject,
      body: updates.body !== undefined ? updates.body : template.body,
      isActive: updates.isActive !== undefined ? updates.isActive : template.isActive ?? true,
    };
    await onSave(template._id, payload);
    setSavingId(null);
  };

  const copyVariableTag = (tag: string) => {
    navigator.clipboard.writeText(tag);
    toast.success(`Copied ${tag} tag to clipboard!`);
  };

  const renderPreviewText = (text: string) => {
    if (!text) return "";
    return text
      .replace(/\{Customer Name\}/gi, "Rahul Sharma")
      .replace(/\{Order Number\}/gi, "RW-98402")
      .replace(/\{Order Amount\}/gi, "₹1,499")
      .replace(/\{Coupon Code\}/gi, "CRUNCH10")
      .replace(/\{Product Name\}/gi, "Original Salted (Pack of 3)")
      .replace(/\{Tracking Number\}/gi, "AWB98457291");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner & Variable Allowlist */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Dynamic Notification Variables</h4>
            <p className="text-xs text-amber-800 mt-0.5">Click any variable chip below to copy it and paste into email or WhatsApp templates:</p>
          </div>
          <span className="text-[10px] font-extrabold uppercase bg-amber-200/80 text-amber-950 px-2.5 py-1 rounded-full border border-amber-300">
            6 System Variables
          </span>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {[
            "{Customer Name}",
            "{Order Number}",
            "{Order Amount}",
            "{Coupon Code}",
            "{Product Name}",
            "{Tracking Number}",
          ].map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => copyVariableTag(tag)}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-amber-100 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-amber-900 border border-amber-300 shadow-2xs transition-all hover:scale-105 cursor-pointer"
            >
              <span>{tag}</span>
              <Copy className="size-3 text-amber-700" />
            </button>
          ))}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
        <div className="flex items-center gap-2">
          {["all", "email", "whatsapp", "sms"].map((ch) => (
            <button
              key={ch}
              onClick={() => {
                setFilterChannel(ch);
                setCurrentPage(1);
              }}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-xl capitalize transition-all cursor-pointer",
                filterChannel === ch
                  ? "bg-[#5B2C83] text-white shadow-2xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {ch === "all" ? "All Templates" : ch}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search templates..."
            className="text-xs bg-white pr-8"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Templates Grid */}
      {paginated.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center">
          <p className="text-xs text-gray-400 font-medium">No notification templates match your search filter.</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {paginated.map((t) => {
            const currentSub = editedFields[t._id]?.subject !== undefined ? editedFields[t._id].subject : t.subject || "";
            const currentBody = editedFields[t._id]?.body !== undefined ? editedFields[t._id].body : t.body || "";
            const currentActive = editedFields[t._id]?.isActive !== undefined ? editedFields[t._id].isActive : t.isActive ?? true;

            const isModified =
              (editedFields[t._id]?.subject !== undefined && editedFields[t._id].subject !== t.subject) ||
              (editedFields[t._id]?.body !== undefined && editedFields[t._id].body !== t.body) ||
              (editedFields[t._id]?.isActive !== undefined && editedFields[t._id].isActive !== t.isActive);

            return (
              <div key={t._id} className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:border-purple-200 transition-all gap-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">{t.label}</h3>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">{t.key}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "rounded-xl px-2.5 py-1 text-[10px] font-extrabold uppercase border shadow-2xs",
                          t.channel === "whatsapp"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : t.channel === "sms"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-purple-50 text-purple-700 border-purple-200"
                        )}
                      >
                        {t.channel}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500">{t.description}</p>

                  {(t.channel === "email" || t.channel === "notification") && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gray-700">Email Subject</label>
                      <input
                        type="text"
                        value={currentSub}
                        onChange={(e) => handleFieldChange(t._id, "subject", e.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 font-medium outline-none focus:border-purple-600"
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700">Body Content Template</label>
                    <textarea
                      rows={4}
                      value={currentBody}
                      onChange={(e) => handleFieldChange(t._id, "body", e.target.value)}
                      className="w-full font-mono rounded-xl border border-gray-200 p-3 text-xs text-gray-800 outline-none focus:border-purple-600 leading-relaxed"
                    />
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`act-${t._id}`}
                      checked={currentActive}
                      onChange={(e) => handleFieldChange(t._id, "isActive", e.target.checked)}
                      className="size-4 accent-[#5B2C83] cursor-pointer"
                    />
                    <label htmlFor={`act-${t._id}`} className="text-xs font-bold text-gray-700 cursor-pointer">
                      {currentActive ? "Active" : "Disabled"}
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewTemplate(t)}
                      className="h-8 text-xs font-bold rounded-xl"
                    >
                      <Eye className="size-3.5 mr-1" /> Preview
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={savingId === t._id}
                      onClick={() => handleSaveSingle(t)}
                      className={cn(
                        "h-8 text-xs font-bold rounded-xl text-white transition-all px-4 cursor-pointer",
                        isModified ? "bg-amber-600 hover:bg-amber-700" : "bg-[#5B2C83] hover:bg-[#4a236c]"
                      )}
                    >
                      {savingId === t._id ? "Saving..." : isModified ? "Save Changes" : "Save Template"}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Footer Bar */}
      {filtered.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-white px-5 py-3.5 rounded-2xl shadow-2xs text-xs">
          <span className="font-semibold text-gray-500">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} templates
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className="h-8 text-xs font-bold rounded-xl"
            >
              <ChevronLeft className="size-3.5 mr-0.5" /> Prev
            </Button>
            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className={cn(
                  "size-7 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  p === currentPage
                    ? "bg-[#5B2C83] text-white shadow-2xs"
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                )}
              >
                {p}
              </button>
            ))}
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              className="h-8 text-xs font-bold rounded-xl"
            >
              Next <ChevronRight className="size-3.5 ml-0.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Live Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-xs p-4">
          <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                  {previewTemplate.channel} Preview
                </span>
                <h3 className="text-base font-bold text-gray-900 mt-1">{previewTemplate.label}</h3>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="size-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            {previewTemplate.subject && (
              <div className="flex flex-col gap-1 rounded-xl bg-purple-50/50 p-3 border border-purple-100">
                <span className="text-[10px] font-extrabold uppercase text-purple-800">Rendered Subject Line</span>
                <p className="text-xs font-bold text-gray-900">
                  {renderPreviewText(editedFields[previewTemplate._id]?.subject ?? previewTemplate.subject)}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-1 rounded-xl bg-gray-50 p-4 border border-gray-200">
              <span className="text-[10px] font-extrabold uppercase text-gray-400 mb-1">Rendered Message Body</span>
              <p className="text-xs text-gray-800 font-medium whitespace-pre-wrap leading-relaxed">
                {renderPreviewText(editedFields[previewTemplate._id]?.body ?? previewTemplate.body)}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setPreviewTemplate(null)} className="bg-[#5B2C83] text-white font-bold rounded-xl px-5">
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/* MODULE 11: SECURITY AUDIT LOGS                                      */
/* ================================================================== */

function AuditLogsTab() {
  const [logs, setLogs] = React.useState<any[]>([]);
  const [currentPage, setCurrentPage] = React.useState(1);
  const LOGS_PER_PAGE = 10;

  React.useEffect(() => {
    apiFetch("/admin/audit-logs")
      .then((res) => {
        if (res && res.data) {
          setLogs(res.data);
        } else if (Array.isArray(res)) {
          setLogs(res);
        }
      })
      .catch(() => {});
  }, []);

  const totalPages = Math.ceil(logs.length / LOGS_PER_PAGE) || 1;
  const paginatedLogs = logs.slice(
    (currentPage - 1) * LOGS_PER_PAGE,
    currentPage * LOGS_PER_PAGE
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 font-bold text-xs uppercase tracking-wider">
                <th className="p-4">Timestamp</th>
                <th className="p-4">User / Role</th>
                <th className="p-4">Operational Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-xs text-gray-400">
                    No audit logs recorded yet.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((l, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="p-4 font-medium text-gray-500 font-mono text-xs">
                      {new Date(l.timestamp || l.time).toLocaleString()}
                    </td>
                    <td className="p-4 text-xs">
                      <span className="font-bold text-purple-700 block">{l.user || 'System'}</span>
                      <span className="text-[10px] text-gray-400 font-semibold uppercase">{l.role || 'System'}</span>
                    </td>
                    <td className="p-4 text-xs text-gray-700 font-semibold">{l.action}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Pagination Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/70 px-4 py-3 text-xs">
          <span className="font-semibold text-gray-500">
            Showing {logs.length > 0 ? (currentPage - 1) * LOGS_PER_PAGE + 1 : 0} to{" "}
            {Math.min(currentPage * LOGS_PER_PAGE, logs.length)} of {logs.length} audit logs
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className="h-8 text-xs font-bold rounded-lg"
            >
              <ChevronLeft className="size-3.5 mr-0.5" /> Prev
            </Button>
            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className={cn(
                  "size-7 rounded-lg text-xs font-bold transition-all",
                  p === currentPage
                    ? "bg-[#5B2C83] text-white shadow-2xs"
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                )}
              >
                {p}
              </button>
            ))}
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              className="h-8 text-xs font-bold rounded-lg"
            >
              Next <ChevronRight className="size-3.5 ml-0.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AdminNotification {
  _id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

interface DeliveryPartnerItem {
  _id: string;
  companyName: string;
  logo?: string;
  contact: string;
  email: string;
  gst?: string;
  address?: string;
  status: "Active" | "Inactive";
  apiKeys?: string;
  supportedRegions?: string[];
  trackingUrl?: string;
}

function NotificationsTab({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onDelete,
  onLoad,
  pagination,
  loading,
}: {
  notifications: AdminNotification[];
  onMarkRead: (id: string) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onLoad: (query: Record<string, string | number>) => Promise<void>;
  pagination: ApiPagination | null;
  loading: boolean;
}) {
  const [search, setSearch] = React.useState("");
  const [type, setType] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [debouncedSearch, setDebouncedSearch] = React.useState("");

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  React.useEffect(() => {
    onLoad({ page: currentPage, limit: 10, search: debouncedSearch, type });
  }, [currentPage, debouncedSearch, type, onLoad]);

  const totalPages = pagination?.totalPages || 1;

  return (
    <div className="flex flex-col gap-5">
      <div className="border-b border-gray-100 pb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">System Alerts</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onMarkAllRead()}
          className="flex items-center gap-1.5 rounded-xl border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold shadow-2xs transition-all"
        >
          <CheckCheck className="size-4 text-purple-600" />
          Mark All as Read
        </Button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search alerts by title or message..."
            className="pl-9 bg-white border-gray-200 text-xs"
          />
        </div>
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setCurrentPage(1);
          }}
          className="rounded-xl border border-gray-200 bg-white p-2.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600/20"
        >
          <option value="">All Alert Types</option>
          <option value="General">General</option>
          <option value="OrderStatus">Order Status</option>
          <option value="Inventory">Inventory</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-gray-400">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="py-12 text-center text-xs text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          No system notifications found matching the criteria.
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {notifications.map((n) => {
            const getNotificationIconAndStyle = (type: string) => {
              switch (type) {
                case "OrderStatus":
                  return {
                    icon: <Truck className="size-4 text-blue-600" />,
                    bgColor: "bg-blue-50 border-blue-100",
                    badgeVariant: "outline" as const,
                  };
                case "Inventory":
                  return {
                    icon: <AlertTriangle className="size-4 text-orange-600" />,
                    bgColor: "bg-orange-50/50 border-orange-100",
                    badgeVariant: "orange" as const,
                  };
                case "Coupon":
                case "Offer":
                  return {
                    icon: <Tag className="size-4 text-green-600" />,
                    bgColor: "bg-green-50 border-green-100",
                    badgeVariant: "green" as const,
                  };
                default:
                  return {
                    icon: <Info className="size-4 text-purple-600" />,
                    bgColor: "bg-purple-50 border-purple-100",
                    badgeVariant: "soft" as const,
                  };
              }
            };

            const { icon, bgColor, badgeVariant } = getNotificationIconAndStyle(n.type);

            return (
              <div
                key={n._id}
                onClick={() => {
                  if (!n.read) onMarkRead(n._id);
                }}
                className={cn(
                  "p-4 rounded-2xl border transition-all flex items-start gap-4 cursor-pointer hover:shadow-md",
                  n.read
                    ? "bg-white border-gray-200/80 hover:border-gray-300"
                    : "bg-purple-50/30 border-purple-200 border-l-4 border-l-[#5B2C83] hover:border-purple-300 shadow-2xs"
                )}
              >
                {/* Visual Icon Badge */}
                <div className={cn("grid size-9 shrink-0 place-items-center rounded-xl border shadow-2xs", bgColor)}>
                  {icon}
                </div>

                <div className="flex-1 flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("text-xs font-bold", n.read ? "text-gray-700" : "text-gray-900")}>
                      {n.title}
                    </span>
                    <Badge variant={badgeVariant} size="sm" className="text-[9px] font-bold uppercase tracking-wider">
                      {n.type || "ALERT"}
                    </Badge>
                    {!n.read && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[9px] font-extrabold text-purple-800 border border-purple-200/60">
                        <span className="size-1.5 rounded-full bg-purple-600 animate-pulse" />
                        UNREAD
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 font-medium leading-relaxed mt-0.5">{n.message}</p>
                  <span className="text-[10px] text-gray-400 mt-1 font-mono">
                    {new Date(n.createdAt).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!n.read ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkRead(n._id);
                      }}
                      title="Mark as read"
                      className="flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-100 transition-all shrink-0 shadow-2xs"
                    >
                      <CheckCheck className="size-3.5 text-purple-600" />
                      <span>Mark as read</span>
                    </button>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 shrink-0 px-2 py-1">
                      <CheckCheck className="size-3.5 text-gray-400" />
                      Read
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(n._id);
                    }}
                    title="Delete notification"
                    className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-xl transition-colors shrink-0"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-2">
          <span className="text-[11px] font-bold text-gray-400">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="h-8 text-xs font-bold rounded-lg"
            >
              <ChevronLeft className="size-4" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="h-8 text-xs font-bold rounded-lg"
            >
              Next <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/* MODULE 13: LOGISTICS PARTNER HUB                                  */
/* ================================================================== */

function LogisticsTab() {
  const [partners, setPartners] = React.useState<DeliveryPartnerItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editingPartner, setEditingPartner] = React.useState<DeliveryPartnerItem | null>(null);
  const [isAddOpen, setIsAddOpen] = React.useState(false);

  // Form states
  const [companyName, setCompanyName] = React.useState("");
  const [logo, setLogo] = React.useState("");
  const [contact, setContact] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [gst, setGst] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [status, setStatus] = React.useState<"Active" | "Inactive">("Active");
  const [apiKeys, setApiKeys] = React.useState("");
  const [supportedRegions, setSupportedRegions] = React.useState("");
  const [trackingUrl, setTrackingUrl] = React.useState("");

  const fetchPartners = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = (await apiFetch<Record<string, unknown>>("/admin/logistics/partners")) as Record<string, unknown>;
      setPartners((res.data as DeliveryPartnerItem[]) || []);
    } catch (err) {
      console.error("Failed to load delivery partners:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPartners();
  }, [fetchPartners]);

  const handleEdit = (partner: DeliveryPartnerItem) => {
    setEditingPartner(partner);
    setCompanyName(partner.companyName);
    setLogo(partner.logo || "");
    setContact(partner.contact);
    setEmail(partner.email);
    setGst(partner.gst || "");
    setAddress(partner.address || "");
    setStatus(partner.status);
    setApiKeys(partner.apiKeys || "");
    setSupportedRegions((partner.supportedRegions || []).join(", "));
    setTrackingUrl(partner.trackingUrl || "");
    setIsAddOpen(true);
  };

  const handleReset = () => {
    setEditingPartner(null);
    setCompanyName("");
    setLogo("");
    setContact("");
    setEmail("");
    setGst("");
    setAddress("");
    setStatus("Active");
    setApiKeys("");
    setSupportedRegions("");
    setTrackingUrl("");
    setIsAddOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !contact || !email) {
      toast.error("Please fill in required fields.");
      return;
    }

    const payload = {
      companyName,
      logo,
      contact,
      email,
      gst,
      address,
      status,
      apiKeys,
      supportedRegions: supportedRegions.split(",").map((s) => s.trim()).filter(Boolean),
      trackingUrl,
    };

    try {
      if (editingPartner) {
        await apiFetch(`/admin/logistics/partners/${editingPartner._id}`, {
          method: "PUT",
          body: payload,
        });
        toast.success("Delivery partner updated successfully");
      } else {
        await apiFetch("/admin/logistics/partners", {
          method: "POST",
          body: payload,
        });
        toast.success("Delivery partner onboarded successfully");
      }
      handleReset();
      fetchPartners();
    } catch (err) {
      console.error("Failed to save delivery partner:", err);
      toast.error("Failed to save delivery partner");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this delivery partner?")) return;
    try {
      await apiFetch(`/admin/logistics/partners/${id}`, { method: "DELETE" });
      toast.success("Delivery partner deleted");
      fetchPartners();
    } catch (err) {
      console.error("Failed to delete partner:", err);
      toast.error("Failed to delete partner");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="border-b border-gray-100 pb-4 flex items-center justify-end gap-4">
        {!isAddOpen && (
          <Button onClick={() => setIsAddOpen(true)} size="sm" className="w-fit flex items-center gap-1.5">
            <Plus className="size-4" /> Onboard Partner
          </Button>
        )}
      </div>

      {isAddOpen ? (
        <form onSubmit={handleSubmit} className="bg-gray-50/50 border border-gray-100 rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <span className="text-sm font-bold text-gray-800">
              {editingPartner ? `Edit Onboard Profile: ${editingPartner.companyName}` : "Onboard Shipping Partner"}
            </span>
            <button type="button" onClick={handleReset} className="text-xs text-gray-400 hover:text-gray-600 font-semibold">
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Company Name *</label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Blue Dart Express"
                className="bg-white border-gray-200 text-xs"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Contact Number *</label>
              <Input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="e.g. +91 99999 88888"
                className="bg-white border-gray-200 text-xs"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Email Address *</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. operations@bluedart.com"
                className="bg-white border-gray-200 text-xs"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">GST Registration</label>
              <Input
                value={gst}
                onChange={(e) => setGst(e.target.value)}
                placeholder="e.g. 27AAAAA1111A1Z1"
                className="bg-white border-gray-200 text-xs"
              />
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Office Address</label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Cargo Terminal, Mumbai Airport"
                className="bg-white border-gray-200 text-xs"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="rounded-xl border border-gray-200 bg-white p-2.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600/20"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Supported Regions (comma-separated)</label>
              <Input
                value={supportedRegions}
                onChange={(e) => setSupportedRegions(e.target.value)}
                placeholder="e.g. Maharashtra, Gujarat, Delhi"
                className="bg-white border-gray-200 text-xs"
              />
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">API Keys / Credential String</label>
              <textarea
                rows={2}
                value={apiKeys}
                onChange={(e) => setApiKeys(e.target.value)}
                placeholder='e.g. {"client_id": "BD_88", "secret": "..."}'
                className="w-full rounded-xl border border-gray-200 bg-white p-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600/20"
              />
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Tracking Redirect URL</label>
              <Input
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
                placeholder="e.g. https://www.bluedart.com/track/{id}"
                className="bg-white border-gray-200 text-xs"
              />
            </div>
          </div>

          <Button type="submit" className="w-fit self-end mt-2">
            {editingPartner ? "Save Partner Details" : "Complete Onboarding"}
          </Button>
        </form>
      ) : (
        <div className="overflow-x-auto border border-gray-100 rounded-xl shadow-sm">
          {loading ? (
            <div className="py-12 text-center text-xs text-gray-400 bg-white">Loading partners...</div>
          ) : partners.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400 bg-white">No delivery partners onboarded yet.</div>
          ) : (
            <table className="w-full min-w-[700px] text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 font-bold text-xs uppercase tracking-wider">
                  <th className="p-4">Partner Name</th>
                  <th className="p-4">Contact Info</th>
                  <th className="p-4">GST No.</th>
                  <th className="p-4">Regions</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {partners.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50/50">
                    <td className="p-4 font-bold text-gray-800">{p.companyName}</td>
                    <td className="p-4">
                      <div className="text-xs text-gray-700 font-semibold">{p.contact}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{p.email}</div>
                    </td>
                    <td className="p-4 font-semibold text-gray-500 text-xs">{p.gst || "—"}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {(p.supportedRegions || []).map((reg: string, idx: number) => (
                          <Badge key={idx} variant="soft" className="text-[9px] font-bold">
                            {reg}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant={p.status === "Active" ? "green" : "red"} className="text-[9px] uppercase font-bold">
                        {p.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => handleEdit(p)}
                          className="text-gray-400 hover:text-purple-650 p-1.5 hover:bg-purple-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p._id)}
                          className="text-gray-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/* MODULE 14: GST TAXES & SETTINGS                                    */
/* ================================================================== */

function GstTab({ orders }: { orders: Order[] }) {
  const { settings, updateSettings } = useStoreSettings();
  const { user } = useAccount();
  const isReadOnly = user?.role === "Manager";

  // Configuration States
  const [gstEnabled, setGstEnabled] = React.useState(settings.gstEnabled !== false);
  const [gstNumber, setGstNumber] = React.useState(settings.gstNumber || "");
  const [businessName, setBusinessName] = React.useState(settings.businessName || "");
  const [businessAddress, setBusinessAddress] = React.useState(settings.businessAddress || "");
  const [panNumber, setPanNumber] = React.useState(settings.panNumber || "");
  const [businessState, setBusinessState] = React.useState(settings.businessState || "Maharashtra");
  const [taxRate, setTaxRate] = React.useState(settings.taxRate || 5);
  const [gstSlabs, setGstSlabs] = React.useState<number[]>(settings.gstSlabs || [0, 3, 5, 12, 18, 28]);
  const [defaultHsnCode, setDefaultHsnCode] = React.useState(settings.defaultHsnCode || "1905");
  const [invoicePrefix, setInvoicePrefix] = React.useState(settings.invoicePrefix || "INV-");
  const [invoiceStartNumber, setInvoiceStartNumber] = React.useState(settings.invoiceStartNumber || 1);
  const [financialYear, setFinancialYear] = React.useState(settings.financialYear || "2026-27");
  const [reverseChargeEnabled, setReverseChargeEnabled] = React.useState(settings.reverseChargeEnabled || false);
  const [compositionSchemeEnabled, setCompositionSchemeEnabled] = React.useState(settings.compositionSchemeEnabled || false);
  const [roundOffEnabled, setRoundOffEnabled] = React.useState(settings.roundOffEnabled !== false);
  const [taxInclusive, setTaxInclusive] = React.useState(settings.taxInclusive !== false);

  const [savingSettings, setSavingSettings] = React.useState(false);
  const [confirmingDisable, setConfirmingDisable] = React.useState(false);
  const [activeSubTab, setActiveSubTab] = React.useState<"config" | "calculator" | "ledger">("config");

  // Calculator States
  const [calcAmount, setCalcAmount] = React.useState<string>("1000");
  const [calcRate, setCalcRate] = React.useState<number>(18);
  const [calcType, setCalcType] = React.useState<"exclusive" | "inclusive">("inclusive");
  const [calcQty, setCalcQty] = React.useState<string>("1");
  const [calcDiscBefore, setCalcDiscBefore] = React.useState<string>("0");
  const [calcDiscAfter, setCalcDiscAfter] = React.useState<string>("0");
  const [calcRoundOffEnabled, setCalcRoundOffEnabled] = React.useState<boolean>(true);
  const [calcSplitType, setCalcSplitType] = React.useState<"intrastate" | "interstate">("intrastate");

  // Ledger Filter States
  const [dateFilter, setDateFilter] = React.useState<"today" | "week" | "month" | "year" | "custom">("month");
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");
  const [exportingFormat, setExportingFormat] = React.useState<string | null>(null);

  // Sync settings when loaded
  React.useEffect(() => {
    setGstEnabled(settings.gstEnabled !== false);
    setGstNumber(settings.gstNumber || "");
    setBusinessName(settings.businessName || "");
    setBusinessAddress(settings.businessAddress || "");
    setPanNumber(settings.panNumber || "");
    setBusinessState(settings.businessState || "Maharashtra");
    setTaxRate(settings.taxRate || 5);
    setGstSlabs(settings.gstSlabs || [0, 3, 5, 12, 18, 28]);
    setDefaultHsnCode(settings.defaultHsnCode || "1905");
    setInvoicePrefix(settings.invoicePrefix || "INV-");
    setInvoiceStartNumber(settings.invoiceStartNumber || 1);
    setFinancialYear(settings.financialYear || "2026-27");
    setReverseChargeEnabled(settings.reverseChargeEnabled || false);
    setCompositionSchemeEnabled(settings.compositionSchemeEnabled || false);
    setRoundOffEnabled(settings.roundOffEnabled !== false);
    setTaxInclusive(settings.taxInclusive !== false);
  }, [settings]);

  // Synchronize calculator rate default
  React.useEffect(() => {
    if (gstSlabs.length > 0 && !gstSlabs.includes(calcRate)) {
      setCalcRate(gstSlabs[0]);
    }
  }, [gstSlabs]);

  const handleSaveGstSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    if (gstEnabled && gstNumber) {
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstinRegex.test(gstNumber.trim().toUpperCase())) {
        toast.error("Invalid GSTIN format. Must be 15 characters matching standard Indian GSTIN format (e.g. 27AAAAA0000A1Z5).");
        return;
      }
    }

    // Check active orders count before disabling GST
    const activeOrderCount = orders.filter(
      (o) =>
        o.status !== "Cancelled" &&
        o.status !== "Delivered" &&
        o.status !== "Refund Completed" &&
        o.status !== "Returned"
    ).length;

    if (!gstEnabled && settings.gstEnabled !== false && activeOrderCount > 0) {
      setConfirmingDisable(true);
      return;
    }

    await saveSettingsDirectly();
  };

  const saveSettingsDirectly = async () => {
    setSavingSettings(true);
    try {
      await updateSettings({
        gstEnabled,
        gstNumber,
        businessName,
        businessAddress,
        panNumber,
        businessState,
        taxRate: Number(taxRate),
        gstSlabs,
        defaultHsnCode,
        invoicePrefix,
        invoiceStartNumber: Number(invoiceStartNumber),
        financialYear,
        reverseChargeEnabled,
        compositionSchemeEnabled,
        roundOffEnabled,
        taxInclusive
      });
      toast.success("GST & tax settings saved successfully");
    } catch {
      toast.error("Failed to save tax configurations");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleConfirmDisableSave = async () => {
    setConfirmingDisable(false);
    setSavingSettings(true);
    try {
      await updateSettings({
        gstEnabled: false,
        gstNumber,
        businessName,
        businessAddress,
        panNumber,
        businessState,
        taxRate: Number(taxRate),
        gstSlabs,
        defaultHsnCode,
        invoicePrefix,
        invoiceStartNumber: Number(invoiceStartNumber),
        financialYear,
        reverseChargeEnabled,
        compositionSchemeEnabled,
        roundOffEnabled,
        taxInclusive
      });
      toast.success("GST Tax deactivated successfully.");
    } catch {
      toast.error("Failed to disable GST settings");
    } finally {
      setSavingSettings(false);
    }
  };

  // Perform calculator math
  const amt = parseFloat(calcAmount) || 0;
  const qty = parseFloat(calcQty) || 1;
  const discBefore = parseFloat(calcDiscBefore) || 0;
  const discAfter = parseFloat(calcDiscAfter) || 0;
  const rate = calcRate;

  const baseBeforeTax = (amt * qty) - discBefore;
  const isInclusive = calcType === "inclusive";

  let baseVal = 0;
  let gstAmount = 0;
  let finalPrice = 0;

  if (isInclusive) {
    const finalPriceWithoutShipping = baseBeforeTax - discAfter;
    baseVal = finalPriceWithoutShipping / (1 + rate / 100);
    gstAmount = finalPriceWithoutShipping - baseVal;
    finalPrice = finalPriceWithoutShipping;
  } else {
    baseVal = baseBeforeTax - discAfter;
    gstAmount = baseVal * (rate / 100);
    finalPrice = baseVal + gstAmount;
  }

  const isSameState = calcSplitType === "intrastate";
  const cgst = isSameState ? gstAmount / 2 : 0;
  const sgst = isSameState ? gstAmount / 2 : 0;
  const igst = isSameState ? 0 : gstAmount;

  let netPayable = finalPrice;
  if (calcRoundOffEnabled) {
    netPayable = Math.round(netPayable);
  }

  // Active orders metrics
  const activeOrders = React.useMemo(() => orders.filter((o) => o.status !== "Cancelled"), [orders]);

  const totalTaxCollected = React.useMemo(() => {
    return activeOrders.reduce((sum, o) => sum + (o.totals?.gst || 0), 0);
  }, [activeOrders]);

  const totalTaxableRevenue = React.useMemo(() => {
    return activeOrders.reduce((sum, o) => {
      const finalTotal = o.totals?.total || 0;
      const gstTotal = o.totals?.gst || 0;
      const taxable = o.totals?.subtotal || (finalTotal - gstTotal);
      return sum + taxable;
    }, 0);
  }, [activeOrders]);

  // Slabs tags helper
  const ALL_SLABS = [0, 3, 5, 12, 18, 28];
  const handleToggleSlab = (slab: number) => {
    if (isReadOnly) return;
    if (gstSlabs.includes(slab)) {
      if (gstSlabs.length === 1) {
        toast.error("At least one GST slab must be active.");
        return;
      }
      setGstSlabs(gstSlabs.filter((s) => s !== slab));
    } else {
      setGstSlabs([...gstSlabs, slab].sort((a, b) => a - b));
    }
  };

  // Ledger date filter calculations
  const ledgerOrders = React.useMemo(() => {
    const now = new Date();
    return activeOrders.filter((o) => {
      const date = new Date(o.createdAt);
      if (dateFilter === "today") {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return date >= start;
      }
      if (dateFilter === "week") {
        const start = new Date();
        start.setDate(now.getDate() - 7);
        return date >= start;
      }
      if (dateFilter === "month") {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        return date >= start;
      }
      if (dateFilter === "year") {
        const start = new Date(now.getFullYear(), 0, 1);
        return date >= start;
      }
      if (dateFilter === "custom") {
        let match = true;
        if (fromDate) {
          const fDate = new Date(fromDate);
          match = match && date >= fDate;
        }
        if (toDate) {
          const tDate = new Date(toDate);
          tDate.setHours(23, 59, 59, 999);
          match = match && date <= tDate;
        }
        return match;
      }
      return true;
    });
  }, [activeOrders, dateFilter, fromDate, toDate]);

  const ledgerTaxCollected = React.useMemo(() => {
    return ledgerOrders.reduce((sum, o) => sum + (o.totals?.gst || 0), 0);
  }, [ledgerOrders]);

  const ledgerTaxableTurnover = React.useMemo(() => {
    return ledgerOrders.reduce((sum, o) => {
      const finalTotal = o.totals?.total || 0;
      const gstTotal = o.totals?.gst || 0;
      const taxable = o.totals?.subtotal || (finalTotal - gstTotal);
      return sum + taxable;
    }, 0);
  }, [ledgerOrders]);

  // Export ledger handler
  const handleExportLedger = async (fmt: "excel" | "csv" | "pdf") => {
    setExportingFormat(fmt);
    try {
      const tokens = getTokens();
      const headers: Record<string, string> = {};
      if (tokens?.accessToken) {
        headers["Authorization"] = `Bearer ${tokens.accessToken}`;
      }

      let urlParams = `type=gst-ledger&format=${fmt}`;
      if (dateFilter !== "custom") {
        const now = new Date();
        let fromDateStr = "";
        if (dateFilter === "today") {
          fromDateStr = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        } else if (dateFilter === "week") {
          const d = new Date();
          d.setDate(now.getDate() - 7);
          fromDateStr = d.toISOString();
        } else if (dateFilter === "month") {
          fromDateStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        } else if (dateFilter === "year") {
          fromDateStr = new Date(now.getFullYear(), 0, 1).toISOString();
        }
        if (fromDateStr) {
          urlParams += `&from=${fromDateStr}`;
        }
      } else {
        if (fromDate) urlParams += `&from=${new Date(fromDate).toISOString()}`;
        if (toDate) {
          const tDate = new Date(toDate);
          tDate.setHours(23, 59, 59, 999);
          urlParams += `&to=${tDate.toISOString()}`;
        }
      }

      const res = await fetch(`/api/v1/admin/reports/export?${urlParams}`, {
        headers
      });

      if (!res.ok) throw new Error();

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      const fileExts: Record<string, string> = { excel: "xlsx", pdf: "pdf", csv: "csv" };
      a.download = `gst-ledger-report-${Date.now()}.${fileExts[fmt] || "xlsx"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Ledger downloaded successfully");
    } catch {
      toast.error("Failed to generate ledger file");
    } finally {
      setExportingFormat(null);
    }
  };

  const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
    "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", 
    "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
  ];

  const INPUT_STYLE = "h-9 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 text-xs font-medium text-[#111827] focus:border-purple-550 focus:ring-1 focus:ring-purple-550 focus:outline-none disabled:bg-[#F8FAFC] disabled:text-[#6B7280]";

  return (
    <div className="flex flex-col gap-5">
      {isReadOnly && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-center gap-2 font-medium">
          <Lock className="size-4 text-amber-600" />
          You have view-only access to Tax configurations as a Manager.
        </div>
      )}

      {/* Metric Cards Banner */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-sm flex flex-col gap-1">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Turnover (Taxable)</span>
          <p className="text-xl font-black text-gray-800">₹{totalTaxableRevenue.toLocaleString("en-IN")}</p>
          <span className="text-[9px] font-semibold text-gray-400">Aggregated active taxable base</span>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-sm flex flex-col gap-1">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total GST Collected</span>
          <p className="text-xl font-black text-purple-700">₹{totalTaxCollected.toLocaleString("en-IN")}</p>
          <span className="text-[9px] font-semibold text-purple-500">CGST + SGST + IGST collected</span>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-sm flex flex-col gap-1">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">CGST (Intrastate)</span>
          <p className="text-xl font-black text-gray-800">₹{(totalTaxCollected / 2).toLocaleString("en-IN")}</p>
          <span className="text-[9px] font-semibold text-gray-400">Central share on Maharashtra sales</span>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-sm flex flex-col gap-1">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">SGST (Intrastate)</span>
          <p className="text-xl font-black text-gray-800">₹{(totalTaxCollected / 2).toLocaleString("en-IN")}</p>
          <span className="text-[9px] font-semibold text-gray-400">State share on Maharashtra sales</span>
        </div>
      </div>

      {/* Sub-Tab Navigation */}
      <div className="flex border-b border-gray-150 gap-2">
        <button
          onClick={() => setActiveSubTab("config")}
          className={cn(
            "pb-2.5 text-xs font-bold transition-all border-b-2 px-1",
            activeSubTab === "config"
              ? "border-purple-650 text-purple-750"
              : "border-transparent text-gray-450 hover:text-gray-700"
          )}
        >
          GST & Tax Configuration
        </button>
        <button
          onClick={() => setActiveSubTab("calculator")}
          className={cn(
            "pb-2.5 text-xs font-bold transition-all border-b-2 px-1",
            activeSubTab === "calculator"
              ? "border-purple-650 text-purple-750"
              : "border-transparent text-gray-450 hover:text-gray-700"
          )}
        >
          Interactive GST Calculator
        </button>
        <button
          onClick={() => setActiveSubTab("ledger")}
          className={cn(
            "pb-2.5 text-xs font-bold transition-all border-b-2 px-1",
            activeSubTab === "ledger"
              ? "border-purple-650 text-purple-750"
              : "border-transparent text-gray-450 hover:text-gray-700"
          )}
        >
          Tax Collection Ledger
        </button>
      </div>

      {/* Sub-Tab Panels */}
      {activeSubTab === "config" && (
        <form onSubmit={handleSaveGstSettings} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col gap-4">
          <h3 className="text-xs font-bold text-purple-700 uppercase tracking-wider flex items-center gap-2 border-b border-gray-150 pb-3">
            <SlidersHorizontal className="size-4" /> Global GST & Invoice Parameters
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-150 bg-gray-50/50 p-3.5">
              <div>
                <p className="text-xs font-bold text-gray-750">Enable GST Taxes</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Toggle tax calculations live across product pages and checkout</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={gstEnabled}
                  disabled={isReadOnly}
                  onChange={(e) => setGstEnabled(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-5 w-9 rounded-full bg-gray-200 after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:size-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-650 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-disabled:opacity-50" />
              </label>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-150 bg-gray-50/50 p-3.5">
              <div>
                <p className="text-xs font-bold text-gray-750">Inclusive Pricing</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Assume product prices list tax-inclusive by default</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={taxInclusive}
                  disabled={isReadOnly}
                  onChange={(e) => setTaxInclusive(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-5 w-9 rounded-full bg-gray-200 after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:size-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-650 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-disabled:opacity-50" />
              </label>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Business Name</label>
              <input
                value={businessName}
                disabled={isReadOnly}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Ratalu Wafers Private Limited"
                className={INPUT_STYLE}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">GSTIN / Tax ID</label>
              <input
                value={gstNumber}
                disabled={isReadOnly}
                onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                placeholder="e.g. 27AAAAA0000A1Z5"
                className={INPUT_STYLE}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">PAN Number</label>
              <input
                value={panNumber}
                disabled={isReadOnly}
                onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                placeholder="e.g. AAAAA1111A"
                className={INPUT_STYLE}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Business State</label>
              <select
                value={businessState}
                disabled={isReadOnly}
                onChange={(e) => setBusinessState(e.target.value)}
                className={INPUT_STYLE}
              >
                {INDIAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Default Store GST Rate (%)</label>
              <select
                value={taxRate}
                disabled={isReadOnly}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                className={INPUT_STYLE}
              >
                <option value={0}>0% GST</option>
                <option value={3}>3% GST</option>
                <option value={5}>5% GST (Standard snacks)</option>
                <option value={12}>12% GST</option>
                <option value={18}>18% GST (Premium products)</option>
                <option value={28}>28% GST</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Default HSN / SAC Code</label>
              <input
                value={defaultHsnCode}
                disabled={isReadOnly}
                onChange={(e) => setDefaultHsnCode(e.target.value)}
                placeholder="e.g. 1905"
                className={INPUT_STYLE}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Business Address</label>
            <textarea
              value={businessAddress}
              disabled={isReadOnly}
              onChange={(e) => setBusinessAddress(e.target.value)}
              placeholder="Full physical billing address of store registration"
              rows={2}
              className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-medium text-[#111827] focus:border-purple-550 focus:ring-1 focus:ring-purple-550 focus:outline-none disabled:bg-[#F8FAFC] disabled:text-[#6B7280]"
            />
          </div>

          <div className="border border-gray-150 rounded-xl p-4 bg-gray-50/40 mt-1 flex flex-col gap-3">
            <h4 className="text-[11px] font-bold text-gray-600 uppercase tracking-wider border-b border-gray-100 pb-1.5">
              Supported GST Slabs Configuration
            </h4>
            <div className="flex flex-wrap gap-2.5">
              {ALL_SLABS.map((slab) => {
                const isActive = gstSlabs.includes(slab);
                return (
                  <button
                    key={slab}
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => handleToggleSlab(slab)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5",
                      isActive
                        ? "bg-purple-50 border-purple-250 text-purple-700 shadow-sm"
                        : "bg-white border-gray-200 text-gray-450 hover:bg-gray-50"
                    )}
                  >
                    <span>{slab}% Slab</span>
                    {isActive ? (
                      <span className="size-1.5 rounded-full bg-purple-600" />
                    ) : (
                      <span className="size-1.5 rounded-full bg-gray-300" />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-[9px] text-gray-400">Active slabs dictate options in the product editors and order invoicing.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 border-t border-gray-150 pt-4 mt-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Invoice Number Prefix</label>
              <input
                value={invoicePrefix}
                disabled={isReadOnly}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                placeholder="e.g. INV-"
                className={INPUT_STYLE}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Invoice Start Number</label>
              <input
                type="number"
                value={invoiceStartNumber}
                disabled={isReadOnly}
                onChange={(e) => setInvoiceStartNumber(Number(e.target.value))}
                className={INPUT_STYLE}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Financial Year</label>
              <input
                value={financialYear}
                disabled={isReadOnly}
                onChange={(e) => setFinancialYear(e.target.value)}
                placeholder="e.g. 2026-27"
                className={INPUT_STYLE}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Reverse Charge Options</label>
              <div className="flex items-center gap-4 h-9">
                <Toggle
                  label="Reverse Charge"
                  checked={reverseChargeEnabled}
                  disabled={isReadOnly}
                  onChange={setReverseChargeEnabled}
                />
                <Toggle
                  label="Composition Scheme"
                  checked={compositionSchemeEnabled}
                  disabled={isReadOnly}
                  onChange={setCompositionSchemeEnabled}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 border-t border-gray-150 pt-4">
            <Toggle
              label="Enable Grand Total Rounding Off"
              checked={roundOffEnabled}
              disabled={isReadOnly}
              onChange={setRoundOffEnabled}
            />
          </div>

          {!isReadOnly && (
            <Button type="submit" disabled={savingSettings} className="w-full mt-2 bg-purple-650 hover:bg-purple-750 text-white font-bold">
              {savingSettings ? "Saving Settings..." : "Save GST & Invoice Configurations"}
            </Button>
          )}

          {/* WARNING CONFIRMATION DIALOG FOR DISABLING GST */}
          {confirmingDisable && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xl max-w-md w-full flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="size-6 text-red-650 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-gray-800">Deactivate GST Calculations?</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      You are disabling tax calculations. Orders currently active on the site will no longer show itemized tax breakdowns, CGST, or SGST lines on customer pages or receipts.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
                  <Button variant="outline" type="button" onClick={() => setConfirmingDisable(false)}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleConfirmDisableSave} className="bg-red-650 hover:bg-red-750 text-white font-bold">
                    Confirm & Disable GST
                  </Button>
                </div>
              </div>
            </div>
          )}
        </form>
      )}

      {activeSubTab === "calculator" && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col gap-4">
          <h3 className="text-xs font-bold text-purple-700 uppercase tracking-wider flex items-center gap-2 border-b border-gray-150 pb-3">
            <Percent className="size-4" /> Interactive GST Calculator
          </h3>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Unit Price / Billing Amount (₹)</label>
              <input
                type="number"
                value={calcAmount}
                onChange={(e) => setCalcAmount(e.target.value)}
                className={INPUT_STYLE}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Quantity</label>
              <input
                type="number"
                value={calcQty}
                onChange={(e) => setCalcQty(e.target.value)}
                className={INPUT_STYLE}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">GST Slab Rate (%)</label>
              <select
                value={calcRate}
                onChange={(e) => setCalcRate(Number(e.target.value))}
                className={INPUT_STYLE}
              >
                {gstSlabs.map((slab) => (
                  <option key={slab} value={slab}>
                    {slab}% GST Slab
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Discount Before Tax (₹)</label>
              <input
                type="number"
                value={calcDiscBefore}
                onChange={(e) => setCalcDiscBefore(e.target.value)}
                className={INPUT_STYLE}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Discount After Tax (₹)</label>
              <input
                type="number"
                value={calcDiscAfter}
                onChange={(e) => setCalcDiscAfter(e.target.value)}
                className={INPUT_STYLE}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Transaction State Type</label>
              <select
                value={calcSplitType}
                onChange={(e) => setCalcSplitType(e.target.value as any)}
                className={INPUT_STYLE}
              >
                <option value="intrastate">Intrastate Sale (CGST + SGST)</option>
                <option value="interstate">Interstate Sale (IGST)</option>
              </select>
            </div>
          </div>

          <div className="flex gap-4 items-center bg-gray-50 border border-gray-150 p-3 rounded-lg">
            <div className="flex-1 flex gap-2 rounded-lg bg-gray-200 p-1">
              <button
                type="button"
                onClick={() => setCalcType("inclusive")}
                className={cn(
                  "flex-1 text-center py-1.5 text-xs font-bold rounded-md transition-colors",
                  calcType === "inclusive" ? "bg-white text-purple-750 shadow-xs" : "text-gray-500 hover:text-gray-700"
                )}
              >
                GST Inclusive
              </button>
              <button
                type="button"
                onClick={() => setCalcType("exclusive")}
                className={cn(
                  "flex-1 text-center py-1.5 text-xs font-bold rounded-md transition-colors",
                  calcType === "exclusive" ? "bg-white text-purple-750 shadow-xs" : "text-gray-500 hover:text-gray-700"
                )}
              >
                GST Exclusive
              </button>
            </div>

            <Toggle
              label="Apply Rounding Off"
              checked={calcRoundOffEnabled}
              onChange={setCalcRoundOffEnabled}
            />
          </div>

          {/* Calculations Breakdown Output */}
          <div className="rounded-xl border border-gray-150 p-5 flex flex-col gap-3 bg-purple-55/10">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Original Amount (Gross Subtotal)</span>
              <span className="font-semibold text-gray-800">₹{(amt * qty).toFixed(2)}</span>
            </div>
            {discBefore > 0 && (
              <div className="flex justify-between text-xs text-red-500">
                <span>Discount Before Tax</span>
                <span className="font-semibold">- ₹{discBefore.toFixed(2)}</span>
              </div>
            )}
            {discAfter > 0 && (
              <div className="flex justify-between text-xs text-red-500">
                <span>Discount After Tax</span>
                <span className="font-semibold">- ₹{discAfter.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-gray-500">
              <span>Taxable base amount</span>
              <span className="font-semibold text-gray-800">₹{baseVal.toFixed(2)}</span>
            </div>

            <div className="border-t border-gray-150 my-1"></div>

            {calcSplitType === "intrastate" ? (
              <>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Central GST (CGST - {rate / 2}%)</span>
                  <span className="font-semibold text-gray-800">₹{cgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>State GST (SGST - {rate / 2}%)</span>
                  <span className="font-semibold text-gray-800">₹{sgst.toFixed(2)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-xs text-gray-500">
                <span>Integrated GST (IGST - {rate}%)</span>
                <span className="font-semibold text-gray-800">₹{igst.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-xs text-gray-500 border-b border-gray-150 pb-3 mb-1">
              <span>Total GST Collected</span>
              <span className="font-bold text-purple-750">₹{gstAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-black text-gray-850">
              <span>Net Payable / Grand Total</span>
              <span className="text-xl text-purple-800">₹{netPayable.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === "ledger" && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Taxes Collected Ledger</h3>
              <p className="text-[10px] text-gray-450 mt-0.5">Detailed records of taxes collected on active transactions</p>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-purple-650 font-bold bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full">
                Turnover: ₹{ledgerTaxableTurnover.toLocaleString("en-IN")}
              </span>
              <span className="text-[10px] text-purple-650 font-bold bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full">
                GST: ₹{ledgerTaxCollected.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* Ledger filters & Export bar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-wider font-bold text-gray-400">Date Range</span>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as any)}
                  className="h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-xs font-semibold text-[#111827] focus:outline-none"
                >
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">This Month</option>
                  <option value="year">This Financial Year</option>
                  <option value="custom">Custom Date Range</option>
                </select>
              </div>

              {dateFilter === "custom" && (
                <>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase tracking-wider font-bold text-gray-400">From Date</span>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-xs font-semibold text-[#111827] focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase tracking-wider font-bold text-gray-400">To Date</span>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="h-9 rounded-lg border border-[#E5E7EB] bg-white px-3 text-xs font-semibold text-[#111827] focus:outline-none"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportLedger("csv")}
                disabled={exportingFormat !== null}
                className="h-9 text-xs font-bold flex items-center gap-1.5 hover:bg-gray-50 border-gray-200"
              >
                <FileText className="size-4 text-orange-600" />
                {exportingFormat === "csv" ? "Exporting..." : "Export CSV"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportLedger("excel")}
                disabled={exportingFormat !== null}
                className="h-9 text-xs font-bold flex items-center gap-1.5 hover:bg-gray-50 border-gray-200"
              >
                <FileSpreadsheet className="size-4 text-emerald-600" />
                {exportingFormat === "excel" ? "Exporting..." : "Export Excel"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportLedger("pdf")}
                disabled={exportingFormat !== null}
                className="h-9 text-xs font-bold flex items-center gap-1.5 hover:bg-gray-50 border-gray-200"
              >
                <Printer className="size-4 text-red-600" />
                {exportingFormat === "pdf" ? "Exporting..." : "Export PDF"}
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-[420px] overflow-y-auto mt-2">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-150 text-gray-400 font-bold text-[10px] uppercase tracking-wider sticky top-0 z-10">
                  <th className="p-3">Invoice Number</th>
                  <th className="p-3">Order Number</th>
                  <th className="p-3">Customer Name</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Taxable Amount</th>
                  <th className="p-3">CGST</th>
                  <th className="p-3">SGST</th>
                  <th className="p-3">IGST</th>
                  <th className="p-3">Total GST</th>
                  <th className="p-3">Grand Total</th>
                  <th className="p-3">Payment Status</th>
                  <th className="p-3 text-right">Order Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white font-medium text-gray-700">
                {ledgerOrders.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-8 text-center text-gray-400 font-semibold">
                      No taxable records match your date range filters.
                    </td>
                  </tr>
                ) : (
                  ledgerOrders.map((o) => {
                    const finalTotal = o.totals?.total || 0;
                    const gstTotal = o.totals?.gst || 0;
                    const taxableVal = o.totals?.subtotal || (finalTotal - gstTotal);
                    const cgst = o.totals?.cgst ?? (o.totals?.igst ? 0 : gstTotal / 2);
                    const sgst = o.totals?.sgst ?? (o.totals?.igst ? 0 : gstTotal / 2);
                    const igst = o.totals?.igst ?? 0;
                    return (
                      <tr key={o.id} className="hover:bg-gray-50/50">
                        <td className="p-3 font-mono font-bold text-gray-800">{o.invoiceNumber || `INV-${o.id}`}</td>
                        <td className="p-3 font-semibold text-gray-500">#{o.displayId || o.id}</td>
                        <td className="p-3 font-bold text-gray-900">{o.userName}</td>
                        <td className="p-3 text-gray-500">{new Date(o.createdAt).toLocaleDateString("en-IN")}</td>
                        <td className="p-3 font-semibold text-gray-700">₹{taxableVal.toFixed(2)}</td>
                        <td className="p-3 text-gray-500">₹{cgst.toFixed(2)}</td>
                        <td className="p-3 text-gray-500">₹{sgst.toFixed(2)}</td>
                        <td className="p-3 text-gray-500">₹{igst.toFixed(2)}</td>
                        <td className="p-3 font-bold text-purple-700">₹{gstTotal.toFixed(2)}</td>
                        <td className="p-3 font-extrabold text-gray-950">₹{finalTotal.toFixed(2)}</td>
                        <td className="p-3">
                          <span className={cn(
                            "px-1.5 py-0.5 rounded-full text-[9px] font-bold border",
                            o.payment?.status === "Paid"
                              ? "bg-emerald-50 border-emerald-250 text-emerald-700"
                              : "bg-amber-50 border-amber-250 text-amber-700"
                          )}>
                            {o.payment?.status || "Pending"}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span className={cn(
                            "px-1.5 py-0.5 rounded-full text-[9px] font-bold border",
                            o.status === "Delivered"
                              ? "bg-purple-50 border-purple-250 text-purple-700"
                              : o.status === "Shipped" || o.status === "Packed"
                              ? "bg-blue-50 border-blue-250 text-blue-700"
                              : "bg-gray-50 border-gray-250 text-gray-700"
                          )}>
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  disabled
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 text-[11.5px] font-semibold text-gray-700 select-none">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="size-3.5 rounded border-gray-300 accent-purple-650 disabled:opacity-50"
      />
      <span>{label}</span>
    </label>
  );
}

function VideoPreview({ url }: { url: string }) {
  if (!url || !url.trim()) return null;
  const isVideo = /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url.trim());
  if (!isVideo) return null;
  return (
    <div className="mt-1.5 overflow-hidden rounded-xl border border-gray-150 bg-gray-50 p-1.5 shadow-inner">
      <video src={url.trim()} controls className="max-h-24 w-full rounded-lg object-cover" muted playsInline />
    </div>
  );
}
