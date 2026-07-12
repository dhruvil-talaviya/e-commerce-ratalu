"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  Users,
  Truck,
  Plus,
  Edit2,
  Trash2,
  Settings,
  LogOut,
  ShieldCheck,
  CheckCircle,
  Eye,
  TrendingUp,
  Package,
  DollarSign,
  AlertTriangle,
  FolderTree,
  Tag,
  Gift,
  FileText,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  Printer,
  Download,
  Info,
  Calendar,
  Layers,
  ChevronDown,
  UserCheck,
  Menu,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useProducts } from "@/components/shop/product-provider";
import { useOrders, type Order, type OrderStatus } from "@/components/shop/order-provider";
import { useAccount, type UserProfile } from "@/components/account/account-provider";
import { useStoreSettings, type StoreSettings } from "@/components/common/settings-provider";
import { toast } from "@/components/ui/toast";
import { formatINR, cn } from "@/lib/utils";
import type { Flavor, HeatLevel } from "@/lib/types";
import { apiFetch } from "@/lib/api";

type AdminTab =
  | "dashboard"
  | "products"
  | "categories"
  | "orders"
  | "customers"
  | "coupons"
  | "offers"
  | "inventory"
  | "reports"
  | "homepage"
  | "audit-logs";

const TABS: { key: AdminTab; label: string; icon: React.ElementType }[] = [
  { key: "dashboard", label: "Overview & Charts", icon: TrendingUp },
  { key: "products", label: "Products Manager", icon: ShoppingBag },
  { key: "categories", label: "Categories Grid", icon: FolderTree },
  { key: "orders", label: "Logistics Queue", icon: Truck },
  { key: "customers", label: "Store Customers", icon: Users },
  { key: "coupons", label: "Coupons Creator", icon: Tag },
  { key: "offers", label: "Promotions & Offers", icon: Gift },
  { key: "inventory", label: "Stock Inventory", icon: Layers },
  { key: "reports", label: "Sales Reports", icon: FileSpreadsheet },
  { key: "homepage", label: "Homepage Design", icon: Settings },
  { key: "audit-logs", label: "Security Logs", icon: Clock },
];

