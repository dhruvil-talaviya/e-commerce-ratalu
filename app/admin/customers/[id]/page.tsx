"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Ban,
  CheckCircle2,
  Trash2,
  Clock,
  Package,
  Activity,
  Edit3,
  MessageSquare,
  Copy,
  CreditCard,
  TrendingUp,
  Ticket,
  UserCheck,
  UserPlus,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api";
import { AdminShell } from "@/components/admin/console/admin-shell";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  ErrorState,
  Skeleton,
} from "@/components/admin/ui/primitives";
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  formatMoney,
  formatDate,
  formatDateTime,
} from "@/components/admin/ui/tokens";

interface Address {
  id?: string;
  tag?: string;
  addressType?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  pincode?: string;
  isDefault?: boolean;
}

interface OrderLite {
  id: string;
  displayId?: string;
  createdAt: string;
  status: string;
  items?: { flavorName: string; quantity: number }[];
  totals?: { total: number };
  payment?: { method?: string; status?: string };
}

interface CustomerDetail {
  _id: string;
  name?: string;
  phone: string;
  email?: string;
  status: "Active" | "Blocked";
  createdAt: string;
  addresses?: Address[];
  notes?: string;
  stats: {
    totalOrders: number;
    lifetimeSpend: number;
    avgOrderValue: number;
    lastOrderAt?: string | null;
    couponsUsed: number;
  };
  orders: OrderLite[];
  activity: { type: string; label: string; at: string; orderId?: string }[];
}

