"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  X,
  Eye,
  Rocket,
  Undo2,
  History,
  Trash2,
  Plus,
  CircleDot,
  Flame,
  Package,
  EyeOff,
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
  EmptyState,
  Skeleton,
} from "@/components/admin/ui/primitives";
import { formatMoney, formatDateTime } from "@/components/admin/ui/tokens";

/* ------------------------------------------------------------------ */
/* TYPES                                                              */
/* ------------------------------------------------------------------ */

interface Pack {
  id: string;
  label: string;
  grams: number;
  price: number;
  /** Strike-through "was" price. Only shown when higher than `price`. */
  compareAt?: number;
  stock: number;
  note?: string;
  sku?: string;
}

interface AdminProduct {
  _id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  heat: number;
  ingredients: string[];
  gradient: { from: string; via: string; to: string };
  accent: string;
  badge?: string;
  bestSeller: boolean;
  inStock: boolean;
  status: "Active" | "Inactive";
  maxQtyPerCheckout?: number;
  image?: string;
  categoryId?: string | null;
  taxOverrideEnabled?: boolean;
  taxRate?: number;
  hsnCode?: string;
  taxCategory?: string;
  taxInclusive?: boolean;

  draft: Partial<AdminProduct> | null;
  hasUnpublishedChanges: boolean;
  publishedAt: string | null;
  publishedBy: string;
  updatedBy: string;

  packs: Pack[];
  packCount: number;
  priceFrom: number | null;
  totalStock: number;
}

interface Version {
  _id: string;
  version: number;
  createdBy: string;
  createdAt: string;
}

/**
 * What the admin is editing: the live product with the draft laid over it.
 * Packs come from the draft when one exists, so reopening the editor resumes
 * the prices you were part-way through changing.
 */
const effective = (p: AdminProduct): AdminProduct => ({
  ...p,
  ...(p.draft ?? {}),
  packs: p.draft?.packs?.length ? p.draft.packs : p.packs,
});

/* ------------------------------------------------------------------ */
/* PAGE                                                               */
/* ------------------------------------------------------------------ */

export default function AdminProductsPage() {
  return (
    <React.Suspense fallback={null}>
      <ProductsPage />
    </React.Suspense>
  );
}