export default function AdminDashboardPage() {
  const { user, isLoggedIn, logout } = useAccount();
  const router = useRouter();
  const { settings, updateSettings } = useStoreSettings();
  const { flavors, addProduct, updateProduct, deleteProduct } = useProducts();
  const { orders, updateOrderStatus, cancelOrder, assignCourier } = useOrders();

  const [activeTab, setActiveTab] = React.useState<AdminTab>("dashboard");
  const [customers, setCustomers] = React.useState<UserProfile[]>([]);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  // Pagination, search, sort states
  const [searchTerm, setSearchTerm] = React.useState("");
  const [sortField, setSortField] = React.useState("id");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [rowsPerPage, setRowsPerPage] = React.useState(5);

  // Security route guard
  React.useEffect(() => {
    if (!isLoggedIn || user?.phone !== "9999999999") {
      router.push("/admin/login");
    }
  }, [isLoggedIn, user, router]);

  // Load customer profiles from local storage
  React.useEffect(() => {
    try {
      const savedAccounts = localStorage.getItem("ratalu.accounts");
      if (savedAccounts) {
        setCustomers(JSON.parse(savedAccounts));
      }
    } catch {
      // ignore
    }
  }, []);

  if (!isLoggedIn || user?.phone !== "9999999999") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center text-sm font-semibold text-gray-500">
          Loading Admin Session...
        </div>
      </div>
    );
  }

  // Count orders by status
  const orderCounts = orders.reduce(
    (acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const totalSales = orders
    .filter((o) => o.status !== "Cancelled")
    .reduce((sum, o) => sum + o.totals.total, 0);

  const lowStockFlavors = flavors.length ? 2 : 0; // Mock statistic

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
              aria-label="Open sidebar"
            >
              <Menu className="size-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700 font-bold border border-purple-200">
                R
              </span>
              <div>
                <h1 className="text-base font-bold text-gray-900 leading-none">Ratalu Admin</h1>
                <p className="text-[10px] text-gray-500 mt-1">Enterprise Management Hub</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              target="_blank"
              className="text-xs font-bold text-gray-700 hover:text-purple-700 border border-gray-200 bg-white rounded-xl px-3.5 py-2 transition-all inline-flex items-center gap-1.5 shadow-sm"
            >
              <Eye className="size-3.5" /> <span className="hidden sm:inline">View Shop</span>
            </Link>
            <button
              onClick={() => {
                logout();
                toast.success("Logged out successfully");
                router.push("/admin/login");
              }}
              className="text-xs font-bold text-red-600 hover:text-red-700 border border-red-100 hover:bg-red-50 bg-white rounded-xl px-3.5 py-2 transition-all inline-flex items-center gap-1.5 shadow-sm focus:outline-none"
            >
              <LogOut className="size-3.5" /> <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex">
        {/* Left Sidebar Drawer / Desktop Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:translate-x-0 lg:static lg:h-auto lg:z-0 shrink-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex flex-col h-full py-4">
            <div className="px-4 pb-4 border-b border-gray-100 flex items-center justify-between lg:hidden">
              <span className="text-sm font-bold text-gray-700">Navigation Menu</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"
              >
                <X className="size-5" />
              </button>
            </div>

            <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto no-scrollbar">
              {TABS.map((t) => {
                const Icon = t.icon;
                const active = activeTab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => {
                      setActiveTab(t.key);
                      setSidebarOpen(false);
                      setCurrentPage(1);
                      setSearchTerm("");
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition-all focus:outline-none",
                      active
                        ? "bg-purple-600 text-white shadow-md shadow-purple-600/10"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    {t.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Backdrop for mobile drawer */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-35 bg-black/30 backdrop-blur-sm lg:hidden"
          />
        )}

        {/* Central tab workarea panel */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 shadow-sm min-h-[600px]">
            {activeTab === "dashboard" && (
              <DashboardTab
                orders={orders}
                totalSales={totalSales}
                orderCounts={orderCounts}
                customersCount={customers.length}
                lowStock={lowStockFlavors}
              />
            )}
            {activeTab === "products" && (
              <ProductsTab
                flavors={flavors}
                onAdd={addProduct}
                onEdit={updateProduct}
                onDelete={deleteProduct}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                rowsPerPage={rowsPerPage}
              />
            )}
            {activeTab === "categories" && <CategoriesTab />}
            {activeTab === "orders" && (
              <OrdersTab
                orders={orders}
                onUpdateStatus={updateOrderStatus}
                onCancelOrder={cancelOrder}
                onAssignCourier={assignCourier}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                rowsPerPage={rowsPerPage}
              />
            )}
            {activeTab === "customers" && (
              <CustomersTab
                customers={customers}
                setCustomers={setCustomers}
                orders={orders}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                rowsPerPage={rowsPerPage}
              />
            )}
            {activeTab === "coupons" && <CouponsTab />}
            {activeTab === "offers" && <OffersTab />}
            {activeTab === "inventory" && <InventoryTab flavors={flavors} />}
            {activeTab === "reports" && <ReportsTab orders={orders} />}
            {activeTab === "homepage" && (
              <HomepageTab settings={settings} onUpdate={updateSettings} />
            )}
            {activeTab === "audit-logs" && <AuditLogsTab />}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ================================================================== */
/* MODULE 1: DASHBOARD OVERVIEW & CHARTS                              */
/* ================================================================== */

function DashboardTab({
  orders,
  totalSales,
  orderCounts,
  customersCount,
  lowStock,
}: {
  orders: Order[];
  totalSales: number;
  orderCounts: Record<string, number>;
  customersCount: number;
  lowStock: number;
}) {
  const stats = [
    { label: "Total Revenue", value: formatINR(totalSales), icon: DollarSign, color: "text-purple-600 bg-purple-50 border-purple-100" },
    { label: "Total Orders", value: String(orders.length), icon: Package, color: "text-orange-600 bg-orange-50 border-orange-100" },
    { label: "Store Customers", value: String(customersCount), icon: Users, color: "text-green-600 bg-green-50 border-green-100" },
    { label: "Pending Orders", value: String(orderCounts["Pending"] || 0), icon: Clock, color: "text-yellow-600 bg-yellow-50 border-yellow-100" },
    { label: "Delivered Orders", value: String(orderCounts["Delivered"] || 0), icon: CheckCircle, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
    { label: "Low Stock Items", value: String(lowStock), icon: AlertTriangle, color: "text-red-600 bg-red-50 border-red-100" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Operational Dashboard</h2>
        <p className="text-xs text-gray-500 mt-1">Real-time enterprise statistics, sales figures, and key performance indicators.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col justify-between shadow-sm">
              <span className={cn("grid size-9 place-items-center rounded-lg border text-base font-semibold", s.color)}>
                <Icon className="size-4.5" />
              </span>
              <div className="mt-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{s.label}</p>
                <p className="text-xl font-extrabold text-gray-800 mt-1 tracking-tight">{s.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Simulated Revenue SVG Chart */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider">Revenue Trend (Last 6 Months)</h3>
        <div className="h-60 w-full relative">
          <svg className="w-full h-full" viewBox="0 0 600 240" preserveAspectRatio="none">
            {/* Grid lines */}
            <line x1="50" y1="40" x2="550" y2="40" stroke="#f3f4f6" strokeWidth="1" />
            <line x1="50" y1="100" x2="550" y2="100" stroke="#f3f4f6" strokeWidth="1" />
            <line x1="50" y1="160" x2="550" y2="160" stroke="#f3f4f6" strokeWidth="1" />
            <line x1="50" y1="210" x2="550" y2="210" stroke="#e5e7eb" strokeWidth="1.5" />

            {/* Line Graph */}
            <path
              d="M 50 190 Q 150 120, 250 140 T 450 70 T 550 50"
              fill="none"
              stroke="#5b2c83"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* Area under curve */}
            <path
              d="M 50 190 Q 150 120, 250 140 T 450 70 T 550 50 L 550 210 L 50 210 Z"
              fill="url(#gradient-chart)"
              opacity="0.12"
            />
            
            <defs>
              <linearGradient id="gradient-chart" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5b2c83" />
                <stop offset="100%" stopColor="#e67e22" />
              </linearGradient>
            </defs>

            {/* Dots */}
            <circle cx="50" cy="190" r="5" fill="#e67e22" />
            <circle cx="250" cy="140" r="5" fill="#5b2c83" />
            <circle cx="550" cy="50" r="5" fill="#5b2c83" />
          </svg>
          {/* Legend */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-between px-10 text-[10px] font-semibold text-gray-400">
            <span>Jan</span>
            <span>Feb</span>
            <span>Mar</span>
            <span>Apr</span>
            <span>May</span>
            <span>Jun</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent orders */}
        <div className="border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider">Recent Orders Queue</h3>
          <div className="divide-y divide-gray-100 flex flex-col">
            {orders.slice(0, 4).map((o) => (
              <div key={o.id} className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0">
                <div>
                  <p className="text-xs font-bold text-gray-800">#{o.id} - {o.userName}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{new Date(o.createdAt).toLocaleDateString("en-IN")} · {o.items.length} items</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-purple-600">{formatINR(o.totals.total)}</p>
                  <Badge variant="soft" className="mt-1 text-[9px] px-2 py-0.5">{o.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions panel */}
        <div className="border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-800 mb-2 uppercase tracking-wider">Store Quick Actions</h3>
            <p className="text-xs text-gray-500">Direct links to manage operations quickly.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <button className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 p-4 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700 transition-all text-center">
              <Plus className="size-5 text-purple-600" />
              <span className="text-xs font-bold">Add Flavour</span>
            </button>
            <button className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 p-4 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700 transition-all text-center">
              <Truck className="size-5 text-orange-500" />
              <span className="text-xs font-bold">Dispatch Orders</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* MODULE 2: PRODUCT MANAGEMENT                                       */
/* ================================================================== */

function ProductsTab({
  flavors,
  onAdd,
  onEdit,
  onDelete,
  searchTerm,
  setSearchTerm,
  currentPage,
  setCurrentPage,
  rowsPerPage,
}: {
  flavors: Flavor[];
  onAdd: (flavor: Omit<Flavor, "id" | "slug">) => void;
  onEdit: (id: string, updated: Omit<Flavor, "id" | "slug">) => void;
  onDelete: (id: string) => void;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  currentPage: number;
  setCurrentPage: (p: number) => void;
  rowsPerPage: number;
}) {
  const [showForm, setShowForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const [form, setForm] = React.useState({
    name: "",
    tagline: "",
    description: "",
    heat: 1,
    badge: "None",
    bestSeller: false,
    ingredients: "Fresh Ratalu, Cold-pressed sunflower oil, spices",
  });

  const filtered = flavors.filter((f) =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / rowsPerPage) || 1;
  const paginated = filtered.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const handleEditClick = (f: Flavor) => {
    setForm({
      name: f.name,
      tagline: f.tagline,
      description: f.description,
      heat: f.heat,
      badge: f.badge || "None",
      bestSeller: !!f.bestSeller,
      ingredients: f.ingredients.join(", "),
    });
    setEditingId(f.id);
    setShowForm(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      tagline: form.tagline,
      description: form.description,
      heat: Number(form.heat) as HeatLevel,
      badge: form.badge === "None" ? undefined : form.badge,
      bestSeller: form.bestSeller,
      gradient: { from: "#7a3f9c", via: "#5b2c6f", to: "#3d1d4c" },
      accent: "#f4b400",
      ingredients: form.ingredients.split(",").map((x) => x.trim()),
    };

    if (editingId) {
      onEdit(editingId, payload);
      toast.success("Product Updated");
    } else {
      onAdd(payload);
      toast.success("Product Added Successfully");
    }

    setShowForm(false);
    setEditingId(null);
    setForm({
      name: "",
      tagline: "",
      description: "",
      heat: 1,
      badge: "None",
      bestSeller: false,
      ingredients: "Fresh Ratalu, Cold-pressed sunflower oil, spices",
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Products Catalog</h2>
          <p className="text-xs text-gray-500 mt-1">Add, update, or remove active wafer products and metadata.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => {
              setEditingId(null);
              setShowForm(true);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-sm focus:outline-none"
          >
            <Plus className="size-4" /> Add Flavor Variant
          </button>
        )}
      </div>

      {showForm ? (
        <form onSubmit={handleSave} className="border border-gray-200 rounded-xl p-5 bg-gray-50 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-purple-700 uppercase tracking-wider">
            {editingId ? "Modify Product Details" : "Create New Flavour"}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500">Wafer Name</label>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-white"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500">Flavor Tagline</label>
              <Input
                required
                value={form.tagline}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                className="bg-white"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500">Description</label>
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600/20"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500">Heat Intensity (0-3)</label>
              <Input
                type="number"
                min={0}
                max={3}
                value={form.heat}
                onChange={(e) => setForm({ ...form, heat: Number(e.target.value) })}
                className="bg-white"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500">Promo Badge</label>
              <select
                value={form.badge}
                onChange={(e) => setForm({ ...form, badge: e.target.value })}
                className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm"
              >
                <option value="None">None</option>
                <option value="Signature">Signature</option>
                <option value="New">New</option>
                <option value="Hot">Hot 🔥</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="bestSeller"
                checked={form.bestSeller}
                onChange={(e) => setForm({ ...form, bestSeller: e.target.checked })}
              />
              <label htmlFor="bestSeller" className="text-xs font-semibold text-gray-600">Featured Best Seller</label>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500">Ingredients (Comma Separated)</label>
            <Input
              value={form.ingredients}
              onChange={(e) => setForm({ ...form, ingredients: e.target.value })}
              className="bg-white"
            />
          </div>

          <div className="flex justify-end gap-2.5 mt-2">
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit">Save Product</Button>
          </div>
        </form>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input
              placeholder="Search flavours catalog..."
              className="pl-10 h-10 border-gray-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto border border-gray-100 rounded-xl shadow-sm">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 font-bold text-xs uppercase tracking-wider">
                  <th className="p-4">Variant</th>
                  <th className="p-4">Spice Level</th>
                  <th className="p-4">Highlight Badge</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {paginated.map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50/50">
                    <td className="p-4">
                      <p className="font-bold text-gray-800">{f.name}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{f.tagline}</p>
                    </td>
                    <td className="p-4">
                      <Badge variant="soft">Spice: {f.heat}/3</Badge>
                    </td>
                    <td className="p-4">
                      {f.badge ? <Badge variant="primary">{f.badge}</Badge> : "—"}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700">
                        <span className="size-2 rounded-full bg-green-500 animate-pulse" /> Active
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => handleEditClick(f)}
                          className="p-2 rounded-lg hover:bg-gray-100 text-purple-600 transition-colors"
                        >
                          <Edit2 className="size-4" />
                        </button>
                        <button
                          onClick={() => {
                            onDelete(f.id);
                            toast.success("Flavour Deleted");
                          }}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          <div className="flex items-center justify-between border-t border-gray-100 pt-4 text-xs font-semibold text-gray-500">
            <span>Page {currentPage} of {totalPages}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="size-4" /> Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ================================================================== */
/* MODULE 3: CATEGORY GRID                                            */
/* ================================================================== */

function CategoriesTab() {
  const [categories, setCategories] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchCategories = React.useCallback(async () => {
    try {
      const data = await apiFetch("/categories");
      setCategories(data);
    } catch {
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Categories Grid</h2>
          <p className="text-xs text-gray-500 mt-1">Structure snack categorization tags and storefront navigation columns.</p>
        </div>
        <button
          onClick={async () => {
            const name = prompt("Enter Category name:");
            if (name) {
              try {
                await apiFetch("/categories", {
                  method: "POST",
                  body: { name, status: "Active" }
                });
                toast.success("Category Created");
                fetchCategories();
              } catch {
                toast.error("Failed to create category");
              }
            }
          }}
          className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-sm focus:outline-none"
        >
          <Plus className="size-4" /> Create Category
        </button>
      </div>

      <div className="overflow-x-auto border border-gray-100 rounded-xl shadow-sm">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 font-bold text-xs uppercase tracking-wider">
              <th className="p-4">Category Name</th>
              <th className="p-4">Linked Products</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {categories.map((c) => (
              <tr key={c._id || c.id} className="hover:bg-gray-50/50">
                <td className="p-4 font-bold text-gray-800">{c.name}</td>
                <td className="p-4 text-xs font-semibold text-gray-500">{c.count || 0} items</td>
                <td className="p-4">
                  <Badge variant={c.status === "Active" ? "primary" : "cream"}>{c.status}</Badge>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={async () => {
                      try {
                        await apiFetch(`/categories/${c._id || c.id}`, { method: "DELETE" });
                        toast.success("Category deleted");
                        fetchCategories();
                      } catch {
                        toast.error("Failed to delete category");
                      }
                    }}
                    className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================================================================== */
/* MODULE 4: LOGISTICS & ORDER WORKFLOW                               */
/* ================================================================== */

function OrdersTab({
  orders,
  onUpdateStatus,
  onCancelOrder,
  onAssignCourier,
  searchTerm,
  setSearchTerm,
  currentPage,
  setCurrentPage,
  rowsPerPage,
}: {
  orders: Order[];
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  onCancelOrder: (orderId: string) => void;
  onAssignCourier: (orderId: string, details: { courierName: string; trackingNumber: string }) => Promise<void>;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  currentPage: number;
  setCurrentPage: (p: number) => void;
  rowsPerPage: number;
}) {
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);
  
  // Logistics Assignment Form
  const [courier, setCourier] = React.useState("");
  const [trackingId, setTrackingId] = React.useState("");

  const filtered = orders.filter(
    (o) =>
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.userName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / rowsPerPage) || 1;
  const paginated = filtered.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const handleStatusChange = (orderId: string, status: OrderStatus) => {
    onUpdateStatus(orderId, status);
    toast.success(`Order #${orderId} status updated to ${status}`);
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status });
    }
  };

  const handleCancelClick = (orderId: string) => {
    onCancelOrder(orderId);
    toast.success(`Order #${orderId} Cancelled`);
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status: "Cancelled" });
    }
  };

  const handleAssignLogistics = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      await onAssignCourier(selectedOrder.id, { courierName: courier, trackingNumber: trackingId });
      toast.success("Courier Assigned", {
        description: `Courier ${courier} with tracking ID ${trackingId} assigned successfully.`,
      });
      setSelectedOrder({
        ...selectedOrder,
        courierName: courier,
        trackingNumber: trackingId,
        status: "Ready for Dispatch"
      });
      setCourier("");
      setTrackingId("");
    } catch {
      toast.error("Failed to assign courier partner.");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-xl font-bold text-gray-800">Order Management & Logistics Queue</h2>
        <p className="text-xs text-gray-500 mt-1">Manage processing queue, assign shipping partners, and update order statuses.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
        <Input
          placeholder="Search by Order ID or customer name..."
          className="pl-10 h-10 border-gray-200"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Orders Queue Table */}
        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto border border-gray-100 rounded-xl shadow-sm">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 font-bold text-xs uppercase tracking-wider">
                  <th className="p-4">Order Details</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {paginated.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50/50">
                    <td className="p-4">
                      <p className="font-bold text-gray-800">#{o.id}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{o.items.length} items · {formatINR(o.totals.total)}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-gray-700">{o.userName}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{o.userPhone}</p>
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-semibold text-gray-600 uppercase">{o.method}</span>
                    </td>
                    <td className="p-4">
                      <Badge variant="soft">{o.status}</Badge>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedOrder(o)}
                        className="text-xs font-bold text-purple-600 hover:text-purple-700 transition-colors focus:outline-none"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>Page {currentPage} of {totalPages}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>

        {/* Detailed Inspector & Workflow Panel */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 flex flex-col gap-5">
          {selectedOrder ? (
            <>
              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <h3 className="text-sm font-bold text-gray-900">Inspect Order #{selectedOrder.id}</h3>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-xs font-semibold text-gray-400 hover:text-gray-600"
                >
                  Clear Selection
                </button>
              </div>

              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Customer Details</p>
                <p className="text-sm font-bold text-gray-800 mt-1">{selectedOrder.userName} ({selectedOrder.userPhone})</p>
                <p className="text-xs text-gray-500 mt-0.5">{selectedOrder.address.addressLine}, {selectedOrder.address.city} - {selectedOrder.address.pincode}</p>
              </div>

              {/* Status Update Form */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Update Status Workflow</label>
                <select
                  value={selectedOrder.status}
                  onChange={(e) => handleStatusChange(selectedOrder.id, e.target.value as OrderStatus)}
                  className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-xs"
                >
                  <option value="Pending">Pending</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Packed">Packed</option>
                  <option value="Ready for Dispatch">Ready for Dispatch</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Out for Delivery">Out for Delivery</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Refund Requested">Refund Requested</option>
                  <option value="Refund Completed">Refund Completed</option>
                  <option value="Return Requested">Return Requested</option>
                  <option value="Return Approved">Return Approved</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              {/* Logistics Assignment Form */}
              <form onSubmit={handleAssignLogistics} className="border-t border-gray-200 pt-4 flex flex-col gap-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Assign Logistics Partner</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase">Courier Partner</label>
                    <Input
                      placeholder="e.g. Delhivery"
                      value={courier}
                      onChange={(e) => setCourier(e.target.value)}
                      className="bg-white h-9 text-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase">Tracking ID</label>
                    <Input
                      placeholder="e.g. DL18392"
                      value={trackingId}
                      onChange={(e) => setTrackingId(e.target.value)}
                      className="bg-white h-9 text-xs"
                    />
                  </div>
                </div>
                <Button type="submit" size="sm" className="w-full">Assign Partner & Track</Button>
              </form>

              {/* Print Invoice Button */}
              <div className="flex gap-2 border-t border-gray-200 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1"
                  onClick={() => toast.success("Invoice print command sent")}
                >
                  <Printer className="size-3.5" /> Print Invoice
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1"
                  onClick={() => toast.success("Invoice PDF Downloaded")}
                >
                  <Download className="size-3.5" /> Download
                </Button>
              </div>

              {/* Cancel Option (Admin can cancel any time BEFORE Delivered) */}
              {selectedOrder.status !== "Delivered" && selectedOrder.status !== "Cancelled" && (
                <button
                  onClick={() => handleCancelClick(selectedOrder.id)}
                  className="w-full text-center text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg py-2.5 transition-colors border border-red-200 mt-2"
                >
                  Cancel Order (Force Administrative Cancel)
                </button>
              )}
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-20 text-center">
              <Truck className="size-8 text-gray-300" />
              <p className="text-xs font-bold text-gray-400 mt-3">Select an order from the queue to process workflow</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* MODULE 5: CUSTOMER MANAGEMENT                                      */
/* ================================================================== */

function CustomersTab({
  customers,
  setCustomers,
  orders,
  searchTerm,
  setSearchTerm,
  currentPage,
  setCurrentPage,
  rowsPerPage,
}: {
  customers: UserProfile[];
  setCustomers: React.Dispatch<React.SetStateAction<UserProfile[]>>;
  orders: Order[];
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  currentPage: number;
  setCurrentPage: (p: number) => void;
  rowsPerPage: number;
}) {
  const [selectedCust, setSelectedCust] = React.useState<UserProfile | null>(null);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
  );

  const totalPages = Math.ceil(filtered.length / rowsPerPage) || 1;
  const paginated = filtered.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const getCustTotals = React.useCallback((phone: string) => {
    const custOrders = orders.filter((o) => o.userPhone === phone);
    const completedOrders = custOrders.filter((o) => o.status !== "Cancelled");
    const count = completedOrders.length;
    const spent = completedOrders.reduce((sum, o) => sum + o.totals.total, 0);

    const lastOrderDate = custOrders.length > 0
      ? new Date(Math.max(...custOrders.map(o => new Date(o.createdAt).getTime()))).toLocaleDateString("en-IN")
      : "No orders";

    return { count, spent, lastOrderDate, allOrders: custOrders };
  }, [orders]);

  const handleStatusToggle = (phone: string, currentStatus?: "Active" | "Blocked") => {
    const nextStatus: "Active" | "Blocked" = currentStatus === "Blocked" ? "Active" : "Blocked";
    
    // Update state & localStorage
    setCustomers((prev) => {
      const copy = prev.map((c) => {
        if (c.phone === phone) {
          const updated = { ...c, status: nextStatus };
          if (selectedCust && selectedCust.phone === phone) {
            setSelectedCust(updated);
          }
          return updated;
        }
        return c;
      });
      localStorage.setItem("ratalu.accounts", JSON.stringify(copy));
      return copy;
    });

    toast.success(`Customer status updated to ${nextStatus}`);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-xl font-bold text-gray-800">Store Customers Profile Directory</h2>
        <p className="text-xs text-gray-500 mt-1">Review registered customers, order histories, block/unblock statuses, and addresses.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
        <Input
          placeholder="Search customers by name or phone..."
          className="pl-10 h-10 border-gray-200"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Customer list table */}
        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto border border-gray-100 rounded-xl shadow-sm">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 font-bold text-xs uppercase tracking-wider">
                  <th className="p-4">Customer</th>
                  <th className="p-4">Total Orders</th>
                  <th className="p-4">Lifetime Spent</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {paginated.map((c) => {
                  const { count, spent } = getCustTotals(c.phone);
                  const isBlocked = c.status === "Blocked";
                  return (
                    <tr key={c.phone} className="hover:bg-gray-50/50">
                      <td className="p-4">
                        <p className="font-bold text-gray-800">{c.name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">+91 {c.phone}</p>
                      </td>
                      <td className="p-4 font-semibold text-gray-650">{count} orders</td>
                      <td className="p-4 font-bold text-purple-650">{formatINR(spent)}</td>
                      <td className="p-4">
                        <Badge variant={isBlocked ? "red" : "soft"}>
                          {c.status || "Active"}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedCust(c)}
                          className="text-xs font-bold text-purple-600 hover:text-purple-700 transition-colors focus:outline-none"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>Page {currentPage} of {totalPages}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>

        {/* Detailed customer panel */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 flex flex-col gap-4">
          {selectedCust ? (
            (() => {
              const { count, spent, lastOrderDate, allOrders } = getCustTotals(selectedCust.phone);
              const isBlocked = selectedCust.status === "Blocked";
              return (
                <>
                  <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                    <h3 className="text-sm font-bold text-gray-900">Customer Profile</h3>
                    <button
                      onClick={() => setSelectedCust(null)}
                      className="text-xs font-semibold text-gray-400 hover:text-gray-600"
                    >
                      Close
                    </button>
                  </div>

                  {/* Profile Header & Blocking CTA */}
                  <div className="flex items-start justify-between gap-3 bg-white p-3.5 border border-gray-150 rounded-xl shadow-sm">
                    <div>
                      <p className="text-base font-bold text-gray-800">{selectedCust.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Mobile: +91 {selectedCust.phone}</p>
                      <div className="mt-1">
                        <Badge variant={isBlocked ? "red" : "soft"}>
                          Account: {selectedCust.status || "Active"}
                        </Badge>
                      </div>
                    </div>
                    <button
                      onClick={() => handleStatusToggle(selectedCust.phone, selectedCust.status)}
                      className={cn(
                        "text-[10px] font-bold rounded-lg px-2.5 py-1.5 transition-colors border",
                        isBlocked
                          ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                          : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                      )}
                    >
                      {isBlocked ? "Activate Profile" : "Block Customer"}
                    </button>
                  </div>

                  {/* Operational Metrics */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-xs">
                      <p className="text-[9px] font-bold text-gray-405 uppercase">Lifetime Spent</p>
                      <p className="text-sm font-extrabold text-purple-700 mt-0.5">{formatINR(spent)}</p>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-xs">
                      <p className="text-[9px] font-bold text-gray-405 uppercase">Total Orders</p>
                      <p className="text-sm font-extrabold text-gray-800 mt-0.5">{count} orders</p>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-xs col-span-2">
                      <p className="text-[9px] font-bold text-gray-405 uppercase">Last Order Date</p>
                      <p className="text-xs font-bold text-gray-700 mt-0.5">{lastOrderDate}</p>
                    </div>
                  </div>

                  {/* Saved Delivery Addresses */}
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Saved Delivery Addresses</p>
                    <div className="flex flex-col gap-2 max-h-[120px] overflow-y-auto pr-1">
                      {selectedCust.addresses.length ? (
                        selectedCust.addresses.map((a) => (
                          <div key={a.id} className="text-xs border border-gray-150 rounded-lg p-2.5 bg-white shadow-xs">
                            <span className="font-bold text-purple-600 text-[9px] uppercase">{a.tag}</span>
                            <p className="text-gray-650 mt-0.5 leading-normal">{a.addressLine}, {a.city} - {a.pincode}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-450 italic">No saved delivery addresses.</p>
                      )}
                    </div>
                  </div>

                  {/* Complete Order History logs */}
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Complete Order History</p>
                    {allOrders.length ? (
                      <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
                        {allOrders.map((o) => (
                          <div key={o.id} className="text-xs border border-gray-150 rounded-lg p-2 bg-white flex justify-between items-center shadow-xs">
                            <div>
                              <p className="font-bold text-gray-800">#{o.id}</p>
                              <p className="text-[9px] text-gray-450 font-semibold">{new Date(o.createdAt).toLocaleDateString("en-IN")} · {o.items.length} items</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-purple-700">{formatINR(o.totals.total)}</p>
                              <Badge variant="soft" className="text-[8px] px-1.5 py-0 mt-0.5">{o.status}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-450 italic">No order history found.</p>
                    )}
                  </div>
                </>
              );
            })()
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-20 text-center">
              <Users className="size-8 text-gray-300" />
              <p className="text-xs font-bold text-gray-400 mt-3">Select a customer profile to view metrics</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* MODULE 6: COUPONS MANAGER                                          */
/* ================================================================== */

function CouponsTab() {
  const [coupons, setCoupons] = React.useState<any[]>([]);

  const fetchCoupons = React.useCallback(async () => {
    try {
      const data = await apiFetch("/coupons");
      setCoupons(data);
    } catch {
      toast.error("Failed to load coupons");
    }
  }, []);

  React.useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Coupons Creator</h2>
          <p className="text-xs text-gray-500 mt-1">Configure active promotional codes and usage rules.</p>
        </div>
        <button
          onClick={async () => {
            const code = prompt("Enter coupon code (e.g. RATALU20):");
            const discount = prompt("Enter discount (e.g. 20% or 50):");
            const desc = prompt("Enter description:");
            if (code && discount && desc) {
              const isPercent = discount.includes("%");
              const val = parseFloat(discount.replace(/[^0-9.]/g, ""));
              try {
                await apiFetch("/admin/coupons", {
                  method: "POST",
                  body: {
                    code: code.toUpperCase(),
                    type: isPercent ? "percent" : "flat",
                    value: val,
                    description: desc
                  }
                });
                toast.success("Coupon Dispatched");
                fetchCoupons();
              } catch {
                toast.error("Failed to create coupon");
              }
            }
          }}
          className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-sm focus:outline-none"
        >
          <Plus className="size-4" /> Create Coupon Code
        </button>
      </div>

      <div className="overflow-x-auto border border-gray-100 rounded-xl shadow-sm">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 font-bold text-xs uppercase tracking-wider">
              <th className="p-4">Promo Code</th>
              <th className="p-4">Discount</th>
              <th className="p-4">Description</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {coupons.map((c) => (
              <tr key={c.code} className="hover:bg-gray-50/50">
                <td className="p-4 font-bold text-gray-900">{c.code}</td>
                <td className="p-4 font-semibold text-purple-600">
                  {c.type === "percent" ? `${c.value}%` : `₹${c.value}`}
                </td>
                <td className="p-4 text-xs text-gray-500">{c.description || c.desc}</td>
                <td className="p-4">
                  <Badge variant="primary">{c.status}</Badge>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={async () => {
                      try {
                        await apiFetch(`/admin/coupons/${c._id || c.id}`, { method: "DELETE" });
                        toast.success("Coupon deleted");
                        fetchCoupons();
                      } catch {
                        toast.error("Failed to delete coupon");
                      }
                    }}
                    className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================================================================== */
/* MODULE 7: PROMOTIONS & OFFERS                                      */
/* ================================================================== */

function OffersTab() {
  const [offers, setOffers] = React.useState<any[]>([]);

  const fetchOffers = React.useCallback(async () => {
    try {
      const data = await apiFetch("/offers");
      setOffers(data);
    } catch {
      toast.error("Failed to load offers");
    }
  }, []);

  React.useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Promotions & Combos</h2>
          <p className="text-xs text-gray-500 mt-1">Configure homepage campaigns, buy-1-get-1, and cart checkout automatic offers.</p>
        </div>
        <button
          onClick={async () => {
            const name = prompt("Enter promotion name:");
            const discount = prompt("Discount details:");
            if (name && discount) {
              try {
                await apiFetch("/admin/offers", {
                  method: "POST",
                  body: { name, discount }
                });
                toast.success("Offer campaign launched");
                fetchOffers();
              } catch {
                toast.error("Failed to launch offer campaign");
              }
            }
          }}
          className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-sm focus:outline-none"
        >
          <Plus className="size-4" /> Create Offer Campaign
        </button>
      </div>

      <div className="overflow-x-auto border border-gray-100 rounded-xl shadow-sm">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 font-bold text-xs uppercase tracking-wider">
              <th className="p-4">Campaign Name</th>
              <th className="p-4">Promotion Details</th>
              <th className="p-4">Banner Section</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {offers.map((o) => (
              <tr key={o._id || o.id} className="hover:bg-gray-50/50">
                <td className="p-4 font-bold text-gray-800">{o.name}</td>
                <td className="p-4 font-semibold text-orange-600">{o.discount}</td>
                <td className="p-4 text-xs text-gray-500">{o.banner || "Homepage"}</td>
                <td className="p-4">
                  <Badge variant="primary">{o.status}</Badge>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={async () => {
                      try {
                        await apiFetch(`/admin/offers/${o._id || o.id}`, { method: "DELETE" });
                        toast.success("Offer Deleted");
                        fetchOffers();
                      } catch {
                        toast.error("Failed to delete offer campaign");
                      }
                    }}
                    className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================================================================== */
/* MODULE 8: STOCK INVENTORY                                         */
/* ================================================================== */

function InventoryTab({ flavors }: { flavors: Flavor[] }) {
  // Inventory levels state mock
  const [stock, setStock] = React.useState<Record<string, number>>({
    "original-salted": 184,
    "classic-masala":  120,
    "peri-peri":       98,
    "black-pepper":    40,
    "cheese":          5,
    "green-chilli":    0,
  });

  const updateStock = (flavorId: string, level: number) => {
    setStock((prev) => ({ ...prev, [flavorId]: level }));
    toast.success("Stock levels updated");
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-xl font-bold text-gray-800">Stock Inventory Dashboard</h2>
        <p className="text-xs text-gray-500 mt-1">Monitor real-time warehouse stock, update bulk quantities, and check alerts.</p>
      </div>

      <div className="overflow-x-auto border border-gray-100 rounded-xl shadow-sm">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 font-bold text-xs uppercase tracking-wider">
              <th className="p-4">Wafer Flavour</th>
              <th className="p-4">Available Box Count</th>
              <th className="p-4">Status Alert</th>
              <th className="p-4 text-right">Quick Restock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {flavors.map((f) => {
              const count = stock[f.id] ?? 0;
              const isLow = count < 15 && count > 0;
              const isOut = count === 0;
              return (
                <tr key={f.id} className="hover:bg-gray-50/50">
                  <td className="p-4 font-bold text-gray-800">{f.name}</td>
                  <td className="p-4">
                    <Input
                      type="number"
                      value={count}
                      onChange={(e) => updateStock(f.id, Number(e.target.value))}
                      className="w-24 bg-white h-9 text-xs text-center border-gray-200"
                    />
                  </td>
                  <td className="p-4">
                    {isOut ? (
                      <Badge variant="red">Out of Stock</Badge>
                    ) : isLow ? (
                      <Badge variant="gold">Low Stock Alert</Badge>
                    ) : (
                      <Badge variant="green">Healthy Stock</Badge>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => updateStock(f.id, count + 50)}
                      className="text-xs font-bold text-purple-600 hover:text-purple-700 transition-colors focus:outline-none"
                    >
                      +50 boxes
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================================================================== */
/* MODULE 9: SALES REPORTS & EXPORT                                   */
/* ================================================================== */

function ReportsTab({ orders }: { orders: Order[] }) {
  const handleExport = (format: string) => {
    toast.success(`Exporting Sales Statistics`, {
      description: `Sales history report containing ${orders.length} records successfully downloaded as ${format}.`,
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Financial Sales Reports</h2>
          <p className="text-xs text-gray-500 mt-1">Export transaction registers, revenue files, and checkout coupon performance data.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport("PDF")} className="gap-1 shadow-sm">
            <Download className="size-3.5" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("Excel/CSV")} className="gap-1 shadow-sm">
            <Download className="size-3.5" /> CSV / Excel
          </Button>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm flex flex-col justify-between">
          <h3 className="text-xs font-bold text-gray-400 uppercase">Coupon Conversion Rate</h3>
          <p className="text-3xl font-extrabold text-gray-800 mt-2">18.4%</p>
          <p className="text-[10px] text-gray-500 mt-1">First-time visitors using WELCOME10 coupon.</p>
        </div>
        <div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm flex flex-col justify-between">
          <h3 className="text-xs font-bold text-gray-400 uppercase">Average Order Value (AOV)</h3>
          <p className="text-3xl font-extrabold text-gray-800 mt-2">₹354</p>
          <p className="text-[10px] text-gray-500 mt-1">Cart checkouts containing multi-variant packs.</p>
        </div>
        <div className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm flex flex-col justify-between">
          <h3 className="text-xs font-bold text-gray-400 uppercase">Customer Retention Rate</h3>
          <p className="text-3xl font-extrabold text-gray-800 mt-2">42.8%</p>
          <p className="text-[10px] text-gray-500 mt-1">Snackers re-purchasing within 30 days.</p>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* MODULE 10: HOMEPAGE DESIGN SETTINGS                                 */
/* ================================================================== */

function HomepageTab({
  settings,
  onUpdate,
}: {
  settings: StoreSettings;
  onUpdate: (updated: Partial<StoreSettings>) => void;
}) {
  const [text, setText] = React.useState(settings.announcementText);
  const [enabled, setEnabled] = React.useState(settings.announcementEnabled);
  
  // Welcome Offer States
  const [welcomeTitle, setWelcomeTitle] = React.useState(settings.welcomeOfferTitle || "");
  const [welcomeDesc, setWelcomeDesc] = React.useState(settings.welcomeOfferDesc || "");
  const [welcomeCoupon, setWelcomeCoupon] = React.useState(settings.welcomeOfferCoupon || "");
  const [welcomeDiscount, setWelcomeDiscount] = React.useState(settings.welcomeOfferDiscount || "");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({
      announcementText: text,
      announcementEnabled: enabled,
      welcomeOfferTitle: welcomeTitle,
      welcomeOfferDesc: welcomeDesc,
      welcomeOfferCoupon: welcomeCoupon,
      welcomeOfferDiscount: welcomeDiscount,
    });
    toast.success("Storefront settings updated successfully");
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-xl font-bold text-gray-800">Homepage Design & Welcome Offer Settings</h2>
        <p className="text-xs text-gray-500 mt-1">Control active announcement bars, hero taglines, and newcomer registration gifts.</p>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-5 max-w-xl">
        <div className="flex flex-col gap-1.5 border-b border-gray-100 pb-4">
          <h3 className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-2">Announcement Bar</h3>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500">Announcement Banner Copy</label>
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="bg-white border-gray-200 text-xs"
            />
          </div>
          <div className="flex items-center gap-2.5 py-2">
            <input
              type="checkbox"
              id="barEnabled"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <label htmlFor="barEnabled" className="text-xs font-semibold text-gray-600">
              Display Announcement Bar on Storefront
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold text-orange-600 uppercase tracking-wider">Newcomer Welcome Offer Popup</h3>
          
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500">Coupon Code</label>
              <Input
                value={welcomeCoupon}
                onChange={(e) => setWelcomeCoupon(e.target.value)}
                className="bg-white border-gray-200 text-xs"
                placeholder="e.g. WELCOME10"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500">Discount Label</label>
              <Input
                value={welcomeDiscount}
                onChange={(e) => setWelcomeDiscount(e.target.value)}
                className="bg-white border-gray-200 text-xs"
                placeholder="e.g. 10% OFF"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500">Popup Title</label>
            <Input
              value={welcomeTitle}
              onChange={(e) => setWelcomeTitle(e.target.value)}
              className="bg-white border-gray-200 text-xs"
              placeholder="e.g. Get 10% OFF on your first order!"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500">Popup Description</label>
            <textarea
              rows={3}
              value={welcomeDesc}
              onChange={(e) => setWelcomeDesc(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white p-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600/20"
              placeholder="Explain the coupon benefit to newcomers..."
            />
          </div>
        </div>

        <Button type="submit" className="w-fit mt-2">
          Save Settings & Banners
        </Button>
      </form>
    </div>
  );
}

/* ================================================================== */
/* MODULE 11: SECURITY AUDIT LOGS                                      */
/* ================================================================== */

function AuditLogsTab() {
  const [logs, setLogs] = React.useState<any[]>([]);

  React.useEffect(() => {
    apiFetch("/admin/audit-logs")
      .then((res) => {
        if (res && res.data) {
          setLogs(res.data);
        } else if (Array.isArray(res)) {
          setLogs(res);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-xl font-bold text-gray-800">Security Audit Logs</h2>
        <p className="text-xs text-gray-500 mt-1">Track store manager edits, updates, inventory modifications, and access history.</p>
      </div>

      <div className="overflow-x-auto border border-gray-100 rounded-xl shadow-sm">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 font-bold text-xs uppercase tracking-wider">
              <th className="p-4">Timestamp</th>
              <th className="p-4">User Role</th>
              <th className="p-4">Operational Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {logs.map((l, i) => (
              <tr key={i} className="hover:bg-gray-50/50">
                <td className="p-4 font-medium text-gray-500 font-mono text-xs">
                  {new Date(l.timestamp || l.time).toLocaleString()}
                </td>
                <td className="p-4 font-bold text-purple-700 text-xs uppercase">{l.user || l.role}</td>
                <td className="p-4 text-xs text-gray-700 font-semibold">{l.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
