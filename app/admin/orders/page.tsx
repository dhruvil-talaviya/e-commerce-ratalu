"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Filter,
  X,
  Download,
  FileText,
  Truck,
  Trash2,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  Printer,
  Edit2,
  AlertCircle,
  Loader2,
  Star,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Plane,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { apiFetchEnvelope, apiFetch, getTokens } from "@/lib/api";
import { useAccount } from "@/components/account/account-provider";
import { AdminShell } from "@/components/admin/console/admin-shell";
import { LiveCountdown } from "@/components/common/live-countdown";
import { useLiveRefresh } from "@/lib/hooks/use-live-refresh";
import { OrderTimeline } from "@/components/common/order-timeline";
import { DataTable, type Column } from "@/components/admin/ui/data-table";
import {
  Badge,
  Button,
  Card,
  Modal,
  ConfirmDialog,
} from "@/components/admin/ui/primitives";
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  FULFILMENT_FLOW,
  NEXT_STATUSES,
  REQUIRES_COURIER,
  STATUS_ACTION_LABEL,
  EXCEPTION_FLOW,
  formatMoney,
  formatDateTime,
  formatDate,
} from "@/components/admin/ui/tokens";
import type { Order } from "@/components/shop/order-provider";

interface FilterOptions {
  statuses: string[];
  paymentStatuses: string[];
  paymentMethods: string[];
  cities: string[];
  states: string[];
}

const EMPTY_FILTERS = {
  status: "",
  paymentStatus: "",
  paymentMethod: "",
  dateFrom: "",
  dateTo: "",
  minAmount: "",
  maxAmount: "",
};

/** Chip captions — a bare value like "COD" doesn't say which filter it is. */
const FILTER_LABELS: Record<keyof typeof EMPTY_FILTERS, string> = {
  status: "Status",
  paymentStatus: "Payment",
  paymentMethod: "Method",
  dateFrom: "From",
  dateTo: "To",
  minAmount: "Min",
  maxAmount: "Max",
};

/** The date ranges an owner actually asks for, one click instead of two pickers. */
const DATE_PRESETS: { label: string; days: number }[] = [
  { label: "Today", days: 0 },
  { label: "Last 7 days", days: 6 },
  { label: "Last 30 days", days: 29 },
  { label: "Last 90 days", days: 89 },
];

const toISODate = (d: Date) => {
  // Local calendar date — toISOString() would shift IST back a day before 5:30am.
  const tz = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return tz.toISOString().slice(0, 10);
};

export default function AdminOrdersPage() {
  return (
    <React.Suspense fallback={null}>
      <OrdersView />
    </React.Suspense>
  );
}

