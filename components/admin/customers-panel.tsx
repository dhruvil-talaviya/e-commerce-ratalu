"use client";

import * as React from "react";
import {
  Search, Download, Ban, CheckCircle2, Trash2, Eye, Pencil, X, Loader2,
  ChevronLeft, ChevronRight, RefreshCw, Users, MapPin, Package, Clock, Save,
} from "lucide-react";
import { apiFetch, getTokens } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { cn, formatINR } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Types — mirror the /admin/customers API contract                    */
/* ------------------------------------------------------------------ */

interface AdminAddress {
  _id: string;
  tag?: string;
  addressLine: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault?: boolean;
}

interface AdminCustomer {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  status: "Active" | "Blocked";
  addresses: AdminAddress[];
  activeAddressId?: string | null;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  totalOrders?: number;
  lifetimeSpend?: number;
  lastOrderAt?: string | null;
}

interface CustomerOrder {
  id: string;
  status: string;
  createdAt: string;
  totals: { total: number };
  items: { quantity: number }[];
  payment?: {
    method: string;
    status: string;
    transactionId?: string;
  };
}

interface CustomerDetail extends AdminCustomer {
  stats: {
    totalOrders: number;
    lifetimeSpend: number;
    avgOrderValue: number;
    lastOrderAt: string | null;
  };
  orders: CustomerOrder[];
  activity: { type: string; label: string; at: string }[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

type SortKey = "recent" | "spend" | "orders" | "name";

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

/* ------------------------------------------------------------------ */
/* Main panel                                                          */
/* ------------------------------------------------------------------ */

export function CustomersPanel() {
  const [rows, setRows] = React.useState<AdminCustomer[]>([]);
  const [pagination, setPagination] = React.useState<Pagination | null>(null);
  const [stats, setStats] = React.useState<{ total: number; active: number; blocked: number; newCustomers: number } | null>(null);

  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [status, setStatus] = React.useState<"" | "Active" | "Blocked">("");
  const [sort, setSort] = React.useState<SortKey>("recent");
  const [page, setPage] = React.useState(1);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [viewing, setViewing] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<AdminCustomer | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  // Debounce the search box so we don't hammer the API on every keystroke.
  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (debounced) params.set("search", debounced);
      if (status) params.set("status", status);

      // apiFetch unwraps `data`; we need `pagination` too, so read the envelope.
      const tokens = getTokens();
      const res = await fetch(`/api/v1/admin/customers?${params}`, {
        headers: tokens?.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {},
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to load customers");

      setRows(json.data || []);
      setPagination(json.pagination || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, [page, debounced, status]);

  const loadStats = React.useCallback(async () => {
    try {
      const s = await apiFetch<typeof stats>("/admin/customers/stats");
      setStats(s);
    } catch {
      /* non-fatal */
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => { loadStats(); }, [loadStats]);

  const refresh = () => { load(); loadStats(); };

  // Sorting is client-side over the current page (the API sorts by recency).
  const sorted = React.useMemo(() => {
    const list = [...rows];
    if (sort === "spend") list.sort((a, b) => (b.lifetimeSpend || 0) - (a.lifetimeSpend || 0));
    if (sort === "orders") list.sort((a, b) => (b.totalOrders || 0) - (a.totalOrders || 0));
    if (sort === "name") list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return list;
  }, [rows, sort]);

  const toggleStatus = async (c: AdminCustomer) => {
    const next = c.status === "Active" ? "Blocked" : "Active";
    setBusyId(c._id);
    try {
      await apiFetch(`/admin/customers/${c._id}/status`, { method: "PATCH", body: { status: next } });
      toast.success(next === "Blocked" ? "Customer blocked" : "Customer activated", {
        description: next === "Blocked" ? "Their active sessions were revoked." : `${c.name || c.phone} can sign in again.`,
      });
      refresh();
    } catch (err) {
      toast.error("Action failed", { description: err instanceof Error ? err.message : "" });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (c: AdminCustomer) => {
    if (!confirm(`Delete ${c.name || c.phone}? This cannot be undone.`)) return;
    setBusyId(c._id);
    try {
      await apiFetch(`/admin/customers/${c._id}`, { method: "DELETE" });
      toast.success("Customer deleted");
      refresh();
    } catch (err) {
      // Backend refuses (409) when the customer has orders — surface that clearly.
      toast.error("Cannot delete", { description: err instanceof Error ? err.message : "" });
    } finally {
      setBusyId(null);
    }
  };

  const exportCsv = async () => {
    try {
      const tokens = getTokens();
      const res = await fetch("/api/v1/admin/customers/export", {
        headers: tokens?.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {},
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exported");
    } catch (err) {
      toast.error("Export failed", { description: err instanceof Error ? err.message : "" });
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-end gap-3 border-b border-gray-100 pb-5">
        <div className="flex gap-2">
          <button
            onClick={refresh}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} /> Refresh
          </button>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-purple-700"
          >
            <Download className="size-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Customers" value={stats?.total} tone="purple" />
        <StatCard label="Active" value={stats?.active} tone="green" />
        <StatCard label="Blocked" value={stats?.blocked} tone="red" />
        <StatCard label="New (30 days)" value={stats?.newCustomers} tone="orange" />
      </div>

      {/* Toolbar */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, mobile or email…"
            className="h-10 w-full rounded-xl border border-gray-200 pl-10 pr-3 text-sm outline-none transition-colors focus:border-purple-400"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as typeof status); setPage(1); }}
          className="h-10 rounded-xl border border-gray-200 px-3 text-xs font-bold text-gray-600 outline-none focus:border-purple-400"
        >
          <option value="">All statuses</option>
          <option value="Active">Active</option>
          <option value="Blocked">Blocked</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="h-10 rounded-xl border border-gray-200 px-3 text-xs font-bold text-gray-600 outline-none focus:border-purple-400"
        >
          <option value="recent">Newest first</option>
          <option value="spend">Highest spend</option>
          <option value="orders">Most orders</option>
          <option value="name">Name (A–Z)</option>
        </select>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full min-w-[860px] text-left">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-4 py-3 font-bold">Customer</th>
              <th className="px-4 py-3 font-bold">Contact</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 font-bold text-right">Orders</th>
              <th className="px-4 py-3 font-bold text-right">Lifetime Spend</th>
              <th className="px-4 py-3 font-bold">Joined</th>
              <th className="px-4 py-3 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {loading && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                <Loader2 className="mx-auto size-5 animate-spin" />
              </td></tr>
            )}

            {!loading && error && (
              <tr><td colSpan={7} className="px-4 py-10 text-center">
                <p className="text-sm font-semibold text-red-600">{error}</p>
                <button onClick={refresh} className="mt-2 text-xs font-bold text-purple-600 hover:underline">Try again</button>
              </td></tr>
            )}

            {!loading && !error && sorted.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center">
                <Users className="mx-auto size-8 text-gray-300" />
                <p className="mt-2 text-sm font-semibold text-gray-500">No customers found</p>
                <p className="text-xs text-gray-400">Try a different search or filter.</p>
              </td></tr>
            )}

            {!loading && !error && sorted.map((c) => (
              <tr key={c._id} className="transition-colors hover:bg-gray-50/60">
                <td className="px-4 py-3 cursor-pointer group" onClick={() => setViewing(c._id)}>
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-purple-100 text-xs font-bold text-purple-700 group-hover:bg-purple-600 group-hover:text-white transition-all">
                      {(c.name || "?").trim().charAt(0).toUpperCase() || "?"}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-gray-900 group-hover:text-purple-700 transition-colors">
                        {c.name || <span className="italic text-gray-400">No name yet</span>}
                      </p>
                      <p className="text-[11px] text-gray-400">{c.addresses?.length || 0} address(es)</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 cursor-pointer" onClick={() => setViewing(c._id)}>
                  <p className="font-semibold text-gray-700">{c.phone}</p>
                  <p className="truncate text-[11px] text-gray-400">{c.email || "—"}</p>
                </td>
                <td className="px-4 py-3 cursor-pointer" onClick={() => setViewing(c._id)}><StatusPill status={c.status} /></td>
                <td className="px-4 py-3 cursor-pointer text-right font-semibold tabular-nums text-gray-700" onClick={() => setViewing(c._id)}>{c.totalOrders ?? 0}</td>
                <td className="px-4 py-3 cursor-pointer text-right font-bold tabular-nums text-gray-900" onClick={() => setViewing(c._id)}>{formatINR(c.lifetimeSpend || 0)}</td>
                <td className="px-4 py-3 cursor-pointer text-xs text-gray-500" onClick={() => setViewing(c._id)}>{fmtDate(c.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <IconBtn title="Edit" onClick={() => setEditing(c)}><Pencil className="size-4" /></IconBtn>
                    <IconBtn
                      title={c.status === "Active" ? "Block" : "Unblock"}
                      busy={busyId === c._id}
                      onClick={() => toggleStatus(c)}
                      tone={c.status === "Active" ? "warn" : "good"}
                    >
                      {c.status === "Active" ? <Ban className="size-4" /> : <CheckCircle2 className="size-4" />}
                    </IconBtn>
                    <IconBtn title="Delete" tone="danger" busy={busyId === c._id} onClick={() => remove(c)}>
                      <Trash2 className="size-4" />
                    </IconBtn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Page <span className="font-bold text-gray-700">{pagination.page}</span> of {pagination.pages} · {pagination.total} customers
          </p>
          <div className="flex gap-1.5">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="grid size-9 place-items-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage((p) => p + 1)}
              className="grid size-9 place-items-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}

      {viewing && <CustomerDrawer id={viewing} onClose={() => setViewing(null)} />}
      {editing && (
        <EditCustomerModal
          customer={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh(); }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

function StatCard({ label, value, tone }: { label: string; value?: number; tone: "purple" | "green" | "red" | "orange" }) {
  const tones = {
    purple: "bg-purple-50 text-purple-700",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
    orange: "bg-orange-50 text-orange-700",
  };
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <p className={cn("mt-1.5 inline-block rounded-lg px-2 py-0.5 text-2xl font-extrabold tabular-nums", tones[tone])}>
        {value === undefined ? "—" : value}
      </p>
    </div>
  );
}

function StatusPill({ status }: { status: "Active" | "Blocked" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold",
        status === "Active"
          ? "bg-green-50 text-green-700 border border-green-100"
          : "bg-red-50 text-red-700 border border-red-100"
      )}
    >
      <span className={cn("size-1.5 rounded-full", status === "Active" ? "bg-green-500" : "bg-red-500")} />
      {status}
    </span>
  );
}

function IconBtn({
  children, title, onClick, tone = "default", busy,
}: {
  children: React.ReactNode; title: string; onClick: () => void;
  tone?: "default" | "danger" | "warn" | "good"; busy?: boolean;
}) {
  const tones = {
    default: "text-gray-500 hover:bg-gray-100 hover:text-gray-800",
    danger: "text-red-500 hover:bg-red-50",
    warn: "text-orange-500 hover:bg-orange-50",
    good: "text-green-600 hover:bg-green-50",
  };
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={busy}
      className={cn("grid size-8 place-items-center rounded-lg transition-colors disabled:opacity-40", tones[tone])}
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : children}
    </button>
  );
}

/** Full customer profile — deliberately shows NO wallet/rewards/loyalty/referral. */
function CustomerDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const [data, setData] = React.useState<CustomerDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    apiFetch<CustomerDetail>(`/admin/customers/${id}`)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e?.message || "Failed to load"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-gray-900/40 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-lg flex-col overflow-y-auto bg-white shadow-2xl animate-[slide-in-right_0.3s_cubic-bezier(0.22,1,0.36,1)]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
          <h3 className="text-base font-bold text-gray-900">Customer Profile</h3>
          <button onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-lg text-gray-400 hover:bg-gray-100">
            <X className="size-4" />
          </button>
        </div>

        {loading && <div className="grid flex-1 place-items-center"><Loader2 className="size-6 animate-spin text-gray-300" /></div>}
        {error && <p className="p-5 text-sm font-semibold text-red-600">{error}</p>}

        {data && (
          <div className="flex flex-col gap-6 p-5">
            {/* Identity */}
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-full bg-purple-100 text-lg font-bold text-purple-700">
                {(data.name || "?").trim().charAt(0).toUpperCase() || "?"}
              </span>
              <div className="min-w-0">
                <p className="truncate text-lg font-bold text-gray-900">{data.name || "No name yet"}</p>
                <p className="text-sm text-gray-500">{data.phone} · {data.email || "no email"}</p>
              </div>
              <span className="ml-auto"><StatusPill status={data.status} /></span>
            </div>

            {/* Commercial summary — no wallet/rewards/loyalty */}
            <div className="grid grid-cols-3 gap-3">
              <MiniStat label="Total Orders" value={String(data.stats.totalOrders)} />
              <MiniStat label="Lifetime Spend" value={formatINR(data.stats.lifetimeSpend)} />
              <MiniStat label="Avg. Order" value={formatINR(data.stats.avgOrderValue)} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <Field label="Registered" value={fmtDate(data.createdAt)} />
              <Field label="Last Order" value={fmtDate(data.stats.lastOrderAt)} />
            </div>

            {data.notes && <Field label="Admin notes" value={data.notes} />}

            {/* Addresses */}
            <Section icon={MapPin} title={`Saved Addresses (${data.addresses.length})`}>
              {data.addresses.length === 0 && <Empty>No addresses saved.</Empty>}
              <div className="flex flex-col gap-2">
                {data.addresses.map((a) => {
                  const isDefault = a._id === data.activeAddressId || a.isDefault;
                  return (
                    <div key={a._id} className={cn("rounded-xl border p-3", isDefault ? "border-purple-200 bg-purple-50/40" : "border-gray-200")}>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-gray-600">{a.tag || "Home"}</span>
                        {isDefault && <span className="rounded-md bg-purple-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Default</span>}
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-gray-600">
                        {a.addressLine}{a.addressLine2 ? `, ${a.addressLine2}` : ""}
                        {a.landmark ? ` (${a.landmark})` : ""}<br />
                        {a.city}, {a.state} — {a.pincode}
                      </p>
                    </div>
                  );
                })}
              </div>
            </Section>

            {/* Order history */}
            <Section icon={Package} title={`Order & Payment History (${data.orders.length})`}>
              {data.orders.length === 0 && <Empty>No orders placed yet.</Empty>}
              <div className="flex flex-col gap-2.5">
                {data.orders.map((o) => {
                  const payStatus = o.payment?.status || "Pending";
                  const payMethod = o.payment?.method || "COD";
                  const payTx = o.payment?.transactionId;

                  return (
                    <div key={o.id} className="flex flex-col gap-2 rounded-xl border border-gray-250 p-3 bg-white hover:border-purple-200 transition-all shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-900">#{o.id}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {fmtDate(o.createdAt)} · {o.items.reduce((n, i) => n + i.quantity, 0)} item(s)
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold tabular-nums text-gray-950 block">{formatINR(o.totals.total)}</span>
                          <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 text-[10px] font-bold text-purple-700 px-1.5 py-0.5 mt-0.5 border border-purple-100/50">
                            {payMethod}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-2 text-[10px]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-400 font-bold uppercase">Order:</span>
                          <span className={cn(
                            "font-semibold rounded px-1.5 py-0.5 text-[9px] uppercase",
                            o.status === "Delivered" ? "bg-green-50 text-green-700 border border-green-200" :
                            o.status === "Cancelled" ? "bg-red-50 text-red-700 border border-red-200" :
                            "bg-gray-100 text-gray-600 border border-gray-200"
                          )}>
                            {o.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-400 font-bold uppercase">Payment:</span>
                          <span className={cn(
                            "font-semibold rounded px-1.5 py-0.5 text-[9px] uppercase",
                            payStatus === "Paid" ? "bg-green-50 text-green-700 border border-green-200" :
                            payStatus === "Failed" || payStatus === "Cancelled" ? "bg-red-50 text-red-700 border border-red-200" :
                            payStatus === "Refunded" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                            "bg-orange-50 text-orange-700 border border-orange-200"
                          )}>
                            {payStatus}
                          </span>
                        </div>
                      </div>
                      {payTx && (
                        <div className="text-[9px] text-gray-450 font-mono flex items-center justify-between gap-2 bg-gray-50 px-2 py-1 rounded border border-gray-100/50 mt-1">
                          <span className="font-bold text-gray-400">TXN ID:</span>
                          <span className="truncate max-w-[200px] select-all">{payTx}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Section>

            {/* Activity timeline */}
            <Section icon={Clock} title="Activity Timeline">
              <ol className="relative flex flex-col gap-3 border-l border-gray-200 pl-4">
                {data.activity.map((a, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-purple-500 ring-4 ring-white" />
                    <p className="text-xs font-semibold text-gray-800">{a.label}</p>
                    <p className="text-[11px] text-gray-400">{fmtDate(a.at)}</p>
                  </li>
                ))}
              </ol>
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

function EditCustomerModal({
  customer, onClose, onSaved,
}: { customer: AdminCustomer; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = React.useState(customer.name || "");
  const [email, setEmail] = React.useState(customer.email || "");
  const [phone, setPhone] = React.useState(customer.phone);
  const [notes, setNotes] = React.useState(customer.notes || "");
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setSaving(true);
    try {
      await apiFetch(`/admin/customers/${customer._id}`, {
        method: "PUT",
        body: { name, email, phone, notes },
      });
      toast.success("Customer updated");
      onSaved();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-gray-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">Edit Customer</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-lg text-gray-400 hover:bg-gray-100">
            <X className="size-4" />
          </button>
        </div>

        {err && <p className="mt-3 rounded-xl bg-red-50 p-2.5 text-xs font-semibold text-red-700">{err}</p>}

        <div className="mt-4 flex flex-col gap-3">
          <Input label="Full Name" value={name} onChange={setName} />
          <Input label="Mobile Number" value={phone} onChange={(v) => setPhone(v.replace(/\D/g, "").slice(0, 10))} />
          <Input label="Email" value={email} onChange={setEmail} type="email" />
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Admin Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-purple-400"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-purple-600 text-sm font-bold text-white transition-colors hover:bg-purple-700 disabled:opacity-60"
        >
          {saving ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : <><Save className="size-4" /> Save changes</>}
        </button>
      </form>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-purple-400"
      />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 p-3 text-center">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-extrabold text-gray-900">{value}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-0.5 text-xs font-semibold text-gray-700">{value}</p>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500">
        <Icon className="size-3.5" /> {title}
      </p>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl bg-gray-50 p-3 text-center text-xs text-gray-400">{children}</p>;
}
