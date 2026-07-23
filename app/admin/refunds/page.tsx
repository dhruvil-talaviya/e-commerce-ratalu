"use client";

import * as React from "react";
import {
  Search,
  X,
  RotateCcw,
  CheckCircle2,
  XCircle,
  PackageCheck,
  Truck,
  Banknote,
  StickyNote,
  Clock,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { apiFetch, apiFetchEnvelope } from "@/lib/api";
import { useAccount } from "@/components/account/account-provider";
import { AdminShell } from "@/components/admin/console/admin-shell";
import { DataTable, type Column } from "@/components/admin/ui/data-table";
import {
  Badge,
  Button,
  Card,
  Modal,
  ConfirmDialog,
  Skeleton,
} from "@/components/admin/ui/primitives";
import {
  formatMoney,
  formatDateTime,
  formatDate,
  type Tone,
} from "@/components/admin/ui/tokens";

/* ------------------------------------------------------------------ */
/* TYPES + STATUS MAP                                                 */
/* ------------------------------------------------------------------ */

interface RefundItem {
  flavorName: string;
  packLabel: string;
  unitPrice: number;
  quantity: number;
}

interface Refund {
  _id: string;
  refundId: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  orderTotal: number;
  type: "Refund" | "Replacement";
  reason: string;
  description: string;
  images: string[];
  videos: string[];
  items: RefundItem[];
  status: string;
  timeline: { status: string; note: string; by: string; at: string }[];
  requestedAmount: number;
  approvedAmount: number | null;
  refundType: "Full" | "Partial" | null;
  rejectionReason: string;
  internalNotes: string;
  ledger: {
    itemsAmount: number;
    tax: number;
    shipping: number;
    discount?: number;
    restockingFee: number;
    netRefund: number;
  };
  razorpayPaymentId: string;
  razorpayRefundId: string;
  failureReason: string;
  createdAt: string;
  itemReceivedAt: string | null;
}

/** One place that decides how every refund state looks. */
const REFUND_STATUS: Record<string, Tone> = {
  Submitted: "info",
  "Under Review": "info",
  "More Info Needed": "warning",
  Approved: "primary",
  Rejected: "danger",
  "Pickup Scheduled": "warning",
  "Item Received": "primary",
  "Refund Processing": "warning",
  Refunded: "success",
  Failed: "danger",
  Cancelled: "neutral",
};

const QUEUES = [
  { label: "All", value: "" },
  { label: "Pending Review", value: "Submitted,Under Review,More Info Needed" },
  { label: "Approved", value: "Approved" },
  { label: "Pickup", value: "Pickup Scheduled" },
  { label: "Item Received", value: "Item Received" },
  { label: "Processing", value: "Refund Processing" },
  { label: "Refunded", value: "Refunded" },
  { label: "Rejected", value: "Rejected,Cancelled" },
  { label: "Failed", value: "Failed" },
];

interface Stats {
  statusCounts: Record<string, number>;
  totalRequests: number;
  amounts: { today: number; week: number; month: number; total: number };
  topReasons: { reason: string; count: number }[];
  refundRate: number;
  avgRefundHours: number;
}

/* ------------------------------------------------------------------ */
/* PAGE                                                               */
/* ------------------------------------------------------------------ */

export default function AdminRefundsPage() {
  const { user } = useAccount();
  const isSuperAdmin = user?.role === "Super Admin";

  const [rows, setRows] = React.useState<Refund[]>([]);
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [queue, setQueue] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalRecords, setTotalRecords] = React.useState(0);

  const [detailId, setDetailId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      if (queue) p.set("status", queue);
      if (debounced) p.set("search", debounced);

      const env = await apiFetchEnvelope<Refund[]>(`/admin/refunds?${p}`);
      setRows(env.data ?? []);
      setTotalPages(env.pagination?.totalPages ?? 1);
      setTotalRecords(env.pagination?.totalRecords ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load refunds");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, queue, debounced]);

  const loadStats = React.useCallback(async () => {
    try {
      setStats(await apiFetch<Stats>("/admin/refunds/stats"));
    } catch {
      setStats(null);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    loadStats();
  }, [loadStats]);

  const refreshAll = async () => {
    await Promise.all([load(), loadStats()]);
  };

  const columns: Column<Refund>[] = [
    {
      key: "refundId",
      header: "Refund",
      sortable: true,
      cell: (r) => (
        <div>
          <span className="font-mono font-bold text-[#5B2C83]">{r.refundId}</span>
          <p className="mt-0.5 text-[10px] text-[#6B7280]">Order {r.orderId}</p>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-semibold">{r.customerName || "—"}</p>
          <p className="text-[10px] text-[#6B7280]">{r.customerPhone}</p>
        </div>
      ),
    },
    {
      key: "reason",
      header: "Reason",
      hideBelow: "lg",
      cell: (r) => (
        <div className="min-w-0">
          <Badge tone="neutral">{r.type}</Badge>
          <p className="mt-1 truncate text-[10px] text-[#6B7280]">{r.reason}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      cell: (r) => <Badge tone={REFUND_STATUS[r.status] ?? "neutral"}>{r.status}</Badge>,
    },
    {
      key: "createdAt",
      header: "Requested",
      sortable: true,
      hideBelow: "lg",
      cell: (r) => <span className="text-[#6B7280]">{formatDate(r.createdAt)}</span>,
    },
    {
      key: "requestedAmount",
      header: "Amount",
      sortable: true,
      className: "text-right",
      cell: (r) => (
        <div>
          <span className="font-bold">
            {formatMoney(r.approvedAmount ?? r.requestedAmount)}
          </span>
          {r.approvedAmount != null && r.approvedAmount !== r.requestedAmount && (
            <p className="text-[10px] text-[#6B7280] line-through">
              {formatMoney(r.requestedAmount)}
            </p>
          )}
        </div>
      ),
    },
  ];

  return (
    <AdminShell
      title="Refunds & Returns"
      description={
        totalRecords > 0
          ? `${totalRecords} request${totalRecords === 1 ? "" : "s"}`
          : "Review and process customer refund requests"
      }
    >
      {/* Analytics */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Pending review"
          value={
            stats
              ? String(
                  (stats.statusCounts["Submitted"] ?? 0) +
                    (stats.statusCounts["Under Review"] ?? 0)
                )
              : null
          }
          hint="Awaiting your decision"
        />
        <StatCard
          label="Refunded this month"
          value={stats ? formatMoney(stats.amounts.month) : null}
          hint={stats ? `All time: ${formatMoney(stats.amounts.total)}` : ""}
        />
        <StatCard
          label="Refund rate"
          value={stats ? `${stats.refundRate}%` : null}
          hint="Refunded orders ÷ all orders"
        />
        <StatCard
          label="Avg. time to refund"
          value={stats ? `${stats.avgRefundHours}h` : null}
          hint="Request → money out"
        />
      </div>

      {/* Queue tabs */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {QUEUES.map((q) => {
          const active = queue === q.value;
          return (
            <button
              key={q.label}
              onClick={() => {
                setQueue(q.value);
                setPage(1);
              }}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-200",
                active
                  ? "bg-[#5B2C83] text-white"
                  : "border border-[#E5E7EB] bg-white text-[#6B7280] hover:bg-gray-50"
              )}
            >
              {q.label}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <Card className="mb-4 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by refund ID, order ID, customer name or phone…"
            className="w-full rounded-lg border border-[#E5E7EB] bg-white py-2 pl-9 pr-9 text-xs focus:border-[#5B2C83] focus:outline-none focus:ring-2 focus:ring-[#5B2C83]/15"
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
      </Card>

      <DataTable<Refund>
        rows={rows}
        columns={columns}
        rowKey={(r) => r.refundId}
        loading={loading}
        error={error}
        onRetry={load}
        emptyTitle={debounced || queue ? "No matching requests" : "No refund requests"}
        emptyDescription={
          debounced || queue
            ? "Try a different queue or search."
            : "Requests appear here when customers ask for a refund."
        }
        page={page}
        totalPages={totalPages}
        totalRecords={totalRecords}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
        onRowClick={(r) => setDetailId(r.refundId)}
      />

      {detailId && (
        <RefundDetail
          refundId={detailId}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setDetailId(null)}
          onChanged={refreshAll}
        />
      )}
    </AdminShell>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | null;
  hint?: string;
}) {
  return (
    <Card className="p-3.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">{label}</p>
      {value === null ? (
        <Skeleton className="mt-1.5 h-6 w-20" />
      ) : (
        <p className="mt-1 text-xl font-bold text-[#111827]">{value}</p>
      )}
      {hint && <p className="mt-0.5 text-[10px] text-gray-400">{hint}</p>}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* DETAIL / REVIEW                                                    */
/* ------------------------------------------------------------------ */

interface DetailPayload {
  refund: Refund;
  order: {
    id: string;
    displayId?: string;
    userName: string;
    userPhone: string;
    address: { addressLine: string; city: string; state: string; pincode: string };
    items: RefundItem[];
    totals: { subtotal: number; gst: number; shipping: number; total: number };
    payment?: { method: string; status: string; transactionId?: string };
  } | null;
  alreadyRefunded: number;
  maxRefundable: number;
}

function RefundDetail({
  refundId,
  isSuperAdmin,
  onClose,
  onChanged,
}: {
  refundId: string;
  isSuperAdmin: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [data, setData] = React.useState<DetailPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  const [amount, setAmount] = React.useState("");
  const [note, setNote] = React.useState("");
  const [rejectReason, setRejectReason] = React.useState("");
  const [confirm, setConfirm] = React.useState<null | "approve" | "reject" | "process">(null);
  const [preview, setPreview] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiFetch<DetailPayload>(`/admin/refunds/${refundId}`);
      setData(d);
      setAmount(String(d.refund.approvedAmount ?? d.refund.requestedAmount));
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [refundId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const act = async (
    path: string,
    body: Record<string, unknown>,
    successMsg: string,
    method: "POST" | "PATCH" = "POST"
  ) => {
    setBusy(true);
    try {
      await apiFetch(`/admin/refunds/${refundId}/${path}`, { method, body });
      toast.success(successMsg);
      await load();
      await onChanged();
    } catch (err) {
      toast.error("Action failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const r = data?.refund;
  const terminal = r ? ["Rejected", "Refunded", "Cancelled"].includes(r.status) : true;
  const canApprove = r && (r.approvedAmount == null || ["Submitted", "More Info Needed", "Failed"].includes(r.status)) && !terminal;
  const canProcess = r && r.approvedAmount != null && !r.razorpayRefundId && !terminal && ["Approved", "Item Received", "Refund Processing"].includes(r.status);

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={loading ? "Loading…" : `${r?.refundId} — ${r?.reason}`}
        description={r ? `Order ${r.orderId} · requested ${formatDateTime(r.createdAt)}` : undefined}
        width="max-w-3xl"
      >
        {loading || !r ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Status + money */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={REFUND_STATUS[r.status] ?? "neutral"}>{r.status}</Badge>
                <Badge tone="neutral">{r.type}</Badge>
                {r.refundType && <Badge tone="primary">{r.refundType}</Badge>}
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-[#6B7280]">
                  Requested / Max refundable
                </p>
                <p className="text-sm font-bold text-[#111827]">
                  {formatMoney(r.requestedAmount)}{" "}
                  <span className="text-[#6B7280]">/ {formatMoney(data.maxRefundable)}</span>
                </p>
              </div>
            </div>

            {r.failureReason && (
              <Card className="border-red-200 bg-red-50/60 p-3">
                <p className="text-xs font-semibold text-red-800">
                  Razorpay error: {r.failureReason}
                </p>
                <p className="mt-0.5 text-[10px] text-red-700">
                  No money moved. Fix the cause and release the refund again.
                </p>
              </Card>
            )}

            {/* Customer + payment */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                  Customer
                </p>
                <p className="mt-1 text-xs font-bold">{r.customerName}</p>
                <a
                  href={`tel:${r.customerPhone}`}
                  className="text-[11px] text-[#3B82F6] hover:underline"
                >
                  {r.customerPhone}
                </a>
                {data.order && (
                  <p className="mt-1.5 text-[10px] leading-relaxed text-[#6B7280]">
                    {data.order.address?.addressLine}, {data.order.address?.city},{" "}
                    {data.order.address?.state} {data.order.address?.pincode}
                  </p>
                )}
              </Card>

              <Card className="p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                  Payment
                </p>
                <p className="mt-1 text-xs font-semibold">
                  {data.order?.payment?.method} · {data.order?.payment?.status}
                </p>
                <p className="mt-0.5 break-all font-mono text-[10px] text-[#6B7280]">
                  {r.razorpayPaymentId || "—"}
                </p>
                {r.razorpayRefundId && (
                  <p className="mt-1 break-all font-mono text-[10px] font-bold text-green-700">
                    Refund: {r.razorpayRefundId}
                  </p>
                )}
                {data.alreadyRefunded > 0 && (
                  <p className="mt-1 text-[10px] text-[#6B7280]">
                    Already refunded: {formatMoney(data.alreadyRefunded)}
                  </p>
                )}
              </Card>
            </div>

            {/* What the customer said */}
            <Card className="p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                Customer&apos;s description
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[#111827]">
                {r.description || <span className="text-gray-400">No description given.</span>}
              </p>

              {(r.images?.length > 0 || r.videos?.length > 0) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.images.map((src) => (
                    <button
                      key={src}
                      onClick={() => setPreview(src)}
                      className="grid size-16 place-items-center overflow-hidden rounded-lg border border-[#E5E7EB] bg-gray-50 hover:border-[#5B2C83]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="Refund evidence" className="size-full object-cover" />
                    </button>
                  ))}
                  {r.videos.map((src) => (
                    <a
                      key={src}
                      href={src}
                      target="_blank"
                      rel="noreferrer"
                      className="grid size-16 place-items-center rounded-lg border border-[#E5E7EB] bg-gray-50 text-[10px] font-semibold text-[#5B2C83] hover:border-[#5B2C83]"
                    >
                      <ImageIcon className="size-4" />
                      Video
                    </a>
                  ))}
                </div>
              )}
            </Card>

            {/* Ledger */}
            {r.approvedAmount != null && (
              <Card className="p-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                  Refund ledger
                </p>
                <div className="space-y-1 text-[11px]">
                  <LedgerRow label="Items" value={formatMoney(r.ledger.itemsAmount)} />
                  <LedgerRow label="Tax (GST)" value={formatMoney(r.ledger.tax)} />
                  <LedgerRow label="Shipping" value={formatMoney(r.ledger.shipping)} />
                  {Boolean(r.ledger.discount) && (
                    <LedgerRow
                      label="Discount"
                      value={`− ${formatMoney(r.ledger.discount || 0)}`}
                    />
                  )}
                  {r.ledger.restockingFee > 0 && (
                    <LedgerRow
                      label="Restocking fee"
                      value={`− ${formatMoney(r.ledger.restockingFee)}`}
                    />
                  )}
                  <div className="flex justify-between border-t border-gray-200 pt-1.5 text-xs font-bold">
                    <span>Net refund</span>
                    <span className="text-[#5B2C83]">{formatMoney(r.ledger.netRefund)}</span>
                  </div>
                </div>
              </Card>
            )}

            {/* Timeline */}
            <div>
              <p className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                <Clock className="size-3" />
                Timeline
              </p>
              <ol className="relative space-y-3 border-l border-gray-200 pl-4">
                {[...r.timeline].reverse().map((t, i) => (
                  <li key={i} className="relative">
                    <span
                      className={cn(
                        "absolute -left-5.25 top-1 size-3 rounded-full border-2 border-white",
                        i === 0 ? "bg-[#5B2C83]" : "bg-gray-300"
                      )}
                    />
                    <p className="text-[11px] font-bold text-[#111827]">{t.status}</p>
                    <p className="text-[10px] text-[#6B7280]">
                      {formatDateTime(t.at)} · {t.by || "—"}
                    </p>
                    {t.note && <p className="mt-0.5 text-[10px] text-[#6B7280]">{t.note}</p>}
                  </li>
                ))}
              </ol>
            </div>

            {/* Internal notes */}
            {r.internalNotes && (
              <Card className="bg-amber-50/50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                  Internal notes
                </p>
                <pre className="mt-1 whitespace-pre-wrap font-sans text-[10px] leading-relaxed text-amber-900">
                  {r.internalNotes}
                </pre>
              </Card>
            )}

            {/* ── Actions ────────────────────────────────────────────────── */}
            {!terminal && (
              <Card className="p-3">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                  Actions
                </p>

                {canApprove && (
                  <div className="mb-3 grid gap-2 sm:grid-cols-[140px_1fr_auto]">
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] font-semibold text-[#6B7280]">
                        Amount (max {formatMoney(data.maxRefundable)})
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={data.maxRefundable}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="rounded-lg border border-[#E5E7EB] px-2.5 py-1.5 text-xs focus:border-[#5B2C83] focus:outline-none"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[10px] font-semibold text-[#6B7280]">Note (optional)</span>
                      <input
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="rounded-lg border border-[#E5E7EB] px-2.5 py-1.5 text-xs focus:border-[#5B2C83] focus:outline-none"
                      />
                    </label>
                    <div className="flex items-end">
                      <Button
                        variant="primary"
                        onClick={() => setConfirm("approve")}
                        disabled={busy || !isSuperAdmin}
                        title={isSuperAdmin ? undefined : "Only a Super Admin can approve"}
                      >
                        <CheckCircle2 className="size-3.5" />
                        Approve
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {r.status === "Submitted" && (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busy}
                      onClick={() => act("status", { status: "Under Review" }, "Marked under review", "PATCH")}
                    >
                      <RotateCcw className="size-3.5" />
                      Start review
                    </Button>
                  )}

                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      act(
                        "status",
                        { status: "More Info Needed", note: "We need more detail to proceed." },
                        "Asked the customer for more information",
                        "PATCH"
                      )
                    }
                  >
                    <StickyNote className="size-3.5" />
                    Request info
                  </Button>

                  {r.type === "Replacement" && (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          act("status", { status: "Pickup Scheduled" }, "Pickup scheduled", "PATCH")
                        }
                      >
                        <Truck className="size-3.5" />
                        Schedule pickup
                      </Button>

                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={busy || Boolean(r.itemReceivedAt)}
                        onClick={() => act("received", {}, "Item received — stock restored")}
                      >
                        <PackageCheck className="size-3.5" />
                        {r.itemReceivedAt ? "Item received ✓" : "Mark item received"}
                      </Button>
                    </>
                  )}

                  {canProcess && (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={busy || !isSuperAdmin}
                      onClick={() => setConfirm("process")}
                      title={isSuperAdmin ? undefined : "Only a Super Admin can release money"}
                    >
                      <Banknote className="size-3.5" />
                      Release {formatMoney(r.approvedAmount ?? 0)} via Razorpay
                    </Button>
                  )}

                  <Button
                    variant="danger"
                    size="sm"
                    disabled={busy || !isSuperAdmin}
                    onClick={() => setConfirm("reject")}
                  >
                    <XCircle className="size-3.5" />
                    Reject
                  </Button>
                </div>

                {confirm === "reject" && (
                  <div className="mt-3">
                    <input
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Why are you rejecting this? The customer will see it."
                      className="w-full rounded-lg border border-red-200 px-2.5 py-1.5 text-xs focus:border-red-400 focus:outline-none"
                    />
                  </div>
                )}
              </Card>
            )}
          </div>
        )}
      </Modal>

      {/* Confirmations */}
      <ConfirmDialog
        open={confirm === "approve"}
        onClose={() => setConfirm(null)}
        onConfirm={() =>
          act("approve", { amount: Number(amount), note }, `Approved ${formatMoney(Number(amount))}`)
        }
        busy={busy}
        tone="primary"
        title={`Approve ${formatMoney(Number(amount) || 0)}?`}
        description="This approves the refund but does NOT move any money. You'll release it to Razorpay in a separate step."
        confirmLabel="Approve"
      />

      <ConfirmDialog
        open={confirm === "process"}
        onClose={() => setConfirm(null)}
        onConfirm={() => act("process", {}, "Refund sent to Razorpay")}
        busy={busy}
        tone="primary"
        title={`Release ${formatMoney(r?.approvedAmount ?? 0)} to the customer?`}
        description="This calls Razorpay and returns the money to the customer's original payment method. It cannot be undone."
        confirmLabel="Release the money"
      />

      <ConfirmDialog
        open={confirm === "reject"}
        onClose={() => setConfirm(null)}
        onConfirm={() => act("reject", { reason: rejectReason }, "Request rejected")}
        busy={busy || !rejectReason.trim()}
        title="Reject this request?"
        description="The customer will be notified with the reason you gave. No money will move."
        confirmLabel="Reject"
      />

      {preview && (
        <Modal open onClose={() => setPreview(null)} title="Evidence" width="max-w-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Refund evidence" className="w-full rounded-lg" />
        </Modal>
      )}
    </>
  );
}

function LedgerRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[#6B7280]">
      <span>{label}</span>
      <span className="font-semibold text-[#111827]">{value}</span>
    </div>
  );
}