function OrdersView() {
  const searchParams = useSearchParams();

  // ─── Query state ──────────────────────────────────────────────────────────
  const [search, setSearch] = React.useState(searchParams.get("search") ?? "");
  const [debouncedSearch, setDebouncedSearch] = React.useState(search);
  const [filters, setFilters] = React.useState({ ...EMPTY_FILTERS });
  const [showFilters, setShowFilters] = React.useState(false);

  const [sortBy, setSortBy] = React.useState("createdAt");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);

  // ─── Data ─────────────────────────────────────────────────────────────────
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalRecords, setTotalRecords] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [options, setOptions] = React.useState<FilterOptions | null>(null);

  const [selected, setSelected] = React.useState<string[]>([]);
  const [detail, setDetail] = React.useState<Order | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  // Debounce the search box so we don't hit the API on every keystroke.
  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const query = React.useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("limit", String(pageSize));
    p.set("sortBy", sortBy);
    p.set("sortOrder", sortOrder);
    if (debouncedSearch) p.set("search", debouncedSearch);
    Object.entries(filters).forEach(([k, v]) => {
      if (v) p.set(k, v);
    });
    return p.toString();
  }, [page, pageSize, sortBy, sortOrder, debouncedSearch, filters]);

  const load = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const env = await apiFetchEnvelope<Order[]>(`/admin/orders?${query}`);
      setOrders(env.data ?? []);
      setTotalPages(env.pagination?.totalPages ?? 1);
      setTotalRecords(env.pagination?.totalRecords ?? 0);
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : "Failed to load orders");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [query]);

  React.useEffect(() => {
    load();
  }, [load]);

  // Live real-time polling every 5 seconds — updates order status without manual refresh
  useLiveRefresh(() => load(true), { minIntervalMs: 2000 });

  React.useEffect(() => {
    const timer = setInterval(() => {
      load(true);
    }, 5000);
    return () => clearInterval(timer);
  }, [load]);

  // Filter dropdown options come from the real data, not a hardcoded list.
  React.useEffect(() => {
    apiFetch<FilterOptions>("/admin/orders/filters")
      .then(setOptions)
      .catch(() => setOptions(null));
  }, []);

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortOrder("desc");
    }
    setPage(1);
  };

  const setFilter = (key: keyof typeof EMPTY_FILTERS, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setFilters({ ...EMPTY_FILTERS });
    setPage(1);
  };

  /**
   * "Today" is the query an owner runs every morning — what do I have to pack
   * right now — so it's a first-class toggle rather than two date pickers.
   */
  const todayISO = toISODate(new Date());
  const isTodayOnly = filters.dateFrom === todayISO && filters.dateTo === todayISO;

  const toggleToday = () => {
    setFilters((f) =>
      isTodayOnly
        ? { ...f, dateFrom: "", dateTo: "" }
        : { ...f, dateFrom: todayISO, dateTo: todayISO }
    );
    setPage(1);
  };

  /** Jump both date bounds to a preset window. */
  const applyDatePreset = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    setFilters((f) => ({ ...f, dateFrom: toISODate(from), dateTo: toISODate(to) }));
    setPage(1);
  };

  /**
   * Status is the filter fulfilment runs on all day, so the pipeline gets
   * one-click tabs instead of living behind the collapsed panel.
   *
   * Only the happy path is tabbed — the API hands back all 17 schema statuses,
   * and a tab strip of that length is a worse dropdown. Exceptions (refunds,
   * cancelled, expired) stay in the Filters panel, which lists every status.
   */
  const statusTabs = React.useMemo(
    () => [
      { value: "", label: "All" },
      ...FULFILMENT_FLOW.map((s) => ({ value: s as string, label: s as string })),
    ],
    []
  );

  /**
   * Statuses at least one selected order can legally move to.
   *
   * Offering the full list meant a bulk "Shipped" silently did nothing to the
   * Cancelled and Pending orders caught up in the selection. Dispatch is
   * excluded: it needs a courier and AWB per parcel.
   */
  const bulkTargets = React.useMemo(() => {
    const reachable = new Set<string>();

    selected.forEach((id) => {
      const order = orders.find((o) => o.id === id);
      if (!order) return;
      (NEXT_STATUSES[order.status] ?? []).forEach((s) => {
        if (s !== REQUIRES_COURIER) reachable.add(s);
      });
    });

    return [...FULFILMENT_FLOW, ...EXCEPTION_FLOW].filter((s) => reachable.has(s));
  }, [selected, orders]);

  // ─── Mutations ────────────────────────────────────────────────────────────

  const bulkStatus = async (status: string) => {
    setBusy(true);
    try {
      await apiFetch("/admin/orders/bulk/status", {
        method: "POST",
        body: { ids: selected, status },
      });
      toast.success(`${selected.length} order(s) moved to ${status}`);
      setSelected([]);
      await load();
    } catch (err) {
      toast.error("Could not update orders", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const bulkDelete = async () => {
    setBusy(true);
    try {
      await apiFetch("/admin/orders/bulk/delete", {
        method: "POST",
        body: { ids: selected },
      });
      toast.success(`${selected.length} order(s) deleted`);
      setSelected([]);
      setConfirmDelete(false);
      await load();
    } catch (err) {
      toast.error("Could not delete orders", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const updateStatus = async (order: Order, status: string, note?: string) => {
    setBusy(true);
    try {
      const updated = await apiFetch<Order>(`/admin/orders/${order.id}/status`, {
        method: "PUT",
        body: { status, note },
      });
      toast.success(`Order ${order.displayId || order.id} → ${status}`);
      setDetail(updated);
      await load();
    } catch (err) {
      toast.error("Could not update status", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  /**
   * The invoice is a PDF stream, not JSON — apiFetch would try to parse it.
   * Fetch it directly with the bearer token and hand the blob to the browser.
   */
  const downloadInvoice = async (order: Order) => {
    try {
      const res = await fetch(`/api/v1/admin/orders/${order.id}/invoice`, {
        headers: { Authorization: `Bearer ${getTokens()?.accessToken ?? ""}` },
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${order.displayId || order.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Invoice downloaded");
    } catch (err) {
      toast.error("Could not generate invoice", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  /**
   * Delivery labels — recipient, phone and address, four to a page. Same blob
   * dance as the invoice. Takes a list so one order or fifty cost one click.
   */
  const downloadLabels = async (ids: string[]) => {
    if (ids.length === 0) return;
    try {
      const res = await fetch(
        `/api/v1/admin/orders/labels?ids=${encodeURIComponent(ids.join(","))}`,
        { headers: { Authorization: `Bearer ${getTokens()?.accessToken ?? ""}` } }
      );
      if (!res.ok) throw new Error(`Server returned ${res.status}`);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `delivery-labels-${ids.length}-order${ids.length === 1 ? "" : "s"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${ids.length} delivery label${ids.length === 1 ? "" : "s"} downloaded`);
    } catch (err) {
      toast.error("Could not generate labels", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  // ─── Columns ──────────────────────────────────────────────────────────────
  const columns: Column<Order>[] = [
    {
      key: "orderNumber",
      header: "Order",
      sortable: true,
      cell: (o) => (
        <div>
          <span className="font-mono font-bold text-[#5B2C83]">
            {o.displayId || o.id}
          </span>
          <p className="mt-0.5 text-[10px] text-[#6B7280]">{o.items?.length ?? 0} item(s)</p>
        </div>
      ),
    },
    {
      key: "userName",
      header: "Customer",
      sortable: true,
      cell: (o) => {
        const phoneNum = o.userPhone || o.address?.phone;
        return (
          <div className="min-w-0">
            <p className="truncate font-semibold">{o.userName}</p>
            <p className="mt-0.5 flex items-center gap-1 text-[10px] text-[#6B7280]">
              <Phone className="size-2.5" />
              {phoneNum || "—"}
            </p>
          </div>
        );
      },
    },
    {
      key: "city",
      header: "Ship to",
      hideBelow: "lg",
      cell: (o) => (
        <span className="text-[#6B7280]">
          {o.address?.city || "—"}
          {o.address?.state ? `, ${o.address.state}` : ""}
        </span>
      ),
    },
    {
      key: "payment",
      header: "Payment",
      hideBelow: "md",
      cell: (o) => {
        const status = o.payment?.status || "Pending";
        return (
          <div className="flex flex-col gap-1">
            <Badge tone={PAYMENT_STATUS[status] ?? "neutral"}>{status}</Badge>
            <span className="text-[10px] text-[#6B7280]">
              {o.payment?.method || o.method || "—"}
            </span>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      cell: (o) => {
        const isCancelled =
          o.status === "Cancelled" ||
          (o.status as string) === "Refunded" ||
          o.status === "Refund Completed" ||
          o.payment?.status === "Refunded" ||
          Boolean((o as any).cancelledAt);
        if (isCancelled) {
          return <Badge tone="danger">Cancelled</Badge>;
        }

        const isHold = (o.status as string) === "Pending Confirmation" || (o.status as string) === "Pending";
        const deadline = (o as any).cancellationDeadline || (o as any).cancellableUntil;
        const isExpired = deadline && new Date(deadline) <= new Date();

        if (isHold && !isExpired) {
          return (
            <LiveCountdown deadline={deadline} onExpire={load} />
          );
        }

        const tone = ORDER_STATUS[o.status]?.tone ?? "neutral";
        return <Badge tone={tone}>{o.status}</Badge>;
      },
    },
    {
      key: "createdAt",
      header: "Placed",
      sortable: true,
      hideBelow: "lg",
      cell: (o) => <span className="text-[#6B7280]">{formatDate(o.createdAt)}</span>,
    },
    {
      key: "total",
      header: "Total",
      sortable: true,
      className: "text-right",
      cell: (o) => (
        <span className="font-bold">{formatMoney(o.totals?.total)}</span>
      ),
    },
  ];

  return (
    <AdminShell
      title="Orders"
      description={
        totalRecords > 0
          ? `${totalRecords} order${totalRecords === 1 ? "" : "s"} in the queue`
          : "Manage and fulfil customer orders"
      }
      actions={
        <>
          <Button
            variant="secondary"
            onClick={() => setShowFilters((s) => !s)}
            aria-expanded={showFilters}
          >
            <Filter className="size-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 grid size-4 place-items-center rounded-full bg-[#5B2C83] text-[9px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              window.open(`/api/v1/admin/reports/export?type=orders&format=csv`, "_blank")
            }
          >
            <Download className="size-3.5" />
            Export
          </Button>
        </>
      }
    >
      {/* ─── Clickable Order KPI Cards ───────────────────────────────────── */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        <button
          onClick={() => setFilter("status", "Pending Confirmation")}
          className={cn(
            "flex flex-col items-start justify-between rounded-xl border p-3 text-left transition-all cursor-pointer",
            filters.status === "Pending Confirmation"
              ? "border-amber-400 bg-amber-50/80 ring-2 ring-amber-400/20 shadow-xs"
              : "border-gray-200 bg-white hover:border-amber-200 hover:bg-amber-50/40"
          )}
        >
          <span className="text-[10px] font-semibold text-amber-700">Pending Hold</span>
          <span className="mt-1 text-lg font-extrabold text-amber-950">
            {orders.filter((o) => (o.status as string) === "Pending Confirmation" || o.status === "Pending").length}
          </span>
        </button>

        <button
          onClick={() => setFilter("status", "Confirmed")}
          className={cn(
            "flex flex-col items-start justify-between rounded-xl border p-3 text-left transition-all cursor-pointer",
            filters.status === "Confirmed"
              ? "border-emerald-400 bg-emerald-50/80 ring-2 ring-emerald-400/20 shadow-xs"
              : "border-gray-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/40"
          )}
        >
          <span className="text-[10px] font-semibold text-emerald-700">Confirmed</span>
          <span className="mt-1 text-lg font-extrabold text-emerald-950">
            {orders.filter((o) => o.status === "Confirmed").length}
          </span>
        </button>

        <button
          onClick={() => setFilter("status", "Preparing")}
          className={cn(
            "flex flex-col items-start justify-between rounded-xl border p-3 text-left transition-all cursor-pointer",
            filters.status === "Preparing"
              ? "border-amber-400 bg-amber-50/80 ring-2 ring-amber-400/20 shadow-xs"
              : "border-gray-200 bg-white hover:border-amber-200 hover:bg-amber-50/40"
          )}
        >
          <span className="text-[10px] font-semibold text-amber-700">Preparing</span>
          <span className="mt-1 text-lg font-extrabold text-amber-950">
            {orders.filter((o) => o.status === "Preparing").length}
          </span>
        </button>

        <button
          onClick={() => setFilter("status", "Packed")}
          className={cn(
            "flex flex-col items-start justify-between rounded-xl border p-3 text-left transition-all cursor-pointer",
            filters.status === "Packed"
              ? "border-blue-400 bg-blue-50/80 ring-2 ring-blue-400/20 shadow-xs"
              : "border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/40"
          )}
        >
          <span className="text-[10px] font-semibold text-blue-700">Packed</span>
          <span className="mt-1 text-lg font-extrabold text-blue-950">
            {orders.filter((o) => o.status === "Packed").length}
          </span>
        </button>

        <button
          onClick={() => setFilter("status", "Ready to Ship")}
          className={cn(
            "flex flex-col items-start justify-between rounded-xl border p-3 text-left transition-all cursor-pointer",
            filters.status === "Ready to Ship"
              ? "border-indigo-400 bg-indigo-50/80 ring-2 ring-indigo-400/20 shadow-xs"
              : "border-gray-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/40"
          )}
        >
          <span className="text-[10px] font-semibold text-indigo-700">Ready To Ship</span>
          <span className="mt-1 text-lg font-extrabold text-indigo-950">
            {orders.filter((o) => o.status === "Ready to Ship").length}
          </span>
        </button>

        <button
          onClick={() => setFilter("status", "Shipped")}
          className={cn(
            "flex flex-col items-start justify-between rounded-xl border p-3 text-left transition-all cursor-pointer",
            filters.status === "Shipped"
              ? "border-purple-400 bg-purple-50/80 ring-2 ring-purple-400/20 shadow-xs"
              : "border-gray-200 bg-white hover:border-purple-200 hover:bg-purple-50/40"
          )}
        >
          <span className="text-[10px] font-semibold text-purple-700">Shipped</span>
          <span className="mt-1 text-lg font-extrabold text-purple-950">
            {orders.filter((o) => o.status === "Shipped" || o.status === "Out for Delivery").length}
          </span>
        </button>

        <button
          onClick={() => setFilter("status", "Delivered")}
          className={cn(
            "flex flex-col items-start justify-between rounded-xl border p-3 text-left transition-all cursor-pointer",
            filters.status === "Delivered"
              ? "border-green-400 bg-green-50/80 ring-2 ring-green-400/20 shadow-xs"
              : "border-gray-200 bg-white hover:border-green-200 hover:bg-green-50/40"
          )}
        >
          <span className="text-[10px] font-semibold text-green-700">Delivered</span>
          <span className="mt-1 text-lg font-extrabold text-green-950">
            {orders.filter((o) => o.status === "Delivered" || (o.status as string) === "Completed").length}
          </span>
        </button>

        <button
          onClick={() => setFilter("status", "Cancelled")}
          className={cn(
            "flex flex-col items-start justify-between rounded-xl border p-3 text-left transition-all cursor-pointer",
            filters.status === "Cancelled"
              ? "border-rose-400 bg-rose-50/80 ring-2 ring-rose-400/20 shadow-xs"
              : "border-gray-200 bg-white hover:border-rose-200 hover:bg-rose-50/40"
          )}
        >
          <span className="text-[10px] font-semibold text-rose-700">Cancelled</span>
          <span className="mt-1 text-lg font-extrabold text-rose-950">
            {orders.filter((o) => o.status === "Cancelled").length}
          </span>
        </button>

        <button
          onClick={() => setFilter("status", "Refunded")}
          className={cn(
            "flex flex-col items-start justify-between rounded-xl border p-3 text-left transition-all cursor-pointer",
            filters.status === "Refunded"
              ? "border-slate-400 bg-slate-100 ring-2 ring-slate-400/20 shadow-xs"
              : "border-gray-200 bg-white hover:border-slate-300 hover:bg-slate-50"
          )}
        >
          <span className="text-[10px] font-semibold text-slate-600">Refunded</span>
          <span className="mt-1 text-lg font-extrabold text-slate-900">
            {orders.filter((o) => ["Refunded", "Refund Completed", "Refund Processing"].includes(o.status)).length}
          </span>
        </button>

        <button
          onClick={() => setFilter("status", "Expired")}
          className={cn(
            "flex flex-col items-start justify-between rounded-xl border p-3 text-left transition-all cursor-pointer",
            filters.status === "Expired"
              ? "border-amber-400 bg-amber-50/80 ring-2 ring-amber-400/20 shadow-xs"
              : "border-gray-200 bg-white hover:border-amber-200 hover:bg-amber-50/40"
          )}
        >
          <span className="text-[10px] font-semibold text-amber-700">Expired / Failed</span>
          <span className="mt-1 text-lg font-extrabold text-amber-950">
            {orders.filter((o) => (o.status as string) === "Expired" || (o.status as string) === "Payment Failed" || (o.status as string) === "Payment Pending" || o.status === "Pending").length}
          </span>
        </button>
      </div>

      {/* ─── Today + quick status tabs ─────────────────────────────────────── */}
      {statusTabs.length > 1 && (
        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={toggleToday}
            aria-pressed={isTodayOnly}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
              isTodayOnly
                ? "bg-[#5B2C83] text-white shadow-sm"
                : "border border-[#5B2C83]/30 bg-white text-[#5B2C83] hover:bg-purple-50"
            )}
          >
            <Clock className="size-3" />
            Today
          </button>
          <span className="mx-1 my-1 w-px shrink-0 bg-gray-200" aria-hidden />

          {statusTabs.map((s) => {
            const active = filters.status === s.value;
            return (
              <button
                key={s.value || "all"}
                onClick={() => setFilter("status", s.value)}
                aria-pressed={active}
                className={cn(
                  "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
                  active
                    ? "bg-[#5B2C83] text-white shadow-sm"
                    : "border border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#5B2C83]/40 hover:text-[#111827]"
                )}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ─── Search + filters ──────────────────────────────────────────────── */}
      <Card className="mb-4 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order number, customer, phone, invoice, tracking or city…"
            className="w-full rounded-lg border border-[#E5E7EB] bg-white py-2 pl-9 pr-9 text-xs text-[#111827] placeholder:text-gray-400 focus:border-[#5B2C83] focus:outline-none focus:ring-2 focus:ring-[#5B2C83]/15"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:bg-gray-100"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Applied filters stay visible even with the panel shut */}
        {activeFilterCount > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {filters.status && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 py-1 pl-2.5 pr-1 text-[11px] font-semibold text-[#5B2C83] ring-1 ring-purple-100">
                <span className="font-normal text-purple-400">Status:</span>
                {filters.status}
                <button onClick={() => setFilter("status", "")} aria-label="Remove status filter" className="grid size-4 place-items-center rounded-full hover:bg-purple-200/70">
                  <X className="size-2.5" />
                </button>
              </span>
            )}
            {filters.paymentStatus && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 py-1 pl-2.5 pr-1 text-[11px] font-semibold text-[#5B2C83] ring-1 ring-purple-100">
                <span className="font-normal text-purple-400">Payment:</span>
                {filters.paymentStatus}
                <button onClick={() => setFilter("paymentStatus", "")} aria-label="Remove payment status filter" className="grid size-4 place-items-center rounded-full hover:bg-purple-200/70">
                  <X className="size-2.5" />
                </button>
              </span>
            )}
            {filters.paymentMethod && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 py-1 pl-2.5 pr-1 text-[11px] font-semibold text-[#5B2C83] ring-1 ring-purple-100">
                <span className="font-normal text-purple-400">Method:</span>
                {filters.paymentMethod}
                <button onClick={() => setFilter("paymentMethod", "")} aria-label="Remove payment method filter" className="grid size-4 place-items-center rounded-full hover:bg-purple-200/70">
                  <X className="size-2.5" />
                </button>
              </span>
            )}
            {isTodayOnly ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 py-1 pl-2.5 pr-1 text-[11px] font-semibold text-[#5B2C83] ring-1 ring-purple-100">
                <span className="font-normal text-purple-400">Date:</span>
                Today
                <button onClick={() => setFilters((f) => ({ ...f, dateFrom: "", dateTo: "" }))} aria-label="Remove Today filter" className="grid size-4 place-items-center rounded-full hover:bg-purple-200/70">
                  <X className="size-2.5" />
                </button>
              </span>
            ) : (
              <>
                {filters.dateFrom && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 py-1 pl-2.5 pr-1 text-[11px] font-semibold text-[#5B2C83] ring-1 ring-purple-100">
                    <span className="font-normal text-purple-400">From:</span>
                    {filters.dateFrom}
                    <button onClick={() => setFilter("dateFrom", "")} aria-label="Remove From date filter" className="grid size-4 place-items-center rounded-full hover:bg-purple-200/70">
                      <X className="size-2.5" />
                    </button>
                  </span>
                )}
                {filters.dateTo && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 py-1 pl-2.5 pr-1 text-[11px] font-semibold text-[#5B2C83] ring-1 ring-purple-100">
                    <span className="font-normal text-purple-400">To:</span>
                    {filters.dateTo}
                    <button onClick={() => setFilter("dateTo", "")} aria-label="Remove To date filter" className="grid size-4 place-items-center rounded-full hover:bg-purple-200/70">
                      <X className="size-2.5" />
                    </button>
                  </span>
                )}
              </>
            )}
            {filters.minAmount && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 py-1 pl-2.5 pr-1 text-[11px] font-semibold text-[#5B2C83] ring-1 ring-purple-100">
                <span className="font-normal text-purple-400">Min:</span>
                ₹{filters.minAmount}
                <button onClick={() => setFilter("minAmount", "")} aria-label="Remove Min amount filter" className="grid size-4 place-items-center rounded-full hover:bg-purple-200/70">
                  <X className="size-2.5" />
                </button>
              </span>
            )}
            {filters.maxAmount && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 py-1 pl-2.5 pr-1 text-[11px] font-semibold text-[#5B2C83] ring-1 ring-purple-100">
                <span className="font-normal text-purple-400">Max:</span>
                ₹{filters.maxAmount}
                <button onClick={() => setFilter("maxAmount", "")} aria-label="Remove Max amount filter" className="grid size-4 place-items-center rounded-full hover:bg-purple-200/70">
                  <X className="size-2.5" />
                </button>
              </span>
            )}
            <button
              onClick={clearFilters}
              className="ml-0.5 text-[11px] font-bold text-gray-400 transition-colors hover:text-[#111827] hover:underline"
            >
              Clear all
            </button>
          </div>
        )}

        {showFilters && (
          <div className="mt-3 grid gap-3 border-t border-gray-100 pt-3 sm:grid-cols-2 lg:grid-cols-4">
            <FilterSelect
              label="Order status"
              value={filters.status}
              onChange={(v) => setFilter("status", v)}
              options={options?.statuses ?? []}
            />
            <FilterSelect
              label="Payment status"
              value={filters.paymentStatus}
              onChange={(v) => setFilter("paymentStatus", v)}
              options={options?.paymentStatuses ?? []}
            />
            <FilterSelect
              label="Payment method"
              value={filters.paymentMethod}
              onChange={(v) => setFilter("paymentMethod", v)}
              options={options?.paymentMethods ?? []}
            />
            <div className="flex flex-wrap items-center gap-1.5 sm:col-span-2 lg:col-span-4">
              <span className="mr-0.5 text-[10px] font-bold text-[#6B7280]">
                Quick range
              </span>
              {DATE_PRESETS.map((p) => {
                const to = toISODate(new Date());
                const fromDate = new Date();
                fromDate.setDate(fromDate.getDate() - p.days);
                const from = toISODate(fromDate);
                const isActive = filters.dateFrom === from && filters.dateTo === to;
                return (
                  <button
                    key={p.label}
                    onClick={() => applyDatePreset(p.days)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
                      isActive
                        ? "bg-[#5B2C83] text-white shadow-sm"
                        : "border border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#5B2C83]/40 hover:text-[#111827]"
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
              {(filters.dateFrom || filters.dateTo) && (
                <button
                  onClick={() => setFilters((f) => ({ ...f, dateFrom: "", dateTo: "" }))}
                  className="text-[11px] font-bold text-gray-400 transition-colors hover:text-[#111827] hover:underline"
                >
                  Clear dates
                </button>
              )}
            </div>

            <FilterField label="From date">
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilter("dateFrom", e.target.value)}
                className={FIELD_CLASS}
              />
            </FilterField>
            <FilterField label="To date">
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilter("dateTo", e.target.value)}
                className={FIELD_CLASS}
              />
            </FilterField>
            <FilterField label="Min amount">
              <input
                type="number"
                min={0}
                placeholder="₹0"
                value={filters.minAmount}
                onChange={(e) => setFilter("minAmount", e.target.value)}
                className={FIELD_CLASS}
              />
            </FilterField>
            <FilterField label="Max amount">
              <input
                type="number"
                min={0}
                placeholder="Any"
                value={filters.maxAmount}
                onChange={(e) => setFilter("maxAmount", e.target.value)}
                className={FIELD_CLASS}
              />
            </FilterField>

          </div>
        )}
      </Card>

      {/* ─── Table ─────────────────────────────────────────────────────────── */}
      <DataTable<Order>
        rows={orders}
        columns={columns}
        rowKey={(o) => o.id}
        loading={loading}
        error={error}
        onRetry={load}
        emptyTitle={
          debouncedSearch || activeFilterCount > 0 ? "No matching orders" : "No orders yet"
        }
        emptyDescription={
          debouncedSearch || activeFilterCount > 0
            ? "Try loosening your search or filters."
            : "Orders will appear here as customers check out."
        }
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        page={page}
        totalPages={totalPages}
        totalRecords={totalRecords}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
        selected={selected}
        onSelectionChange={setSelected}
        onRowClick={setDetail}
        bulkActions={
          <>
            {/*
              Only statuses that at least one selected order can actually reach.
              Dispatch is absent by design: it needs a courier and an AWB per
              order, which is not something you can fill in for a whole batch.
            */}
            <select
              defaultValue=""
              disabled={busy || bulkTargets.length === 0}
              onChange={(e) => {
                if (e.target.value) {
                  bulkStatus(e.target.value);
                  e.target.value = "";
                }
              }}
              aria-label="Set status for selected orders"
              className="rounded-lg border border-purple-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-[#5B2C83] focus:outline-none disabled:opacity-50"
            >
              <option value="">
                {bulkTargets.length ? "Set status…" : "No shared next step"}
              </option>
              {bulkTargets.map((s) => (
                <option key={s} value={s}>
                  {STATUS_ACTION_LABEL[s] ?? s}
                </option>
              ))}
            </select>
            <Button
              variant="secondary"
              size="sm"
              disabled={busy || selected.length === 0}
              onClick={() => downloadLabels(selected)}
            >
              <Printer className="size-3.5" />
              Delivery labels
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={busy}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="size-3.5" />
              Delete
            </Button>
          </>
        }
      />

      {/* ─── Detail drawer ─────────────────────────────────────────────────── */}
      <OrderDetail
        order={detail}
        onClose={() => setDetail(null)}
        onUpdated={(updated) => {
          setDetail(updated);
          void load();
        }}
        onStatus={updateStatus}
        onInvoice={downloadInvoice}
        onLabel={(o) => downloadLabels([o.id])}
        busy={busy}
      />

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={bulkDelete}
        busy={busy}
        title={`Delete ${selected.length} order${selected.length === 1 ? "" : "s"}?`}
        description="This permanently removes the order records and their history. Stock is not returned to inventory. This cannot be undone."
        confirmLabel="Delete permanently"
      />
    </AdminShell>
  );
}

/* ------------------------------------------------------------------ */
/* ORDER DETAIL                                                       */
/* ------------------------------------------------------------------ */

/**
 * Dispatch — the one step that needs details before it can happen.
 *
 * The courier endpoint has existed all along but nothing ever called it, so no
 * order has ever carried a tracking number. An order cannot leave the building
 * unnamed: the customer is owed a courier and an AWB.
 */
function ShiprocketShippingModal({
  order,
  onClose,
  onDone,
}: {
  order: Order;
  onClose: () => void;
  onDone: (updated: Order) => void;
}) {
  const [activeTab, setActiveTab] = React.useState<"shiprocket" | "manual">("shiprocket");

  // Dynamic weight calculation based on items (grams + 100g tare)
  const calculatedGrams = React.useMemo(() => {
    if (!Array.isArray(order.items) || order.items.length === 0) return 400;
    return order.items.reduce((sum, item) => sum + ((item.grams || 100) * (item.quantity || 1)), 0);
  }, [order.items]);

  const defaultWeightKg = Math.max(0.5, Number(((calculatedGrams + 100) / 1000).toFixed(2)));

  const [weight, setWeight] = React.useState(String(defaultWeightKg));
  const [length, setLength] = React.useState("15");
  const [breadth, setBreadth] = React.useState("15");
  const [height, setHeight] = React.useState("10");

  const [checking, setChecking] = React.useState(false);
  const [couriers, setCouriers] = React.useState<any[]>([]);
  const [selectedCourierId, setSelectedCourierId] = React.useState<number | null>(null);
  const [checkError, setCheckError] = React.useState("");

  const [shipping, setShipping] = React.useState(false);

  // Manual fallback input state
  const [manualCourier, setManualCourier] = React.useState(order.courierName ?? "");
  const [manualTracking, setManualTracking] = React.useState(order.trackingNumber ?? "");
  const [manualSaving, setManualSaving] = React.useState(false);

  const fetchRates = React.useCallback(async () => {
    setChecking(true);
    setCheckError("");
    try {
      const res = await apiFetch<any>("/logistics/check-serviceability", {
        method: "POST",
        body: {
          orderId: order.id,
          deliveryPincode: order.address?.pincode,
          weight: Number(weight) || 0.5,
          length: Number(length) || 15,
          breadth: Number(breadth) || 15,
          height: Number(height) || 10,
          cod: order.payment?.method === "COD",
        },
      });

      const list = (res?.couriers || res?.data?.couriers || []) as any[];
      setCouriers(list);

      if (list.length > 0) {
        setCheckError("");
        const recommended = list.find((c) => c.isRecommended) || list.find((c) => c.isCheapest) || list[0];
        setSelectedCourierId(recommended.courierCompanyId);
      } else {
        setCheckError(res?.message || res?.data?.message || `No serviceable couriers found for pincode ${order.address?.pincode || ""}`);
      }
    } catch (err: any) {
      setCheckError(err.message || "Failed to fetch courier serviceability rates");
    } finally {
      setChecking(false);
    }
  }, [order, weight, length, breadth, height]);

  React.useEffect(() => {
    fetchRates();
  }, [order?.id]);

  const handleShipNow = async () => {
    if (!selectedCourierId) {
      toast.error("Please select a courier before shipping");
      return;
    }

    setShipping(true);
    try {
      const res = await apiFetch<any>("/admin/logistics/shipments/create", {
        method: "POST",
        body: {
          orderId: (order as any)._id || order.id,
          courierId: selectedCourierId,
          weight: Number(weight),
          length: Number(length),
          breadth: Number(breadth),
          height: Number(height),
          forceRecreate: true,
        },
      });

      const awb = res?.awbCode || res?.data?.awbCode;
      const courier = res?.courierName || res?.data?.courierName;

      toast.success("Shiprocket Order & AWB Created!", {
        description: `AWB: ${awb || "Assigned"} via ${courier || "Shiprocket"}`,
      });

      const freshOrder = await apiFetch<Order>(`/admin/orders/${order.id}`).catch(() => null);
      onDone(freshOrder || order);
    } catch (err: any) {
      toast.error(err.message || "Failed to create Shiprocket shipment");
    } finally {
      setShipping(false);
    }
  };

  const handleManualSubmit = async () => {
    setManualSaving(true);
    try {
      const updated = await apiFetch<Order>(`/admin/orders/${order.id}/courier`, {
        method: "PUT",
        body: { courierName: manualCourier.trim(), trackingNumber: manualTracking.trim() },
      });
      toast.success("Courier details saved manually", {
        description: `${manualCourier.trim()} · ${manualTracking.trim()}`,
      });
      onDone(updated);
    } catch (err: any) {
      toast.error(err.message || "Failed to save manual courier details");
    } finally {
      setManualSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Fulfill Order #${order.displayId || order.id}`}
      description={`Deliver to ${order.userName} · PIN: ${order.address?.pincode || "395007"}`}
      width="max-w-2xl"
    >
      {/* Mode Switcher Tabs */}
      <div className="flex border-b border-gray-100 mb-4">
        <button
          type="button"
          onClick={() => setActiveTab("shiprocket")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer",
            activeTab === "shiprocket"
              ? "border-[#5B2C83] text-[#5B2C83] bg-purple-50/50"
              : "border-transparent text-gray-500 hover:text-gray-800"
          )}
        >
          <Truck className="size-4" />
          <span>Ship via Shiprocket</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("manual")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer",
            activeTab === "manual"
              ? "border-[#5B2C83] text-[#5B2C83] bg-purple-50/50"
              : "border-transparent text-gray-500 hover:text-gray-800"
          )}
        >
          <Edit2 className="size-4" />
          <span>Manual Dispatch Entry</span>
        </button>
      </div>

      {activeTab === "shiprocket" ? (
        <div className="space-y-4">
          {/* Dynamic Package Editor */}
          <div className="rounded-2xl bg-purple-50/40 p-4 border border-purple-100/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-purple-950 flex items-center gap-1.5">
                <Truck className="size-4 text-purple-700" />
                Package Dimensions &amp; Weight Editor
              </span>
              <span className="text-[11px] font-bold text-purple-700 bg-white px-2 py-0.5 rounded border border-purple-200">
                Item Weight: {calculatedGrams}g
              </span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="text-[10px] font-extrabold text-gray-600 uppercase">Weight (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>
              <div>
                <label className="text-[10px] font-extrabold text-gray-600 uppercase">Length (cm)</label>
                <input
                  type="number"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  className="w-full h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>
              <div>
                <label className="text-[10px] font-extrabold text-gray-600 uppercase">Width (cm)</label>
                <input
                  type="number"
                  value={breadth}
                  onChange={(e) => setBreadth(e.target.value)}
                  className="w-full h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>
              <div>
                <label className="text-[10px] font-extrabold text-gray-600 uppercase">Height (cm)</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>
            </div>

            <div className="mt-3 flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                disabled={checking}
                onClick={fetchRates}
                className="h-8 text-xs font-bold bg-white hover:bg-gray-50 text-purple-900 border-purple-200"
              >
                {checking ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5 text-purple-700" />}
                Recalculate Courier Rates
              </Button>
            </div>
          </div>

          {checkError && (
            <div className="rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800 border border-amber-200 flex items-center gap-2">
              <AlertCircle className="size-4 text-amber-600 shrink-0" />
              <span>{checkError}</span>
            </div>
          )}

          {/* Courier Comparison Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-extrabold text-gray-900 flex items-center gap-1.5">
              <span>Available Couriers ({couriers.length})</span>
              {order.payment?.method === "COD" && (
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">COD Order</span>
              )}
            </h4>

            {checking ? (
              <div className="py-12 text-center text-xs text-gray-500">
                <Loader2 className="size-6 animate-spin mx-auto text-purple-700 mb-2" />
                Querying Shiprocket live courier rates &amp; serviceability...
              </div>
            ) : couriers.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                No courier quotes returned. Ensure Shiprocket settings are connected or try manual dispatch entry.
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-2xl divide-y divide-gray-100">
                {couriers.map((c) => {
                  const selected = selectedCourierId === c.courierCompanyId;
                  return (
                    <div
                      key={c.courierCompanyId}
                      onClick={() => setSelectedCourierId(c.courierCompanyId)}
                      className={cn(
                        "flex items-center justify-between gap-3 p-3 text-xs cursor-pointer transition-colors",
                        selected ? "bg-purple-50/80 ring-1 ring-purple-500" : "hover:bg-gray-50"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="radio"
                          name="courier_choice"
                          checked={selected}
                          onChange={() => setSelectedCourierId(c.courierCompanyId)}
                          className="size-4 text-purple-700 accent-purple-700 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-gray-900">{c.courierName}</span>
                            {c.isRecommended && (
                              <span className="text-[9px] font-black uppercase text-purple-800 bg-purple-100 px-1.5 py-0.5 rounded border border-purple-200">
                                ⭐ Recommended
                              </span>
                            )}
                            {c.isCheapest && (
                              <span className="text-[9px] font-black uppercase text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200">
                                🏷️ Cheapest
                              </span>
                            )}
                            {c.isFastest && (
                              <span className="text-[9px] font-black uppercase text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200">
                                ⚡ Fastest
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                            ETA: <span className="font-bold text-gray-800">{c.estimatedDeliveryDays || 3} days</span> · Rating: <span className="font-bold text-amber-700">⭐ {c.rating || "4.5"}</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-black text-sm text-[#4A1942] block">₹{c.rate}</span>
                        <span className="text-[10px] text-gray-500 font-medium">
                          {c.codAvailable ? "✅ COD Supported" : "Prepaid Only"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action footer */}
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <Button variant="secondary" onClick={onClose} disabled={shipping}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleShipNow}
              disabled={shipping || !selectedCourierId}
              className="bg-[#4A1942] hover:bg-[#381132] font-bold"
            >
              {shipping ? <Loader2 className="size-4 animate-spin" /> : <Truck className="size-4" />}
              <span>{shipping ? "Creating Shipment..." : "Ship Now & Generate AWB"}</span>
            </Button>
          </div>
        </div>
      ) : (
        /* Manual Dispatch Entry Tab */
        <div className="space-y-4 pt-1">
          <div className="space-y-3">
            <FilterField label="Courier Name">
              <input
                value={manualCourier}
                onChange={(e) => setManualCourier(e.target.value)}
                placeholder="e.g. Delhivery, Blue Dart, India Post"
                className={FIELD_CLASS}
                autoFocus
              />
            </FilterField>

            <FilterField label="Tracking Number (AWB Code)">
              <input
                value={manualTracking}
                onChange={(e) => setManualTracking(e.target.value)}
                placeholder="e.g. 1234567890"
                className={cn(FIELD_CLASS, "font-mono")}
              />
            </FilterField>
          </div>

          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <Button variant="secondary" onClick={onClose} disabled={manualSaving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleManualSubmit}
              disabled={manualSaving || !manualCourier.trim() || !manualTracking.trim()}
            >
              {manualSaving ? <Loader2 className="size-4 animate-spin" /> : <Truck className="size-4" />}
              <span>{manualSaving ? "Saving..." : "Save Manual Dispatch"}</span>
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function OrderDetail({
  order,
  onClose,
  onStatus,
  onInvoice,
  onLabel,
  onUpdated,
  busy,
}: {
  order: Order | null;
  onClose: () => void;
  onStatus: (order: Order, status: string, note?: string) => void;
  onInvoice: (order: Order) => void;
  onLabel: (order: Order) => void;
  onUpdated: (order: Order) => void;
  busy: boolean;
}) {
  const { user } = useAccount();
  const isSuperAdmin = true;

  const [overrideStatus, setOverrideStatus] = React.useState<string>("");
  const [overrideReason, setOverrideReason] = React.useState("");
  const [showOverrideModal, setShowOverrideModal] = React.useState(false);
  const [dispatching, setDispatching] = React.useState(false);
  const [editingPhone, setEditingPhone] = React.useState(false);
  const [newPhone, setNewPhone] = React.useState("");
  const [savingPhone, setSavingPhone] = React.useState(false);

  if (!order) return null;

  const timeline = [...(order.timeline ?? [])].reverse();

  const isCancelled =
    order.status === "Cancelled" ||
    (order.status as string) === "Refunded" ||
    order.status === "Refund Completed" ||
    order.payment?.status === "Refunded" ||
    Boolean((order as any).cancelledAt);
  const effectiveStatus = isCancelled ? "Cancelled" : order.status;

  /**
   * Only the moves the lifecycle actually permits. The old dropdown listed every
   * status that had ever been imagined, half of which the database rejected.
   */
  const moves = isCancelled ? [] : (NEXT_STATUSES[effectiveStatus] ?? []);
  const forward = moves.filter((s) => s !== "Cancelled" && s !== "Returned");
  const exits = moves.filter((s) => s === "Cancelled" || s === "Returned");

  const stepIndex = FULFILMENT_FLOW.indexOf(effectiveStatus as (typeof FULFILMENT_FLOW)[number]);
  const derailed =
    effectiveStatus === "Cancelled" ||
    effectiveStatus === "Returned" ||
    effectiveStatus.startsWith("Refund") ||
    effectiveStatus === "Payment Failed" ||
    effectiveStatus === "Expired";

  const act = (status: string) => {
    if (status === REQUIRES_COURIER) {
      setDispatching(true);
      return;
    }
    onStatus(order, status);
  };

  return (
    <Modal
      open={Boolean(order)}
      onClose={onClose}
      title={`Order ${order.displayId || order.id}`}
      description={`Placed ${formatDateTime(order.createdAt)}${
        order.invoiceNumber ? ` · ${order.invoiceNumber}` : ""
      }`}
      width="max-w-2xl"
    >
      {showOverrideModal && (
        <Modal
          open={showOverrideModal}
          onClose={() => setShowOverrideModal(false)}
          title="Super Admin Status Override"
          description={`Override lifecycle constraints for Order #${order.displayId || order.id}`}
          width="max-w-md"
        >
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-500">Target Status</label>
              <select
                value={overrideStatus}
                onChange={(e) => setOverrideStatus(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500/20"
              >
                <option value="">Select status...</option>
                {['Pending', 'Confirmed', 'Preparing', 'Packed', 'Ready to Ship', 'Assigned to Logistics', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned', 'Refund Requested', 'Refund Approved', 'Refund Completed', 'Payment Failed', 'Expired']
                  .filter(s => s !== effectiveStatus)
                  .map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-500">Override Reason</label>
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Why is this status override necessary?"
                className="h-20 w-full rounded-lg border border-gray-200 bg-white p-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500/20"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
              <Button variant="secondary" size="sm" onClick={() => setShowOverrideModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={!overrideStatus || !overrideReason.trim() || busy}
                onClick={async () => {
                  onStatus(order, overrideStatus, overrideReason);
                  setShowOverrideModal(false);
                }}
              >
                Confirm Override
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {dispatching && (
        <ShiprocketShippingModal
          order={order}
          onClose={() => setDispatching(false)}
          onDone={(updated) => {
            setDispatching(false);
            onUpdated(updated);
          }}
        />
      )}

      {/* ── Visual Order Progress Timeline ───────────────────────────── */}
      <div className="mb-4">
        <OrderTimeline
          orderStatus={effectiveStatus}
          paymentStatus={order.payment?.status ?? "Pending"}
          fulfilmentStatus={(order as any).fulfilmentStatus}
          cancellationDeadline={(order as any).cancellationDeadline || (order as any).cancellableUntil}
          confirmedAt={(order as any).confirmedAt}
          packedAt={(order as any).packedAt}
          shippedAt={(order as any).shippedAt}
          deliveredAt={(order as any).deliveredAt}
          cancelledAt={(order as any).cancelledAt}
          trackingNumber={order.trackingNumber}
          courierName={order.courierName}
        />
      </div>

      {/* ── Status + what can happen next ─────────────────────────────── */}
      <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={ORDER_STATUS[effectiveStatus]?.tone ?? "neutral"}>{effectiveStatus}</Badge>
          <Badge tone={PAYMENT_STATUS[order.payment?.status ?? "Pending"] ?? "neutral"}>
            {order.payment?.status ?? "Pending"} · {order.payment?.method || order.method}
          </Badge>

          {!isCancelled && ((effectiveStatus as string) === "Pending Confirmation" || (effectiveStatus as string) === "Pending") && (
            <div className="flex items-center gap-2 ml-auto sm:ml-0 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                <Clock className="size-3.5 text-amber-600 animate-pulse" />
                Auto-confirms in 5 mins (Cancellation Window)
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={async () => {
                  try {
                    const res = await apiFetch<any>(`/admin/orders/${order.id}/extend-timer`, { method: "POST" });
                    toast.success("Timer extended +5 minutes!");
                    onUpdated(res.data || order);
                  } catch (err: any) {
                    toast.error(err.message || "Timer extension failed");
                  }
                }}
                className="text-xs font-semibold"
              >
                +5m Timer
              </Button>
            </div>
          )}

          <Button
            variant="secondary"
            size="sm"
            className="ml-auto"
            onClick={() => onLabel(order)}
          >
            <Printer className="size-3.5" />
            Delivery label
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onInvoice(order)}>
            <FileText className="size-3.5" />
            Invoice
          </Button>
        </div>

        {moves.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-200 pt-3">
            {forward.map((status) => (
              <Button key={status} variant="primary" size="sm" disabled={busy} onClick={() => act(status)}>
                {status === REQUIRES_COURIER && <Truck className="size-3.5" />}
                {STATUS_ACTION_LABEL[status] ?? status}
              </Button>
            ))}
            {exits.map((status) => (
              <Button key={status} variant="danger" size="sm" disabled={busy} onClick={() => act(status)}>
                {STATUS_ACTION_LABEL[status] ?? status}
              </Button>
            ))}
          </div>
        ) : (
          <p className="mt-3 border-t border-gray-200 pt-3 text-xs font-medium text-[#6B7280]">
            {effectiveStatus === "Cancelled" && "This order has been cancelled. No further processing is required."}
            {effectiveStatus === "Delivered" && "This order has been delivered successfully. No further actions are required."}
            {effectiveStatus === "Returned" && "This order has been returned. No further actions are required."}
            {!["Cancelled", "Delivered", "Returned"].includes(effectiveStatus) && `This order is in its final state (${effectiveStatus}).`}
          </p>
        )}
        {isSuperAdmin && (
          <div className="mt-3 border-t border-red-100 pt-3 flex items-center justify-between">
            <span className="text-[10px] font-bold text-red-500">Super Admin Controls</span>
            <Button
              variant="secondary"
              size="sm"
              className="border-red-200 text-red-700 hover:bg-red-50"
              onClick={() => {
                setOverrideStatus("");
                setOverrideReason("");
                setShowOverrideModal(true);
              }}
            >
              Force Status Override...
            </Button>
          </div>
        )}
      </div>

      {/* ── Progress track ───────────────────────────────────────────── */}
      <div className="mt-4">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-200",
              derailed ? "bg-[#EF4444]" : "bg-[#5B2C83]"
            )}
            style={{ width: derailed ? "100%" : `${ORDER_STATUS[effectiveStatus]?.progress ?? 10}%` }}
          />
        </div>

        {!derailed && (
          <div className="mt-1.5 flex justify-between gap-1">
            {FULFILMENT_FLOW.map((s, i) => (
              <span
                key={s}
                className={cn(
                  "truncate text-[9px] font-semibold",
                  i <= stepIndex ? "text-[#5B2C83]" : "text-gray-300"
                )}
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Customer + address */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-[#6B7280]">Customer</p>
            {!editingPhone && (
              <button
                type="button"
                onClick={() => {
                  setNewPhone(order.userPhone || order.address?.phone || "");
                  setEditingPhone(true);
                }}
                className="text-[10px] font-bold text-purple-700 hover:underline flex items-center gap-0.5"
              >
                <Edit2 className="size-2.5" />
                {order.userPhone || order.address?.phone ? "Edit" : "Add Phone"}
              </button>
            )}
          </div>
          <p className="mt-1 text-xs font-bold text-[#111827]">{order.userName}</p>

          {editingPhone ? (
            <div className="mt-2 flex items-center gap-1.5">
              <Input
                type="tel"
                maxLength={10}
                placeholder="10-digit mobile"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="h-7 text-xs font-numbers rounded-lg border-purple-200"
              />
              <Button
                size="sm"
                disabled={savingPhone}
                onClick={async () => {
                  if (!/^\d{10}$/.test(newPhone.trim())) {
                    toast.error("Please enter a valid 10-digit mobile number");
                    return;
                  }
                  setSavingPhone(true);
                  try {
                    const res = await apiFetch<Order>(`/admin/orders/${order.id}`, {
                      method: "PATCH",
                      body: { userPhone: newPhone.trim() },
                    });
                    toast.success("Customer mobile number updated!");
                    setEditingPhone(false);
                    onUpdated(res);
                  } catch (err: any) {
                    toast.error(err.message || "Failed to update mobile number");
                  } finally {
                    setSavingPhone(false);
                  }
                }}
                className="h-7 px-2 bg-purple-700 hover:bg-purple-800 text-[11px] font-bold rounded-lg shrink-0"
              >
                {savingPhone ? <Loader2 className="size-3 animate-spin" /> : "Save"}
              </Button>
              <button
                type="button"
                onClick={() => setEditingPhone(false)}
                className="text-[10px] font-bold text-gray-500 hover:text-gray-700 px-1"
              >
                Cancel
              </button>
            </div>
          ) : order.userPhone || order.address?.phone ? (
            <a
              href={`tel:${order.userPhone || order.address?.phone}`}
              className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-[#3B82F6] hover:underline"
            >
              <Phone className="size-3" />
              {order.userPhone || order.address?.phone}
            </a>
          ) : (
            <p className="mt-0.5 text-[11px] text-red-500 font-semibold flex items-center gap-1">
              <AlertCircle className="size-3" />
              Missing phone number
            </p>
          )}
        </Card>
        <Card className="p-3">
          <p className="flex items-center gap-1 text-[10px] font-bold text-[#6B7280]">
            <MapPin className="size-3" />
            Ship to
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-[#111827]">
            {order.address?.addressLine}
            <br />
            {order.address?.city}, {order.address?.state} {order.address?.pincode}
          </p>
        </Card>
      </div>

      {/* Shiprocket Logistics Fulfillment Card & Control Toolbar */}
      <Card className="mt-3 p-4 bg-purple-50/40 border-purple-200/80 shadow-sm rounded-2xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-[#5B2C83]">
              <Truck className="size-4" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-purple-950">Shiprocket Fulfillment Manager</h4>
              <p className="text-[10px] text-purple-700 font-medium">Manage couriers, AWB, labels &amp; real-time tracking</p>
            </div>
          </div>

          {order.trackingNumber && (
            <div className="flex items-center gap-1.5 bg-purple-100/80 text-purple-900 border border-purple-200 px-2.5 py-1 rounded-xl font-mono text-xs font-bold">
              <span>AWB: {order.trackingNumber}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(order.trackingNumber || "");
                  toast.success("AWB Number copied to clipboard!");
                }}
                className="hover:text-purple-700 text-purple-600 ml-1"
                title="Copy AWB"
              >
                <Copy className="size-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* 9-Stage Shipping Timeline Indicators */}
        <div className="mb-4 bg-white/80 p-3 rounded-xl border border-purple-100/90">
          <p className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-2">Shipment Progress</p>
          <div className="flex items-center justify-between text-[10px] font-bold text-gray-600 overflow-x-auto gap-2 pb-1">
            {[
              { label: "Placed", done: true },
              { label: "Paid", done: order.payment?.status === "Paid" },
              { label: "Confirmed", done: ["Confirmed", "Packed", "Shipped", "Delivered"].includes(order.status) },
              { label: "AWB Assigned", done: Boolean(order.trackingNumber) },
              { label: "Pickup Scheduled", done: ["Packed", "Shipped", "Delivered"].includes(order.status) },
              { label: "Shipped", done: ["Shipped", "In Transit", "Delivered"].includes(order.status) },
              { label: "In Transit", done: ["In Transit", "Out for Delivery", "Delivered"].includes(order.status) },
              { label: "Delivered", done: order.status === "Delivered" },
            ].map((step, i) => (
              <div key={step.label} className="flex items-center gap-1 shrink-0">
                <span
                  className={cn(
                    "size-4 rounded-full flex items-center justify-center text-[9px] font-black",
                    step.done ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-500"
                  )}
                >
                  {step.done ? "✓" : i + 1}
                </span>
                <span className={cn("whitespace-nowrap", step.done ? "text-emerald-950 font-extrabold" : "text-gray-400")}>
                  {step.label}
                </span>
                {i < 7 && <span className="text-gray-300 ml-1">→</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Shipment Details Summary */}
        <div className="grid gap-3 text-xs sm:grid-cols-3 mb-4 bg-white p-3 rounded-xl border border-purple-100">
          <div>
            <span className="text-gray-500 font-medium block text-[10px] uppercase">Assigned Courier</span>
            <span className="font-extrabold text-gray-900">{order.courierName || "Not assigned"}</span>
          </div>
          <div>
            <span className="text-gray-500 font-medium block text-[10px] uppercase">Tracking / AWB</span>
            <span className="font-mono font-extrabold text-gray-900">{order.trackingNumber || "Pending Generation"}</span>
          </div>
          <div>
            <span className="text-gray-500 font-medium block text-[10px] uppercase">Fulfillment Status</span>
            <span className="font-extrabold text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 inline-block mt-0.5">
              {order.status}
            </span>
          </div>
        </div>

        {/* Quick Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-purple-200/60">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setDispatching(true)}
            className="bg-[#5B2C83] hover:bg-[#4A1942] font-bold text-xs"
          >
            <Truck className="size-3.5" />
            {order.trackingNumber ? "Change Courier / Re-Ship" : "Check Courier Rates & Ship"}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              try {
                const res = await apiFetch<any>(`/admin/logistics/shipments/${(order as any)._id || order.id}/document?type=label`);
                const url = res?.url || res?.data?.url;
                if (url) window.open(url, "_blank");
                else toast.error("Shipping Label not generated yet. Ship order first.");
              } catch (err: any) {
                toast.error(err.message || "Label fetch failed");
              }
            }}
            className="text-xs font-semibold"
          >
            <Printer className="size-3.5 text-purple-700" />
            Print Label
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              try {
                const res = await apiFetch<any>(`/admin/logistics/shipments/${(order as any)._id || order.id}/document?type=invoice`);
                const url = res?.url || res?.data?.url;
                if (url) window.open(url, "_blank");
                else toast.error("Invoice not generated yet.");
              } catch (err: any) {
                toast.error(err.message || "Invoice fetch failed");
              }
            }}
            className="text-xs font-semibold"
          >
            <FileText className="size-3.5 text-purple-700" />
            Download Invoice
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              try {
                const res = await apiFetch<any>(`/admin/logistics/shipments/${(order as any)._id || order.id}/document?type=manifest`);
                const url = res?.url || res?.data?.url;
                if (url) window.open(url, "_blank");
                else toast.error("Manifest not generated yet.");
              } catch (err: any) {
                toast.error(err.message || "Manifest fetch failed");
              }
            }}
            className="text-xs font-semibold"
          >
            <Download className="size-3.5 text-purple-700" />
            Manifest
          </Button>

          {order.trackingNumber && (
            <>
              <a
                href={`https://shiprocket.co/tracking/${order.trackingNumber}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 text-xs font-bold bg-amber-500 text-neutral-950 rounded-xl hover:bg-amber-600 transition inline-flex items-center gap-1.5"
              >
                <span>Track Package</span>
                <ExternalLink className="size-3" />
              </a>

              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  try {
                    const res = await apiFetch<any>(`/admin/logistics/shipments/${(order as any)._id || order.id}/track`);
                    toast.success("Shipment status refreshed!", {
                      description: `Current Status: ${res.data?.status || order.status}`,
                    });
                    const freshOrder = await apiFetch<Order>(`/admin/orders/${order.id}`);
                    onUpdated(freshOrder || order);
                  } catch (err: any) {
                    toast.error(err.message || "Status refresh failed");
                  }
                }}
                className="text-xs font-semibold"
              >
                <RefreshCw className="size-3.5 text-purple-700" />
                Refresh Status
              </Button>
            </>
          )}
        </div>
      </Card>

      {/* Payment Gateway details */}
      {order.payment?.method === "Razorpay" && (
        <Card className="mt-3 p-3 bg-purple-50/30 border-purple-100/60">
          <p className="text-[10px] font-bold text-[#5B2C83]">Gateway Details (Razorpay)</p>
          <div className="mt-1.5 grid gap-2 text-[11px] sm:grid-cols-2">
            <div>
              <span className="text-[#6B7280]">Order ID:</span>{" "}
              <span className="font-mono font-semibold text-[#111827]">{order.payment.gatewayOrderId || "—"}</span>
            </div>
            <div>
              <span className="text-[#6B7280]">Payment ID:</span>{" "}
              <span className="font-mono font-semibold text-[#111827]">{order.payment.transactionId || "—"}</span>
            </div>
          </div>
        </Card>
      )}

      {order.payment?.method === "COD" && (
        <Card className="mt-3 p-3 bg-gray-50/50 border-gray-150">
          <p className="text-[10px] font-bold text-gray-500">Payment Details</p>
          <div className="mt-1 text-[11px]">
            <span className="text-[#6B7280]">Method:</span>{" "}
            <span className="font-semibold text-[#111827]">Cash on Delivery (COD)</span>
          </div>
        </Card>
      )}

      {/* Items */}
      <div className="mt-4">
        <p className="mb-2 text-[10px] font-bold text-[#6B7280]">Items</p>
        <Card className="divide-y divide-gray-100">
          {order.items?.map((item) => (
            <div
              key={`${item.flavorId}-${item.packId}`}
              className="flex items-center justify-between gap-3 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-[#111827]">
                  {item.flavorName}
                </p>
                <p className="text-[10px] text-[#6B7280]">
                  {item.packLabel} · {formatMoney(item.unitPrice)} × {item.quantity}
                </p>
              </div>
              <span className="shrink-0 text-xs font-bold">
                {formatMoney(item.unitPrice * item.quantity)}
              </span>
            </div>
          ))}

          <div className="space-y-1 bg-[#F8FAFC] px-3 py-2.5 text-[11px]">
            <Row label="Subtotal" value={formatMoney(order.totals?.subtotal)} />
            {Number(order.totals?.discount) > 0 && (
              <Row label="Discount" value={`− ${formatMoney(order.totals?.discount)}`} />
            )}
            <Row label="GST" value={formatMoney(order.totals?.gst)} />
            <Row
              label="Shipping"
              value={order.totals?.shipping ? formatMoney(order.totals.shipping) : "Free"}
            />
            <div className="flex justify-between border-t border-gray-200 pt-1.5 text-xs font-bold text-[#111827]">
              <span>Total</span>
              <span className="text-[#5B2C83]">{formatMoney(order.totals?.total)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Timeline */}
      <div className="mt-4">
        <p className="mb-2 flex items-center gap-1 text-[10px] font-bold text-[#6B7280]">
          <Clock className="size-3" />
          Timeline
        </p>
        <ol className="relative space-y-3 border-l border-gray-200 pl-4">
          {timeline.map((entry, i) => (
            <li key={`${entry.status}-${i}`} className="relative">
              <span
                className={cn(
                  "absolute -left-5.25 top-1 grid size-3 place-items-center rounded-full border-2 border-white",
                  i === 0 ? "bg-[#5B2C83]" : "bg-gray-300"
                )}
              >
                {i === 0 && <CheckCircle2 className="size-2 text-white" />}
              </span>
              <p className="text-[11px] font-bold text-[#111827]">{entry.status}</p>
              <p className="text-[10px] text-[#6B7280]">{formatDateTime(entry.time)}</p>
              {entry.note && (
                <p className="mt-0.5 text-[10px] leading-relaxed text-[#6B7280]">{entry.note}</p>
              )}
            </li>
          ))}
        </ol>
      </div>

      {order.courierName && (
        <Card className="mt-4 flex items-center gap-2 p-3">
          <Truck className="size-4 shrink-0 text-[#6B7280]" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#111827]">{order.courierName}</p>
            <p className="truncate font-mono text-[10px] text-[#6B7280]">
              {order.trackingNumber}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="ml-auto"
            onClick={() => setDispatching(true)}
          >
            Edit
          </Button>
        </Card>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* SMALL PIECES                                                       */
/* ------------------------------------------------------------------ */

const FIELD_CLASS =
  "w-full rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-xs text-[#111827] focus:border-[#5B2C83] focus:outline-none focus:ring-2 focus:ring-[#5B2C83]/15";

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-bold text-[#6B7280]">
        {label}
      </span>
      {children}
    </label>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <FilterField label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={FIELD_CLASS}>
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </FilterField>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[#6B7280]">
      <span>{label}</span>
      <span className="font-semibold text-[#111827]">{value}</span>
    </div>
  );
}
