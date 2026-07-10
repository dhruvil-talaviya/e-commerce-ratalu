"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  CreditCard,
  Smartphone,
  Landmark,
  Lock,
  ShoppingBag,
  Check,
  ArrowLeft,
  Loader2,
  PartyPopper,
  Plus,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/components/cart/cart-provider";
import { useAccount } from "@/components/account/account-provider";
import { useOrders } from "@/components/shop/order-provider";
import { formatINR, cn } from "@/lib/utils";
import { SITE } from "@/lib/constants";

type PayMethod = "upi" | "card" | "netbanking";
const PAY_METHODS: { key: PayMethod; label: string; icon: React.ElementType; hint: string }[] = [
  { key: "upi", label: "UPI", icon: Smartphone, hint: "GPay, PhonePe, Paytm & more" },
  { key: "card", label: "Card", icon: CreditCard, hint: "Credit / Debit cards" },
  { key: "netbanking", label: "Net Banking", icon: Landmark, hint: "All major banks" },
];

export default function CheckoutPage() {
  const { items, totals, clear } = useCart();
  const { user, isLoggedIn, addAddress, setActiveAddress } = useAccount();
  const { placeOrder } = useOrders();
  const router = useRouter();

  const [method, setMethod] = React.useState<PayMethod>("upi");
  const [placing, setPlacing] = React.useState(false);
  const [orderId, setOrderId] = React.useState<string | null>(null);

  // Address Form State
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [tag, setTag] = React.useState<"Home" | "Work" | "Other">("Home");
  const [addressLine, setAddressLine] = React.useState("");
  const [city, setCity] = React.useState("");
  const [state, setState] = React.useState("");
  const [pincode, setPincode] = React.useState("");
  const [locLoading, setLocLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState("");

  // Gate check: redirect to home if logged out
  React.useEffect(() => {
    if (!isLoggedIn) {
      router.push("/");
    }
  }, [isLoggedIn, router]);

  if (!user) {
    return (
      <div className="container-px mx-auto flex max-w-lg flex-col items-center gap-6 py-32 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-purple-50 text-purple-300">
          <Loader2 className="size-8 animate-spin" />
        </span>
        <p className="text-charcoal-muted">Redirecting to login...</p>
      </div>
    );
  }

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!user?.activeAddressId) {
      setErrorMsg("Please select or add a delivery address to place your order.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const activeAddr = user.addresses.find((a) => a.id === user.activeAddressId);
    if (!activeAddr) {
      setErrorMsg("Selected address details are missing.");
      return;
    }

    setPlacing(true);
    await new Promise((r) => setTimeout(r, 1300));
    
    // Save to global order provider
    const newId = placeOrder(
      user.name,
      user.phone,
      items,
      totals,
      activeAddr,
      method
    );

    setOrderId(newId);
    clear();
    setPlacing(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleUseLocation = () => {
    setLocLoading(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => {
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

    setTag("Home");
    setAddressLine("");
    setCity("");
    setState("");
    setPincode("");
    setShowAddForm(false);
  };

  if (orderId) return <OrderConfirmation orderId={orderId} />;

  if (items.length === 0)
    return (
      <div className="container-px mx-auto flex max-w-lg flex-col items-center gap-6 py-32 text-center">
        <span className="grid size-20 place-items-center rounded-full bg-purple-50 text-purple-300">
          <ShoppingBag className="size-9" />
        </span>
        <div>
          <h1 className="font-serif text-3xl font-bold text-charcoal">Your cart is empty</h1>
          <p className="mt-2 text-charcoal-muted">Add a few packs before checking out.</p>
        </div>
        <Button asChild size="lg">
          <Link href="/shop">Browse flavours</Link>
        </Button>
      </div>
    );

  const selectedAddress = user.addresses.find((a) => a.id === user.activeAddressId);

  return (
    <div className="container-px mx-auto max-w-6xl py-12">
      <Link
        href="/shop"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-charcoal-muted transition-colors hover:text-purple-600"
      >
        <ArrowLeft className="size-4" /> Continue shopping
      </Link>

      <h1 className="font-serif text-4xl font-bold text-charcoal">Checkout</h1>

      {errorMsg && (
        <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-600">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handlePlaceOrder} className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* Left: details */}
        <div className="flex flex-col gap-8">
          {/* Contact & Delivery */}
          <Section step={1} title="Contact & Delivery Address">
            {/* Contact Preview */}
            <div className="grid gap-4 sm:grid-cols-2 rounded-2xl bg-cream-100/40 border border-cream-200 p-4 mb-6">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-soft">Customer Name</span>
                <span className="text-sm font-bold text-charcoal">{user.name}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-soft">Phone Number</span>
                <span className="text-sm font-bold text-charcoal">{user.phone}</span>
              </div>
            </div>

            {/* Address Selection */}
            <div className="flex flex-col gap-4">
              <span className="text-xs font-bold uppercase tracking-wider text-charcoal-soft">Select Delivery Address</span>
              
              <div className="grid gap-4 sm:grid-cols-2">
                {user.addresses.map((addr) => {
                  const active = user.activeAddressId === addr.id;
                  return (
                    <div
                      key={addr.id}
                      onClick={() => setActiveAddress(addr.id)}
                      className={cn(
                        "relative flex flex-col justify-between rounded-2xl border p-4 cursor-pointer text-left transition-all",
                        active
                          ? "border-purple-600 bg-purple-50/40 ring-1 ring-purple-500 shadow-sm"
                          : "border-[var(--color-border)] bg-white hover:border-purple-200"
                      )}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <Badge variant={addr.tag === "Home" ? "primary" : addr.tag === "Work" ? "gold" : "orange"} size="sm">
                            {addr.tag}
                          </Badge>
                        </div>
                        <p className="mt-3 text-xs font-semibold text-charcoal-muted leading-relaxed">
                          {addr.addressLine},
                          <br />
                          {addr.city}, {addr.state} {addr.pincode}
                        </p>
                      </div>

                      {active && (
                        <div className="mt-3 text-[9px] font-bold text-purple-700 uppercase tracking-wider border-t border-purple-100 pt-2">
                          ✓ Selected Delivery
                        </div>
                      )}
                    </div>
                  );
                })}

                {!showAddForm ? (
                  <button
                    type="button"
                    onClick={() => setShowAddForm(true)}
                    className="flex min-h-[120px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-purple-200 text-charcoal-muted transition-colors hover:border-purple-400 hover:text-purple-700"
                  >
                    <Plus className="size-5" />
                    <span className="text-xs font-bold">Add New Address</span>
                  </button>
                ) : (
                  <div className="rounded-2xl border border-dashed border-purple-300 bg-purple-50/10 p-4 flex flex-col gap-4 sm:col-span-2">
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-soft">Address Type</span>
                      <div className="flex gap-2">
                        {(["Home", "Work", "Other"] as const).map((t) => (
                          <button
                            type="button"
                            key={t}
                            onClick={() => setTag(t)}
                            className={cn(
                              "rounded-lg px-3 py-1 text-xs font-semibold border transition-all focus:outline-none",
                              tag === t
                                ? "bg-purple-500 border-purple-600 text-cream"
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
                          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-white px-3 py-1 text-xs font-semibold text-purple-700 transition-colors hover:bg-purple-50 focus:outline-none"
                        >
                          <Compass className={cn("size-3.5", locLoading && "animate-spin")} />
                          {locLoading ? "Locating..." : "Use Current Location"}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-charcoal-soft">Address details</label>
                      <textarea
                        required
                        rows={2}
                        placeholder="Flat / House no, building, street, area"
                        value={addressLine}
                        onChange={(e) => setAddressLine(e.target.value)}
                        className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-2 text-sm text-charcoal outline-none transition-all focus-visible:border-purple-400 focus-visible:ring-2 focus-visible:ring-purple-200"
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-charcoal-soft">City</label>
                        <Input required placeholder="Mumbai" value={city} onChange={(e) => setCity(e.target.value)} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-charcoal-soft">State</label>
                        <Input required placeholder="Maharashtra" value={state} onChange={(e) => setState(e.target.value)} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-charcoal-soft">PIN Code</label>
                        <Input required placeholder="400001" value={pincode} onChange={(e) => setPincode(e.target.value)} />
                      </div>
                    </div>

                    <div className="flex gap-2 mt-1">
                      <button
                        type="button"
                        onClick={handleSaveAddress}
                        className="rounded-lg bg-purple-500 hover:bg-purple-600 px-4 py-2 text-xs font-bold text-cream transition-colors"
                      >
                        Save Address
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddForm(false)}
                        className="rounded-lg hover:bg-cream-100 px-4 py-2 text-xs font-bold text-charcoal transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Section>

          {/* Payment */}
          <Section step={2} title="Payment method">
            <div className="grid gap-3 sm:grid-cols-3">
              {PAY_METHODS.map((m) => {
                const Icon = m.icon;
                const active = method === m.key;
                return (
                  <button
                    type="button"
                    key={m.key}
                    onClick={() => setMethod(m.key)}
                    className={cn(
                      "flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all focus:outline-none",
                      active
                        ? "border-purple-500 bg-purple-50 shadow-sm"
                        : "border-[var(--color-border)] bg-white hover:border-purple-200"
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-9 place-items-center rounded-xl",
                        active ? "bg-purple-500 text-cream" : "bg-cream-100 text-charcoal-muted"
                      )}
                    >
                      <Icon className="size-4.5" />
                    </span>
                    <span className="font-semibold text-charcoal">{m.label}</span>
                    <span className="text-xs text-charcoal-soft">{m.hint}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-cream-100 px-4 py-3 text-sm text-charcoal-muted">
              <Lock className="size-4 text-purple-600" />
              Payments are securely processed by Razorpay. Your details are encrypted end-to-end.
            </div>
          </Section>
        </div>

        {/* Right: summary */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-[var(--color-border)] bg-white/80 p-6 shadow-[var(--shadow-soft)] backdrop-blur-sm">
            <h2 className="font-serif text-xl font-semibold text-charcoal">Order summary</h2>
            <ul className="mt-4 flex flex-col gap-3">
              {items.map((item) => (
                <li key={item.key} className="flex items-center gap-3">
                  <span
                    className="grid size-12 shrink-0 place-items-center rounded-xl text-xs font-bold text-white"
                    style={{
                      background: `radial-gradient(120% 120% at 30% 20%, ${item.gradient.from}, ${item.gradient.to})`,
                    }}
                  >
                    {item.quantity}×
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-charcoal">{item.flavorName}</p>
                    <p className="text-xs text-charcoal-soft">{item.packLabel}</p>
                  </div>
                  <span className="text-sm font-semibold text-charcoal">
                    {formatINR(item.unitPrice * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="mt-5 flex flex-col gap-2 border-t border-[var(--color-border)] pt-5 text-sm">
              <Row label="Subtotal" value={formatINR(totals.subtotal)} />
              {totals.discount > 0 && (
                <Row label="Discount" value={`− ${formatINR(totals.discount)}`} accent />
              )}
              <Row label={`GST (${Math.round(SITE.gstRate * 100)}%)`} value={formatINR(totals.gst)} />
              <Row
                label="Shipping"
                value={totals.shipping === 0 ? "Free" : formatINR(totals.shipping)}
                accent={totals.shipping === 0}
              />
            </dl>

            {/* Delivery address details preview */}
            {selectedAddress && (
              <div className="mt-4 border-t border-[var(--color-border)] pt-4 text-xs text-charcoal-muted">
                <p className="font-semibold text-charcoal uppercase tracking-wider text-[9px] mb-1">Delivering to ({selectedAddress.tag})</p>
                <p className="truncate">{selectedAddress.addressLine}, {selectedAddress.city}</p>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between border-t border-[var(--color-border)] pt-3">
              <span className="font-serif text-lg font-semibold text-charcoal">Total</span>
              <span className="font-serif text-2xl font-bold text-purple-700">
                {formatINR(totals.total)}
              </span>
            </div>

            <Button type="submit" size="lg" disabled={placing} className="mt-6 w-full">
              {placing ? (
                <>
                  <Loader2 className="animate-spin" /> Processing…
                </>
              ) : (
                <>
                  <Lock /> Pay {formatINR(totals.total)}
                </>
              )}
            </Button>
            <p className="mt-3 text-center text-xs text-charcoal-soft">
              Estimated delivery in 2–6 business days
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}

function Section({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-[var(--color-border)] bg-white/70 p-6 shadow-[var(--shadow-soft)] backdrop-blur-sm sm:p-8">
      <div className="flex items-center gap-3">
        <span className="grid size-7 place-items-center rounded-lg bg-purple-500 font-serif text-sm font-bold text-cream">
          {step}
        </span>
        <h2 className="font-serif text-2xl font-semibold text-charcoal">{title}</h2>
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}



function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-charcoal-muted">{label}</dt>
      <dd className={cn("font-medium", accent ? "text-green-700" : "text-charcoal")}>{value}</dd>
    </div>
  );
}

function OrderConfirmation({ orderId }: { orderId: string }) {
  return (
    <div className="container-px mx-auto max-w-xl py-24 text-center">
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="mx-auto grid size-24 place-items-center rounded-full bg-gradient-to-br from-green-400 to-green-600 text-white shadow-[var(--shadow-lift)]"
      >
        <Check className="size-12" strokeWidth={3} />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Badge variant="soft" size="lg" className="mt-8">
          <PartyPopper className="size-4" /> Order confirmed
        </Badge>
        <h1 className="mt-5 font-serif text-4xl font-bold text-charcoal">Thank you!</h1>
        <p className="mt-3 text-lg text-charcoal-muted">
          Your order{" "}
          <span className="font-semibold text-purple-700">#{orderId}</span> is confirmed. A
          confirmation email is on its way, and your crunch will be kettle-cooked fresh and
          dispatched shortly.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/account">Track your order</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/shop">Keep shopping</Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
