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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { apiFetchEnvelope, apiFetch, getTokens } from "@/lib/api";
import { useAccount } from "@/components/account/account-provider";
import { AdminShell } from "@/components/admin/console/admin-shell";
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

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const env = await apiFetchEnvelope<Order[]>(`/admin/orders?${query}`);
      setOrders(env.data ?? []);
      setTotalPages(env.pagination?.totalPages ?? 1);
      setTotalRecords(env.pagination?.totalRecords ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [query]);

  React.useEffect(() => {
    load();
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
      cell: (o) => (
        <div className="min-w-0">
          <p className="truncate font-semibold">{o.userName}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[10px] text-[#6B7280]">
            <Phone className="size-2.5" />
            {o.userPhone}
          </p>
        </div>
      ),
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
      cell: (o) => (
        <Badge tone={ORDER_STATUS[o.status]?.tone ?? "neutral"}>{o.status}</Badge>
      ),
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
              <span className="mr-0.5 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
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
function DispatchDialog({
  order,
  onClose,
  onDone,
}: {
  order: Order;
  onClose: () => void;
  onDone: (updated: Order) => void;
}) {
  const [courierName, setCourierName] = React.useState(order.courierName ?? "");
  const [trackingNumber, setTrackingNumber] = React.useState(order.trackingNumber ?? "");
  const [saving, setSaving] = React.useState(false);

  const editing = Boolean(order.trackingNumber);

  const submit = async () => {
    setSaving(true);
    try {
      const updated = await apiFetch<Order>(`/admin/orders/${order.id}/courier`, {
        method: "PUT",
        body: { courierName: courierName.trim(), trackingNumber: trackingNumber.trim() },
      });
      toast.success(editing ? "Courier details updated" : "Order dispatched", {
        description: `${courierName.trim()} · ${trackingNumber.trim()}`,
      });
      onDone(updated);
    } catch (err) {
      toast.error("Could not dispatch", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? "Update courier details" : `Dispatch ${order.displayId || order.id}`}
      description="The customer sees the courier and tracking number on their order."
      width="max-w-md"
    >
      <div className="flex flex-col gap-3.5">
        <FilterField label="Courier">
          <input
            value={courierName}
            onChange={(e) => setCourierName(e.target.value)}
            placeholder="Delhivery, Blue Dart, India Post…"
            className={FIELD_CLASS}
            autoFocus
          />
        </FilterField>

        <FilterField label="Tracking number (AWB)">
          <input
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="e.g. 1234567890"
            className={cn(FIELD_CLASS, "font-mono")}
          />
        </FilterField>
      </div>

      <div className="mt-5 flex justify-end gap-2 border-t border-gray-100 pt-4">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={submit}
          disabled={saving || !courierName.trim() || !trackingNumber.trim()}
        >
          <Truck className="size-3.5" />
          {saving ? "Saving…" : editing ? "Save details" : "Dispatch order"}
        </Button>
      </div>
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
  const isSuperAdmin = user?.role === "Super Admin";

  const [overrideStatus, setOverrideStatus] = React.useState<string>("");
  const [overrideReason, setOverrideReason] = React.useState("");
  const [showOverrideModal, setShowOverrideModal] = React.useState(false);
  const [dispatching, setDispatching] = React.useState(false);

  if (!order) return null;

  const timeline = [...(order.timeline ?? [])].reverse();

  /**
   * Only the moves the lifecycle actually permits. The old dropdown listed every
   * status that had ever been imagined, half of which the database rejected.
   */
  const moves = NEXT_STATUSES[order.status] ?? [];
  const forward = moves.filter((s) => s !== "Cancelled" && s !== "Returned");
  const exits = moves.filter((s) => s === "Cancelled" || s === "Returned");

  const stepIndex = FULFILMENT_FLOW.indexOf(order.status as (typeof FULFILMENT_FLOW)[number]);
  const derailed =
    order.status === "Cancelled" ||
    order.status === "Returned" ||
    order.status.startsWith("Refund") ||
    order.status === "Payment Failed" ||
    order.status === "Expired";

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
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Target Status</label>
              <select
                value={overrideStatus}
                onChange={(e) => setOverrideStatus(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500/20"
              >
                <option value="">Select status...</option>
                {['Pending', 'Confirmed', 'Preparing', 'Packed', 'Ready to Ship', 'Assigned to Logistics', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned', 'Refund Requested', 'Refund Approved', 'Refund Completed', 'Payment Failed', 'Expired']
                  .filter(s => s !== order.status)
                  .map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Override Reason</label>
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
        <DispatchDialog
          order={order}
          onClose={() => setDispatching(false)}
          onDone={(updated) => {
            setDispatching(false);
            onUpdated(updated);
          }}
        />
      )}

      {/* ── Status + what can happen next ─────────────────────────────── */}
      <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={ORDER_STATUS[order.status]?.tone ?? "neutral"}>{order.status}</Badge>
          <Badge tone={PAYMENT_STATUS[order.payment?.status ?? "Pending"] ?? "neutral"}>
            {order.payment?.status ?? "Pending"} · {order.payment?.method || order.method}
          </Badge>

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
            {order.status === "Cancelled" && "This order has been cancelled. No further processing is required."}
            {order.status === "Delivered" && "This order has been delivered successfully. No further actions are required."}
            {order.status === "Returned" && "This order has been returned. No further actions are required."}
            {!["Cancelled", "Delivered", "Returned"].includes(order.status) && `This order is in its final state (${order.status}).`}
          </p>
        )}
        {isSuperAdmin && (
          <div className="mt-3 border-t border-red-100 pt-3 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">Super Admin Controls</span>
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
            style={{ width: `${ORDER_STATUS[order.status]?.progress ?? 10}%` }}
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
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Customer</p>
          <p className="mt-1 text-xs font-bold text-[#111827]">{order.userName}</p>
          <a
            href={`tel:${order.userPhone}`}
            className="mt-0.5 flex items-center gap-1 text-[11px] text-[#3B82F6] hover:underline"
          >
            <Phone className="size-3" />
            {order.userPhone}
          </a>
        </Card>
        <Card className="p-3">
          <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
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

      {/* Payment Gateway details */}
      {order.payment?.method === "Razorpay" && (
        <Card className="mt-3 p-3 bg-purple-50/30 border-purple-100/60">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#5B2C83]">Gateway Details (Razorpay)</p>
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
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Payment Details</p>
          <div className="mt-1 text-[11px]">
            <span className="text-[#6B7280]">Method:</span>{" "}
            <span className="font-semibold text-[#111827]">Cash on Delivery (COD)</span>
          </div>
        </Card>
      )}

      {/* Items */}
      <div className="mt-4">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Items</p>
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
        <p className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
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
      <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
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
