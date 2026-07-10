"use client";

import * as React from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Users,
  Truck,
  Plus,
  Edit2,
  Trash2,
  Settings,
  LogOut,
  ShieldAlert,
  Save,
  CheckCircle,
  Eye,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { HeatMeter } from "@/components/common/heat-meter";
import { useProducts } from "@/components/shop/product-provider";
import { useOrders, type Order } from "@/components/shop/order-provider";
import { useAccount, type UserProfile, type SavedAddress } from "@/components/account/account-provider";
import { useStoreSettings, type StoreSettings } from "@/components/common/settings-provider";
import { formatINR, cn } from "@/lib/utils";
import type { Flavor, HeatLevel } from "@/lib/types";

type AdminTab = "products" | "orders" | "customers" | "settings";

const TABS: { key: AdminTab; label: string; icon: React.ElementType }[] = [
  { key: "products", label: "Catalog Manager", icon: ShoppingBag },
  { key: "orders", label: "Logistics Queue", icon: Truck },
  { key: "customers", label: "Store Customers", icon: Users },
  { key: "settings", label: "Store Configuration", icon: Settings },
];

const GRADIENT_PRESETS = [
  { label: "Purple Velvet", from: "#7a3f9c", to: "#3d1d4c", via: "#5b2c6f", accent: "#f4c542" },
  { label: "Sunset Amber", from: "#ec8a35", to: "#7a3f10", via: "#c9691a", accent: "#f4c542" },
  { label: "Chilli Crimson", from: "#e0452e", to: "#7a1210", via: "#c9291a", accent: "#f4c542" },
  { label: "Forest Grass", from: "#4e9c5a", to: "#134a1f", via: "#2f7d3d", accent: "#f4c542" },
  { label: "Obsidian Smoke", from: "#4a4a52", to: "#141416", via: "#2c2c2c", accent: "#f4c542" },
];

