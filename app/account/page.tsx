"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  User,
  Package,
  MapPin,
  Heart,
  Gift,
  Ticket,
  Plus,
  Trash2,
  Star,
  ArrowRight,
  LogOut,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/page-header";
import { HeatMeter } from "@/components/common/heat-meter";
import { WaferVisual } from "@/components/common/wafer-visual";
import { useWishlist } from "@/components/cart/wishlist-provider";
import { useCart } from "@/components/cart/cart-provider";
import { useAccount } from "@/components/account/account-provider";
import { useProducts } from "@/components/shop/product-provider";
import { useOrders } from "@/components/shop/order-provider";
import { getPack, DEFAULT_PACK_ID, PACK_SIZES } from "@/lib/data/products";
import { COUPONS } from "@/lib/data/coupons";
import { formatINR, cn } from "@/lib/utils";
import type { Flavor } from "@/lib/types";

type Tab = "profile" | "orders" | "addresses" | "wishlist" | "rewards" | "coupons";
const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "profile", label: "Profile", icon: User },
  { key: "orders", label: "Orders", icon: Package },
  { key: "addresses", label: "Addresses", icon: MapPin },
  { key: "wishlist", label: "Wishlist", icon: Heart },
  { key: "rewards", label: "Rewards", icon: Gift },
  { key: "coupons", label: "Coupons", icon: Ticket },
];