const INPUT =
  "w-full rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-xs text-[#111827] focus:border-[#5B2C83] focus:outline-none focus:ring-2 focus:ring-[#5B2C83]/15";

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [detail, setDetail] = React.useState<CustomerDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", email: "", phone: "", notes: "" });
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [orderPage, setOrderPage] = React.useState(1);
  const [activityPage, setActivityPage] = React.useState(1);
  const ITEMS_PER_PAGE = 5;

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<CustomerDetail>(`/admin/customers/${id}`);
      setDetail(data);
      setForm({
        name: data.name ?? "",
        email: data.email ?? "",
        phone: data.phone ?? "",
        notes: data.notes ?? "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customer");
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setBusy(true);
    try {
      await apiFetch(`/admin/customers/${id}`, { method: "PUT", body: form });
      toast.success("Customer updated");
      setEditing(false);
      await load();
    } catch (err) {
      toast.error("Could not save", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async () => {
    if (!detail) return;
    const next = detail.status === "Active" ? "Blocked" : "Active";
    setBusy(true);
    try {
      await apiFetch(`/admin/customers/${id}/status`, { method: "PATCH", body: { status: next } });
      toast.success(next === "Blocked" ? "Customer blocked" : "Customer unblocked");
      await load();
    } catch (err) {
      toast.error("Could not update status", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await apiFetch(`/admin/customers/${id}`, { method: "DELETE" });
      toast.success("Customer deleted");
      router.push("/admin/customers");
    } catch (err) {
      toast.error("Could not delete", {
        description: err instanceof Error ? err.message : undefined,
      });
      setBusy(false);
    }
  };

  const backLink = (
    <Link
      href="/admin/customers"
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B7280] transition-colors hover:text-[#5B2C83]"
    >
      <ArrowLeft className="size-3.5" />
      All customers
    </Link>
  );

  if (loading) {
    return (
      <AdminShell title="Customer" description="Loading…">
        {backLink}
        <div className="mt-4 flex flex-col gap-4">
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminShell>
    );
  }

  if (error || !detail) {
    return (
      <AdminShell title="Customer">
        {backLink}
        <div className="mt-4">
          <ErrorState message={error ?? "Customer not found"} onRetry={load} />
        </div>
      </AdminShell>
    );
  }

  /**
   * Order-status breakdown for the Status section — how many of this customer's
   * orders sit in each state, and how their payments split. Computed from the
   * real orders, so support can see at a glance where this account stands.
   */
  const orderStatusCounts = detail.orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});
  const paymentStatusCounts = detail.orders.reduce<Record<string, number>>((acc, o) => {
    const s = o.payment?.status ?? "Pending";
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});

  const orderTotalPages = Math.ceil(detail.orders.length / ITEMS_PER_PAGE) || 1;
  const activityTotalPages = Math.ceil(detail.activity.length / ITEMS_PER_PAGE) || 1;

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <AdminShell
      title={detail.name || detail.phone}
      description={`Customer account since ${formatDate(detail.createdAt)}`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {!editing && (
            <Button
              variant="secondary"
              onClick={() => setEditing(true)}
              className="h-9 rounded-xl text-xs font-bold gap-1.5"
            >
              <Edit3 className="size-3.5 text-purple-700" />
              Edit details
            </Button>
          )}

          <a
            href={`https://wa.me/91${detail.phone.replace(/[^0-9]/g, "")}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors shadow-2xs"
          >
            <MessageSquare className="size-3.5 text-emerald-600" />
            WhatsApp
          </a>

          <Button
            variant={detail.status === "Active" ? "danger" : "secondary"}
            onClick={toggleStatus}
            disabled={busy}
            className="h-9 rounded-xl text-xs font-bold gap-1.5"
          >
            {detail.status === "Active" ? (
              <>
                <Ban className="size-3.5" />
                Block Account
              </>
            ) : (
              <>
                <CheckCircle2 className="size-3.5" />
                Unblock Account
              </>
            )}
          </Button>
          <Button
            variant="danger"
            onClick={() => setConfirmDelete(true)}
            disabled={busy}
            className="h-9 rounded-xl text-xs font-bold px-3"
            title="Delete Customer Account"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      }
    >
      <div className="mb-4">{backLink}</div>

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* ── Left Column: Profile Card & Saved Addresses ──────────── */}
        <div className="flex flex-col gap-5">
          <Card className="p-5 shadow-sm border border-gray-200 bg-white rounded-2xl">
            <div className="flex items-center gap-4">
              <div className="relative">
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#5B2C83] to-purple-800 text-2xl font-black text-white shadow-md border border-purple-300/30">
                  {(detail.name || detail.phone || "?").slice(0, 1).toUpperCase()}
                </span>
                <span
                  className={cn(
                    "absolute -bottom-1 -right-1 size-4 rounded-full border-2 border-white shadow-2xs",
                    detail.status === "Active" ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                  )}
                />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-extrabold text-gray-900">
                  {detail.name || <span className="italic text-gray-400">Unnamed Customer</span>}
                </h2>
                <div className="mt-1 flex items-center gap-2">
                  <Badge tone={detail.status === "Active" ? "success" : "danger"}>
                    {detail.status}
                  </Badge>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    {detail.stats.totalOrders === 0
                      ? "New Customer"
                      : detail.stats.totalOrders > 5
                      ? "VIP Customer"
                      : "Regular Customer"}
                  </span>
                </div>
              </div>
            </div>

            {editing ? (
              <div className="mt-5 flex flex-col gap-3.5 border-t border-gray-100 pt-4">
                <Labeled label="Customer Name">
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className={INPUT}
                  />
                </Labeled>
                <Labeled label="Phone Number">
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className={INPUT}
                  />
                </Labeled>
                <Labeled label="Email Address">
                  <input
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className={INPUT}
                  />
                </Labeled>
                <Labeled label="Internal Staff Notes">
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Staff notes visible only to admins"
                    className={cn(INPUT, "resize-y")}
                  />
                </Labeled>
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="secondary" size="sm" onClick={() => setEditing(false)} disabled={busy} className="rounded-xl">
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" onClick={save} disabled={busy} className="rounded-xl bg-[#5B2C83]">
                    {busy ? "Saving…" : "Save Changes"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-5 flex flex-col gap-3 text-xs border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between group">
                  <a
                    href={`tel:${detail.phone}`}
                    className="flex items-center gap-2.5 font-bold text-gray-800 hover:text-[#5B2C83] transition-colors"
                  >
                    <Phone className="size-4 text-purple-600" />
                    {detail.phone}
                  </a>
                  <button
                    type="button"
                    onClick={() => copyText(detail.phone, "Phone number")}
                    className="text-gray-400 hover:text-purple-700 transition-colors p-1"
                    title="Copy Phone"
                  >
                    <Copy className="size-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between group">
                  {detail.email ? (
                    <a
                      href={`mailto:${detail.email}`}
                      className="flex items-center gap-2.5 font-bold text-gray-800 hover:text-[#5B2C83] transition-colors truncate"
                    >
                      <Mail className="size-4 text-purple-600 shrink-0" />
                      <span className="truncate">{detail.email}</span>
                    </a>
                  ) : (
                    <span className="flex items-center gap-2.5 text-gray-400 font-medium">
                      <Mail className="size-4 text-gray-300" />
                      No email on file
                    </span>
                  )}
                  {detail.email && (
                    <button
                      type="button"
                      onClick={() => copyText(detail.email || "", "Email")}
                      className="text-gray-400 hover:text-purple-700 transition-colors p-1"
                      title="Copy Email"
                    >
                      <Copy className="size-3.5" />
                    </button>
                  )}
                </div>

                {detail.notes && (
                  <div className="mt-2 rounded-xl bg-purple-50/70 border border-purple-100 p-3 text-[11px] font-medium text-purple-900 leading-relaxed">
                    <span className="block font-bold text-purple-800 not-italic uppercase tracking-wider text-[9px] mb-1">Staff Note</span>
                    {detail.notes}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Saved Addresses */}
          <Card className="p-5 shadow-sm border border-gray-200 bg-white rounded-2xl">
            <div className="mb-3.5 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                <MapPin className="size-3.5 text-purple-600" />
                Saved Delivery Addresses ({detail.addresses?.length ?? 0})
              </p>
            </div>

            {detail.addresses && detail.addresses.length > 0 ? (
              <div className="flex flex-col gap-3">
                {detail.addresses.map((a, i) => (
                  <div key={a.id ?? i} className="rounded-xl border border-gray-200/80 bg-gray-50/50 p-3.5 transition-all hover:border-purple-200">
                    <div className="flex items-center justify-between gap-1.5">
                      <Badge tone="neutral" className="font-bold">{a.tag ?? a.addressType ?? "Address"}</Badge>
                      {a.isDefault && <Badge tone="primary" className="bg-[#5B2C83]">Default</Badge>}
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-gray-800 font-semibold">
                      {a.addressLine}
                      <br />
                      <span className="text-gray-500 font-medium">{a.city}, {a.state} — {a.pinCode ?? a.pincode}</span>
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-6 text-center">
                <MapPin className="size-6 text-gray-300 mx-auto mb-1.5" />
                <p className="text-xs text-gray-400 font-medium">No saved delivery addresses on file.</p>
              </div>
            )}
          </Card>
        </div>

        {/* ── Right Column: Stats, Status, Orders & Activity ────────── */}
        <div className="flex flex-col gap-5">
          {/* 4 Key Stat Cards */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            <MiniStat
              label="Total orders"
              value={String(detail.stats.totalOrders)}
              sub="Orders placed"
              icon={Package}
              color="text-purple-700 bg-purple-50 border-purple-100"
            />
            <MiniStat
              label="Lifetime spend"
              value={formatMoney(detail.stats.lifetimeSpend)}
              sub="Total revenue"
              icon={CreditCard}
              color="text-emerald-700 bg-emerald-50 border-emerald-100"
            />
            <MiniStat
              label="Avg. order value"
              value={formatMoney(detail.stats.avgOrderValue)}
              sub="Per order avg"
              icon={TrendingUp}
              color="text-blue-700 bg-blue-50 border-blue-100"
            />
          </div>

          {/* ── Status Overview ─────────────────────────────────────── */}
          <Card className="p-5 shadow-sm border border-gray-200 bg-white rounded-2xl">
            <p className="mb-3.5 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
              <Activity className="size-3.5 text-purple-600" />
              Account & Order Status Overview
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                <div className="flex items-center gap-2.5">
                  <UserCheck className="size-4 text-purple-600" />
                  <span className="text-xs font-bold text-gray-700">Account status</span>
                </div>
                <Badge tone={detail.status === "Active" ? "success" : "danger"}>
                  {detail.status}
                </Badge>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                <div className="flex items-center gap-2.5">
                  <Ticket className="size-4 text-purple-600" />
                  <span className="text-xs font-bold text-gray-700">Coupons redeemed</span>
                </div>
                <span className="text-xs font-black text-gray-900">{detail.stats.couponsUsed ?? 0}</span>
              </div>
            </div>

            {/* Orders & Payments Status Breakdown */}
            <div className="mt-4 grid gap-4 sm:grid-cols-2 border-t border-gray-100 pt-4">
              <div>
                <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                  Orders Breakdown
                </p>
                {detail.orders.length === 0 ? (
                  <p className="text-xs text-gray-400 font-medium">No order history available yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(orderStatusCounts).map(([status, count]) => (
                      <Badge key={status} tone={ORDER_STATUS[status]?.tone ?? "neutral"} className="font-bold">
                        {status}: {count}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                  Payments Breakdown
                </p>
                {detail.orders.length === 0 ? (
                  <p className="text-xs text-gray-400 font-medium">No payment history available yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(paymentStatusCounts).map(([status, count]) => (
                      <Badge key={status} tone={PAYMENT_STATUS[status] ?? "neutral"} className="font-bold">
                        {status}: {count}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* ── Order & Payment History ───────────────────────────── */}
          <Card className="p-5 shadow-sm border border-gray-200 bg-white rounded-2xl">
            <p className="mb-3.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                <Package className="size-3.5 text-purple-600" />
                Order &amp; Payment History ({detail.orders.length})
              </span>
            </p>

            {detail.orders.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-10 text-center">
                <Package className="size-8 text-purple-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-gray-600">No orders placed yet</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Orders placed by this customer will automatically appear here.</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-gray-100 border-t border-b border-gray-100">
                  {detail.orders
                    .slice((orderPage - 1) * ITEMS_PER_PAGE, orderPage * ITEMS_PER_PAGE)
                    .map((o) => (
                      <Link
                        key={o.id}
                        href={`/admin/orders?search=${encodeURIComponent(o.id)}`}
                        className="flex flex-wrap items-center justify-between gap-3 py-3.5 transition-colors hover:bg-purple-50/40 rounded-xl px-2"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#5B2C83]">{o.displayId || o.id}</p>
                          <p className="mt-0.5 text-[11px] text-gray-500 font-medium">
                            {formatDate(o.createdAt)} · {o.items?.length ?? 0} item(s)
                            {o.payment?.method ? ` · ${o.payment.method}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge tone={ORDER_STATUS[o.status]?.tone ?? "neutral"} className="font-bold">{o.status}</Badge>
                          {o.payment?.status && (
                            <Badge tone={PAYMENT_STATUS[o.payment.status] ?? "neutral"} className="font-bold">
                              {o.payment.status}
                            </Badge>
                          )}
                          <span className="text-xs font-black text-gray-900 min-w-[70px] text-right">
                            {formatMoney(o.totals?.total)}
                          </span>
                        </div>
                      </Link>
                    ))}
                </div>
                {detail.orders.length > 0 && (
                  <div className="-mx-5 -mb-5 mt-4 border-t border-gray-100 bg-gray-50/70 px-5 py-3 rounded-b-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                    <span className="text-gray-500 font-semibold">
                      Showing {(orderPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(orderPage * ITEMS_PER_PAGE, detail.orders.length)} of {detail.orders.length} orders
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={orderPage <= 1}
                        onClick={() => setOrderPage((p) => Math.max(p - 1, 1))}
                        className="h-8 px-2.5 text-xs font-bold rounded-lg"
                      >
                        <ChevronLeft className="size-3.5 mr-0.5" /> Prev
                      </Button>
                      {Array.from({ length: orderTotalPages }, (_, idx) => idx + 1).map((p) => (
                        <button
                          key={p}
                          onClick={() => setOrderPage(p)}
                          className={cn(
                            "size-7 rounded-lg text-xs font-bold transition-all",
                            p === orderPage
                              ? "bg-[#5B2C83] text-white shadow-2xs"
                              : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                          )}
                        >
                          {p}
                        </button>
                      ))}
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={orderPage >= orderTotalPages}
                        onClick={() => setOrderPage((p) => Math.min(p + 1, orderTotalPages))}
                        className="h-8 px-2.5 text-xs font-bold rounded-lg"
                      >
                        Next <ChevronRight className="size-3.5 ml-0.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>

          {/* ── Activity Log ────────────────────────────────────────── */}
          <Card className="p-5 shadow-sm border border-gray-200 bg-white rounded-2xl">
            <p className="mb-4 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
              <Clock className="size-3.5 text-purple-600" />
              Customer Activity Audit Log ({detail.activity.length})
            </p>
            {detail.activity.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No activity logged yet.</p>
            ) : (
              <ol className="relative space-y-4 border-l border-purple-200 pl-4 ml-2">
                {detail.activity
                  .slice((activityPage - 1) * ITEMS_PER_PAGE, activityPage * ITEMS_PER_PAGE)
                  .map((entry, i) => (
                    <li key={i} className="relative">
                      <span className="absolute -left-[1.35rem] top-1 size-2.5 rounded-full border-2 border-white bg-[#5B2C83] shadow-2xs" />
                      <p className="text-xs font-bold text-gray-900">{entry.label}</p>
                      <p className="text-[10px] font-medium text-gray-400 mt-0.5">{formatDateTime(entry.at)}</p>
                    </li>
                  ))}
              </ol>
            )}
            {detail.activity.length > 0 && (
              <div className="-mx-5 -mb-5 mt-4 border-t border-gray-100 bg-gray-50/70 px-5 py-3 rounded-b-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="text-gray-500 font-semibold">
                  Showing {(activityPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(activityPage * ITEMS_PER_PAGE, detail.activity.length)} of {detail.activity.length} logs
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={activityPage <= 1}
                    onClick={() => setActivityPage((p) => Math.max(p - 1, 1))}
                    className="h-8 px-2.5 text-xs font-bold rounded-lg"
                  >
                    <ChevronLeft className="size-3.5 mr-0.5" /> Prev
                  </Button>
                  {Array.from({ length: activityTotalPages }, (_, idx) => idx + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setActivityPage(p)}
                      className={cn(
                        "size-7 rounded-lg text-xs font-bold transition-all",
                        p === activityPage
                          ? "bg-[#5B2C83] text-white shadow-2xs"
                          : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={activityPage >= activityTotalPages}
                    onClick={() => setActivityPage((p) => Math.min(p + 1, activityTotalPages))}
                    className="h-8 px-2.5 text-xs font-bold rounded-lg"
                  >
                    Next <ChevronRight className="size-3.5 ml-0.5" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        busy={busy}
        title={`Delete ${detail.name || detail.phone}?`}
        description="This removes the customer account. Their orders stay in the system for your records."
        confirmLabel="Delete customer"
      />
    </AdminShell>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#6B7280]">{label}</span>
      {children}
    </label>
  );
}

function MiniStat({
  label,
  value,
  sub,
  icon: Icon,
  color = "text-purple-600 bg-purple-50 border-purple-100",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <Card className="p-4 shadow-sm border border-gray-200 bg-white hover:border-purple-200 transition-all flex items-center justify-between rounded-2xl">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">{label}</p>
        <p className="mt-1 text-xl font-black text-gray-900">{value}</p>
        {sub && <p className="mt-0.5 text-[10px] font-semibold text-gray-400">{sub}</p>}
      </div>
      <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl border shadow-2xs", color)}>
        <Icon className="size-5" />
      </span>
    </Card>
  );
}