export default function AdminPage() {
  const { user, isLoggedIn, login, logout } = useAccount();
  const { settings, updateSettings } = useStoreSettings();
  const { flavors, addProduct, updateProduct, deleteProduct } = useProducts();
  const { orders, updateOrderStatus, placeOrder } = useOrders();
  const [customers, setCustomers] = React.useState<UserProfile[]>([]);

  // Gate credentials
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [authError, setAuthError] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<AdminTab>("products");

  const isAdmin = isLoggedIn && user?.phone === "9999999999";

  // Seed default orders if empty
  React.useEffect(() => {
    if (orders.length === 0) {
      const seedItems = [
        {
          key: "original-salted-pack-2",
          flavorId: "original-salted",
          flavorName: "Original Salted",
          flavorSlug: "original-salted",
          packId: "pack-2",
          packLabel: "200g Sharing",
          unitPrice: 175,
          quantity: 2,
          grams: 200,
          gradient: { from: "#7a3f9c", via: "#5b2c6f", to: "#3d1d4c" },
        },
      ];
      const seedTotals = {
        subtotal: 350,
        discount: 50,
        gst: 54,
        shipping: 0,
        total: 354,
      };
      const seedAddress = {
        id: "addr-1",
        tag: "Home" as const,
        addressLine: "14 Marine Drive, Nariman Point",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400021",
      };
      placeOrder("Ananya Mehta", "9825000000", seedItems, seedTotals, seedAddress, "upi");
    }
  }, [orders, placeOrder]);

  // Load customer accounts
  React.useEffect(() => {
    try {
      const savedAccounts = localStorage.getItem("ratalu.accounts");
      if (savedAccounts) {
        const parsed = JSON.parse(savedAccounts);
        setTimeout(() => setCustomers(parsed), 0);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    if (phone === "9999999999" && password === "admin") {
      // Log in with Admin session
      login("9999999999");
      // Add Admin Profile to localStorage ratalu.accounts so they show up or sync
      try {
        const savedAccounts = localStorage.getItem("ratalu.accounts");
        const accounts = savedAccounts ? JSON.parse(savedAccounts) : [];
        if (Array.isArray(accounts) && !accounts.some((a) => a.phone === "9999999999")) {
          accounts.push({
            name: "Admin Store Owner",
            phone: "9999999999",
            addresses: [],
            activeAddressId: null,
          });
          localStorage.setItem("ratalu.accounts", JSON.stringify(accounts));
        }
      } catch {
        // ignore
      }
    } else {
      setAuthError("Invalid Admin credentials. Use Phone: 9999999999 & Password: admin.");
    }
  };

  // Render Admin Gate if not authenticated as Admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 selection:bg-indigo-500 selection:text-white">
        <div className="absolute top-1/4 left-1/4 size-72 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 size-72 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-md">
          <div className="text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <ShieldAlert className="size-6" />
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-100">
              Admin Console Gate
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Access is restricted to the store manager.
            </p>
          </div>

          {authError && (
            <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs font-semibold text-red-400 text-center">
              {authError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Admin Mobile
              </label>
              <Input
                required
                type="tel"
                placeholder="9999999999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-slate-950 border-slate-800 text-slate-100 focus-visible:border-indigo-500 placeholder:text-slate-600 focus-visible:ring-indigo-500/20"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Password
              </label>
              <Input
                required
                type="password"
                placeholder="admin"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-950 border-slate-800 text-slate-100 focus-visible:border-indigo-500 placeholder:text-slate-600 focus-visible:ring-indigo-500/20"
              />
            </div>

            <button
              type="submit"
              className="mt-2 w-full rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              Sign In to Console
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Admin Top Header Bar */}
      <header className="border-b border-slate-900 bg-slate-950/80 sticky top-0 z-40 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-bold">
              R
            </span>
            <div>
              <h1 className="text-base font-bold text-slate-100 leading-tight">Admin Console</h1>
              <p className="text-[10px] text-slate-500">Logistics & Catalog Control Center</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-semibold text-slate-400 hover:text-slate-200 border border-slate-800 rounded-xl px-3.5 py-2 transition-colors inline-flex items-center gap-1.5"
            >
              <Eye className="size-3.5" /> View Public Storefront
            </Link>
            <button
              onClick={logout}
              className="text-xs font-semibold text-red-400 hover:text-red-300 border border-red-500/10 hover:bg-red-500/5 rounded-xl px-3.5 py-2 transition-all flex items-center gap-1.5 focus:outline-none"
            >
              <LogOut className="size-3.5" /> Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-[250px_1fr]">
          {/* Navigation Sidebar */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-900 bg-slate-900/40 p-2 lg:flex-col">
              {TABS.map((t) => {
                const Icon = t.icon;
                const active = activeTab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    className={cn(
                      "flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all focus:outline-none",
                      active
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                        : "text-slate-400 hover:bg-slate-900/60 hover:text-slate-200"
                    )}
                  >
                    <Icon className="size-4" />
                    {t.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Console Work area */}
          <div className="min-h-[500px]">
            {activeTab === "products" && (
              <ProductsTab
                flavors={flavors}
                onAdd={addProduct}
                onEdit={updateProduct}
                onDelete={deleteProduct}
              />
            )}
            {activeTab === "orders" && (
              <OrdersTab orders={orders} onUpdateStatus={updateOrderStatus} />
            )}
            {activeTab === "customers" && <CustomersTab customers={customers} />}
            {activeTab === "settings" && (
              <SettingsTab settings={settings} onUpdate={updateSettings} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

/* --------------------------------- PRODUCTS CONTROL --------------------------------- */

interface ProductFormState {
  name: string;
  tagline: string;
  description: string;
  heat: number;
  badge: "None" | "Signature" | "New" | "Hot";
  bestSeller: boolean;
  presetIdx: number;
  ingredients: string;
}

const INITIAL_FORM: ProductFormState = {
  name: "",
  tagline: "",
  description: "",
  heat: 1,
  badge: "None",
  bestSeller: false,
  presetIdx: 0,
  ingredients: "Fresh Ratalu, Cold-pressed sunflower oil, spices",
};

function ProductsTab({
  flavors,
  onAdd,
  onEdit,
  onDelete,
}: {
  flavors: Flavor[];
  onAdd: (flavor: Omit<Flavor, "id" | "slug">) => void;
  onEdit: (id: string, updated: Omit<Flavor, "id" | "slug">) => void;
  onDelete: (id: string) => void;
}) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [form, setForm] = React.useState<ProductFormState>(INITIAL_FORM);

  const handleEditClick = (flavor: Flavor) => {
    const matchedIdx = GRADIENT_PRESETS.findIndex((g) => g.from === flavor.gradient.from) ?? 0;
    setForm({
      name: flavor.name,
      tagline: flavor.tagline,
      description: flavor.description,
      heat: flavor.heat,
      badge: (flavor.badge ?? "None") as ProductFormState["badge"],
      bestSeller: !!flavor.bestSeller,
      presetIdx: matchedIdx > -1 ? matchedIdx : 0,
      ingredients: flavor.ingredients?.join(", ") || "",
    });
    setEditingId(flavor.id);
    setShowForm(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.tagline || !form.description) return;

    const preset = GRADIENT_PRESETS[form.presetIdx];
    const ingredientsArr = form.ingredients.split(",").map((s) => s.trim()).filter(Boolean);

    const payload = {
      name: form.name,
      tagline: form.tagline,
      description: form.description,
      heat: Number(form.heat) as HeatLevel,
      badge: form.badge === "None" ? undefined : form.badge,
      bestSeller: form.bestSeller,
      gradient: {
        from: preset.from,
        via: preset.via,
        to: preset.to,
      },
      accent: preset.accent,
      ingredients: ingredientsArr,
    };

    if (editingId) {
      onEdit(editingId, payload);
    } else {
      onAdd(payload);
    }

    setForm(INITIAL_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="rounded-2xl border border-slate-900 bg-slate-900/30 p-6 backdrop-blur-sm sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Store Catalog Management</h2>
          <p className="text-xs text-slate-500 mt-1">Configure active potato yam flavor items, pricing structure, and details.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setForm(INITIAL_FORM); setEditingId(null); setShowForm(true); }}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-xs font-bold text-white transition-all focus:outline-none"
          >
            <Plus className="size-4" /> Add New Flavor
          </button>
        )}
      </div>

      <div className="mt-6">
        {showForm ? (
          <form onSubmit={handleSave} className="flex flex-col gap-5 rounded-2xl border border-slate-800 bg-slate-950 p-5">
            <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider">
              {editingId ? "Edit Catalog Item details" : "Add New Flavor Item"}
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Flavor Name</label>
                <Input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Classic Masala"
                  className="bg-slate-900 border-slate-800 text-slate-100 focus-visible:border-indigo-500"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tagline</label>
                <Input
                  required
                  value={form.tagline}
                  onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                  placeholder="e.g. Tangy & deeply aromatic"
                  className="bg-slate-900 border-slate-800 text-slate-100 focus-visible:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</label>
              <textarea
                required
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe this wafer pack to buyers..."
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 outline-none focus-visible:border-indigo-500 placeholder:text-slate-600"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Spiciness level</label>
                <select
                  value={form.heat}
                  onChange={(e) => setForm({ ...form, heat: Number(e.target.value) })}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value={0}>0 - Mild</option>
                  <option value={1}>1 - Gentle</option>
                  <option value={2}>2 - Medium</option>
                  <option value={3}>3 - Fiery</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Product Tag Badge</label>
                <select
                  value={form.badge}
                  onChange={(e) => setForm({ ...form, badge: e.target.value as ProductFormState["badge"] })}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="None">None</option>
                  <option value="Signature">Signature</option>
                  <option value="New">New</option>
                  <option value="Hot">Hot</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-6 pl-2">
                <input
                  type="checkbox"
                  id="bestSeller"
                  checked={form.bestSeller}
                  onChange={(e) => setForm({ ...form, bestSeller: e.target.checked })}
                  className="size-4.5 rounded border-slate-800 bg-slate-900 accent-indigo-600 cursor-pointer"
                />
                <label htmlFor="bestSeller" className="text-xs font-bold text-slate-400 uppercase tracking-wider cursor-pointer select-none">
                  Best Seller status ★
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Accents & Color Gradients</span>
              <div className="grid gap-2 sm:grid-cols-5">
                {GRADIENT_PRESETS.map((preset, idx) => (
                  <button
                    type="button"
                    key={preset.label}
                    onClick={() => setForm({ ...form, presetIdx: idx })}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border p-2 text-center transition-all focus:outline-none",
                      form.presetIdx === idx
                        ? "border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500"
                        : "border-slate-800 bg-slate-900 hover:border-slate-700"
                    )}
                  >
                    <span
                      className="size-6 rounded-full border border-slate-950 shadow-inner"
                      style={{
                        background: `linear-gradient(135deg, ${preset.from}, ${preset.to})`,
                      }}
                    />
                    <span className="text-[10px] font-bold text-slate-300">{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ingredients (separated by commas)</label>
              <Input
                value={form.ingredients}
                onChange={(e) => setForm({ ...form, ingredients: e.target.value })}
                placeholder="Fresh Ratalu, Sunflower oil, seasonings"
                className="bg-slate-900 border-slate-800 text-slate-100 focus-visible:border-indigo-500"
              />
            </div>

            <div className="flex gap-2 mt-2">
              <button
                type="submit"
                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-xs font-bold text-white transition-colors"
              >
                Save Catalog Item
              </button>
              <button
                type="button"
                onClick={() => { setEditingId(null); setShowForm(false); }}
                className="rounded-xl border border-slate-800 hover:bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {flavors.map((f) => (
              <div key={f.id} className="flex gap-4 rounded-xl border border-slate-900 bg-slate-900/10 p-4 shadow-sm hover:border-slate-800 transition-all">
                <div
                  className="size-16 shrink-0 rounded-xl border border-slate-800 self-center shadow-inner"
                  style={{
                    background: `linear-gradient(135deg, ${f.gradient.from}, ${f.gradient.to})`,
                  }}
                />
                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <h4 className="text-base font-bold text-slate-100 leading-tight">{f.name}</h4>
                      <HeatMeter level={f.heat} className="mt-1" />
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditClick(f)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-slate-200 transition-colors"
                        aria-label="Edit product"
                      >
                        <Edit2 className="size-4.5" />
                      </button>
                      <button
                        onClick={() => onDelete(f.id)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-red-400 transition-colors"
                        aria-label="Delete product"
                      >
                        <Trash2 className="size-4.5" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400 line-clamp-2">{f.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------------------- LOGISTICS QUEUE --------------------------------- */

function OrdersTab({
  orders,
  onUpdateStatus,
}: {
  orders: Order[];
  onUpdateStatus: (id: string, status: Order["status"]) => void;
}) {
  const statusColors = {
    Pending: "bg-slate-800/80 text-slate-400 border-slate-700/30",
    "Kettle Cooking": "bg-amber-500/10 text-amber-500 border-amber-500/20",
    Shipped: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    Delivered: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  };

  return (
    <div className="rounded-2xl border border-slate-900 bg-slate-900/30 p-6 backdrop-blur-sm sm:p-8">
      <div className="border-b border-slate-900 pb-5">
        <h2 className="text-xl font-bold text-slate-100">Logistics & Order dispatch</h2>
        <p className="text-xs text-slate-500 mt-1">Track pending customer order queues and dispatch kettle batches.</p>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <th className="py-3 px-4">Order ID</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Items Summary</th>
              <th className="py-3 px-4">Paid Total</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900 text-xs text-slate-300">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-slate-900/10 transition-colors">
                <td className="py-4 px-4 font-mono font-bold text-indigo-400">#{o.id}</td>
                <td className="py-4 px-4">
                  <p className="font-semibold text-slate-200">{o.userName}</p>
                  <p className="text-slate-500 text-[10px]">{o.userPhone}</p>
                </td>
                <td className="py-4 px-4 text-slate-400">
                  {o.items.map((i) => (
                    <div key={i.key} className="truncate max-w-[200px]">
                      {i.quantity}x {i.flavorName} ({i.packLabel})
                    </div>
                  ))}
                </td>
                <td className="py-4 px-4 font-bold text-slate-200">{formatINR(o.totals.total)}</td>
                <td className="py-4 px-4">
                  <Badge variant="soft" className={cn("border font-bold uppercase text-[9px] tracking-wider", statusColors[o.status])}>
                    {o.status}
                  </Badge>
                </td>
                <td className="py-4 px-4">
                  <select
                    value={o.status}
                    onChange={(e) => onUpdateStatus(o.id, e.target.value as Order["status"])}
                    className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs font-bold text-indigo-400 outline-none cursor-pointer focus:border-indigo-500"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Kettle Cooking">Kettle Cooking</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Delivered">Delivered</option>
                  </select>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-500">
                  No orders logged in queue yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* --------------------------------- STORE CUSTOMERS --------------------------------- */

function CustomersTab({ customers }: { customers: UserProfile[] }) {
  const [search, setSearch] = React.useState("");

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q);
  });

  return (
    <div className="rounded-2xl border border-slate-900 bg-slate-900/30 p-6 backdrop-blur-sm sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Store Customers</h2>
          <p className="text-xs text-slate-500 mt-1">Review registered shopper accounts and active shipping coordinates.</p>
        </div>
        <div className="w-full max-w-xs">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone..."
            className="h-10 bg-slate-950 border-slate-800 text-slate-100 focus-visible:border-indigo-500 placeholder:text-slate-600"
          />
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-5">
        {filtered.map((c) => (
          <div key={c.phone} className="rounded-xl border border-slate-900 bg-slate-950 p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-lg bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20 text-xs">
                {c.name[0].toUpperCase()}
              </span>
              <div>
                <h4 className="text-sm font-bold text-slate-100">{c.name}</h4>
                <p className="text-[10px] text-slate-500 font-medium">Mobile Contact: {c.phone}</p>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-900 pt-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Saved Locations ({c.addresses?.length || 0})</span>
              
              {c.addresses && c.addresses.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {c.addresses.map((a: SavedAddress) => (
                    <div key={a.id} className="rounded-lg border border-slate-800 bg-slate-900/30 p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <Badge variant={a.tag === "Home" ? "primary" : a.tag === "Work" ? "gold" : "orange"} size="sm">
                          {a.tag}
                        </Badge>
                        {c.activeAddressId === a.id && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400">Active</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {a.addressLine}, {a.city}, {a.state} {a.pincode}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-600">No shipping addresses configured on profile.</p>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="py-10 text-center text-slate-500 text-xs">
            No shopper profiles match your search criteria.
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------------------- CONFIG/SETTINGS TAB --------------------------------- */

function SettingsTab({
  settings,
  onUpdate,
}: {
  settings: StoreSettings;
  onUpdate: (updated: Partial<StoreSettings>) => void;
}) {
  const [announcementText, setAnnouncementText] = React.useState(settings.announcementText);
  const [announcementEnabled, setAnnouncementEnabled] = React.useState(settings.announcementEnabled);
  const [footerEmail, setFooterEmail] = React.useState(settings.footerEmail);
  const [footerPhone, setFooterPhone] = React.useState(settings.footerPhone);
  const [footerAddress, setFooterAddress] = React.useState(settings.footerAddress);
  const [maxOrderLimit, setMaxOrderLimit] = React.useState(settings.maxOrderLimit);
  const [success, setSuccess] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({
      announcementText,
      announcementEnabled,
      footerEmail,
      footerPhone,
      footerAddress,
      maxOrderLimit: Number(maxOrderLimit),
    });
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-slate-900 bg-slate-900/30 p-6 backdrop-blur-sm sm:p-8">
      <div className="border-b border-slate-900 pb-5">
        <h2 className="text-xl font-bold text-slate-100">Store Configuration</h2>
        <p className="text-xs text-slate-500 mt-1">Configure announcement headers, coordinates, and purchase caps.</p>
      </div>

      {success && (
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-400">
          <CheckCircle className="size-4" /> Settings updated successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-6">
        {/* Header Announcements */}
        <fieldset className="rounded-xl border border-slate-800 bg-slate-950 p-5 flex flex-col gap-4">
          <legend className="px-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">Announcement Banner</legend>
          
          <div className="flex items-center justify-between border-b border-slate-900 pb-4">
            <div>
              <p className="text-sm font-semibold text-slate-200">Show Announcement Bar</p>
              <p className="text-[10px] text-slate-500">Toggle announcement marquee bar on page headers.</p>
            </div>
            <input
              type="checkbox"
              checked={announcementEnabled}
              onChange={(e) => setAnnouncementEnabled(e.target.checked)}
              className="size-5 rounded border-slate-800 bg-slate-900 accent-indigo-600 cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Announcement Text</label>
            <Input
              disabled={!announcementEnabled}
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              placeholder="e.g. Free shipping on orders over ₹499!"
              className="bg-slate-900 border-slate-800 text-slate-100 focus-visible:border-indigo-500 disabled:opacity-50"
            />
          </div>
        </fieldset>

        {/* Purchase Limits */}
        <fieldset className="rounded-xl border border-slate-800 bg-slate-950 p-5 flex flex-col gap-4">
          <legend className="px-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">Order quantity limits</legend>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Max pack items per checkout</label>
            <Input
              required
              type="number"
              min={1}
              max={99}
              value={maxOrderLimit}
              onChange={(e) => setMaxOrderLimit(Number(e.target.value))}
              className="bg-slate-900 border-slate-800 text-slate-100 focus-visible:border-indigo-500 w-full max-w-xs"
            />
            <p className="text-[10px] text-slate-500 mt-1">Prevents orders containing more total packages than this quantity threshold to avoid inventory strain.</p>
          </div>
        </fieldset>

        {/* Contact Coordinates */}
        <fieldset className="rounded-xl border border-slate-800 bg-slate-950 p-5 flex flex-col gap-4">
          <legend className="px-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">Footer Contact info</legend>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Support Email</label>
              <Input
                required
                type="email"
                value={footerEmail}
                onChange={(e) => setFooterEmail(e.target.value)}
                className="bg-slate-900 border-slate-800 text-slate-100 focus-visible:border-indigo-500"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Support Phone</label>
              <Input
                required
                value={footerPhone}
                onChange={(e) => setFooterPhone(e.target.value)}
                className="bg-slate-900 border-slate-800 text-slate-100 focus-visible:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Office Address</label>
            <textarea
              required
              rows={2}
              value={footerAddress}
              onChange={(e) => setFooterAddress(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 outline-none focus-visible:border-indigo-500 placeholder:text-slate-600"
            />
          </div>
        </fieldset>

        <button
          type="submit"
          className="rounded-xl bg-indigo-600 hover:bg-indigo-500 py-3 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-colors focus:outline-none"
        >
          <Save className="size-4" /> Save Configuration
        </button>
      </form>
    </div>
  );
}
