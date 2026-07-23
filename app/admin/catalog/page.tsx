"use client";

import * as React from "react";
import { Plus, Trash2, Package, Layers, X, Tag, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { apiFetch, apiFetchEnvelope } from "@/lib/api";
import { AdminShell } from "@/components/admin/console/admin-shell";
import { DataTable, type Column } from "@/components/admin/ui/data-table";
import {
  Badge,
  Button,
  Card,
  Modal,
  ConfirmDialog,
} from "@/components/admin/ui/primitives";
import { formatMoney } from "@/components/admin/ui/tokens";

/* ------------------------------------------------------------------ */
/* TYPES                                                              */
/* ------------------------------------------------------------------ */

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  sorting: number;
  status: "Active" | "Inactive";
  visibility: boolean;
  productCount: number;
}

interface ComboItem {
  flavorId: string;
  flavorName: string;
  packId: string;
  packLabel: string;
  quantity: number;
}

interface Combo {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  items: ComboItem[];
  comboPrice: number;
  originalPrice: number;
  savings: number;
  discountPercent: number;
  badge?: string;
  featured: boolean;
  status: "Active" | "Inactive";
}

interface ProductOption {
  slug: string;
  name: string;
  /** What the storefront draws for this product — a photo, or the gradient wafer. */
  image?: string;
  gradient?: { from: string; via: string; to: string };
  packs: { id: string; label: string; price: number }[];
}

const INPUT =
  "w-full rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-xs text-[#111827] focus:border-[#5B2C83] focus:outline-none focus:ring-2 focus:ring-[#5B2C83]/15";

/* ------------------------------------------------------------------ */
/* PAGE                                                               */
/* ------------------------------------------------------------------ */

