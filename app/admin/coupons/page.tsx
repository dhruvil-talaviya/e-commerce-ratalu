"use client";

import * as React from "react";
import { Plus, Search, Ticket, Trash2, Home, LogIn } from "lucide-react";
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

  /** Counted from live orders, not the counter — see coupon.service.js. */
  redeemed: number;
  totalDiscount: number;
}

const INPUT =
  "w-full rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-xs text-[#111827] focus:border-[#5B2C83] focus:outline-none focus:ring-2 focus:ring-[#5B2C83]/15";

const blank = (): Partial<Coupon> => ({
  code: "",
  type: "percent",
  value: 10,
  minSubtotal: 0,
  description: "",
  status: "Active",
  usageLimit: 0,
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

  // Client-side pagination over the filtered coupon list.
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

  const columns: Column<Coupon>[] = [
    {
      key: "code",
      header: "Coupon",
      cell: (c) => (
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-xs font-bold text-[#5B2C83]">{c.code}</span>
            {c.firstOrderOnly && <Badge tone="info">First order</Badge>}
            {c.showOnLoginPopup && (
              <Badge tone="warning">
                <LogIn className="size-2.5" />
                Popup
              </Badge>
            )}
            {c.showOnHomepage && (
              <Badge tone="warning">
                <Home className="size-2.5" />
                Homepage
              </Badge>
            )}
          </div>
          <p className="mt-0.5 truncate text-[11px] text-[#6B7280]">{c.description}</p>
        </div>
      ),
    },
    {
      key: "value",
      header: "Discount",
      cell: (c) => (
        <div>
          <p className="text-xs font-bold text-[#111827]">
            {c.type === "percent" ? `${c.value}% off` : `${formatMoney(c.value)} off`}
          </p>
          <p className="text-[10px] text-[#6B7280]">
            {c.minSubtotal > 0 ? `Min ${formatMoney(c.minSubtotal)}` : "No minimum"}
            {c.maxDiscount ? ` · Max ${formatMoney(c.maxDiscount)}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "perAccountLimit",
      header: "Per account",
      cell: (c) => (
        <span className="text-[11px] text-[#111827]">
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
      header: "Redeemed",
      cell: (c) => (
        <div>
          <p className="text-xs font-semibold text-[#111827]">
            {c.redeemed}
            {c.usageLimit > 0 && (
              <span className="font-normal text-[#6B7280]"> / {c.usageLimit}</span>
            )}
          </p>
          {c.totalDiscount > 0 && (
            <p className="text-[10px] text-[#6B7280]">
              {formatMoney(c.totalDiscount)} given away
            </p>
          )}
        </div>
      ),
    },
    {
      key: "expiryDate",
      header: "Expires",
      cell: (c) => (
        <span className="text-[11px] text-[#6B7280]">
          {c.expiryDate ? formatDate(c.expiryDate) : "Never"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (c) => (
        <Badge tone={c.status === "Active" ? "success" : "neutral"}>{c.status}</Badge>
      ),
    },
    {
      key: "_actions",
      header: "",
      cell: (c) => (
        <div className="flex justify-end gap-1.5">
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
      title="Coupons"
      description="Discounts, who can use them, and where they're advertised."
      actions={
        <Button variant="primary" onClick={() => setEditing(blank())}>
          <Plus className="size-3.5" />
          New coupon
        </Button>
      }
    >
      <Card className="mb-4 p-3">
        <label className="relative block">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code or description…"
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
          title={search ? "No coupons match that" : "No coupons yet"}
          description={
            search
              ? "Try a different code."
              : "Create one to start offering discounts. You can pin it to the sign-in popup or the homepage."
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

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={remove}
        busy={busy}
        title={`Delete ${confirmDelete?.code}?`}
        description={
          confirmDelete?.redeemed
            ? `This code has been used on ${confirmDelete.redeemed} order(s). Those orders keep their discount, but nobody can redeem it again.`
            : "Nobody will be able to redeem this code again."
        }
        confirmLabel="Delete coupon"
      />
    </AdminShell>
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
      <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
        {label}
      </span>
      {children}
      {hint && <span className="text-[10px] leading-relaxed text-gray-400">{hint}</span>}
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
        checked ? "border-[#5B2C83] bg-purple-50/40" : "border-gray-200 bg-white hover:bg-gray-50"
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 cursor-pointer accent-[#5B2C83]"
      />
      <span className="min-w-0">
        <span className={cn("block text-xs font-bold", checked ? "text-[#5B2C83]" : "text-gray-900")}>{label}</span>
        {hint && <span className="block text-[10px] leading-relaxed text-gray-500 mt-0.5">{hint}</span>}
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
        toast.success(`${form.code} created`);
      } else {
        await apiFetch(`/admin/coupons/${coupon._id}`, { method: "PUT", body });
        toast.success(`${form.code} updated`);
      }
      onSaved();
    } catch (err) {
      toast.error("Could not save", {
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
      title={isNew ? "New coupon" : `Edit — ${coupon.code}`}
      description="The rules here are enforced at checkout, not just displayed."
      width="max-w-2xl"
    >
      <div className="flex flex-col gap-4">
        {/* ── The discount ──────────────────────────────────────────── */}
        <div className="grid gap-3.5 sm:grid-cols-3">
          <Field label="Code">
            <input
              value={form.code ?? ""}
              onChange={(e) => set("code", e.target.value.toUpperCase())}
              placeholder="WELCOME10"
              disabled={!isNew}
              className={cn(INPUT, "font-mono font-bold", !isNew && "bg-gray-50 text-gray-500")}
            />
          </Field>
          <Field label="Type">
            <select
              value={form.type ?? "percent"}
              onChange={(e) => set("type", e.target.value as Coupon["type"])}
              className={INPUT}
            >
              <option value="percent">Percentage off</option>
              <option value="flat">Flat ₹ off</option>
            </select>
          </Field>
          <Field label={form.type === "percent" ? "Percent" : "Amount ₹"}>
            <input
              type="number"
              min={0}
              value={form.value ?? 0}
              onChange={(e) => set("value", Number(e.target.value))}
              className={cn(INPUT, "font-bold")}
            />
          </Field>
        </div>

        <Field label="Description" hint="Shown to customers wherever the code appears.">
          <input
            value={form.description ?? ""}
            onChange={(e) => set("description", e.target.value)}
            placeholder="10% off your first order"
            className={INPUT}
          />
        </Field>

        <div className="grid gap-3.5 sm:grid-cols-3">
          <Field label="Minimum spend ₹" hint="0 = no minimum">
            <input
              type="number"
              min={0}
              value={form.minSubtotal ?? 0}
              onChange={(e) => set("minSubtotal", Number(e.target.value))}
              className={INPUT}
            />
          </Field>
          <Field label="Max discount ₹" hint="Caps a percentage. 0 = uncapped.">
            <input
              type="number"
              min={0}
              value={form.maxDiscount ?? 0}
              onChange={(e) => set("maxDiscount", Number(e.target.value))}
              className={INPUT}
            />
          </Field>
          <Field label="Expires" hint="Blank = never">
            <input
              type="date"
              value={form.expiryDate ? String(form.expiryDate).slice(0, 10) : ""}
              onChange={(e) => set("expiryDate", e.target.value)}
              className={INPUT}
            />
          </Field>
        </div>

        {/* ── Who can use it ────────────────────────────────────────── */}
        <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-3.5">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
            Who can use it
          </p>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="Times per account" hint="How often ONE customer may redeem it. 0 = unlimited.">
              <input
                type="number"
                min={0}
                value={form.perAccountLimit ?? 1}
                onChange={(e) => set("perAccountLimit", Number(e.target.value))}
                disabled={Boolean(form.firstOrderOnly)}
                className={cn(INPUT, form.firstOrderOnly && "bg-gray-100 text-gray-400")}
              />
            </Field>
            <Field label="Total redemptions" hint="Across all customers. 0 = unlimited.">
              <input
                type="number"
                min={0}
                value={form.usageLimit ?? 0}
                onChange={(e) => set("usageLimit", Number(e.target.value))}
                className={INPUT}
              />
            </Field>
          </div>

          <div className="mt-3 border-t border-gray-200 pt-3">
            <Check
              label="First order only"
              hint="Only redeemable by a customer who has never ordered. Checked at checkout against their real order history."
              checked={Boolean(form.firstOrderOnly)}
              onChange={(v) => {
                set("firstOrderOnly", v);
                if (v) set("perAccountLimit", 1);
              }}
            />
          </div>
        </div>

        {/* ── Where it's advertised ─────────────────────────────────── */}
        <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-3.5">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
            Where it&apos;s advertised
          </p>
          <p className="mb-3 text-[10px] leading-relaxed text-gray-400">
            Only one coupon can hold each slot — pinning this one releases whoever had it.
            Customers who can&apos;t redeem the code aren&apos;t shown it.
          </p>

          <div className="flex flex-col gap-2.5">
            <Check
              label="Sign-in / verify mobile popup"
              checked={Boolean(form.showOnLoginPopup)}
              onChange={(v) => set("showOnLoginPopup", v)}
            />
            <Check
              label="Homepage"
              checked={Boolean(form.showOnHomepage)}
              onChange={(v) => set("showOnHomepage", v)}
            />
          </div>

          {advertised && (
            <div className="mt-3 grid gap-3.5 border-t border-gray-200 pt-3 sm:grid-cols-2">
              <Field label="Headline" hint="e.g. Get 10% OFF your first order!">
                <input
                  value={form.title ?? ""}
                  onChange={(e) => set("title", e.target.value)}
                  className={INPUT}
                />
              </Field>
              <Field label="Short label" hint="e.g. 10% OFF. Blank = generated from the discount.">
                <input
                  value={form.displayLabel ?? ""}
                  onChange={(e) => set("displayLabel", e.target.value)}
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
            className={cn(INPUT, "max-w-40")}
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
        <Button variant="primary" onClick={save} disabled={saving || !valid}>
          {saving ? "Saving…" : isNew ? "Create coupon" : "Save changes"}
        </Button>
      </div>
    </Modal>
  );
}
