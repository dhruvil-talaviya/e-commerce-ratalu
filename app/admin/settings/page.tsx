"use client";

import * as React from "react";
import {
  Store,
  ShieldCheck,
  KeyRound,
  Copy,
  Check,
  Eye,
  EyeOff,
  Loader2,
  CreditCard,
  Receipt,
  Truck,
  Package,
  Settings,
  Sparkles,
  Zap,
  Globe,
  MapPin,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sliders,
  DollarSign,
  Plus,
  Trash2,
  Radio,
  CheckSquare,
  Building,
  Layers,
  ArrowRight
} from "lucide-react";
import { cn, formatINR } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api";
import { useAccount } from "@/components/account/account-provider";
import { AdminShell } from "@/components/admin/console/admin-shell";
import { MediaField } from "@/components/admin/ui/media-field";
import { Button, Card, Skeleton } from "@/components/admin/ui/primitives";

const INPUT =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#111827] focus:border-[#5B2C83] focus:outline-none focus:ring-2 focus:ring-[#5B2C83]/15 transition-colors";

function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold", className)}>
      {children}
    </span>
  );
}

type SettingsTab = "shipping" | "shiprocket" | "razorpay" | "checkout" | "brand" | "tax" | "security";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = React.useState<SettingsTab>("shipping");

  return (
    <AdminShell
      title="Settings & Integrations"
      description="Manage shipping rules, Razorpay payments, Shiprocket fulfillment, checkout rules, and store identity."
    >
      <div className="flex flex-col gap-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-2">
          {[
            { id: "shipping", label: "Shipping & Delivery", icon: Truck },
            { id: "shiprocket", label: "Shiprocket Logistics", icon: Package },
            { id: "razorpay", label: "Payments & Razorpay", icon: CreditCard },
            { id: "checkout", label: "Checkout & Order Flow", icon: Sliders },
            { id: "brand", label: "Brand Profile", icon: Store },
            { id: "tax", label: "GST & Tax", icon: Receipt },
            { id: "security", label: "Security", icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-colors",
                  active
                    ? "bg-[#5B2C83] text-white shadow-md shadow-[#5B2C83]/20"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                )}
              >
                <Icon className="size-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === "shipping" && <ShippingSettingsTab />}
        {activeTab === "shiprocket" && <ShiprocketCard />}
        {activeTab === "razorpay" && <RazorpayCard />}
        {activeTab === "checkout" && <CheckoutSettingsCard />}
        {activeTab === "brand" && <BrandCard />}
        {activeTab === "tax" && <TaxCard />}
        {activeTab === "security" && <SecurityCard />}
      </div>
    </AdminShell>
  );
}

/* ------------------------------------------------------------------ */
/* SHIPPING & DELIVERY SETTINGS TAB                                   */
/* ------------------------------------------------------------------ */

