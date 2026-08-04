"use client";

import * as React from "react";
import { Plus, Search, Ticket, Trash2, Home, LogIn, Users, Calendar, ArrowUpRight, CheckCircle2, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api";
import { AdminShell } from "@/components/admin/console/admin-shell";
import { DataTable, type Column } from "@/components/admin/ui/data-table";
import {
  Badge,
  Button,
  Card,
  Modal,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  TableSkeleton,
} from "@/components/admin/ui/primitives";
import { formatMoney, formatDate } from "@/components/admin/ui/tokens";

interface Coupon {
  _id: string;
  code: string;
  type: "percent" | "flat";
  value: number;
  minSubtotal: number;
  maxDiscount?: number;
  description: string;
  status: "Active" | "Inactive";
  expiryDate?: string | null;

  /** Total redemptions allowed across everyone. 0 = unlimited. */
  usageLimit: number;
  usageCount: number;

  /** How many times ONE account may use it. 0 = unlimited. */
  perAccountLimit: number;
  firstOrderOnly: boolean;

  showOnLoginPopup: boolean;
  showOnHomepage: boolean;
  title: string;
  displayLabel: string;

  /** Counted from live orders */
  redeemed: number;
  totalDiscount: number;
}

interface Redemption {
  _id: string;
  orderId: string;
  displayId: string;
  orderNumber: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  orderTotal: number;
  discount: number;
  status: string;
  date: string;
}

const INPUT =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-600/15 transition-all";

const blank = (): Partial<Coupon> => ({
  code: "",
  type: "percent",
  value: 10,
  minSubtotal: 0,
  description: "",
  status: "Active",
  usageLimit: 1000,
  perAccountLimit: 1,
  firstOrderOnly: false,
  showOnLoginPopup: false,
  showOnHomepage: false,
  title: "",
  displayLabel: "",
});

export default function CouponsPage() {
  const [rows, setRows] = React.useState<Coupon[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");

  const [editing, setEditing] = React.useState<Partial<Coupon> | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<Coupon | null>(null);
  const [viewHistoryCoupon, setViewHistoryCoupon] = React.useState<Coupon | null>(null);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await apiFetch<Coupon[]>("/admin/coupons"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load coupons");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const visible = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (c) =>
        c.code.toLowerCase().includes(q) || (c.description ?? "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  React.useEffect(() => setPage(1), [search, pageSize]);
  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = React.useMemo(
    () => visible.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [visible, currentPage, pageSize]
  );

  const remove = async () => {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await apiFetch(`/admin/coupons/${confirmDelete._id}`, { method: "DELETE" });
      toast.success(`${confirmDelete.code} deleted`);
      setConfirmDelete(null);
      await load();
    } catch (err) {
      toast.error("Could not delete", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const getCouponStatusTone = (c: Coupon) => {
    if (c.status === "Inactive") return { label: "Inactive", tone: "neutral" as const };
    if (c.expiryDate && new Date(c.expiryDate) < new Date()) return { label: "Expired", tone: "danger" as const };
    if (c.usageLimit > 0 && c.redeemed >= c.usageLimit) return { label: "Limit Reached", tone: "warning" as const };
    return { label: "Active", tone: "success" as const };
  };

  const columns: Column<Coupon>[] = [
    {
      key: "code",
      header: "Coupon Code",
      cell: (c) => (
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-xs font-extrabold text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
              {c.code}
            </span>
            {c.firstOrderOnly && <Badge tone="info">1st Order Only</Badge>}
            {c.showOnLoginPopup && (
              <Badge tone="warning">
                <LogIn className="size-2.5 mr-1" /> Popup
              </Badge>
            )}
            {c.showOnHomepage && (
              <Badge tone="warning">
                <Home className="size-2.5 mr-1" /> Homepage
              </Badge>
            )}
          </div>
          <p className="mt-1 truncate text-xs text-gray-600">{c.description}</p>
        </div>
      ),
    },
    {
      key: "value",
      header: "Discount",
      cell: (c) => (
        <div>
          <p className="text-xs font-bold text-gray-900">
            {c.type === "percent" ? `${c.value}% OFF` : `${formatMoney(c.value)} OFF`}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {c.minSubtotal > 0 ? `Min Spend: ${formatMoney(c.minSubtotal)}` : "No minimum spend"}
            {c.maxDiscount ? ` · Max: ${formatMoney(c.maxDiscount)}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "perAccountLimit",
      header: "Account Rules",
      hideBelow: "md",
      cell: (c) => (
        <span className="text-xs font-medium text-gray-700">
          {c.firstOrderOnly
            ? "First order only"
            : c.perAccountLimit > 0
              ? `${c.perAccountLimit}× per customer`
              : "Unlimited"}
        </span>
      ),
    },
    {
      key: "redeemed",
      header: "Redemption Usage",
      cell: (c) => (
        <div>
          <div className="flex items-center gap-1 text-xs font-semibold text-gray-900">
            <span>{c.redeemed} used</span>
            {c.usageLimit > 0 && (
              <span className="text-gray-400 font-normal"> / {c.usageLimit} max</span>
            )}
          </div>
          {c.totalDiscount > 0 && (
            <p className="text-[10px] text-emerald-700 font-medium">
              {formatMoney(c.totalDiscount)} saved by customers
            </p>
          )}
        </div>
      ),
    },
    {
      key: "expiryDate",
      header: "Expiry",
      hideBelow: "md",
      cell: (c) => (
        <span className="text-xs text-gray-500">
          {c.expiryDate ? formatDate(c.expiryDate) : "Never"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (c) => {
        const { label, tone } = getCouponStatusTone(c);
        return <Badge tone={tone}>{label}</Badge>;
      },
    },
    {
      key: "_actions",
      header: "Actions",
      cell: (c) => (
        <div className="flex justify-end gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setViewHistoryCoupon(c)}
            title="View customer redemptions history"
            className="text-xs flex items-center gap-1"
          >
            <Users className="size-3" />
            <span>Usage</span>
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setEditing(c)}>
            Edit
          </Button>
          <Button variant="danger" size="sm" onClick={() => setConfirmDelete(c)}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminShell
      title="Coupons & Discount Offers"
      description="Create, manage, and audit customer promotion codes, limits, and redemptions."
      actions={
        <Button variant="primary" onClick={() => setEditing(blank())}>
          <Plus className="size-3.5" />
          New Coupon
        </Button>
      }
    >
      <Card className="mb-4 p-3">
        <label className="relative block">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by coupon code or description…"
            className={cn(INPUT, "pl-9")}
          />
        </label>
      </Card>

      {loading ? (
        <TableSkeleton rows={5} cols={7} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title={search ? "No coupons match your search" : "No coupons created yet"}
          description={
            search
              ? "Try searching for a different code."
              : "Create a coupon offer to offer promotional discounts to customers."
          }
        />
      ) : (
        <DataTable<Coupon>
          rows={paged}
          columns={columns}
          rowKey={(c) => c._id}
          page={currentPage}
          totalPages={totalPages}
          totalRecords={visible.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {editing && (
        <CouponEditor
          coupon={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}

      {viewHistoryCoupon && (
        <RedemptionHistoryModal
          coupon={viewHistoryCoupon}
          onClose={() => setViewHistoryCoupon(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={remove}
        busy={busy}
        title={`Delete Coupon ${confirmDelete?.code}?`}
        description={
          confirmDelete?.redeemed
            ? `This code has been used in ${confirmDelete.redeemed} order(s). Those orders keep their discount, but no customer will be able to use it again.`
            : "No customer will be able to use this coupon code again."
        }
        confirmLabel="Delete Coupon"
      />
    </AdminShell>
  );
}

/* ------------------------------------------------------------------ */
/* REDEMPTION HISTORY MODAL                                            */
/* ------------------------------------------------------------------ */

function RedemptionHistoryModal({
  coupon,
  onClose,
}: {
  coupon: Coupon;
  onClose: () => void;
}) {
  const [redemptions, setRedemptions] = React.useState<Redemption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    async function fetchRedemptions() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<{ redemptions: Redemption[] }>(`/admin/coupons/${coupon._id}/redemptions`);
        if (active) {
          setRedemptions(res.redemptions || []);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load customer redemptions");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchRedemptions();
    return () => { active = false; };
  }, [coupon._id]);

  return (
    <Modal
      open
      onClose={onClose}
      title={`Customer Redemptions — ${coupon.code}`}
      description={`Audit of all customers who used ${coupon.code}. (${redemptions.length} ${redemptions.length === 1 ? 'order' : 'orders'})`}
      width="max-w-3xl"
    >
      <div className="flex flex-col gap-4">
        {/* Header Summary Pill */}
        <div className="grid grid-cols-3 gap-3 rounded-xl bg-purple-50 p-3.5 border border-purple-200">
          <div>
            <span className="text-xs font-semibold text-purple-700">Total Usage</span>
            <p className="text-base font-extrabold text-purple-950">
              {coupon.redeemed} {coupon.usageLimit > 0 ? `/ ${coupon.usageLimit}` : ""}
            </p>
          </div>
          <div>
            <span className="text-xs font-semibold text-purple-700">Discount Type</span>
            <p className="text-base font-extrabold text-purple-950">
              {coupon.type === "percent" ? `${coupon.value}% OFF` : `₹${coupon.value} OFF`}
            </p>
          </div>
          <div>
            <span className="text-xs font-semibold text-purple-700">Total Discount Given</span>
            <p className="text-base font-extrabold text-emerald-700">
              {formatMoney(coupon.totalDiscount)}
            </p>
          </div>
        </div>

        {/* Customer Redemptions Table */}
        {loading ? (
          <TableSkeleton rows={4} cols={5} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => {}} />
        ) : redemptions.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No redemptions yet"
            description="No customer has used this coupon code yet."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-3.5 py-2.5">Customer</th>
                  <th className="px-3.5 py-2.5">Contact</th>
                  <th className="px-3.5 py-2.5">Order ID</th>
                  <th className="px-3.5 py-2.5">Discount</th>
                  <th className="px-3.5 py-2.5">Order Total</th>
                  <th className="px-3.5 py-2.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {redemptions.map((r) => (
                  <tr key={r._id} className="hover:bg-purple-50/30 transition-colors">
                    <td className="px-3.5 py-2.5 font-bold text-gray-900">
                      {r.customerName}
                    </td>
                    <td className="px-3.5 py-2.5 text-gray-600">
                      <div>{r.customerPhone}</div>
                      {r.customerEmail !== "N/A" && (
                        <div className="text-[10px] text-gray-400">{r.customerEmail}</div>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-purple-700 font-semibold">
                      #{r.displayId}
                    </td>
                    <td className="px-3.5 py-2.5 font-bold text-emerald-600">
                      -{formatMoney(r.discount)}
                    </td>
                    <td className="px-3.5 py-2.5 text-gray-900 font-medium">
                      {formatMoney(r.orderTotal)}
                    </td>
                    <td className="px-3.5 py-2.5 text-gray-500 text-[11px]">
                      {formatDate(r.date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-5 flex justify-end border-t border-gray-100 pt-3">
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* EDITOR                                                              */
/* ------------------------------------------------------------------ */

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-bold text-gray-600">
        {label}
      </span>
      {children}
      {hint && <span className="text-[10px] text-gray-400">{hint}</span>}
    </label>
  );
}

function Check({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all",
        checked ? "border-purple-600 bg-purple-50/50 shadow-xs" : "border-gray-200 bg-white hover:bg-gray-50"
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 cursor-pointer accent-purple-700"
      />
      <span className="min-w-0">
        <span className={cn("block text-xs font-bold", checked ? "text-purple-950" : "text-gray-900")}>{label}</span>
        {hint && <span className="block text-[10px] text-gray-500 mt-0.5">{hint}</span>}
      </span>
    </label>
  );
}

function CouponEditor({
  coupon,
  onClose,
  onSaved,
}: {
  coupon: Partial<Coupon>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = React.useState<Partial<Coupon>>(coupon);
  const [saving, setSaving] = React.useState(false);

  const isNew = !coupon._id;
  const isDirty = React.useMemo(() => {
    if (isNew) return true;
    return JSON.stringify(form) !== JSON.stringify(coupon);
  }, [form, coupon, isNew]);

  const set = <K extends keyof Coupon>(key: K, value: Coupon[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        code: form.code,
        type: form.type,
        value: Number(form.value) || 0,
        minSubtotal: Number(form.minSubtotal) || 0,
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : 0,
        description: form.description,
        status: form.status,
        expiryDate: form.expiryDate || null,
        usageLimit: Number(form.usageLimit) || 0,
        perAccountLimit: Number(form.perAccountLimit) || 0,
        firstOrderOnly: Boolean(form.firstOrderOnly),
        showOnLoginPopup: Boolean(form.showOnLoginPopup),
        showOnHomepage: Boolean(form.showOnHomepage),
        title: form.title,
        displayLabel: form.displayLabel,
      };

      if (isNew) {
        await apiFetch("/admin/coupons", { method: "POST", body });
        toast.success(`Coupon ${form.code} created`);
      } else {
        await apiFetch(`/admin/coupons/${coupon._id}`, { method: "PUT", body });
        toast.success(`Coupon ${form.code} updated`);
      }
      onSaved();
    } catch (err) {
      toast.error("Could not save coupon", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const advertised = form.showOnLoginPopup || form.showOnHomepage;
  const valid = (form.code ?? "").trim() && Number(form.value) > 0 && (form.description ?? "").trim();

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? "Create New Coupon" : `Edit Coupon — ${coupon.code}`}
      description="Set rules, maximum customer limits, and store placements."
      width="max-w-2xl"
    >
      <div className="flex flex-col gap-4">
        {/* ── Section 1: Discount & Code ───────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-xs">
          <p className="mb-3 text-[10px] font-bold text-purple-800">
            Discount Details
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Coupon Code">
              <input
                value={form.code ?? ""}
                onChange={(e) => set("code", e.target.value.toUpperCase())}
                placeholder="WELCOME10"
                disabled={!isNew}
                className={cn(INPUT, "font-mono font-bold ", !isNew && "bg-gray-100 text-gray-500")}
              />
            </Field>
            <Field label="Discount Type">
              <select
                value={form.type ?? "percent"}
                onChange={(e) => set("type", e.target.value as Coupon["type"])}
                className={INPUT}
              >
                <option value="percent">Percentage OFF (%)</option>
                <option value="flat">Flat Amount OFF (₹)</option>
              </select>
            </Field>
            <Field label={form.type === "percent" ? "Percentage (%)" : "Flat Amount (₹)"}>
              <input
                type="number"
                min={0}
                value={form.value ?? 0}
                onChange={(e) => set("value", Number(e.target.value))}
                className={cn(INPUT, "font-bold")}
              />
            </Field>
          </div>

          <div className="mt-3">
            <Field label="Description" hint="Customer-facing offer summary shown in checkout.">
              <input
                value={form.description ?? ""}
                onChange={(e) => set("description", e.target.value)}
                placeholder="10% off on your order"
                className={INPUT}
              />
            </Field>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Field label="Minimum Spend (₹)" hint="0 = No minimum">
              <input
                type="number"
                min={0}
                value={form.minSubtotal ?? 0}
                onChange={(e) => set("minSubtotal", Number(e.target.value))}
                className={INPUT}
              />
            </Field>
            <Field label="Max Discount Cap (₹)" hint="0 = Uncapped">
              <input
                type="number"
                min={0}
                value={form.maxDiscount ?? 0}
                onChange={(e) => set("maxDiscount", Number(e.target.value))}
                className={INPUT}
              />
            </Field>
            <Field label="Expiry Date" hint="Blank = Never expires">
              <input
                type="date"
                value={form.expiryDate ? String(form.expiryDate).slice(0, 10) : ""}
                onChange={(e) => set("expiryDate", e.target.value)}
                className={INPUT}
              />
            </Field>
          </div>
        </div>

        {/* ── Section 2: Usage Limits & Customer Rules ────────────── */}
        <div className="rounded-xl border border-gray-200 bg-slate-50 p-3.5">
          <p className="mb-3 text-xs font-semibold text-slate-700">
            Usage Limits & Restrictions
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Total Redemptions Limit" hint="Max uses across ALL customers (e.g. 1000). 0 = unlimited. Auto-inactivates when reached.">
              <input
                type="number"
                min={0}
                value={form.usageLimit ?? 1000}
                onChange={(e) => set("usageLimit", Number(e.target.value))}
                className={INPUT}
              />
            </Field>

            <Field label="Per-Account Limit" hint="Times ONE account can use it. (1 = one time only). 0 = unlimited.">
              <input
                type="number"
                min={0}
                value={form.perAccountLimit ?? 1}
                onChange={(e) => set("perAccountLimit", Number(e.target.value))}
                disabled={Boolean(form.firstOrderOnly)}
                className={cn(INPUT, form.firstOrderOnly && "bg-gray-100 text-gray-400")}
              />
            </Field>
          </div>

          <div className="mt-3 border-t border-gray-200 pt-3">
            <Check
              label="First Order Only (New Customers)"
              hint="Only redeemable by a customer who has never ordered. Invisible after first order."
              checked={Boolean(form.firstOrderOnly)}
              onChange={(v) => {
                set("firstOrderOnly", v);
                if (v) set("perAccountLimit", 1);
              }}
            />
          </div>
        </div>

        {/* ── Section 3: Placements ───────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-xs">
          <p className="mb-2 text-xs font-semibold text-gray-700">
            Storefront Placements
          </p>

          <div className="flex flex-col gap-2">
            <Check
              label="Pin to Sign-in / OTP Modal Popup"
              checked={Boolean(form.showOnLoginPopup)}
              onChange={(v) => set("showOnLoginPopup", v)}
            />
            <Check
              label="Pin to Homepage Banner"
              checked={Boolean(form.showOnHomepage)}
              onChange={(v) => set("showOnHomepage", v)}
            />
          </div>

          {advertised && (
            <div className="mt-3 grid gap-3 border-t border-gray-100 pt-3 sm:grid-cols-2">
              <Field label="Popup Headline">
                <input
                  value={form.title ?? ""}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="Get 10% OFF your first order!"
                  className={INPUT}
                />
              </Field>
              <Field label="Short Badge Label">
                <input
                  value={form.displayLabel ?? ""}
                  onChange={(e) => set("displayLabel", e.target.value)}
                  placeholder="10% OFF"
                  className={INPUT}
                />
              </Field>
            </div>
          )}
        </div>

        <Field label="Status">
          <select
            value={form.status ?? "Active"}
            onChange={(e) => set("status", e.target.value as Coupon["status"])}
            className={cn(INPUT, "max-w-40 font-bold")}
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </Field>
      </div>

      <div className="mt-5 flex justify-end gap-2 border-t border-gray-100 pt-4">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="primary" onClick={save} disabled={saving || !valid || !isDirty}>
          {saving ? "Saving…" : isNew ? "Create Coupon" : "Save Changes"}
        </Button>
      </div>
    </Modal>
  );
}