export default function CatalogPage({
  defaultTab = "categories",
}: {
  defaultTab?: "categories" | "combos";
} = {}) {
  const [tab, setTab] = React.useState<"categories" | "combos">(defaultTab);

  return (
    <AdminShell
      title="Categories & Combos"
      description="Group products into categories, and bundle them into combo offers."
    >
      <div className="mb-4 flex gap-1.5">
        {(
          [
            { key: "categories", label: "Categories", icon: Layers },
            { key: "combos", label: "Combo offers", icon: Package },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200",
                active
                  ? "bg-[#5B2C83] text-white"
                  : "border border-[#E5E7EB] bg-white text-[#6B7280] hover:bg-gray-50"
              )}
            >
              <Icon className="size-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "categories" ? <CategoriesPanel /> : <CombosPanel />}
    </AdminShell>
  );
}

/* ------------------------------------------------------------------ */
/* CATEGORIES                                                         */
/* ------------------------------------------------------------------ */

function CategoriesPanel() {
  const [rows, setRows] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<Category | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<Category | null>(null);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await apiFetch<Category[]>("/admin/categories"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const remove = async () => {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      const res = await apiFetch<null>(`/admin/categories/${confirmDelete._id}`, {
        method: "DELETE",
      });
      void res;
      toast.success("Category deleted", {
        description:
          confirmDelete.productCount > 0
            ? `${confirmDelete.productCount} product(s) are now uncategorised.`
            : undefined,
      });
      setConfirmDelete(null);
      await load();
      await fetch("/api/revalidate", { method: "POST" }).catch(() => {});
    } catch (err) {
      toast.error("Could not delete", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<Category>[] = [
    {
      key: "name",
      header: "Category",
      cell: (c) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-10 overflow-hidden rounded-lg bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200">
            {c.image ? (
              <img src={c.image} alt={c.name} className="size-full object-cover" />
            ) : (
              <Package className="size-5 text-gray-400" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-bold text-[#111827]">{c.name}</p>
            <p className="truncate font-mono text-[10px] text-[#6B7280]">/{c.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: "products",
      header: "Products",
      cell: (c) => (
        <span className={cn("font-semibold", c.productCount === 0 && "text-[#6B7280]")}>
          {c.productCount}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (c) => (
        <div className="flex flex-wrap gap-1">
          <Badge tone={c.status === "Active" ? "success" : "neutral"}>{c.status}</Badge>
          {!c.visibility && <Badge tone="warning">Hidden</Badge>}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (c) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
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
    <>
      <div className="mb-3 flex justify-end">
        <Button variant="primary" onClick={() => setEditing("new")}>
          <Plus className="size-3.5" />
          New category
        </Button>
      </div>

      <DataTable<Category>
        rows={rows}
        columns={columns}
        rowKey={(c) => c._id}
        loading={loading}
        error={error}
        onRetry={load}
        emptyTitle="No categories yet"
        emptyDescription="Create one, then assign products to it from the Products page."
        onRowClick={setEditing}
      />

      {editing && (
        <CategoryEditor
          category={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
            await fetch("/api/revalidate", { method: "POST" }).catch(() => {});
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={remove}
        busy={busy}
        title={`Delete "${confirmDelete?.name}"?`}
        description={
          confirmDelete && confirmDelete.productCount > 0
            ? `${confirmDelete.productCount} product(s) are in this category. They won't be deleted — they'll become uncategorised and still appear in the full catalogue.`
            : "This category has no products. Deleting it is safe."
        }
        confirmLabel="Delete category"
      />
    </>
  );
}

function FileUploaderField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
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

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
          {label}
        </span>
        {value && (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[9px] font-bold text-[#5B2C83] hover:underline"
          >
            View Current
          </a>
        )}
      </div>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "Image URL"}
          className="flex-1 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-xs text-[#111827] placeholder-gray-400 outline-none focus:border-[#5B2C83] focus:ring-1 focus:ring-[#5B2C83]"
        />
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="shrink-0 text-[11px] px-3 h-8"
        >
          {uploading ? "Uploading..." : "Upload File"}
        </Button>
      </div>
    </div>
  );
}

function CategoryEditor({
  category,
  onClose,
  onSaved,
}: {
  category: Category | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = React.useState({
    name: category?.name ?? "",
    slug: category?.slug ?? "",
    description: category?.description ?? "",
    image: category?.image ?? "",
    sorting: category?.sorting ?? 0,
    status: category?.status ?? "Active",
    visibility: category?.visibility ?? true,
  });
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("A category needs a name");
      return;
    }
    setSaving(true);
    try {
      if (category) {
        await apiFetch(`/admin/categories/${category._id}`, { method: "PUT", body: form });
        toast.success("Category updated");
      } else {
        await apiFetch("/admin/categories", { method: "POST", body: form });
        toast.success("Category created");
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

  return (
    <Modal
      open
      onClose={onClose}
      title={category ? `Edit — ${category.name}` : "New category"}
      description="Categories drive the storefront filters and category pages."
      width="max-w-lg"
    >
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
            Name
          </span>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className={INPUT}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
            Slug
          </span>
          <input
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            placeholder="Generated from the name if left blank"
            className={INPUT}
          />
          <span className="text-[10px] text-gray-400">Used in the URL: /shop?category=…</span>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
            Description
          </span>
          <textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className={cn(INPUT, "resize-y")}
          />
        </label>

        <FileUploaderField
          label="Category Image"
          value={form.image}
          onChange={(val) => setForm((f) => ({ ...f, image: val }))}
          placeholder="e.g. /images/ratalu-wafers.png or https://..."
        />

        <div className="grid grid-cols-2 gap-3">
          <label
            className={cn(
              "flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 transition-all",
              form.status === "Active"
                ? "border-[#5B2C83] bg-purple-50/40 text-[#5B2C83]"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            )}
          >
            <input
              type="checkbox"
              checked={form.status === "Active"}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.checked ? "Active" : "Inactive" }))
              }
              className="size-4 cursor-pointer accent-[#5B2C83]"
            />
            <div className="flex flex-col">
              <span className="text-xs font-bold">Active Status</span>
              <span className="text-[10px] text-gray-400 font-normal">Enabled in store</span>
            </div>
          </label>
          <label
            className={cn(
              "flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 transition-all",
              form.visibility
                ? "border-[#5B2C83] bg-purple-50/40 text-[#5B2C83]"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            )}
          >
            <input
              type="checkbox"
              checked={form.visibility}
              onChange={(e) => setForm((f) => ({ ...f, visibility: e.target.checked }))}
              className="size-4 cursor-pointer accent-[#5B2C83]"
            />
            <div className="flex flex-col">
              <span className="text-xs font-bold">Store Visibility</span>
              <span className="text-[10px] text-gray-400 font-normal">Visible on storefront</span>
            </div>
          </label>
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2 border-t border-gray-100 pt-4">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : category ? "Save changes" : "Create category"}
        </Button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* COMBOS                                                             */
/* ------------------------------------------------------------------ */

function CombosPanel() {
  const [rows, setRows] = React.useState<Combo[]>([]);
  const [products, setProducts] = React.useState<ProductOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<Combo | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<Combo | null>(null);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [combos, prods] = await Promise.all([
        apiFetch<Combo[]>("/admin/combos"),
        apiFetch<ProductOption[]>("/admin/products"),
      ]);
      setRows(combos);
      setProducts(prods);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load combos");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const remove = async () => {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await apiFetch(`/admin/combos/${confirmDelete._id}`, { method: "DELETE" });
      toast.success("Combo deleted");
      setConfirmDelete(null);
      await load();
      await fetch("/api/revalidate", { method: "POST" }).catch(() => {});
    } catch (err) {
      toast.error("Could not delete", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<Combo>[] = [
    {
      key: "name",
      header: "Combo",
      cell: (c) => (
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate font-bold text-[#111827]">{c.name}</p>
            {c.badge && <Badge tone="primary">{c.badge}</Badge>}
          </div>
          <p className="truncate text-[10px] text-[#6B7280]">
            {c.items.map((i) => `${i.quantity}× ${i.flavorName} ${i.packLabel}`).join(" + ")}
          </p>
        </div>
      ),
    },
    {
      key: "price",
      header: "Price",
      cell: (c) => (
        <div>
          <p className="font-bold">{formatMoney(c.comboPrice)}</p>
          <p className="text-[10px] text-[#6B7280] line-through">
            {formatMoney(c.originalPrice)}
          </p>
        </div>
      ),
    },
    {
      key: "savings",
      header: "Saving",
      cell: (c) => (
        <Badge tone="success">
          {formatMoney(c.savings)} · {c.discountPercent}%
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      hideBelow: "md",
      cell: (c) => (
        <Badge tone={c.status === "Active" ? "success" : "neutral"}>{c.status}</Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (c) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
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
    <>
      <div className="mb-3 flex justify-end">
        <Button variant="primary" onClick={() => setEditing("new")} disabled={products.length < 2}>
          <Plus className="size-3.5" />
          New combo
        </Button>
      </div>

      <DataTable<Combo>
        rows={rows}
        columns={columns}
        rowKey={(c) => c._id}
        loading={loading}
        error={error}
        onRetry={load}
        emptyTitle="No combos yet"
        emptyDescription="Bundle two or more packs together at a lower price."
        onRowClick={setEditing}
      />

      {editing && (
        <ComboEditor
          combo={editing === "new" ? null : editing}
          products={products}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
            await fetch("/api/revalidate", { method: "POST" }).catch(() => {});
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={remove}
        busy={busy}
        title={`Delete "${confirmDelete?.name}"?`}
        description="Customers will no longer see this bundle. Orders that already contain it are unaffected."
        confirmLabel="Delete combo"
      />
    </>
  );
}

/**
 * Small square showing the product exactly as the storefront draws it: its photo
 * if one is set, otherwise the generative gradient wafer that stands in for it.
 * Picking items out of bare dropdowns gave no clue what was actually going into
 * the bundle.
 */
function ProductThumb({
  product,
  className,
}: {
  product?: ProductOption;
  className?: string;
}) {
  if (!product) {
    return (
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-lg border border-dashed border-[#E5E7EB] bg-[#F8FAFC] text-gray-300",
          className
        )}
      >
        <Package className="size-4" />
      </span>
    );
  }

  if (product.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={product.image}
        alt=""
        className={cn("shrink-0 rounded-lg object-cover", className)}
      />
    );
  }

  return (
    <span
      className={cn("grid shrink-0 place-items-center rounded-lg", className)}
      style={{
        background: `radial-gradient(120% 120% at 30% 20%, ${product.gradient?.from}, ${product.gradient?.to})`,
      }}
    >
      <Package className="size-4 text-white/70" />
    </span>
  );
}

function ComboEditor({
  combo,
  products,
  onClose,
  onSaved,
}: {
  combo: Combo | null;
  products: ProductOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = React.useState(combo?.name ?? "");
  const [badge, setBadge] = React.useState(combo?.badge ?? "");
  const [description, setDescription] = React.useState(combo?.description ?? "");
  const [image, setImage] = React.useState(combo?.image ?? "");
  const [featured, setFeatured] = React.useState(combo?.featured ?? false);
  const [active, setActive] = React.useState((combo?.status ?? "Active") === "Active");
  const [comboPrice, setComboPrice] = React.useState(String(combo?.comboPrice ?? ""));
  const [items, setItems] = React.useState<
    { flavorId: string; packId: string; quantity: number }[]
  >(
    combo?.items.map((i) => ({
      flavorId: i.flavorId,
      packId: i.packId,
      quantity: i.quantity,
    })) ?? [
      { flavorId: "", packId: "", quantity: 1 },
      { flavorId: "", packId: "", quantity: 1 },
    ]
  );
  const [saving, setSaving] = React.useState(false);

  /** Every line resolved against the live catalogue — names, packs and prices. */
  const resolved = React.useMemo(
    () =>
      items.map((item) => {
        const product = products.find((p) => p.slug === item.flavorId);
        const pack = product?.packs.find((k) => k.id === item.packId);
        return { ...item, product, pack, lineTotal: pack ? pack.price * item.quantity : 0 };
      }),
    [items, products]
  );

  const originalPrice = resolved.reduce((sum, r) => sum + r.lineTotal, 0);
  const price = Number(comboPrice) || 0;
  const savings = Math.max(originalPrice - price, 0);
  const percent = originalPrice > 0 ? Math.round((savings / originalPrice) * 100) : 0;

  const complete = items.every((i) => i.flavorId && i.packId) && items.length >= 2;
  const priceValid = price > 0 && price < originalPrice;

  const setItem = (i: number, patch: Partial<(typeof items)[number]>) =>
    setItems((prev) => prev.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        name,
        description,
        badge,
        image,
        featured,
        status: active ? "Active" : "Inactive",
        items,
        comboPrice: price,
      };
      if (combo) {
        await apiFetch(`/admin/combos/${combo._id}`, { method: "PUT", body });
        toast.success("Combo updated");
      } else {
        await apiFetch("/admin/combos", { method: "POST", body });
        toast.success("Combo created");
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

  return (
    <Modal
      open
      onClose={onClose}
      title={combo ? `Edit — ${combo.name}` : "New combo offer"}
      description="Bundle two or more packs together for less than buying them separately."
      width="max-w-4xl"
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        {/* ── Builder ──────────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-col gap-3.5">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                Name
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Spice Duo"
                className={INPUT}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                Badge
              </span>
              <input
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="Best value"
                className={INPUT}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
              Description
            </span>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional combo description..."
              className={cn(INPUT, "resize-y")}
            />
          </label>

          <FileUploaderField
            label="Combo photo"
            value={image}
            onChange={setImage}
            placeholder="Upload artwork or leave empty for stacked thumbnails"
          />

          <div className="grid grid-cols-2 gap-3">
            <label
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 transition-all",
                active
                  ? "border-[#5B2C83] bg-purple-50/40 text-[#5B2C83]"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              )}
            >
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="size-4 cursor-pointer accent-[#5B2C83]"
              />
              <div className="flex flex-col">
                <span className="text-xs font-bold">Active Status</span>
                <span className="text-[10px] text-gray-400 font-normal">Visible in store</span>
              </div>
            </label>
            <label
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 transition-all",
                featured
                  ? "border-[#5B2C83] bg-purple-50/40 text-[#5B2C83]"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              )}
            >
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="size-4 cursor-pointer accent-[#5B2C83]"
              />
              <div className="flex flex-col">
                <span className="text-xs font-bold">Featured Combo</span>
                <span className="text-[10px] text-gray-400 font-normal">Pinned to homepage</span>
              </div>
            </label>
          </div>

          {/* ── Items ─────────────────────────────────────────────── */}
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
              What&apos;s in the bundle
            </p>

            <div className="flex flex-col gap-2">
              {resolved.map((row, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 rounded-lg border border-[#E5E7EB] bg-white p-2.5"
                >
                  <ProductThumb product={row.product} className="size-11" />

                  <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,1fr)_130px_72px]">
                    <select
                      value={row.flavorId}
                      onChange={(e) => setItem(i, { flavorId: e.target.value, packId: "" })}
                      className={INPUT}
                      aria-label="Product"
                    >
                      <option value="">Choose a product…</option>
                      {products.map((p) => (
                        <option key={p.slug} value={p.slug}>
                          {p.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={row.packId}
                      onChange={(e) => setItem(i, { packId: e.target.value })}
                      className={INPUT}
                      disabled={!row.product}
                      aria-label="Pack size"
                    >
                      <option value="">Size…</option>
                      {row.product?.packs.map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.label} · {formatMoney(k.price)}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min={1}
                      value={row.quantity}
                      onChange={(e) =>
                        setItem(i, { quantity: Math.max(Number(e.target.value) || 1, 1) })
                      }
                      className={INPUT}
                      aria-label="Quantity"
                    />
                  </div>

                  <span className="w-16 shrink-0 text-right text-[11px] font-semibold text-[#111827]">
                    {row.pack ? formatMoney(row.lineTotal) : "—"}
                  </span>

                  <Button
                    variant="danger"
                    size="sm"
                    disabled={items.length <= 2}
                    title={items.length <= 2 ? "A combo needs at least two items" : "Remove"}
                    onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              variant="secondary"
              size="sm"
              className="mt-2"
              onClick={() => setItems((prev) => [...prev, { flavorId: "", packId: "", quantity: 1 }])}
            >
              <Plus className="size-3.5" />
              Add item
            </Button>
          </div>

          {/* ── Price ─────────────────────────────────────────────── */}
          <Card className="bg-[#F8FAFC] p-3.5">
            <div className="grid gap-3.5 sm:grid-cols-[160px_1fr]">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                  Combo price ₹
                </span>
                <input
                  type="number"
                  min={0}
                  value={comboPrice}
                  onChange={(e) => setComboPrice(e.target.value)}
                  className={cn(INPUT, "font-bold")}
                />
              </label>

              <div className="flex flex-col justify-end gap-0.5 text-[11px]">
                <div className="flex justify-between text-[#6B7280]">
                  <span>Bought separately</span>
                  <span className="font-semibold text-[#111827]">{formatMoney(originalPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Customer saves</span>
                  <span className={cn("font-bold", priceValid ? "text-green-600" : "text-[#6B7280]")}>
                    {priceValid ? `${formatMoney(savings)} · ${percent}% off` : "—"}
                  </span>
                </div>
              </div>
            </div>

            {price > 0 && originalPrice > 0 && !priceValid && (
              <p className="mt-2 flex items-start gap-1.5 text-[11px] font-semibold text-amber-700">
                <Tag className="mt-0.5 size-3.5 shrink-0" />
                The combo price must be below {formatMoney(originalPrice)}, or it isn&apos;t a
                saving.
              </p>
            )}
          </Card>
        </div>

        {/* ── Customer preview ─────────────────────────────────────── */}
        <div className="lg:sticky lg:top-0 lg:self-start">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
            How customers see it
          </p>

          <Card className="overflow-hidden">
            {/* Exactly what the shop grid renders: the combo's own photo, or the
                stacked pack thumbnails when no artwork was uploaded. */}
            {image ? (
              <div className="aspect-square bg-[#F8FAFC]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt={name || "Combo"} className="size-full object-cover" />
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 bg-[#F8FAFC] p-4">
                {resolved.slice(0, 4).map((row, i) => (
                  <ProductThumb key={i} product={row.product} className="size-14 shadow-sm" />
                ))}
              </div>
            )}

            <div className="p-3.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-sm font-bold text-[#111827]">{name || "Untitled combo"}</p>
                {badge && <Badge tone="primary">{badge}</Badge>}
              </div>

              {description && (
                <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#6B7280]">
                  {description}
                </p>
              )}

              <ul className="mt-2.5 flex flex-col gap-1">
                {resolved.map((row, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-[11px] text-[#6B7280]">
                    <Check className="size-3 shrink-0 text-green-600" />
                    <span className="truncate">
                      {row.quantity}× {row.product?.name ?? "Choose a product"}
                      {row.pack ? ` · ${row.pack.label}` : ""}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex items-end gap-2 border-t border-gray-100 pt-3">
                <span className="text-lg font-extrabold text-[#5B2C83]">
                  {price > 0 ? formatMoney(price) : "—"}
                </span>
                {priceValid && (
                  <>
                    <span className="pb-0.5 text-xs text-gray-400 line-through">
                      {formatMoney(originalPrice)}
                    </span>
                    <span className="ml-auto pb-0.5 text-[11px] font-bold text-green-600">
                      {percent}% off
                    </span>
                  </>
                )}
              </div>
            </div>
          </Card>

          <p className="mt-2 text-[10px] leading-relaxed text-gray-400">
            Prices come straight from the catalogue, so the saving shown here is the saving the
            customer gets.
          </p>
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2 border-t border-gray-100 pt-4">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={save}
          disabled={saving || !name.trim() || !complete || !priceValid}
        >
          {saving ? "Saving…" : combo ? "Save changes" : "Create combo"}
        </Button>
      </div>
    </Modal>
  );
}