function ShippingSettingsTab() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [data, setData] = React.useState<any>(null);
  const [initialData, setInitialData] = React.useState<any>(null);

  // Live Preview & Simulator State
  const [testOrderAmount, setTestOrderAmount] = React.useState<number>(650);
  const [simPincode, setSimPincode] = React.useState<string>("400021");
  const [simWeight, setSimWeight] = React.useState<number>(0.5);
  const [simPrice, setSimPrice] = React.useState<number>(450);
  const [simCity, setSimCity] = React.useState<string>("Mumbai");
  const [simState, setSimState] = React.useState<string>("Maharashtra");
  const [simResult, setSimResult] = React.useState<any>(null);
  const [simulating, setSimulating] = React.useState<boolean>(false);

  const isDirty = React.useMemo(() => {
    if (!data || !initialData) return false;
    return JSON.stringify(data) !== JSON.stringify(initialData);
  }, [data, initialData]);

  const loadShipping = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<any>("/admin/settings/shipping");
      if (res) {
        setData(res);
        setInitialData(res);
      }
    } catch {
      toast.error("Failed to load shipping settings");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadShipping();
  }, [loadShipping]);

  const saveShipping = async () => {
    if (!data) return;
    setSaving(true);
    try {
      await apiFetch("/admin/settings/shipping", {
        method: "PUT",
        body: data
      });
      setInitialData(data);
      toast.success("Shipping rules saved successfully", {
        description: "Live storefront shipping calculations updated immediately."
      });
    } catch (err: any) {
      toast.error("Could not save shipping settings", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const runSimulation = async () => {
    setSimulating(true);
    try {
      const res = await apiFetch<any>("/shipping/calculate", {
        method: "POST",
        body: {
          subtotal: simPrice,
          weightKg: simWeight,
          pincode: simPincode,
          city: simCity,
          state: simState,
          method: "home_delivery"
        }
      });
      setSimResult(res);
    } catch (err: any) {
      toast.error("Simulation failed", { description: err.message });
    } finally {
      setSimulating(false);
    }
  };

  const addShippingRule = () => {
    if (!data) return;
    const rules = [...(data.shippingRules || [])];
    rules.push({
      minPrice: 0,
      maxPrice: 499,
      charge: 49,
      minWeight: 0,
      maxWeight: 5,
      states: [],
      pincodes: []
    });
    setData({ ...data, shippingRules: rules });
  };

  const removeShippingRule = (idx: number) => {
    if (!data) return;
    const rules = (data.shippingRules || []).filter((_: any, i: number) => i !== idx);
    setData({ ...data, shippingRules: rules });
  };

  if (loading || !data) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 1. SHIPPING METHODS TOGGLES */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-purple-50 text-[#5B2C83]">
              <Truck className="size-5" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-[#111827]">Delivery &amp; Fulfillment Methods</h2>
              <p className="text-xs text-[#6B7280]">Enable or disable supported fulfillment modes for customer orders.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <PayToggle
            title="Home Delivery"
            desc="Standard doorstep shipping to customer addresses."
            checked={data.homeDeliveryEnabled}
            onChange={(v) => setData({ ...data, homeDeliveryEnabled: v })}
          />
          <PayToggle
            title="Cash on Delivery (COD)"
            desc="Collect cash upon order delivery."
            checked={data.codEnabled}
            onChange={(v) => setData({ ...data, codEnabled: v })}
          />
          <PayToggle
            title="Express Delivery"
            desc="Air express priority dispatch (24–48 hours)."
            checked={data.expressDeliveryEnabled}
            onChange={(v) => setData({ ...data, expressDeliveryEnabled: v })}
          />
          <PayToggle
            title="Same Day Delivery"
            desc="Intra-city hyper-local dispatch within hours."
            checked={data.sameDayDeliveryEnabled}
            onChange={(v) => setData({ ...data, sameDayDeliveryEnabled: v })}
          />
          <PayToggle
            title="Store Pickup"
            desc="Customers pick up orders from primary warehouse."
            checked={data.storePickupEnabled}
            onChange={(v) => setData({ ...data, storePickupEnabled: v })}
          />
          <PayToggle
            title="International Shipping"
            desc="Worldwide export shipping (Custom rates apply)."
            checked={data.internationalShippingEnabled}
            onChange={(v) => setData({ ...data, internationalShippingEnabled: v })}
          />
        </div>

        <div className="mt-5 grid gap-4 rounded-xl border border-gray-100 bg-gray-50/60 p-4 sm:grid-cols-3">
          <Labeled label="Standard Flat Rate (₹)">
            <input
              type="number"
              value={data.shippingFlatRate}
              onChange={(e) => setData({ ...data, shippingFlatRate: Number(e.target.value) })}
              className={INPUT}
            />
          </Labeled>
          <Labeled label="Express Flat Rate (₹)">
            <input
              type="number"
              value={data.expressFlatRate}
              onChange={(e) => setData({ ...data, expressFlatRate: Number(e.target.value) })}
              className={INPUT}
            />
          </Labeled>
          <Labeled label="Same Day Flat Rate (₹)">
            <input
              type="number"
              value={data.sameDayFlatRate}
              onChange={(e) => setData({ ...data, sameDayFlatRate: Number(e.target.value) })}
              className={INPUT}
            />
          </Labeled>
        </div>
      </Card>

      {/* 2. FREE SHIPPING RULES & LIVE PREVIEW */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-600">
              <Sparkles className="size-5" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-[#111827]">Free Shipping Rules &amp; Triggers</h2>
              <p className="text-xs text-[#6B7280]">Configure minimum cart threshold and eligibility scope.</p>
            </div>
          </div>
          <PayToggle
            title="Enable Free Shipping"
            desc=""
            checked={data.freeShippingEnabled}
            onChange={(v) => setData({ ...data, freeShippingEnabled: v })}
          />
        </div>

        {data.freeShippingEnabled && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4">
              <Labeled label="Minimum Order Amount for Free Shipping (₹)">
                <input
                  type="number"
                  value={data.freeShippingMinAmount}
                  onChange={(e) => setData({ ...data, freeShippingMinAmount: Number(e.target.value) })}
                  className={INPUT}
                />
              </Labeled>

              <Labeled label="Free Shipping Target Scope">
                <select
                  value={data.freeShippingScope}
                  onChange={(e) => setData({ ...data, freeShippingScope: e.target.value })}
                  className={INPUT}
                >
                  <option value="all_india">Entire India (All Pincodes)</option>
                  <option value="selected_states">Selected States Only</option>
                  <option value="selected_cities">Selected Cities Only</option>
                  <option value="selected_pincodes">Specific PIN Codes Only</option>
                  <option value="specific_categories">Specific Product Categories</option>
                  <option value="vip_customers">VIP Customers Only</option>
                </select>
              </Labeled>

              {data.freeShippingScope === "selected_states" && (
                <Labeled label="Target States (Comma separated)">
                  <input
                    type="text"
                    value={(data.freeShippingStates || []).join(", ")}
                    onChange={(e) => setData({ ...data, freeShippingStates: e.target.value.split(",").map(s => s.trim()) })}
                    placeholder="e.g. Maharashtra, Gujarat, Delhi"
                    className={INPUT}
                  />
                </Labeled>
              )}
            </div>

            {/* LIVE PREVIEW WIDGET */}
            <div className="flex flex-col justify-between rounded-xl border border-purple-100 bg-purple-50/50 p-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-[#5B2C83] text-white">Live Interactive Rule Preview</Badge>
                </div>
                <p className="text-xs text-gray-600 mb-4">
                  Adjust order value to preview customer checkout calculation.
                </p>

                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-700">Simulated Order Amount:</span>
                  <span className="font-mono text-sm font-extrabold text-[#5B2C83]">₹{testOrderAmount}</span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={1200}
                  step={50}
                  value={testOrderAmount}
                  onChange={(e) => setTestOrderAmount(Number(e.target.value))}
                  className="w-full accent-[#5B2C83]"
                />

                <div className="mt-4 rounded-lg border border-purple-200 bg-white p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Cart Subtotal:</span>
                    <span className="font-bold">₹{testOrderAmount}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs border-t pt-2">
                    <span className="text-gray-500">Applied Shipping Fee:</span>
                    {testOrderAmount >= (data.freeShippingMinAmount || 599) ? (
                      <span className="font-extrabold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="size-3.5" /> FREE DELIVERY
                      </span>
                    ) : (
                      <span className="font-bold text-[#111827]">₹{data.shippingFlatRate || 49}</span>
                    )}
                  </div>
                  {testOrderAmount < (data.freeShippingMinAmount || 599) && (
                    <p className="text-[11px] text-amber-700 font-medium">
                      Add ₹{(data.freeShippingMinAmount || 599) - testOrderAmount} more to unlock FREE delivery!
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* 3. TIERED SHIPPING CHARGES RULES */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-[#111827]">Tiered &amp; Rule-Based Shipping Charges</h2>
            <p className="text-xs text-[#6B7280]">
              Create custom fee tiers based on price ranges, weight limits, and destination states.
            </p>
          </div>
          <Button onClick={addShippingRule} size="sm" variant="secondary" className="border-purple-200 text-[#5B2C83] font-bold">
            <Plus className="size-4" /> Add Shipping Tier
          </Button>
        </div>

        {(!data.shippingRules || data.shippingRules.length === 0) ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center">
            <p className="text-xs text-gray-500">No custom tiered rules configured. Standard flat rate (₹{data.shippingFlatRate}) applies.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.shippingRules.map((rule: any, idx: number) => (
              <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/50 p-3.5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1 w-full">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-gray-500 ">Min Price (₹)</span>
                    <input
                      type="number"
                      value={rule.minPrice}
                      onChange={(e) => {
                        const copy = [...data.shippingRules];
                        copy[idx].minPrice = Number(e.target.value);
                        setData({ ...data, shippingRules: copy });
                      }}
                      className={INPUT}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-gray-500 ">Max Price (₹)</span>
                    <input
                      type="number"
                      value={rule.maxPrice}
                      onChange={(e) => {
                        const copy = [...data.shippingRules];
                        copy[idx].maxPrice = Number(e.target.value);
                        setData({ ...data, shippingRules: copy });
                      }}
                      className={INPUT}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-gray-500 ">Shipping Charge (₹)</span>
                    <input
                      type="number"
                      value={rule.charge}
                      onChange={(e) => {
                        const copy = [...data.shippingRules];
                        copy[idx].charge = Number(e.target.value);
                        setData({ ...data, shippingRules: copy });
                      }}
                      className={INPUT}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-gray-500 ">Max Weight (KG)</span>
                    <input
                      type="number"
                      step="0.1"
                      value={rule.maxWeight || 5}
                      onChange={(e) => {
                        const copy = [...data.shippingRules];
                        copy[idx].maxWeight = Number(e.target.value);
                        setData({ ...data, shippingRules: copy });
                      }}
                      className={INPUT}
                    />
                  </label>
                </div>
                <Button onClick={() => removeShippingRule(idx)} size="sm" variant="ghost" className="text-red-600 hover:bg-red-50 self-end sm:self-center">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 4. LIVE SHIPPING SIMULATOR */}
      <Card className="p-6 border-purple-200 bg-gradient-to-br from-white to-purple-50/30">
        <div className="mb-4 flex items-center gap-3 border-b border-purple-100 pb-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[#5B2C83] text-white">
            <Zap className="size-5" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-[#111827]">Live Shipping Rate &amp; Courier Simulator</h2>
            <p className="text-xs text-[#6B7280]">Test how active rules calculate shipping cost for any test destination.</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-5">
          <Labeled label="Pincode">
            <input value={simPincode} onChange={(e) => setSimPincode(e.target.value)} className={INPUT} />
          </Labeled>
          <Labeled label="Weight (KG)">
            <input type="number" step="0.1" value={simWeight} onChange={(e) => setSimWeight(Number(e.target.value))} className={INPUT} />
          </Labeled>
          <Labeled label="Order Value (₹)">
            <input type="number" value={simPrice} onChange={(e) => setSimPrice(Number(e.target.value))} className={INPUT} />
          </Labeled>
          <Labeled label="City">
            <input value={simCity} onChange={(e) => setSimCity(e.target.value)} className={INPUT} />
          </Labeled>
          <div className="flex items-end">
            <Button onClick={runSimulation} disabled={simulating} className="w-full bg-[#5B2C83] text-white font-bold">
              {simulating ? "Calculating..." : "Run Simulator"}
            </Button>
          </div>
        </div>

        {simResult && (
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-purple-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-3">
              <div>
                <p className="text-xs font-bold text-gray-500 ">Calculation Result</p>
                <p className="text-lg font-extrabold text-[#111827]">{simResult.method}</p>
                <p className="text-xs text-gray-600">
                  Estimated ETD: <span className="font-semibold text-purple-900">{simResult.estimatedDays}</span> ({simResult.courierName})
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-400 block font-medium">Final Shipping Charge</span>
                {simResult.isFree ? (
                  <Badge className="bg-emerald-600 text-white text-sm px-3 py-1 font-bold">FREE SHIPPING</Badge>
                ) : (
                  <span className="font-mono text-xl font-extrabold text-[#5B2C83]">₹{simResult.shippingCharge}</span>
                )}
              </div>
            </div>

            {Array.isArray(simResult.couriers) && simResult.couriers.length > 0 && (
              <div className="mt-1">
                <p className="text-[11px] font-bold text-purple-900 mb-2">
                  Live Serviceable Couriers (Shiprocket Real-Time API)
                </p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {simResult.couriers.map((c: any, idx: number) => (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-center justify-between rounded-lg border p-2.5 text-xs transition-all",
                        c.isRecommended ? "border-purple-300 bg-purple-50/60 shadow-xs" : "border-gray-200 bg-white"
                      )}
                    >
                      <div>
                        <div className="flex items-center gap-1 font-bold text-gray-900">
                          <span>{c.courierName}</span>
                          {c.isRecommended && (
                            <span className="rounded bg-amber-400 px-1 py-0.2 text-[9px] font-extrabold text-purple-950">
                              Best
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-500">ETD: {c.estimatedDeliveryDays || "3-5"} Days</span>
                      </div>
                      <span className="font-mono font-extrabold text-purple-900">₹{c.rate}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* SAVE BUTTON */}
      <div className="flex justify-end border-t border-gray-100 pt-4">
        <Button variant="primary" onClick={saveShipping} disabled={saving || !isDirty}>
          {saving ? "Saving All Shipping Rules…" : "Save Shipping Configuration"}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SHIPROCKET LOGISTICS INTEGRATION CARD                              */
/* ------------------------------------------------------------------ */

function ShiprocketCard() {
  const [loading, setLoading] = React.useState(true);
  const [testing, setTesting] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [status, setStatus] = React.useState("unconfigured");
  const [lastTested, setLastTested] = React.useState<string | null>(null);
  const [lastSync, setLastSync] = React.useState<string | null>(null);

  const [shiprocketData, setShiprocketData] = React.useState<any>({});

  const [defaults, setDefaults] = React.useState({
    weight: 0.5,
    length: 15,
    breadth: 15,
    height: 10,
    insuranceToggle: false,
    codToggle: true,
    autoAssignCourier: true,
    autoGenerateAWB: true,
    autoCreateShipment: true,
    autoSchedulePickup: true,
    autoGenerateLabel: true,
    autoGenerateInvoice: true,
    autoNotifyCustomer: true,
    defaultCourier: "Auto Select (Shiprocket Recommended)",
    defaultPickupLocation: "Primary Warehouse"
  });

  const [initialSnapshot, setInitialSnapshot] = React.useState<string>("");

  React.useEffect(() => {
    apiFetch<Record<string, any>>("/admin/settings/shipping")
      .then((res) => {
        let emailVal = "";
        let srData = {};
        let defs = defaults;
        if (res.shiprocket) {
          emailVal = res.shiprocket.apiEmail || "";
          setStatus(res.shiprocket.connectionStatus || "unconfigured");
          setLastTested(res.shiprocket.lastTestedAt || null);
          setLastSync(res.shiprocket.lastSyncAt || null);
          srData = res.shiprocket;
          setEmail(emailVal);
          setShiprocketData(srData);
        }
        if (res.defaults) {
          defs = { ...defaults, ...res.defaults };
          setDefaults(defs);
        }
        setInitialSnapshot(JSON.stringify({ email: emailVal, password: "", srData, defs }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isDirty = React.useMemo(() => {
    if (!initialSnapshot) return false;
    const current = JSON.stringify({ email, password, srData: shiprocketData, defs: defaults });
    return current !== initialSnapshot;
  }, [email, password, shiprocketData, defaults, initialSnapshot]);

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const res = await apiFetch<any>("/admin/settings/test-shiprocket", {
        method: "POST",
        body: { email, password: password || undefined }
      });
      setStatus("connected");
      setLastTested(res.lastTestedAt);
      toast.success("Shiprocket Connection Active!", {
        description: "API credentials verified and token refreshed."
      });
      setPassword("");
    } catch (err: any) {
      setStatus("authentication_error");
      toast.error("Test Connection Failed", { description: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSyncPickups = async () => {
    setSyncing(true);
    try {
      const res = await apiFetch<any>("/admin/settings/sync-pickups", { method: "POST" });
      toast.success("Pickup Locations Synchronized", {
        description: `Synced ${res.length || 0} warehouse locations from Shiprocket.`
      });
      setLastSync(new Date().toISOString());
    } catch (err: any) {
      toast.error("Sync Failed", { description: err.message });
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveShiprocket = async () => {
    setSaving(true);
    try {
      await apiFetch("/admin/settings/shipping", {
        method: "PUT",
        body: {
          shiprocket: {
            enabled: true,
            apiEmail: email,
            password: password || undefined,
            warehouseName: shiprocketData.warehouseName,
            warehousePhone: shiprocketData.warehousePhone,
            gstNumber: shiprocketData.gstNumber,
            companyName: shiprocketData.companyName,
            pickupAddress: shiprocketData.pickupAddress
          },
          defaults
        }
      });
      setInitialSnapshot(JSON.stringify({ email, password: "", srData: shiprocketData, defs: defaults }));
      toast.success("Shiprocket Logistics Settings Saved");
    } catch (err: any) {
      toast.error("Could not save settings", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
            <Package className="size-5" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-[#111827]">Shiprocket Enterprise Logistics Integration</h2>
            <p className="text-xs text-[#6B7280]">Official Shiprocket REST API credentials, warehouse settings &amp; auto-fulfillment.</p>
          </div>
        </div>

        {/* STATUS BADGE */}
        <span
          className={cn(
            "px-3 py-1 text-xs font-bold rounded-full border flex items-center gap-1.5",
            status === "connected"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : status === "authentication_error"
              ? "bg-amber-50 text-amber-700 border-amber-200"
              : "bg-rose-50 text-rose-700 border-rose-200"
          )}
        >
          <span className={cn("size-2 rounded-full", status === "connected" ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
          {status}
        </span>
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="flex flex-col gap-6">
          {/* Credentials Card */}
          <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
            <p className="text-xs font-bold text-gray-700 mb-3">API Authentication Credentials (AES-256 Encrypted)</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Labeled label="Shiprocket API Email">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter API Email"
                  className={INPUT}
                />
              </Labeled>

              <Labeled label="Shiprocket API Password">
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={shiprocketData.passwordMasked || "Enter Shiprocket Password"}
                    className={cn(INPUT, "pr-10")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </Labeled>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200/60 pt-3">
              <span className="text-xs text-gray-400">
                {lastTested ? `Last Verified: ${new Date(lastTested).toLocaleString("en-IN")}` : "Credentials encrypted in DB."}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={handleSyncPickups} disabled={syncing}>
                  {syncing ? "Syncing..." : "Sync Pickups"}
                </Button>
                <Button variant="primary" size="sm" onClick={handleTestConnection} disabled={testing}>
                  {testing ? "Testing..." : "Test Connection"}
                </Button>
              </div>
            </div>
          </div>

          {/* Warehouse & Package Defaults */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-bold text-gray-700 mb-3">Warehouse &amp; Package Specifications</p>
            <div className="grid gap-3 sm:grid-cols-4 mb-4">
              <Labeled label="Warehouse Name">
                <input
                  value={shiprocketData.warehouseName || ""}
                  onChange={(e) => setShiprocketData({ ...shiprocketData, warehouseName: e.target.value })}
                  className={INPUT}
                />
              </Labeled>
              <Labeled label="Warehouse Phone">
                <input
                  value={shiprocketData.warehousePhone || ""}
                  onChange={(e) => setShiprocketData({ ...shiprocketData, warehousePhone: e.target.value })}
                  className={INPUT}
                />
              </Labeled>
              <Labeled label="GSTIN Number">
                <input
                  value={shiprocketData.gstNumber || ""}
                  onChange={(e) => setShiprocketData({ ...shiprocketData, gstNumber: e.target.value })}
                  className={INPUT}
                />
              </Labeled>
              <Labeled label="Company Name">
                <input
                  value={shiprocketData.companyName || ""}
                  onChange={(e) => setShiprocketData({ ...shiprocketData, companyName: e.target.value })}
                  className={INPUT}
                />
              </Labeled>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <Labeled label="Default Weight (KG)">
                <input
                  type="number"
                  step="0.1"
                  value={defaults.weight}
                  onChange={(e) => setDefaults({ ...defaults, weight: Number(e.target.value) })}
                  className={INPUT}
                />
              </Labeled>
              <Labeled label="Length (CM)">
                <input
                  type="number"
                  value={defaults.length}
                  onChange={(e) => setDefaults({ ...defaults, length: Number(e.target.value) })}
                  className={INPUT}
                />
              </Labeled>
              <Labeled label="Width (CM)">
                <input
                  type="number"
                  value={defaults.breadth}
                  onChange={(e) => setDefaults({ ...defaults, breadth: Number(e.target.value) })}
                  className={INPUT}
                />
              </Labeled>
              <Labeled label="Height (CM)">
                <input
                  type="number"
                  value={defaults.height}
                  onChange={(e) => setDefaults({ ...defaults, height: Number(e.target.value) })}
                  className={INPUT}
                />
              </Labeled>
            </div>
          </div>

          {/* Automation Switches */}
          <div className="grid gap-3 sm:grid-cols-3">
            <PayToggle
              title="Auto Assign Courier"
              desc="Auto-select best courier on paid orders."
              checked={defaults.autoAssignCourier}
              onChange={(v) => setDefaults({ ...defaults, autoAssignCourier: v })}
            />
            <PayToggle
              title="Auto Generate AWB"
              desc="Automatically generate AWB post-payment."
              checked={defaults.autoGenerateAWB}
              onChange={(v) => setDefaults({ ...defaults, autoGenerateAWB: v })}
            />
            <PayToggle
              title="Auto Schedule Pickup"
              desc="Schedule pickup request with courier."
              checked={defaults.autoSchedulePickup}
              onChange={(v) => setDefaults({ ...defaults, autoSchedulePickup: v })}
            />
            <PayToggle
              title="Auto Generate Label"
              desc="Fetch shipping label PDF automatically."
              checked={defaults.autoGenerateLabel}
              onChange={(v) => setDefaults({ ...defaults, autoGenerateLabel: v })}
            />
            <PayToggle
              title="Auto Generate Invoice"
              desc="Generate tax invoice upon shipment creation."
              checked={defaults.autoGenerateInvoice}
              onChange={(v) => setDefaults({ ...defaults, autoGenerateInvoice: v })}
            />
            <PayToggle
              title="Auto Notify Customer"
              desc="Dispatch WhatsApp/SMS tracking link to customer."
              checked={defaults.autoNotifyCustomer}
              onChange={(v) => setDefaults({ ...defaults, autoNotifyCustomer: v })}
            />
          </div>
        </div>
      )}

      <div className="mt-5 flex justify-end border-t border-gray-100 pt-4">
        <Button variant="primary" onClick={handleSaveShiprocket} disabled={saving || loading || !isDirty}>
          {saving ? "Saving Shiprocket Settings…" : "Save Shiprocket Configuration"}
        </Button>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* RAZORPAY PAYMENT INTEGRATION CARD                                  */
/* ------------------------------------------------------------------ */

function RazorpayCard() {
  const [loading, setLoading] = React.useState(true);
  const [testing, setTesting] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [form, setForm] = React.useState<any>({});
  const [keySecret, setKeySecret] = React.useState("");
  const [webhookSecret, setWebhookSecret] = React.useState("");
  const [showSecret, setShowSecret] = React.useState(false);
  const [initialSnapshot, setInitialSnapshot] = React.useState<string>("");

  React.useEffect(() => {
    apiFetch<any>("/admin/settings/payment")
      .then((res) => {
        if (res) {
          const loadedForm = {
            ...res,
            razorpayEnabled: res.razorpayEnabled ?? true,
            razorpayTestMode: res.razorpayTestMode ?? res.testMode ?? false,
            razorpayAutoCapture: res.razorpayAutoCapture ?? res.autoCapture ?? true,
            razorpayEnableUPI: res.razorpayEnableUPI ?? res.enableUPI ?? true,
            razorpayEnableCards: res.razorpayEnableCards ?? res.enableCards ?? true,
            razorpayEnableNetBanking: res.razorpayEnableNetBanking ?? res.enableNetBanking ?? true,
          };
          setForm(loadedForm);
          setInitialSnapshot(JSON.stringify({ form: loadedForm, keySecret: "", webhookSecret: "" }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isDirty = React.useMemo(() => {
    if (!initialSnapshot) return false;
    const current = JSON.stringify({ form, keySecret, webhookSecret });
    return current !== initialSnapshot;
  }, [form, keySecret, webhookSecret, initialSnapshot]);

  const handleTestRazorpay = async () => {
    setTesting(true);
    try {
      await apiFetch("/admin/settings/test-razorpay", {
        method: "POST",
        body: {
          keyId: form.keyId,
          keySecret: keySecret || undefined
        }
      });
      toast.success("Razorpay Credentials Active!", {
        description: "API key and secret verified with Razorpay REST API."
      });
      setKeySecret("");
    } catch (err: any) {
      toast.error("Razorpay Verification Failed", { description: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleGenerateWebhook = async () => {
    setGenerating(true);
    try {
      const res = await apiFetch<any>("/admin/settings/generate-webhook", { method: "POST" });
      setForm((f: any) => ({
        ...f,
        webhookUrl: res.webhookUrl,
        webhookSecretMasked: `whsec_••••••••`
      }));
      toast.success("Webhook URL Generated!", {
        description: "Configure this webhook URL in your Razorpay Dashboard."
      });
    } catch (err: any) {
      toast.error("Webhook Generation Failed", { description: err.message });
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveRazorpay = async () => {
    setSaving(true);
    try {
      await apiFetch("/admin/settings/payment", {
        method: "PUT",
        body: {
          ...form,
          keySecret: keySecret || undefined,
          webhookSecret: webhookSecret || undefined
        }
      });
      setInitialSnapshot(JSON.stringify({ form, keySecret: "", webhookSecret: "" }));
      setKeySecret("");
      setWebhookSecret("");
      toast.success("Razorpay Configuration Saved");
    } catch (err: any) {
      toast.error("Could not save Razorpay settings", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-purple-50 text-[#5B2C83]">
            <CreditCard className="size-5" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-[#111827]">Razorpay Payment Gateway &amp; Webhooks</h2>
            <p className="text-xs text-[#6B7280]">Live and Sandbox Razorpay credentials, Webhook HMAC secrets, and supported payment options.</p>
          </div>
        </div>

        <span className={cn("px-3 py-1 text-xs font-bold rounded-full border", form.connectionStatus === "connected" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-600 border-gray-200")}>
          {form.connectionStatus || "unconfigured"}
        </span>
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="flex flex-col gap-6">
          {/* RAZORPAY ENVIRONMENT MODE SWITCHER */}
          <div
            className={cn(
              "rounded-2xl border p-4.5 transition-all shadow-xs",
              form.razorpayTestMode
                ? "border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50/40 to-amber-50"
                : "border-emerald-300 bg-gradient-to-r from-emerald-50 via-teal-50/40 to-emerald-50"
            )}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3">
                <span
                  className={cn(
                    "grid size-11 shrink-0 place-items-center rounded-2xl text-lg font-bold shadow-xs",
                    form.razorpayTestMode ? "bg-amber-500 text-white" : "bg-emerald-600 text-white"
                  )}
                >
                  {form.razorpayTestMode ? "🧪" : "⚡"}
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-extrabold text-[#111827]">
                      {form.razorpayTestMode ? "Razorpay Test / Sandbox Mode Active" : "Razorpay Live Production Mode Active"}
                    </h3>
                    <Badge
                      className={cn(
                        form.razorpayTestMode
                          ? "bg-amber-600 text-white"
                          : "bg-emerald-600 text-white"
                      )}
                    >
                      {form.razorpayTestMode ? "TEST MODE" : "LIVE MODE"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-600 font-medium leading-relaxed">
                    {form.razorpayTestMode
                      ? "Test key ID (rzp_test_...) is enabled. Real customer accounts will NOT be charged. All test orders are simulated."
                      : "Live key ID (rzp_live_...) is active. Real payments will be processed via Razorpay gateway."}
                  </p>
                </div>
              </div>

              {/* TOGGLE BUTTONS */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, razorpayTestMode: true, testMode: true })}
                  className={cn(
                    "px-3.5 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 shadow-xs",
                    form.razorpayTestMode
                      ? "border-amber-500 bg-amber-500 text-white ring-2 ring-amber-300"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  )}
                >
                  🧪 Enable Test Mode
                </button>

                <button
                  type="button"
                  onClick={() => setForm({ ...form, razorpayTestMode: false, testMode: false })}
                  className={cn(
                    "px-3.5 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 shadow-xs",
                    !form.razorpayTestMode
                      ? "border-emerald-600 bg-emerald-600 text-white ring-2 ring-emerald-300"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  )}
                >
                  ⚡ Enable Live Mode
                </button>
              </div>
            </div>
          </div>

          {/* Credentials */}
          <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
            <p className="text-xs font-bold text-gray-700 mb-3">Razorpay API Keys &amp; Secrets (AES-256 Encrypted)</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Labeled label="Razorpay Key ID">
                <input
                  value={form.keyId || ""}
                  onChange={(e) => setForm({ ...form, keyId: e.target.value })}
                  placeholder="rzp_test_..."
                  className={cn(INPUT, "font-mono")}
                />
              </Labeled>

              <Labeled label="Razorpay Key Secret">
                <div className="relative">
                  <input
                    type={showSecret ? "text" : "password"}
                    value={keySecret}
                    onChange={(e) => setKeySecret(e.target.value)}
                    placeholder={form.keySecretMasked || "Enter Key Secret"}
                    className={cn(INPUT, "font-mono pr-10")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  >
                    {showSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </Labeled>
            </div>

            {/* Webhook Secret & URL */}
            <div className="mt-4 grid gap-4 sm:grid-cols-2 border-t border-gray-200/60 pt-3">
              <Labeled label="Webhook URL (Auto-Generated)">
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={form.webhookUrl || ""}
                    className={cn(INPUT, "font-mono text-xs bg-gray-100 text-gray-600")}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      navigator.clipboard.writeText(form.webhookUrl || "");
                      toast.success("Webhook URL copied");
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </Labeled>

              <Labeled label="Webhook HMAC Secret">
                <input
                  type="password"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder={form.webhookSecretMasked || "whsec_..."}
                  className={cn(INPUT, "font-mono")}
                />
              </Labeled>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={handleGenerateWebhook} disabled={generating}>
                {generating ? "Generating..." : "Generate Webhook Secret"}
              </Button>
              <Button size="sm" variant="primary" onClick={handleTestRazorpay} disabled={testing}>
                {testing ? "Testing..." : "Test Connection"}
              </Button>
            </div>
          </div>

          {/* Payment Method Switches */}
          <div className="grid gap-3 sm:grid-cols-3">
            <PayToggle
              title="Enable Razorpay Gateway"
              desc="Allow online payments on storefront."
              checked={form.razorpayEnabled}
              onChange={(v) => setForm({ ...form, razorpayEnabled: v })}
            />
            <PayToggle
              title="Test / Sandbox Mode"
              desc="Use test keys without real money charges."
              checked={form.razorpayTestMode}
              onChange={(v) => setForm({ ...form, razorpayTestMode: v })}
            />
            <PayToggle
              title="Auto-Capture Payments"
              desc="Instantly capture authorized transactions."
              checked={form.razorpayAutoCapture}
              onChange={(v) => setForm({ ...form, razorpayAutoCapture: v })}
            />
            <PayToggle
              title="UPI &amp; QR Payments"
              desc="Google Pay, PhonePe, Paytm &amp; BHIM."
              checked={form.razorpayEnableUPI}
              onChange={(v) => setForm({ ...form, razorpayEnableUPI: v })}
            />
            <PayToggle
              title="Credit &amp; Debit Cards"
              desc="Visa, Mastercard, RuPay, Amex."
              checked={form.razorpayEnableCards}
              onChange={(v) => setForm({ ...form, razorpayEnableCards: v })}
            />
            <PayToggle
              title="Net Banking &amp; Wallets"
              desc="All major Indian banks and wallets."
              checked={form.razorpayEnableNetBanking}
              onChange={(v) => setForm({ ...form, razorpayEnableNetBanking: v })}
            />
          </div>
        </div>
      )}

      <div className="mt-5 flex justify-end border-t border-gray-100 pt-4">
        <Button variant="primary" onClick={handleSaveRazorpay} disabled={saving || loading || !isDirty}>
          {saving ? "Saving Razorpay Settings…" : "Save Razorpay Configuration"}
        </Button>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* CHECKOUT RULES & ORDER PIPELINE CARD                               */
/* ------------------------------------------------------------------ */

function CheckoutSettingsCard() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<any>({});
  const [initialForm, setInitialForm] = React.useState<string>("");

  React.useEffect(() => {
    apiFetch<any>("/admin/settings")
      .then((s) => {
        if (s) {
          setForm(s);
          setInitialForm(JSON.stringify(s));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isDirty = React.useMemo(() => {
    if (!initialForm) return false;
    return JSON.stringify(form) !== initialForm;
  }, [form, initialForm]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch("/admin/settings", {
        method: "PUT",
        body: form
      });
      setInitialForm(JSON.stringify(form));
      toast.success("Checkout & Order Pipeline rules updated");
    } catch (err: any) {
      toast.error("Could not save checkout settings", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-purple-50 text-[#5B2C83]">
            <Sliders className="size-5" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-[#111827]">Checkout Limits &amp; Order Pipeline Flow</h2>
            <p className="text-xs text-[#6B7280]">Configure minimum order limits, COD thresholds, and order status steps.</p>
          </div>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Labeled label="Minimum Order Value (₹)">
              <input
                type="number"
                value={form.minOrderAmount || 0}
                onChange={(e) => setForm({ ...form, minOrderAmount: Number(e.target.value) })}
                className={INPUT}
              />
            </Labeled>
            <Labeled label="Maximum Order Limit (₹)">
              <input
                type="number"
                value={form.maxOrderAmount || 50000}
                onChange={(e) => setForm({ ...form, maxOrderAmount: Number(e.target.value) })}
                className={INPUT}
              />
            </Labeled>
            <Labeled label="Maximum COD Amount (₹)">
              <input
                type="number"
                value={form.maxCodAmount || 3000}
                onChange={(e) => setForm({ ...form, maxCodAmount: Number(e.target.value) })}
                className={INPUT}
              />
            </Labeled>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <PayToggle
              title="Guest Checkout"
              desc="Allow checkout without creating account."
              checked={form.guestCheckoutEnabled !== false}
              onChange={(v) => setForm({ ...form, guestCheckoutEnabled: v })}
            />
            <PayToggle
              title="OTP Verification"
              desc="Require mobile OTP on guest checkout."
              checked={form.otpVerificationRequired !== false}
              onChange={(v) => setForm({ ...form, otpVerificationRequired: v })}
            />
            <PayToggle
              title="Address Validation"
              desc="Verify PIN code deliverability."
              checked={form.addressValidationRequired !== false}
              onChange={(v) => setForm({ ...form, addressValidationRequired: v })}
            />
          </div>
        </div>
      )}

      <div className="mt-5 flex justify-end border-t border-gray-100 pt-4">
        <Button variant="primary" onClick={handleSave} disabled={saving || loading || !isDirty}>
          {saving ? "Saving Checkout Rules…" : "Save Checkout Configuration"}
        </Button>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* HELPER COMPONENTS                                                  */
/* ------------------------------------------------------------------ */

function PayToggle({
  title,
  desc,
  checked,
  onChange,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-[#111827]">{title}</p>
        {desc && <p className="text-[11px] leading-snug text-[#6B7280]">{desc}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-[#5B2C83]" : "bg-gray-300"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-xs transition-transform duration-200",
            checked ? "translate-x-4" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}

function Labeled({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold text-gray-600">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-gray-400">{hint}</span>}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* PRESERVED BRAND & TAX CARDS                                         */
/* ------------------------------------------------------------------ */

function BrandCard() {
  const [form, setForm] = React.useState<any>(null);
  const [initialForm, setInitialForm] = React.useState<string>("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    apiFetch<Record<string, unknown>>("/admin/settings")
      .then((s) => {
        const loaded = {
          storeName: (s.storeName as string) ?? "Yamora Chips",
          storeTagline: (s.storeTagline as string) ?? "",
          storeDescription: (s.storeDescription as string) ?? "",
          storeLogo: (s.storeLogo as string) ?? "",
          storeFavicon: (s.storeFavicon as string) ?? "",
        };
        setForm(loaded);
        setInitialForm(JSON.stringify(loaded));
      })
      .catch(() => {
        const fallback = { storeName: "Yamora Chips", storeTagline: "", storeDescription: "", storeLogo: "", storeFavicon: "" };
        setForm(fallback);
        setInitialForm(JSON.stringify(fallback));
      });
  }, []);

  const isDirty = React.useMemo(() => {
    if (!initialForm || !form) return false;
    return JSON.stringify(form) !== initialForm;
  }, [form, initialForm]);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await apiFetch("/admin/settings", { method: "PUT", body: form });
      setInitialForm(JSON.stringify(form));
      toast.success("Brand settings saved");
    } catch (err: any) {
      toast.error("Could not save", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (!form) return <Skeleton className="h-48 w-full" />;

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center gap-3 border-b border-gray-100 pb-3">
        <span className="grid size-10 place-items-center rounded-xl bg-purple-50 text-[#5B2C83]">
          <Store className="size-5" />
        </span>
        <div>
          <h2 className="text-sm font-bold text-[#111827]">Brand Identity &amp; Profile</h2>
          <p className="text-xs text-[#6B7280]">Store name, tagline and brand logos.</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Labeled label="Store Name">
          <input value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} className={INPUT} />
        </Labeled>
        <Labeled label="Tagline">
          <input value={form.storeTagline} onChange={(e) => setForm({ ...form, storeTagline: e.target.value })} className={INPUT} />
        </Labeled>
      </div>
      <div className="mt-4 flex justify-end">
        <Button variant="primary" onClick={save} disabled={saving || !isDirty}>
          {saving ? "Saving..." : "Save Brand Profile"}
        </Button>
      </div>
    </Card>
  );
}

function TaxCard() {
  const [form, setForm] = React.useState<any>(null);
  const [initialForm, setInitialForm] = React.useState<string>("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    apiFetch<Record<string, unknown>>("/admin/settings")
      .then((s) => {
        const loaded = {
          gstEnabled: s.gstEnabled !== false,
          taxRate: typeof s.taxRate === "number" ? s.taxRate : 5,
          taxInclusive: s.taxInclusive !== false,
          gstNumber: (s.gstNumber as string) ?? "",
        };
        setForm(loaded);
        setInitialForm(JSON.stringify(loaded));
      })
      .catch(() => {
        const fallback = { gstEnabled: true, taxRate: 5, taxInclusive: true, gstNumber: "" };
        setForm(fallback);
        setInitialForm(JSON.stringify(fallback));
      });
  }, []);

  const isDirty = React.useMemo(() => {
    if (!initialForm || !form) return false;
    return JSON.stringify(form) !== initialForm;
  }, [form, initialForm]);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await apiFetch("/admin/settings", { method: "PUT", body: form });
      setInitialForm(JSON.stringify(form));
      toast.success("GST Tax settings saved");
    } catch (err: any) {
      toast.error("Could not save", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (!form) return <Skeleton className="h-48 w-full" />;

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center gap-3 border-b border-gray-100 pb-3">
        <span className="grid size-10 place-items-center rounded-xl bg-purple-50 text-[#5B2C83]">
          <Receipt className="size-5" />
        </span>
        <div>
          <h2 className="text-sm font-bold text-[#111827]">GST &amp; Tax Policy</h2>
          <p className="text-xs text-[#6B7280]">Configure store GST percentage and invoice tax inclusion.</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Labeled label="GST Rate (%)">
          <input type="number" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })} className={INPUT} />
        </Labeled>
        <Labeled label="GSTIN Number">
          <input value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} className={INPUT} />
        </Labeled>
      </div>
      <div className="mt-4 flex justify-end">
        <Button variant="primary" onClick={save} disabled={saving || !isDirty}>
          {saving ? "Saving..." : "Save GST Settings"}
        </Button>
      </div>
    </Card>
  );
}

function SecurityCard() {
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirm password do not match.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long.");
      return;
    }

    setBusy(true);
    try {
      const res: any = await apiFetch("/admin/change-password", {
        method: "PUT",
        body: { currentPassword, newPassword, confirmPassword }
      });
      toast.success(res.message || "Admin password updated successfully! Please sign in again.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error("Password update failed", { description: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-4">
        <span className="grid size-10 place-items-center rounded-xl bg-purple-50 text-[#5B2C83]">
          <ShieldCheck className="size-5" />
        </span>
        <div>
          <h2 className="text-sm font-bold text-[#111827]">Admin Password & Security</h2>
          <p className="text-xs text-[#6B7280]">Update your administrator password to secure access to the console.</p>
        </div>
      </div>

      <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
        <Labeled label="Current Password">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
            required
            className={INPUT}
          />
        </Labeled>

        <Labeled label="New Password">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            required
            className={INPUT}
          />
        </Labeled>

        <Labeled label="Confirm New Password">
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required
            className={INPUT}
          />
        </Labeled>

        <div className="pt-2">
          <Button variant="primary" type="submit" disabled={busy}>
            {busy ? "Updating Password..." : "Update Admin Password"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