export default function AccountPage() {
  const [tab, setTab] = React.useState<Tab>("profile");
  const { user, isLoggedIn, logout } = useAccount();
  const { count } = useWishlist();

  if (!isLoggedIn) {
    return (
      <div className="container-px mx-auto flex max-w-lg flex-col items-center gap-6 py-32 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-purple-50 text-purple-300">
          <User className="size-8" />
        </span>
        <div>
          <h1 className="font-serif text-3xl font-bold text-charcoal">Sign in required</h1>
          <p className="mt-2 text-charcoal-muted">Please log in to manage your account details.</p>
        </div>
      </div>
    );
  }

  const firstName = (user?.name || "Snacker").split(" ")[0];

  return (
    <>
      <PageHeader
        eyebrow="My Account"
        title={
          <>
            Welcome back, <span className="text-gradient-warm">{firstName}</span>
          </>
        }
        description="Manage your orders, addresses, wishlist and rewards — all in one place."
        crumbs={[{ label: "Home", href: "/" }, { label: "Account" }]}
      />

      <div className="container-px mx-auto max-w-7xl py-10">
        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <nav className="flex gap-2 overflow-x-auto rounded-3xl border border-[var(--color-border)] bg-white/70 p-2 backdrop-blur-sm lg:flex-col">
              {TABS.map((t) => {
                const Icon = t.icon;
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={cn(
                      "flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all focus:outline-none",
                      active
                        ? "bg-purple-500 text-cream shadow-sm"
                        : "text-charcoal-muted hover:bg-purple-50 hover:text-purple-700"
                    )}
                  >
                    <Icon className="size-4.5" />
                    {t.label}
                    {t.key === "wishlist" && count > 0 && (
                      <span
                        className={cn(
                          "ml-auto grid min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold",
                          active ? "bg-cream text-purple-700" : "bg-orange-500 text-white"
                        )}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
              <div className="my-1 hidden h-px bg-[var(--color-border)] lg:block" />
              <button
                onClick={logout}
                className="flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-red-600 transition-all hover:bg-red-50 focus:outline-none"
              >
                <LogOut className="size-4.5" />
                Sign Out
              </button>
            </nav>
          </aside>

          {/* Content */}
          <div className="min-h-[420px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                {tab === "profile" && <ProfilePanel />}
                {tab === "orders" && <OrdersPanel />}
                {tab === "addresses" && <AddressesPanel />}
                {tab === "wishlist" && <WishlistPanel />}
                {tab === "rewards" && <RewardsPanel />}
                {tab === "coupons" && <CouponsPanel />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-[var(--color-border)] bg-white/70 p-6 shadow-[var(--shadow-soft)] backdrop-blur-sm sm:p-8">
      <h2 className="font-serif text-2xl font-semibold text-charcoal">{title}</h2>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function ProfilePanel() {
  const { user, updateProfile } = useAccount();
  const { flavors } = useProducts();
  const [name, setName] = React.useState(user?.name || "");
  const [phone, setPhone] = React.useState(user?.phone || "");
  const [saved, setSaved] = React.useState(false);

  const [prevUser, setPrevUser] = React.useState(user);
  if (user !== prevUser) {
    setPrevUser(user);
    setName(user?.name || "");
    setPhone(user?.phone || "");
  }

  const handleSave = () => {
    updateProfile({ name, phone });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col gap-8">
      <Panel title="Profile Details">
        <div className="grid gap-5 sm:grid-cols-2">
          <LabeledInput
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <LabeledInput
            label="Mobile Number"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="mt-6 flex items-center gap-3">
          <Button onClick={handleSave}>
            {saved ? "Saved successfully!" : "Save changes"}
          </Button>
        </div>
      </Panel>

      <Panel title="Recommended Flavours">
        <p className="mb-5 text-sm text-charcoal-muted">
          Add these signature Ratalu Wafers to your cart with one-click custom sizing:
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {flavors.slice(0, 2).map((f) => (
            <QuickAddCard key={f.id} flavor={f} />
          ))}
        </div>
      </Panel>
    </div>
  );
}

function QuickAddCard({ flavor }: { flavor: Flavor }) {
  const { addItem } = useCart();
  const [packId, setPackId] = React.useState(DEFAULT_PACK_ID);
  const [added, setAdded] = React.useState(false);
  const pack = getPack(packId)!;

  const handleAdd = () => {
    addItem(flavor, pack, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
      <div className="flex gap-3">
        <div
          className="size-16 shrink-0 rounded-xl p-1.5"
          style={{
            background: `radial-gradient(120% 120% at 30% 20%, ${flavor.gradient.from}22, transparent)`,
          }}
        >
          <WaferVisual flavor={flavor} />
        </div>
        <div className="flex-1">
          <h4 className="font-serif text-base font-bold text-charcoal">{flavor.name}</h4>
          <p className="text-xs text-charcoal-soft line-clamp-1 mt-0.5">{flavor.tagline}</p>
          <HeatMeter level={flavor.heat} className="mt-1" />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-cream-100 pt-3">
        <select
          value={packId}
          onChange={(e) => setPackId(e.target.value)}
          className="rounded-lg border border-purple-200 bg-cream-50 px-2 py-1 text-xs font-semibold text-purple-700 outline-none"
        >
          {PACK_SIZES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label} - {formatINR(p.price)}
            </option>
          ))}
        </select>

        <Button size="sm" onClick={handleAdd} variant={added ? "accent" : "primary"}>
          {added ? "Added!" : "Add to Cart"}
        </Button>
      </div>
    </div>
  );
}

function OrdersPanel() {
  const { user } = useAccount();
  const { getOrdersByUser } = useOrders();
  const orders = getOrdersByUser(user?.phone || "");

  if (orders.length === 0) {
    return (
      <Panel title="Your orders">
        <div className="flex flex-col items-center gap-5 py-10 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-purple-50 text-purple-300">
            <Package className="size-8" />
          </span>
          <div>
            <p className="font-serif text-xl font-semibold text-charcoal">No orders yet</p>
            <p className="mt-1 text-sm text-charcoal-muted">
              When you place an order, it&apos;ll appear here with live tracking.
            </p>
          </div>
          <Button asChild>
            <Link href="/shop">
              Start shopping <ArrowRight />
            </Link>
          </Button>
        </div>
      </Panel>
    );
  }

  const statusProgress = {
    Pending: 25,
    "Kettle Cooking": 50,
    Shipped: 75,
    Delivered: 100,
  };

  const statusColors = {
    Pending: "bg-charcoal-muted/10 text-charcoal-muted border-charcoal-muted/20",
    "Kettle Cooking": "bg-orange-500/10 text-orange-600 border-orange-500/20",
    Shipped: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    Delivered: "bg-green-500/10 text-green-600 border-green-500/20",
  };

  return (
    <Panel title={`Your orders (${orders.length})`}>
      <div className="flex flex-col gap-6">
        {orders.map((order) => (
          <div
            key={order.id}
            className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm"
          >
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cream-100 pb-4">
              <div>
                <span className="text-xs text-charcoal-soft font-semibold">
                  Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <h4 className="mt-0.5 font-serif text-lg font-bold text-charcoal">
                  Order ID: <span className="text-purple-700">#{order.id}</span>
                </h4>
              </div>
              <Badge
                variant="soft"
                className={cn("border font-semibold", statusColors[order.status])}
              >
                {order.status}
              </Badge>
            </div>

            {/* Items */}
            <ul className="mt-4 flex flex-col gap-2">
              {order.items.map((item) => (
                <li key={item.key} className="flex justify-between text-sm">
                  <span className="text-charcoal-soft">
                    {item.quantity}x {item.flavorName} ({item.packLabel})
                  </span>
                  <span className="font-semibold text-charcoal">
                    {formatINR(item.unitPrice * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            {/* Logistics Tracking Bar */}
            <div className="mt-6 rounded-xl bg-cream-50/50 border border-cream-100 p-4">
              <div className="mb-2 flex justify-between text-[11px] font-bold uppercase tracking-wider text-charcoal-soft">
                <span>Cooking status</span>
                <span>{order.status}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-cream-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-500"
                  style={{ width: `${statusProgress[order.status]}%` }}
                />
              </div>
              <p className="mt-3 text-[11px] text-charcoal-muted leading-relaxed">
                Delivering to: <span className="font-bold text-charcoal">{order.address.tag}</span> - {order.address.addressLine}, {order.address.city}
              </p>
            </div>

            {/* Summary */}
            <div className="mt-4 flex items-center justify-between border-t border-cream-100 pt-4">
              <span className="text-sm font-medium text-charcoal-soft">Payment via {order.method.toUpperCase()}</span>
              <span className="font-serif text-xl font-bold text-purple-700">
                Total Paid: {formatINR(order.totals.total)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function AddressesPanel() {
  const { user, addAddress, deleteAddress, setActiveAddress } = useAccount();
  const [showForm, setShowForm] = React.useState(false);
  
  // Form State
  const [tag, setTag] = React.useState<"Home" | "Work" | "Other">("Home");
  const [addressLine, setAddressLine] = React.useState("");
  const [city, setCity] = React.useState("");
  const [state, setState] = React.useState("");
  const [pincode, setPincode] = React.useState("");
  const [locLoading, setLocLoading] = React.useState(false);

  const handleUseLocation = () => {
    setLocLoading(true);
    
    // Check if Geolocation is available
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => {
          // Success: mock location translation using realistic Indian addresses
          const mockLocations = [
            {
              line: "Flat 402, Sea Breeze, Marine Drive",
              city: "Mumbai",
              state: "Maharashtra",
              pin: "400021",
            },
            {
              line: "Block G, Naman BKC Centre, Bandra East",
              city: "Mumbai",
              state: "Maharashtra",
              pin: "400051",
            },
            {
              line: "101 Green Heights, Off Linking Road",
              city: "Mumbai",
              state: "Maharashtra",
              pin: "400050",
            },
            {
              line: "B-204 Dev Aurum, Prahlad Nagar",
              city: "Ahmedabad",
              state: "Gujarat",
              pin: "380015",
            },
          ];
          const randomLoc = mockLocations[Math.floor(Math.random() * mockLocations.length)];
          setAddressLine(randomLoc.line);
          setCity(randomLoc.city);
          setState(randomLoc.state);
          setPincode(randomLoc.pin);
          setLocLoading(false);
        },
        () => {
          // Fallback if permission denied
          setAddressLine("Flat 12, Royal Palms Mansion, Park Street");
          setCity("Kolkata");
          setState("West Bengal");
          setPincode("700016");
          setLocLoading(false);
        }
      );
    } else {
      setLocLoading(false);
    }
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressLine || !city || !state || !pincode) return;

    addAddress({
      tag,
      addressLine,
      city,
      state,
      pincode,
    });

    // Reset Form
    setTag("Home");
    setAddressLine("");
    setCity("");
    setState("");
    setPincode("");
    setShowForm(false);
  };

  return (
    <Panel title="Saved Delivery Addresses">
      <p className="text-xs text-charcoal-soft -mt-4 mb-6">
        Select your active delivery address, delete address details, or add new home/work locations.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {user?.addresses.map((addr) => {
          const isActive = user.activeAddressId === addr.id;
          return (
            <div
              key={addr.id}
              onClick={() => setActiveAddress(addr.id)}
              className={cn(
                "relative flex flex-col justify-between rounded-2xl border p-5 cursor-pointer transition-all",
                isActive
                  ? "border-purple-600 bg-purple-50/40 ring-1 ring-purple-500 shadow-sm"
                  : "border-[var(--color-border)] bg-white/60 hover:border-purple-200 hover:bg-white"
              )}
            >
              <div>
                <div className="flex items-center justify-between">
                  <Badge variant={addr.tag === "Home" ? "primary" : addr.tag === "Work" ? "gold" : "orange"} size="sm">
                    {addr.tag}
                  </Badge>
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Avoid triggering setActiveAddress
                      deleteAddress(addr.id);
                    }}
                    className="text-charcoal-soft hover:text-red-500 transition-colors"
                    aria-label="Remove address"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <p className="mt-4 text-sm font-semibold text-charcoal">{user.name}</p>
                <p className="mt-1 text-xs text-charcoal-muted leading-relaxed">
                  {addr.addressLine},
                  <br />
                  {addr.city}, {addr.state} {addr.pincode}
                </p>
              </div>
              
              {isActive && (
                <div className="mt-4 flex items-center justify-between border-t border-purple-100 pt-3 text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                  <span>✓ Active Address</span>
                </div>
              )}
            </div>
          );
        })}

        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-purple-200 text-charcoal-muted transition-colors hover:border-purple-400 hover:text-purple-700"
          >
            <Plus className="size-6" />
            <span className="text-sm font-semibold">Add New Address</span>
          </button>
        ) : (
          <form
            onSubmit={handleSaveAddress}
            className="rounded-2xl border border-dashed border-purple-300 bg-purple-50/20 p-5 flex flex-col gap-4 sm:col-span-2"
          >
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-charcoal-soft">Address Type</span>
              <div className="flex gap-2">
                {(["Home", "Work", "Other"] as const).map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setTag(t)}
                    className={cn(
                      "rounded-lg px-3.5 py-1.5 text-xs font-semibold border transition-all",
                      tag === t
                        ? "bg-purple-500 border-purple-600 text-cream shadow-sm"
                        : "bg-white border-cream-200 text-charcoal-muted hover:border-purple-200"
                    )}
                  >
                    {t}
                  </button>
                ))}
                
                <button
                  type="button"
                  onClick={handleUseLocation}
                  disabled={locLoading}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-purple-700 transition-colors hover:bg-purple-50"
                >
                  <Compass className={cn("size-3.5", locLoading && "animate-spin")} />
                  {locLoading ? "Locating..." : "Use Current Location"}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-charcoal-soft">Address details</label>
              <textarea
                required
                rows={2}
                placeholder="Flat / House no, building, street, area"
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-2.5 text-sm text-charcoal outline-none transition-all placeholder:text-charcoal-soft focus-visible:border-purple-400 focus-visible:ring-2 focus-visible:ring-purple-200"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-charcoal-soft">City</label>
                <Input required placeholder="Mumbai" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-charcoal-soft">State</label>
                <Input required placeholder="Maharashtra" value={state} onChange={(e) => setState(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-charcoal-soft">PIN Code</label>
                <Input required placeholder="400001" value={pincode} onChange={(e) => setPincode(e.target.value)} />
              </div>
            </div>

            <div className="flex gap-2 mt-2">
              <Button type="submit" size="sm">Save Address</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        )}
      </div>
    </Panel>
  );
}

function WishlistPanel() {
  const { ids, toggle } = useWishlist();
  const { addItem } = useCart();
  const { getFlavor } = useProducts();
  const pack = getPack(DEFAULT_PACK_ID)!;
  const flavors = ids.map((id) => getFlavor(id)).filter(Boolean);

  if (flavors.length === 0)
    return (
      <Panel title="Your wishlist">
        <div className="flex flex-col items-center gap-5 py-10 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-purple-50 text-purple-300">
            <Heart className="size-8" />
          </span>
          <div>
            <p className="font-serif text-xl font-semibold text-charcoal">Nothing saved yet</p>
            <p className="mt-1 text-sm text-charcoal-muted">
              Tap the heart on any flavour to save it for later.
            </p>
          </div>
          <Button asChild>
            <Link href="/shop">Explore flavours</Link>
          </Button>
        </div>
      </Panel>
    );

  return (
    <Panel title={`Your wishlist (${flavors.length})`}>
      <div className="grid gap-4 sm:grid-cols-2">
        {flavors.map(
          (f) =>
            f && (
              <div
                key={f.id}
                className="flex gap-4 rounded-2xl border border-[var(--color-border)] bg-white p-4"
              >
                <div
                  className="size-20 shrink-0 rounded-xl p-2"
                  style={{
                    background: `radial-gradient(120% 120% at 30% 20%, ${f.gradient.from}22, transparent)`,
                  }}
                >
                  <WaferVisual flavor={f} />
                </div>
                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-serif text-lg font-semibold text-charcoal">{f.name}</p>
                      <HeatMeter level={f.heat} className="mt-1" />
                    </div>
                    <button
                      onClick={() => toggle(f.id)}
                      className="text-charcoal-soft hover:text-red-500"
                      aria-label="Remove from wishlist"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <span className="font-semibold text-purple-700">{formatINR(pack.price)}</span>
                    <Button size="sm" onClick={() => addItem(f, pack, 1)}>
                      <Plus /> Add
                    </Button>
                  </div>
                </div>
              </div>
            )
        )}
      </div>
    </Panel>
  );
}

function RewardsPanel() {
  const points = 240;
  const nextTier = 500;
  return (
    <div className="flex flex-col gap-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600 to-purple-800 p-8 text-cream shadow-[var(--shadow-lift)]">
        <div className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-gold-400/20 blur-3xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-sm text-cream/70">Crunch points</p>
            <p className="font-serif text-5xl font-bold text-gold-300">{points}</p>
          </div>
          <Star className="size-12 fill-gold-300 text-gold-300" />
        </div>
        <div className="relative mt-6">
          <div className="mb-2 flex justify-between text-xs text-cream/70">
            <span>{points} pts</span>
            <span>{nextTier} pts · Gold tier</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-400 to-gold-400"
              style={{ width: `${(points / nextTier) * 100}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-cream/80">
            Earn 1 point per ₹10 spent. You&apos;re {nextTier - points} points from a free 200g pack!
          </p>
        </div>
      </div>
      <Panel title="How rewards work">
        <ul className="grid gap-3 sm:grid-cols-3">
          {[
            { t: "Earn", d: "1 point for every ₹10 you spend." },
            { t: "Refer", d: "Give ₹100, get ₹100 for every friend." },
            { t: "Redeem", d: "500 points = a free 200g pack." },
          ].map((x) => (
            <li key={x.t} className="rounded-2xl bg-cream-100 p-4">
              <p className="font-serif text-lg font-semibold text-purple-700">{x.t}</p>
              <p className="mt-1 text-sm text-charcoal-muted">{x.d}</p>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function CouponsPanel() {
  return (
    <Panel title="Available coupons">
      <div className="grid gap-4 sm:grid-cols-2">
        {COUPONS.map((c) => (
          <div
            key={c.code}
            className="relative flex items-center gap-4 overflow-hidden rounded-2xl border border-dashed border-purple-300 bg-purple-50/50 p-5"
          >
            <span className="absolute -left-3 top-1/2 size-6 -translate-y-1/2 rounded-full bg-[var(--color-cream)]" />
            <span className="absolute -right-3 top-1/2 size-6 -translate-y-1/2 rounded-full bg-[var(--color-cream)]" />
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-purple-500 text-cream">
              <Ticket className="size-6" />
            </span>
            <div className="flex-1">
              <p className="font-serif text-lg font-bold text-purple-700">{c.code}</p>
              <p className="text-sm text-charcoal-muted">{c.description}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-5 text-sm text-charcoal-soft">
        Apply any code at checkout or in your cart to save instantly.
      </p>
    </Panel>
  );
}

function LabeledInput({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-charcoal">{label}</label>
      <Input {...props} />
    </div>
  );
}