function ProductsPage() {
  const { user } = useAccount();
  const isSuperAdmin = user?.role === "Super Admin";

  const [rows, setRows] = React.useState<AdminProduct[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");

  const [editing, setEditing] = React.useState<AdminProduct | null>(null);
  const [historyFor, setHistoryFor] = React.useState<AdminProduct | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<AdminProduct | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await apiFetch<AdminProduct[]>("/admin/products"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  /**
   * `?edit=<slug>` reopens the editor on that product.
   *
   * This is how "Back to editor" in the preview banner returns you to the work
   * you were doing. Previewing opens a new tab, and leaving it used to strand
   * you on the dashboard with your draft nowhere in sight.
   *
   * The param is consumed once, then stripped from the URL, so closing the
   * dialog and refreshing doesn't spring it open again.
   */
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestedEdit = searchParams.get("edit");

  React.useEffect(() => {
    if (!requestedEdit || loading) return;

    const target = rows.find((p) => p.slug === requestedEdit);
    if (target) setEditing(target);

    router.replace("/admin/products", { scroll: false });
  }, [requestedEdit, loading, rows, router]);

  const visible = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q)
    );
  }, [rows, search]);

  // Client-side pagination — the whole catalogue is small enough to hold in
  // memory, so we page the filtered list rather than round-tripping the server.
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  React.useEffect(() => setPage(1), [search, pageSize]);
  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = React.useMemo(
    () => visible.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [visible, currentPage, pageSize]
  );

  const unpublished = rows.filter((p) => p.hasUnpublishedChanges).length;

  /* ── Actions ─────────────────────────────────────────────────────── */

  const publish = async (p: AdminProduct) => {
    setBusy(true);
    try {
      await apiFetch(`/admin/products/${p.slug}/publish`, { method: "POST" });
      await fetch("/api/revalidate", { method: "POST" }).catch(() => {});

      // An Inactive product is filtered out of the public catalogue, so
      // "it's live" would be false. Say what actually happened.
      if (effective(p).status === "Active") {
        toast.success(`"${p.name}" is live`, {
          description: "Customers can see the change now.",
        });
      } else {
        toast.warning(`"${p.name}" saved, but hidden`, {
          description: "It's set to Inactive, so it won't appear in the shop.",
        });
      }
      await load();
    } catch (err) {
      toast.error("Could not publish", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  /** Show a hidden product without opening the editor. */
  const makeVisible = async (p: AdminProduct) => {
    setBusy(true);
    try {
      await apiFetch(`/admin/products/${p.slug}/draft`, {
        method: "PUT",
        body: { status: "Active" },
      });
      await apiFetch(`/admin/products/${p.slug}/publish`, { method: "POST" });
      await fetch("/api/revalidate", { method: "POST" }).catch(() => {});
      toast.success(`"${p.name}" is now visible`, {
        description: "It's in the shop for customers.",
      });
      await load();
    } catch (err) {
      toast.error("Could not show the product", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const discard = async (p: AdminProduct) => {
    setBusy(true);
    try {
      await apiFetch(`/admin/products/${p.slug}/revert`, { method: "POST" });
      toast.success("Draft discarded", { description: "Back to what customers see." });
      await load();
    } catch (err) {
      toast.error("Could not discard the draft", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await apiFetch(`/products/${confirmDelete._id}`, { method: "DELETE" });
      await fetch("/api/revalidate", { method: "POST" }).catch(() => {});
      toast.success(`"${confirmDelete.name}" deleted`);
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

  const openPreview = (p: AdminProduct) =>
    window.open(`/shop/${p.slug}?preview=1`, "_blank");

  /* ── Columns ─────────────────────────────────────────────────────── */

  const columns: Column<AdminProduct>[] = [
    {
      key: "name",
      header: "Product",
      cell: (row) => {
        const p = effective(row);
        return (
          <div className="flex items-center gap-2.5">
            <span
              className="size-9 shrink-0 rounded-lg"
              style={{
                background: `radial-gradient(120% 120% at 30% 20%, ${p.gradient?.from}, ${p.gradient?.to})`,
              }}
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="truncate font-bold text-[#111827]">{p.name}</p>
                {row.hasUnpublishedChanges && (
                  <Badge tone="warning">
                    <CircleDot className="size-2.5" />
                    Draft
                  </Badge>
                )}
              </div>
              <p className="truncate text-[10px] text-[#6B7280]">{p.tagline}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => {
        const p = effective(row);

        // "Inactive" said nothing about the consequence. A hidden product is
        // absent from the shop entirely, which is the thing worth shouting.
        return (
          <div className="flex flex-col items-start gap-1">
            {p.status === "Active" ? (
              <Badge tone="success">In the shop</Badge>
            ) : (
              <Badge tone="warning">
                <EyeOff className="size-2.5" />
                Hidden
              </Badge>
            )}
            {!p.inStock && <Badge tone="danger">Out of stock</Badge>}

            {p.status !== "Active" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void makeVisible(row);
                }}
                disabled={busy}
                className="text-[10px] font-bold text-[#5B2C83] underline-offset-2 hover:underline disabled:opacity-50"
              >
                Show in shop
              </button>
            )}
          </div>
        );
      },
    },
    {
      key: "flags",
      header: "Flags",
      hideBelow: "lg",
      cell: (row) => {
        const p = effective(row);
        return (
          <div className="flex flex-wrap gap-1">
            {p.bestSeller && <Badge tone="primary">Best seller</Badge>}
            {p.badge && <Badge tone="info">{p.badge}</Badge>}
            {p.heat > 0 && (
              <Badge tone="danger">
                <Flame className="size-2.5" />
                {p.heat}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      key: "packs",
      header: "Packs",
      hideBelow: "md",
      cell: (row) => (
        <div>
          <p className="font-semibold">{row.packCount} sizes</p>
          <p className="text-[10px] text-[#6B7280]">{row.totalStock} in stock</p>
        </div>
      ),
    },
    {
      key: "price",
      header: "From",
      className: "text-right",
      cell: (row) => (
        <span className="font-bold">
          {row.priceFrom != null ? formatMoney(row.priceFrom) : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (row) => (
        <div
          className="flex items-center justify-end gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="sm"
            title="Preview on the storefront"
            onClick={() => openPreview(row)}
          >
            <Eye className="size-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            title="Version history"
            onClick={() => setHistoryFor(row)}
          >
            <History className="size-3.5" />
          </Button>

          {row.hasUnpublishedChanges && (
            <Button
              variant="ghost"
              size="sm"
              title="Discard draft"
              disabled={busy}
              onClick={() => discard(row)}
            >
              <Undo2 className="size-3.5" />
            </Button>
          )}

          <Button variant="secondary" size="sm" onClick={() => setEditing(row)}>
            Edit
          </Button>

          <Button
            variant="primary"
            size="sm"
            disabled={busy || !row.hasUnpublishedChanges || !isSuperAdmin}
            title={
              !isSuperAdmin
                ? "Only a Super Admin can publish"
                : !row.hasUnpublishedChanges
                  ? "Nothing new to publish"
                  : "Publish to the live storefront"
            }
            onClick={() => publish(row)}
          >
            <Rocket className="size-3.5" />
            Publish
          </Button>

          <Button
            variant="danger"
            size="sm"
            title="Delete"
            onClick={() => setConfirmDelete(row)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminShell
      title="Products"
      description="Edit as a draft, preview it on the real storefront, then publish."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => window.open("/shop", "_blank")}>
            <Eye className="size-3.5" />
            View shop
          </Button>
          <Button variant="primary" onClick={() => setCreating(true)}>
            <Plus className="size-3.5" />
            New product
          </Button>
        </div>
      }
    >
      {unpublished > 0 && (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 border-amber-200 bg-amber-50/60 p-3">
          <p className="text-xs font-semibold text-amber-800">
            {unpublished} product{unpublished === 1 ? " has" : "s have"} unpublished changes.
            They&apos;re saved, but customers still see the published version.
          </p>
        </Card>
      )}

      <Card className="mb-4 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by name, slug or tagline…"
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

      <DataTable<AdminProduct>
        rows={paged}
        columns={columns}
        rowKey={(p) => p._id}
        loading={loading}
        error={error}
        onRetry={load}
        emptyTitle={search ? "No matching products" : "No products yet"}
        emptyDescription={
          search ? "Try a different search." : "Add a product to see it here."
        }
        onRowClick={setEditing}
        page={currentPage}
        totalPages={totalPages}
        totalRecords={visible.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      {creating && (
        <NewProductDialog
          onClose={() => setCreating(false)}
          onCreated={async (slug) => {
            setCreating(false);
            await load();
            // Open the full editor on the new product so the details can be filled in.
            router.push(`/admin/products?edit=${slug}`);
          }}
        />
      )}

      {editing && (
        <ProductEditor
          product={editing}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
          onPreview={openPreview}
        />
      )}

      {historyFor && (
        <VersionHistory
          product={historyFor}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setHistoryFor(null)}
          onRestored={async () => {
            setHistoryFor(null);
            await load();
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={remove}
        busy={busy}
        title={`Delete "${confirmDelete?.name}"?`}
        description="This removes the product from the storefront permanently. Orders that already contain it are unaffected. This cannot be undone."
        confirmLabel="Delete permanently"
      />
    </AdminShell>
  );
}

/* ------------------------------------------------------------------ */
/* EDITOR                                                             */
/* ------------------------------------------------------------------ */

const INPUT =
  "w-full rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-xs text-[#111827] focus:border-[#5B2C83] focus:outline-none focus:ring-2 focus:ring-[#5B2C83]/15";

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
      {hint && <span className="text-[10px] text-gray-400">{hint}</span>}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* PACK PRICING (price per weight)                                     */
/* ------------------------------------------------------------------ */

/**
 * The price ladder: one row per weight (100g, 200g, …).
 *
 * Laid out as a stack of cards rather than a wide table. The table version was
 * 620px of fixed-width columns crammed into a ~430px pane, so it grew its own
 * horizontal scrollbar and pushed the fields beside it out of the dialog.
 *
 * `compareAt` is the strike-through "was" price. It is only shown to customers
 * when it is genuinely higher than the real price — the server drops it
 * otherwise, so the storefront can never advertise a saving that isn't real.
 */
function PackEditor({
  packs,
  onChange,
}: {
  packs: Pack[];
  onChange: (packs: Pack[]) => void;
}) {
  const update = (i: number, patch: Partial<Pack>) =>
    onChange(packs.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  const addPack = () =>
    onChange([...packs, { id: "", label: "", grams: 0, price: 0, stock: 0, note: "" }]);

  const num = (v: string) => (v === "" ? 0 : Number(v));

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-3.5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
            Price per weight
          </p>
          <p className="text-[10px] text-gray-400">What the customer pays for each pack size.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={addPack}>
          <Plus className="size-3.5" />
          Add size
        </Button>
      </div>

      {packs.length === 0 ? (
        <p className="py-6 text-center text-[11px] text-gray-400">
          No pack sizes yet. Add one to make this product buyable.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {packs.map((p, i) => {
            const saving = p.compareAt && p.compareAt > p.price ? p.compareAt - p.price : 0;
            const fakeSaving = p.compareAt != null && p.compareAt > 0 && p.compareAt <= p.price;

            return (
              <div
                key={i}
                className="rounded-lg border border-[#E5E7EB] bg-white p-2.5"
              >
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
                  <Field label="Size">
                    <input
                      value={p.id}
                      onChange={(e) => update(i, { id: e.target.value, label: e.target.value })}
                      placeholder="200g"
                      className={INPUT}
                      aria-label="Pack size"
                    />
                  </Field>
                  <Field label="Grams">
                    <input
                      type="number"
                      min={0}
                      value={p.grams ?? 0}
                      onChange={(e) => update(i, { grams: num(e.target.value) })}
                      className={INPUT}
                      aria-label="Grams"
                    />
                  </Field>
                  <Field label="Price ₹">
                    <input
                      type="number"
                      min={0}
                      value={p.price ?? 0}
                      onChange={(e) => update(i, { price: num(e.target.value) })}
                      className={cn(INPUT, "font-bold")}
                      aria-label="Price"
                    />
                  </Field>
                  <Field label="Was ₹">
                    <input
                      type="number"
                      min={0}
                      value={p.compareAt ?? ""}
                      onChange={(e) =>
                        update(i, {
                          compareAt: e.target.value ? num(e.target.value) : undefined,
                        })
                      }
                      placeholder="—"
                      className={INPUT}
                      aria-label="Compare-at price"
                    />
                  </Field>
                  <Field label="Stock">
                    <input
                      type="number"
                      min={0}
                      value={p.stock ?? 0}
                      onChange={(e) => update(i, { stock: num(e.target.value) })}
                      className={INPUT}
                      aria-label="Stock"
                    />
                  </Field>
                  <Field label="Note">
                    <input
                      value={p.note ?? ""}
                      onChange={(e) => update(i, { note: e.target.value })}
                      placeholder="Most loved"
                      className={INPUT}
                      aria-label="Note"
                    />
                  </Field>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2 border-t border-gray-100 pt-2">
                  <span className="text-[10px] font-semibold">
                    {saving > 0 && (
                      <span className="text-green-600">
                        Customer saves {formatMoney(saving)}
                      </span>
                    )}
                    {fakeSaving && (
                      <span className="text-amber-600">
                        &ldquo;Was&rdquo; is not above the price — customers won&apos;t see it.
                      </span>
                    )}
                  </span>

                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onChange(packs.filter((_, idx) => idx !== i))}
                    title="Remove this size"
                  >
                    <Trash2 className="size-3.5" />
                    Remove
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-2.5 text-[10px] leading-relaxed text-gray-400">
        Changing stock here also updates Inventory and records a stock movement, so the two
        can&apos;t drift apart.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PRODUCT EDITOR                                                      */
/* ------------------------------------------------------------------ */

type EditorTab = "details" | "pricing" | "tax";

const EDITOR_TABS: { id: EditorTab; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "pricing", label: "Price & stock" },
  { id: "tax", label: "Tax" },
];

/* ------------------------------------------------------------------ */
/* NEW PRODUCT                                                         */
/* ------------------------------------------------------------------ */

/**
 * Creates a product with the essentials, then hands off to the full editor to
 * fill in prices, tax and the rest. The server seeds sensible default pack
 * sizes, so a new product is buyable immediately.
 */
function NewProductDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (slug: string) => void;
}) {
  const [form, setForm] = React.useState({
    name: "",
    tagline: "",
    description: "",
    heat: 1,
    from: "#7c3aed",
    to: "#4c1d95",
    inStock: true,
  });
  const [saving, setSaving] = React.useState(false);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const create = async () => {
    if (!form.name.trim()) {
      toast.error("Give the product a name first");
      return;
    }
    setSaving(true);
    try {
      // The create endpoint returns the new product's slug as `id`.
      const created = await apiFetch<{ id: string; slug?: string }>("/products", {
        method: "POST",
        body: {
          name: form.name.trim(),
          tagline: form.tagline,
          description: form.description,
          heat: Number(form.heat),
          ingredients: [],
          gradient: { from: form.from, via: form.from, to: form.to },
          accent: form.to,
          inStock: form.inStock,
        },
      });
      await fetch("/api/revalidate", { method: "POST" }).catch(() => {});
      toast.success(`"${form.name.trim()}" created`, {
        description: "Now add prices and details, then publish.",
      });
      onCreated(created.slug ?? created.id);
    } catch (err) {
      toast.error("Could not create the product", {
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
      title="New product"
      description="Just the basics to start — you'll set prices and details next."
      width="max-w-lg"
    >
      <div className="flex flex-col gap-3.5">
        <Field label="Name" hint="Becomes the product's page address (slug).">
          <input
            autoFocus
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Tangy Tomato"
            className={INPUT}
          />
        </Field>
        <Field label="Tagline">
          <input
            value={form.tagline}
            onChange={(e) => set("tagline", e.target.value)}
            placeholder="A short, punchy line"
            className={INPUT}
          />
        </Field>
        <Field label="Description">
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            className={cn(INPUT, "resize-y")}
          />
        </Field>

        <div className="grid gap-3.5 sm:grid-cols-3">
          <Field label="Heat (0–3)">
            <input
              type="number"
              min={0}
              max={3}
              value={form.heat}
              onChange={(e) => set("heat", Number(e.target.value))}
              className={INPUT}
            />
          </Field>
          <Field label="Colour from" hint="Wafer visual">
            <input
              type="color"
              value={form.from}
              onChange={(e) => set("from", e.target.value)}
              className="h-9 w-full cursor-pointer rounded-lg border border-[#E5E7EB]"
            />
          </Field>
          <Field label="Colour to">
            <input
              type="color"
              value={form.to}
              onChange={(e) => set("to", e.target.value)}
              className="h-9 w-full cursor-pointer rounded-lg border border-[#E5E7EB]"
            />
          </Field>
        </div>

        {/* Live preview of the generated wafer */}
        <div className="flex items-center gap-3 rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] p-3">
          <span
            className="grid size-14 shrink-0 place-items-center rounded-xl"
            style={{ background: `radial-gradient(120% 120% at 30% 20%, ${form.from}, ${form.to})` }}
          >
            <Package className="size-6 text-white/70" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[#111827]">{form.name || "Untitled"}</p>
            <p className="truncate text-[11px] text-[#6B7280]">{form.tagline || "Preview"}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2 border-t border-gray-100 pt-4">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="primary" onClick={create} disabled={saving || !form.name.trim()}>
          {saving ? "Creating…" : "Create & continue"}
        </Button>
      </div>
    </Modal>
  );
}

function ProductEditor({
  product,
  isSuperAdmin,
  onClose,
  onSaved,
  onPreview,
}: {
  product: AdminProduct;
  isSuperAdmin: boolean;
  onClose: () => void;
  onSaved: () => void;
  onPreview: (p: AdminProduct) => void;
}) {
  // Edit the effective value (live + draft), so reopening resumes where you left off.
  const [form, setForm] = React.useState(() => effective(product));
  const [saving, setSaving] = React.useState(false);
  const [tab, setTab] = React.useState<EditorTab>("details");
  const [categories, setCategories] = React.useState<{ _id: string; name: string }[]>([]);

  React.useEffect(() => {
    apiFetch<{ _id: string; name: string }[]>("/admin/categories")
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const set = <K extends keyof AdminProduct>(key: K, value: AdminProduct[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const dirty = React.useMemo(() => {
    const base = effective(product);
    return JSON.stringify(form) !== JSON.stringify(base);
  }, [form, product]);

  const saveDraft = async (): Promise<boolean> => {
    setSaving(true);
    try {
      await apiFetch(`/admin/products/${product.slug}/draft`, {
        method: "PUT",
        body: {
          name: form.name,
          tagline: form.tagline,
          description: form.description,
          heat: Number(form.heat),
          ingredients: form.ingredients,
          badge: form.badge,
          bestSeller: form.bestSeller,
          inStock: form.inStock,
          status: form.status,
          maxQtyPerCheckout: form.maxQtyPerCheckout,
          image: form.image,
          gradient: form.gradient,
          accent: form.accent,
          taxOverrideEnabled: form.taxOverrideEnabled,
          taxRate: form.taxRate,
          hsnCode: form.hsnCode,
          taxCategory: form.taxCategory,
          taxInclusive: form.taxInclusive,
          categoryId: form.categoryId || null,
          // Pack pricing rides along in the draft, so new prices can be
          // previewed before customers ever pay them.
          packs: form.packs,
        },
      });
      return true;
    } catch (err) {
      toast.error("Could not save the draft", {
        description: err instanceof Error ? err.message : undefined,
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (await saveDraft()) {
      toast.success("Draft saved", { description: "Preview it on the storefront, then publish." });
      onSaved();
    }
  };

  /** Save first, so the preview shows what they just typed — not the last save. */
  const handlePreview = async () => {
    if (dirty && !(await saveDraft())) return;
    onPreview(product);
  };

  const handlePublish = async () => {
    if (dirty && !(await saveDraft())) return;

    setSaving(true);
    try {
      const res = await apiFetchEnvelope(`/admin/products/${product.slug}/publish`, {
        method: "POST",
      });
      await fetch("/api/revalidate", { method: "POST" }).catch(() => {});

      // The server knows whether this is actually visible; don't claim otherwise.
      if (form.status === "Active") {
        toast.success(`"${form.name}" is live`, { description: "Customers can see it now." });
      } else {
        toast.warning("Saved, but still hidden", {
          description: res.message ?? "Turn on \u201cVisible to customers\u201d to show it.",
        });
      }
      onSaved();
    } catch (err) {
      toast.error("Could not publish", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const from = product.priceFrom;

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit — ${product.name}`}
      description="Changes save as a draft. Nothing reaches customers until you publish."
      width="max-w-5xl"
    >
      {/*
        Two panes: the form scrolls, the preview stays put. They were previously
        columns of one grid inside the dialog's own scroller, so the preview
        drifted off-screen the moment you reached the pack prices.
      */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0">
          {/* Tabs — the form was one long column that overflowed the dialog. */}
          <div
            role="tablist"
            aria-label="Product fields"
            className="mb-4 flex gap-1 rounded-lg bg-[#F3F4F6] p-1"
          >
            {EDITOR_TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex-1 rounded-md px-3 py-1.5 text-[11px] font-bold transition-colors",
                  tab === t.id
                    ? "bg-white text-[#5B2C83] shadow-sm"
                    : "text-[#6B7280] hover:text-[#111827]"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Details ─────────────────────────────────────────────── */}
          {tab === "details" && (
            <div className="flex flex-col gap-3.5">
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label="Name">
                  <input
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    className={INPUT}
                  />
                </Field>
                <Field label="Tagline">
                  <input
                    value={form.tagline}
                    onChange={(e) => set("tagline", e.target.value)}
                    className={INPUT}
                  />
                </Field>
              </div>

              <Field label="Description">
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  className={cn(INPUT, "resize-y")}
                />
              </Field>

              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label="Category" hint="Drives the storefront filters">
                  <select
                    value={form.categoryId ?? ""}
                    onChange={(e) => set("categoryId", (e.target.value || null) as never)}
                    className={INPUT}
                  >
                    <option value="">Uncategorised</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Badge" hint="Blank for none">
                  <input
                    value={form.badge ?? ""}
                    onChange={(e) => set("badge", e.target.value)}
                    className={INPUT}
                  />
                </Field>
                <Field label="Heat (0–3)">
                  <input
                    type="number"
                    min={0}
                    max={3}
                    value={form.heat}
                    onChange={(e) => set("heat", Number(e.target.value))}
                    className={INPUT}
                  />
                </Field>
                <Field label="Max per checkout" hint="Blank = use the store-wide limit">
                  <input
                    type="number"
                    min={1}
                    value={form.maxQtyPerCheckout ?? ""}
                    onChange={(e) =>
                      set(
                        "maxQtyPerCheckout",
                        e.target.value ? Number(e.target.value) : (undefined as never)
                      )
                    }
                    className={INPUT}
                  />
                </Field>
              </div>

              <Field label="Ingredients" hint="Comma separated">
                <input
                  value={(form.ingredients ?? []).join(", ")}
                  onChange={(e) =>
                    set(
                      "ingredients",
                      e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                    )
                  }
                  className={INPUT}
                />
              </Field>

              <Field label="Image URL" hint="Optional — the generative wafer renders if blank">
                <input
                  value={form.image ?? ""}
                  onChange={(e) => set("image", e.target.value)}
                  placeholder="https://…"
                  className={INPUT}
                />
              </Field>

              {/*
                "Published" was a terrible name for this next to a Publish
                button: publishing pushes the draft live, but an Inactive
                product is filtered out of the public catalogue entirely. An
                admin could publish, be told it was live, and find nothing on
                the shop page.
              */}
              <div className="flex flex-col gap-3 rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] p-3">
                <div className="flex flex-wrap items-center gap-4">
                  <Toggle
                    label="Visible to customers"
                    checked={form.status === "Active"}
                    onChange={(v) => set("status", v ? "Active" : "Inactive")}
                  />
                  <Toggle
                    label="In stock"
                    checked={form.inStock}
                    onChange={(v) => set("inStock", v)}
                  />
                  <Toggle
                    label="Best seller"
                    checked={form.bestSeller}
                    onChange={(v) => set("bestSeller", v)}
                  />
                </div>

                {!form.inStock && (
                  <p className="flex items-start gap-1.5 border-t border-gray-200 pt-2.5 text-[11px] font-semibold leading-relaxed text-red-600">
                    <EyeOff className="mt-0.5 size-3.5 shrink-0" />
                    Marked <strong>Out of stock</strong>. The product still shows in the shop but is
                    dimmed with an &ldquo;Out of stock&rdquo; label and can&apos;t be added to cart —
                    no need to touch pack quantities.
                  </p>
                )}

                {form.status !== "Active" && (
                  <p className="flex items-start gap-1.5 border-t border-gray-200 pt-2.5 text-[11px] font-semibold leading-relaxed text-amber-700">
                    <EyeOff className="mt-0.5 size-3.5 shrink-0" />
                    Hidden from the shop. Publishing saves your changes, but nobody will see
                    this product until &ldquo;Visible to customers&rdquo; is on.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Price & stock ───────────────────────────────────────── */}
          {tab === "pricing" && (
            <PackEditor packs={form.packs ?? []} onChange={(packs) => set("packs", packs)} />
          )}

          {/* ── Tax ─────────────────────────────────────────────────── */}
          {tab === "tax" && (
            <div className="flex flex-col gap-3.5 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-3.5">
              <Toggle
                label="Override the store GST rate for this product"
                checked={!!form.taxOverrideEnabled}
                onChange={(v) => set("taxOverrideEnabled" as never, v as never)}
              />

              {form.taxOverrideEnabled ? (
                <div className="grid gap-3.5 border-t border-gray-100 pt-3.5 sm:grid-cols-2">
                  <Field label="GST rate">
                    <select
                      value={form.taxRate ?? 5}
                      onChange={(e) => set("taxRate" as never, Number(e.target.value) as never)}
                      className={INPUT}
                    >
                      {[0, 3, 5, 12, 18, 28].map((r) => (
                        <option key={r} value={r}>
                          {r}% GST
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="HSN code">
                    <input
                      value={form.hsnCode ?? ""}
                      onChange={(e) => set("hsnCode" as never, e.target.value as never)}
                      className={INPUT}
                      placeholder="e.g. 1905"
                    />
                  </Field>
                  <Field label="Tax category">
                    <input
                      value={form.taxCategory ?? ""}
                      onChange={(e) => set("taxCategory" as never, e.target.value as never)}
                      className={INPUT}
                      placeholder="e.g. Snacks"
                    />
                  </Field>
                  <div className="flex items-end pb-1">
                    <Toggle
                      label="Price includes tax"
                      checked={form.taxInclusive !== false}
                      onChange={(v) => set("taxInclusive" as never, v as never)}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-[11px] leading-relaxed text-gray-500">
                  This product uses the store-wide GST rate set in Settings.
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Storefront card preview ──────────────────────────────── */}
        <div className="lg:sticky lg:top-0 lg:self-start">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
            Storefront card
          </p>
          <Card className="overflow-hidden">
            <div
              className="grid h-32 place-items-center"
              style={{
                background: `radial-gradient(120% 120% at 30% 20%, ${form.gradient?.from}, ${form.gradient?.to})`,
              }}
            >
              <Package className="size-9 text-white/70" />
            </div>
            <div className="p-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-sm font-bold text-[#111827]">{form.name || "Untitled"}</p>
                {form.bestSeller && <Badge tone="primary">Best seller</Badge>}
              </div>
              {form.tagline && (
                <p className="mt-0.5 text-[11px] italic text-[#6B7280]">{form.tagline}</p>
              )}
              <p className="mt-1.5 line-clamp-3 text-[11px] leading-relaxed text-[#6B7280]">
                {form.description}
              </p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#5B2C83]">
                  {from != null ? `From ${formatMoney(from)}` : "No price set"}
                </span>
                {!form.inStock && <Badge tone="danger">Out of stock</Badge>}
              </div>
            </div>
          </Card>

          <p className="mt-2 text-[10px] leading-relaxed text-gray-400">
            An approximation of the card. Use <strong>Preview</strong> to open the real product
            page with your draft applied.
          </p>
        </div>
      </div>

      {/* ── Actions ─────────────────────────────────────────────────── */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-4">
        <span className="text-[10px] text-[#6B7280]">
          {product.publishedAt
            ? `Live since ${formatDateTime(product.publishedAt)}`
            : "Never published"}
        </span>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={handlePreview} disabled={saving}>
            <Eye className="size-3.5" />
            Preview
          </Button>
          <Button variant="secondary" onClick={handleSave} disabled={saving || !dirty}>
            {saving ? "Saving…" : "Save draft"}
          </Button>
          <Button
            variant="primary"
            onClick={handlePublish}
            disabled={saving || !isSuperAdmin || (!dirty && !product.hasUnpublishedChanges)}
            title={isSuperAdmin ? undefined : "Only a Super Admin can publish"}
          >
            <Rocket className="size-3.5" />
            Publish
          </Button>
        </div>
      </div>
    </Modal>
  );
}


function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold text-[#111827]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-3.5 rounded border-gray-300 accent-[#5B2C83]"
      />
      {label}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* VERSION HISTORY                                                    */
/* ------------------------------------------------------------------ */

function VersionHistory({
  product,
  isSuperAdmin,
  onClose,
  onRestored,
}: {
  product: AdminProduct;
  isSuperAdmin: boolean;
  onClose: () => void;
  onRestored: () => void;
}) {
  const [versions, setVersions] = React.useState<Version[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [confirm, setConfirm] = React.useState<Version | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    apiFetch<Version[]>(`/admin/products/${product.slug}/versions`)
      .then(setVersions)
      .catch(() => setVersions([]))
      .finally(() => setLoading(false));
  }, [product.slug]);

  const restore = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      await apiFetch(`/admin/products/${product.slug}/restore/${confirm._id}`, {
        method: "POST",
      });
      toast.success(`Restored v${confirm.version}`, {
        description: "It's in your draft — preview it, then publish.",
      });
      onRestored();
    } catch (err) {
      toast.error("Could not restore", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={`History — ${product.name}`}
        description="A snapshot is saved every time you publish. Restoring loads it into your draft, so it's never instantly live."
      >
        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : versions.length === 0 ? (
          <EmptyState
            icon={History}
            title="No versions yet"
            description="A snapshot is saved the first time you publish a change."
          />
        ) : (
          <ol className="flex flex-col gap-2">
            {versions.map((v, i) => (
              <li
                key={v._id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E5E7EB] p-2.5"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-[#5B2C83]">
                      v{v.version}
                    </span>
                    {i === 0 && <Badge tone="success">Latest</Badge>}
                  </div>
                  <p className="mt-0.5 text-[10px] text-[#6B7280]">
                    {formatDateTime(v.createdAt)} · {v.createdBy || "—"}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!isSuperAdmin}
                  onClick={() => setConfirm(v)}
                  title={isSuperAdmin ? undefined : "Only a Super Admin can restore"}
                >
                  <Undo2 className="size-3.5" />
                  Restore
                </Button>
              </li>
            ))}
          </ol>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={restore}
        busy={busy}
        tone="primary"
        title={`Restore v${confirm?.version}?`}
        description="This loads that version into your draft. The live storefront does not change until you publish, and your current draft will be replaced."
        confirmLabel="Restore into draft"
      />
    </>
  );
}
