"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Banknote,
  ShoppingBag,
  Check,
  ArrowLeft,
  Loader2,
  PartyPopper,
  Plus,
  Phone,
  ShieldCheck,
  MapPin,
  CheckCircle,
  AlertCircle,
  Edit2,
  Trash2,
  CheckCircle2,
  User,
  Mail,
  Lock,
  X,
  Truck,
  RotateCcw,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useStoreSettings } from "@/components/common/settings-provider";
import { useCart } from "@/components/cart/cart-provider";
import { useAccount, type SavedAddress } from "@/components/account/account-provider";
import { useOrders } from "@/components/shop/order-provider";
import { formatINR, cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api";
import { AddressForm, INDIAN_STATES } from "@/components/shop/address-form";

type PayMethod = "Razorpay" | "COD";

interface PayOption {
  key: PayMethod;
  title: string;
  description: string;
  badge?: string;
  icon: typeof CreditCard;
}

const ALL_PAYMENT_OPTIONS: PayOption[] = [
  {
    key: "Razorpay",
    title: "Pay Online",
    description: "UPI & QR, cards, net-banking and wallets — secured by Razorpay",
    badge: "Recommended",
    icon: CreditCard,
  },
  {
    key: "COD",
    title: "Cash on Delivery",
    description: "Pay in cash when your order arrives",
    icon: Banknote,
  },
];

export default function CheckoutPage() {
  const { settings } = useStoreSettings();
  const { items, totals, clear, coupon } = useCart();
  const { user, isLoggedIn, hydrated, updateProfile, addAddress, updateAddress, deleteAddress, setDefaultAddress, setActiveAddress } = useAccount();
  const { placeOrder } = useOrders();
  const router = useRouter();

  // Profile completion form states for first-time checkout / missing profile
  const [profileName, setProfileName] = React.useState(user?.name || "");
  const [profilePhone, setProfilePhone] = React.useState(user?.phone || "");
  const [profileEmail, setProfileEmail] = React.useState(user?.email || "");
  
  const [houseNo, setHouseNo] = React.useState("");
  const [street, setStreet] = React.useState("");
  const [area, setArea] = React.useState("");
  const [landmark, setLandmark] = React.useState("");
  const [city, setCity] = React.useState("");
  const [state, setState] = React.useState("");
  const [pinCode, setPinCode] = React.useState("");
  const [addressType, setAddressType] = React.useState<"Home" | "Work" | "Other">("Home");
  
  const [profileSaving, setProfileSaving] = React.useState(false);
  const [profileError, setProfileError] = React.useState("");
  const [showAddressPicker, setShowAddressPicker] = React.useState(false);

  // Keep state synced with user
  React.useEffect(() => {
    if (user) {
      if (user.name) setProfileName(user.name);
      if (user.phone) setProfilePhone(user.phone);
      if (user.email) setProfileEmail(user.email);
    }
  }, [user]);

  const addresses = React.useMemo(
    () => (Array.isArray(user?.addresses) ? user.addresses : []),
    [user?.addresses]
  );

  /**
   * Require initial profile completion if user has no saved addresses OR
   * is missing a valid phone number. This ensures first-time checkout collects
   * both personal details (name, phone) and the primary address, auto-saving
   * them to the profile.
   */
  const needsProfileCompletion = React.useMemo(() => {
    if (!isLoggedIn || !user) return false;
    const hasValidPhone = Boolean(user.phone && /^\d{10}$/.test(user.phone.trim()));
    return addresses.length === 0 || !hasValidPhone;
  }, [isLoggedIn, user, addresses]);

  // Payment methods
  const paymentOptions = React.useMemo(
    () =>
      ALL_PAYMENT_OPTIONS.filter((o) =>
        o.key === "COD" ? settings.codEnabled !== false : settings.razorpayEnabled !== false
      ),
    [settings.codEnabled, settings.razorpayEnabled]
  );

  const [method, setMethod] = React.useState<PayMethod>("Razorpay");

  React.useEffect(() => {
    if (paymentOptions.length && !paymentOptions.some((o) => o.key === method)) {
      setMethod(paymentOptions[0].key);
    }
  }, [paymentOptions, method]);

  const [placing, setPlacing] = React.useState(false);
  const [orderId, setOrderId] = React.useState<string | null>(null);

  /**
   * `createdOrder` is backed by sessionStorage so it survives page refresh,
   * browser-back, and navigation within the same browser tab.
   *
   * Problem it solves: if the user lands on /payment-failed then presses the
   * browser back button or navigates to /checkout again, React state is wiped
   * and handlePlaceOrder sees createdOrder===null, calling placeOrder() which
   * creates a duplicate RW-XXXXXX document.
   *
   * With sessionStorage persistence the checkout page re-hydrates createdOrder
   * on mount, so the if(createdOrder) guard in handlePlaceOrder still fires.
   * Combined with the server-side idempotency guard in createPaymentOrder,
   * duplicate creation is impossible.
   */
  const SESSION_KEY = 'ratalu_pending_order';

  const [createdOrder, _setCreatedOrder] = React.useState<{
    orderId: string;
    rzpOrderId: string;
    amount: number;
    currency: string;
    keyId: string;
  } | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const setCreatedOrder = React.useCallback(
    (val: typeof createdOrder | null) => {
      _setCreatedOrder(val);
      try {
        if (val) {
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(val));
        } else {
          sessionStorage.removeItem(SESSION_KEY);
        }
      } catch {}
    },
    []
  );

  // When payment succeeds and orderId is set, clear the session
  React.useEffect(() => {
    if (orderId) {
      try { sessionStorage.removeItem(SESSION_KEY); } catch {}
    }
  }, [orderId]);

  const [showAddForm, setShowAddForm] = React.useState(false);
  const [checkoutError, setCheckoutError] = React.useState("");
  const [editingAddress, setEditingAddress] = React.useState<SavedAddress | null>(null);

  // Ref to the address card section for auto-scrolling
  const addressSectionRef = React.useRef<HTMLDivElement>(null);

  /**
   * Auto-open address form when a logged-in user has no saved addresses.
   * Covers two cases:
   *  (a) Brand-new Google-login user who has a name but no saved addresses.
   *  (b) Any user whose address was deleted and they return to checkout.
   * After addresses are saved, this effect will not re-open the form.
   */
  React.useEffect(() => {
    if (isLoggedIn && !needsProfileCompletion && addresses.length === 0) {
      setShowAddForm(true);
      // Smooth-scroll to the address section after a short render delay
      const timer = setTimeout(() => {
        addressSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
      return () => clearTimeout(timer);
    }
  // Only run when login state / address list changes, not on every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, needsProfileCompletion, addresses.length]);

  /**
   * `paymentFailed` tracks whether the current checkout session had a payment
   * failure WHILE an order document already exists (`createdOrder` is set).
   * If true and the customer presses "Place Order" again, we MUST call
   * POST /payment/retry-order/:orderId — NOT POST /payment/create-order.
   */
  const [paymentFailed, setPaymentFailed] = React.useState(false);

  // PIN-code auto-fill effect for city and state
  const [pinStatus, setPinStatus] = React.useState<"idle" | "loading" | "ok" | "invalid">("idle");

  React.useEffect(() => {
    const pin = pinCode.trim();
    if (!/^\d{6}$/.test(pin)) {
      setPinStatus("idle");
      return;
    }

    let cancelled = false;
    setPinStatus("loading");

    (async () => {
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const data = await res.json();
        if (cancelled) return;

        const entry = Array.isArray(data) ? data[0] : null;
        const offices = entry?.Status === "Success" && Array.isArray(entry.PostOffice) ? entry.PostOffice : [];

        if (offices.length === 0) {
          setPinStatus("invalid");
          return;
        }

        const first = offices[0];
        if (first.State) setState(first.State);
        if (first.District || first.Division) setCity(first.District || first.Division);
        setPinStatus("ok");
      } catch {
        if (!cancelled) setPinStatus("invalid");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pinCode]);

  // Shiprocket Pincode Serviceability & Rates State
  const [serviceability, setServiceability] = React.useState<{
    loading: boolean;
    serviceable: boolean;
    courierName?: string;
    rate?: number;
    etdDays?: number;
    message?: string;
  } | null>(null);

  React.useEffect(() => {
    const activeAddr = addresses.find((a) => a.id === user?.activeAddressId || a._id === user?.activeAddressId) || addresses[0];
    const pin = activeAddr?.pinCode || activeAddr?.pincode || pinCode;
    const stateName = activeAddr?.state || state;
    const cityName = activeAddr?.city || city;

    if (pin && pin.length === 6) {
      setServiceability({ loading: true, serviceable: true });
      apiFetch<any>("/shipping/calculate", {
        method: "POST",
        body: {
          subtotal: totals.subtotal,
          weightKg: 0.5,
          pincode: pin,
          state: stateName,
          city: cityName,
          method: "home_delivery"
        }
      })
        .then((res) => {
          setServiceability({
            loading: false,
            serviceable: true,
            courierName: res.courierName || "Shiprocket Express",
            rate: res.shippingCharge || 0,
            etdDays: 3,
            message: res.isFree ? "Free Shipping Applied!" : `Standard Rate ₹${res.shippingCharge}`
          });
        })
        .catch(() => {
          setServiceability({ loading: false, serviceable: true });
        });
    }
  }, [user?.activeAddressId, addresses, pinCode, state, city, totals.subtotal]);

  const selectedAddress = addresses.find((a) => a.id === user?.activeAddressId || a._id === user?.activeAddressId) || addresses[0];

  const handleProfileCompletionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");

    if (!profileName.trim()) {
      setProfileError("Please enter your Full Name.");
      return;
    }
    if (!profilePhone.trim() || profilePhone.trim().length !== 10) {
      setProfileError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!houseNo.trim() || !street.trim() || !city.trim() || !state.trim() || !pinCode.trim()) {
      setProfileError("Please fill in all complete address details.");
      return;
    }

    setProfileSaving(true);
    try {
      await updateProfile({ name: profileName.trim(), phone: profilePhone.trim(), email: profileEmail.trim() });
      await addAddress({
        fullName: profileName.trim(),
        phone: profilePhone.trim(),
        houseNo: houseNo.trim(),
        street: street.trim(),
        area: area.trim(),
        landmark: landmark.trim(),
        city: city.trim(),
        state: state.trim(),
        pinCode: pinCode.trim(),
        addressType,
        isDefault: true
      });

      toast.success("Profile & Address Saved!", { description: "You can now proceed to payment." });
    } catch (err: any) {
      setProfileError(err.message || "Failed to save profile and address.");
    } finally {
      setProfileSaving(false);
    }
  };

  const loadRazorpayScript = () =>
    new Promise<boolean>((resolve) => {
      if ((window as any).Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const launchRazorpay = async (co: NonNullable<typeof createdOrder>) => {
    setCheckoutError("");
    setPaymentFailed(false);
    setPlacing(true);

    try {
      if (!(await loadRazorpayScript())) {
        throw new Error("Couldn't load the payment gateway. Please try again.");
      }

      const options = {
        key: co.keyId,
        amount: co.amount,
        currency: co.currency,
        name: settings.storeName || "Ratalu Wafers",
        description: `Order ${co.orderId}`,
        order_id: co.rzpOrderId,
        handler: function (response: any) {
          // Immediately clear cart & redirect to order-success
          setOrderId(co.orderId);
          clear();
          window.location.href = `/order-success?orderId=${co.orderId}`;

          // Fire background verification
          apiFetch("/payment/verify", {
            method: "POST",
            body: {
              orderId: co.orderId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            },
          }).catch(() => {});
        },
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
          contact: user?.phone || "",
        },
        theme: { color: "#4A1942" },
        modal: { ondismiss: () => setPlacing(false) },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        const msg = response.error?.description || "Payment failed or cancelled. Please try again.";
        setCheckoutError(msg);
        setPaymentFailed(true);
        setPlacing(false);
        router.push(`/payment-failed?orderId=${co.orderId}&reason=${encodeURIComponent(msg)}`);
      });
      rzp.open();
    } catch (err: any) {
      setCheckoutError(err.message || "Something went wrong opening the payment gateway.");
      setPlacing(false);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError("");

    /**
     * DUPLICATE-ORDER GUARD
     *
     * Case A — Razorpay dismissed without navigation (same React session):
     *   `createdOrder` is non-null. Re-launch the gateway with the same Razorpay
     *   order. No backend call needed — the order still exists, payment is Pending.
     *
     * Case B — Payment failed AND we're back in the same session (paymentFailed=true):
     *   The previous Razorpay order is expired/failed. We must create a NEW Razorpay
     *   gateway order against the EXISTING MongoDB order via retry-order, never via
     *   create-order (which would run placeOrder() → Order.create() → duplicate RW).
     */
    if (createdOrder) {
      if (paymentFailed) {
        // Session is still alive but payment failed — get a fresh Razorpay order
        // against the same MongoDB document. Never create a new order.
        setPlacing(true);
        try {
          const retryRes = await apiFetch<any>(`/payment/retry-order/${createdOrder.orderId}`, {
            method: "POST",
          });
          const rzpData = retryRes?.razorpay;
          if (!rzpData?.orderId) throw new Error("Retry failed: no gateway order returned.");

          const co = {
            orderId: createdOrder.orderId, // SAME MongoDB order ID — never changes
            rzpOrderId: rzpData.orderId,   // NEW Razorpay gateway order
            amount: rzpData.amount,
            currency: rzpData.currency,
            keyId: rzpData.keyId,
          };
          setCreatedOrder(co);
          setPaymentFailed(false);
          await launchRazorpay(co);
        } catch (err: any) {
          setCheckoutError(err.message || "Failed to retry payment. Please try from your orders.");
          setPlacing(false);
        }
      } else {
        // Gateway dismissed (ondismiss) — re-open with the same Razorpay order.
        await launchRazorpay(createdOrder);
      }
      return;
    }

    // No order exists yet — this is a fresh checkout. Safe to create one.
    const activeAddr = selectedAddress;
    if (!activeAddr) {
      setCheckoutError("Please select or add a delivery address to place your order.");
      return;
    }

    setPlacing(true);

    try {
      const res = await apiFetch<{
        order: any;
        requiresPayment: boolean;
        razorpay: { orderId: string; amount: number; currency: string; keyId: string };
      }>("/payment/create-order", {
        method: "POST",
        body: {
          items: items.map((i) => ({
            flavorId: i.flavorId,
            flavorName: i.flavorName,
            packId: i.packId,
            packLabel: i.packLabel,
            grams: i.grams,
            unitPrice: i.unitPrice,
            quantity: i.quantity,
            gradient: i.gradient,
            isCombo: i.isCombo,
            comboId: i.comboId,
          })),
          couponCode: coupon?.code,
          address: activeAddr,
          paymentMethod: method,
        },
      });

      if (!res.requiresPayment) {
        window.scrollTo(0, 0);
        setOrderId(res.order.id);
        clear();
        router.push(`/order-success?orderId=${res.order.id}`);
        return;
      }

      const co = {
        orderId: res.order.id,
        rzpOrderId: res.razorpay.orderId,
        amount: res.razorpay.amount,
        currency: res.razorpay.currency,
        keyId: res.razorpay.keyId,
      };
      setCreatedOrder(co);
      await launchRazorpay(co);
    } catch (err: any) {
      setCheckoutError(err.message || "An error occurred while placing your order.");
      setPlacing(false);
    }
  };

  if (orderId) return <OrderConfirmation orderId={orderId} />;

  if (items.length === 0) {
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
  }

  return (
    <div className="px-3.5 sm:px-6 mx-auto max-w-6xl py-4 sm:py-10 w-full min-w-0">
      {/* Checkout Header */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center justify-between border-b border-purple-100/60 pb-3.5">
        <div>
          <h1 className="font-serif text-xl sm:text-3xl font-extrabold text-[#4A1942]">Checkout</h1>
          <p className="text-xs text-gray-500 mt-0.5 font-medium">Review your items and complete your order</p>
        </div>
        <Link href="/shop" className="text-xs font-bold text-purple-700 hover:underline flex items-center gap-1 self-start sm:self-auto">
          <ArrowLeft className="size-3.5" /> Continue Shopping
        </Link>
      </div>

      <div className="grid gap-5 sm:gap-8 lg:grid-cols-[1.4fr_1fr] w-full min-w-0">

        {/* LEFT COLUMN: AUTH / PROFILE / ADDRESS & PAYMENT */}
        <div className="flex flex-col gap-5 sm:gap-6 w-full min-w-0">

          {/* 1. NOT LOGGED IN GATE */}
          {!hydrated ? (
            <div className="bg-white border border-gray-200 rounded-2xl sm:rounded-3xl p-8 sm:p-12 shadow-sm text-center flex flex-col items-center justify-center min-h-[260px]">
              <Loader2 className="size-8 animate-spin text-[#4A1942] mb-3" />
              <p className="text-sm font-extrabold text-[#4A1942]">Loading checkout details...</p>
            </div>
          ) : !isLoggedIn ? (
            <div className="bg-white border border-gray-200 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-sm text-center">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-purple-50 text-purple-700 mb-4">
                <User className="size-7" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Sign in to Checkout</h2>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Please sign in with your email address or Google account to save delivery details and track your orders.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild size="lg" className="bg-[#4A1942] hover:bg-[#381132]">
                  <Link href="/account?login=true">Sign In / Register</Link>
                </Button>
              </div>
            </div>
          ) : needsProfileCompletion ? (

            /* 2. FIRST-TIME CHECKOUT PROFILE & ADDRESS COMPLETION */
            <form onSubmit={handleProfileCompletionSubmit} className="bg-white border border-purple-200 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-sm flex flex-col gap-4.5 w-full min-w-0">
              <div className="border-b border-gray-100 pb-3">
                <h2 className="text-base sm:text-lg font-extrabold text-[#4A1942]">Complete Your Profile &amp; Delivery Address</h2>
                <p className="text-xs text-gray-500 mt-0.5 font-medium">Please enter your contact details and address to continue to payment.</p>
              </div>

              {profileError && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600 border border-red-100">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              {/* Personal Info */}
              <div className="grid gap-3 sm:grid-cols-2 w-full min-w-0">
                <div className="w-full min-w-0">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Full Name</label>
                  <Input
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Dhruvil Talaviya"
                    className="h-10 text-sm rounded-xl w-full"
                  />
                </div>
                <div className="w-full min-w-0">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Mobile Number</label>
                  <Input
                    required
                    type="tel"
                    maxLength={10}
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="10-digit mobile number"
                    className="h-10 text-sm rounded-xl w-full"
                  />
                </div>
              </div>

              {/* Complete Address */}
              <div className="space-y-3 pt-1 w-full min-w-0">
                <h3 className="text-xs font-extrabold text-purple-800 uppercase tracking-wider">Delivery Address Details</h3>
                <div className="grid gap-3 sm:grid-cols-2 w-full min-w-0">
                  <div className="w-full min-w-0">
                    <label className="block text-xs font-bold text-gray-700 mb-1">House / Flat / Block No.</label>
                    <Input required value={houseNo} onChange={(e) => setHouseNo(e.target.value)} placeholder="House/Flat No." className="h-10 text-sm rounded-xl w-full" />
                  </div>
                  <div className="w-full min-w-0">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Street / Road Name</label>
                    <Input required value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Street/Road Name" className="h-10 text-sm rounded-xl w-full" />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 w-full min-w-0">
                  <div className="w-full min-w-0">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Area / Locality</label>
                    <Input required value={area} onChange={(e) => setArea(e.target.value)} placeholder="Area/Locality" className="h-10 text-sm rounded-xl w-full" />
                  </div>
                  <div className="w-full min-w-0">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Landmark (Optional)</label>
                    <Input value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="Nearby landmark" className="h-10 text-sm rounded-xl w-full" />
                  </div>
                </div>

                <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 w-full min-w-0">
                  <div className="w-full min-w-0">
                    <label className="block text-xs font-bold text-gray-700 mb-1">PIN Code *</label>
                    <div className="relative w-full">
                      <Input
                        required
                        inputMode="numeric"
                        value={pinCode}
                        onChange={(e) => setPinCode(e.target.value.replace(/\D/g, "").substring(0, 6))}
                        placeholder="6-digit PIN"
                        className="h-10 text-sm rounded-xl pr-8 font-numbers w-full"
                      />
                      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
                        {pinStatus === "loading" && <Loader2 className="size-4 animate-spin text-purple-500" />}
                        {pinStatus === "ok" && <CheckCircle2 className="size-4 text-green-600" />}
                        {pinStatus === "invalid" && <AlertCircle className="size-4 text-amber-500" />}
                      </span>
                    </div>
                  </div>

                  <div className="w-full min-w-0">
                    <label className="block text-xs font-bold text-gray-700 mb-1">State *</label>
                    <select
                      required
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition-all focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                    >
                      <option value="" disabled>Select State</option>
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                      {state && !INDIAN_STATES.includes(state) && <option value={state}>{state}</option>}
                    </select>
                  </div>

                  <div className="w-full min-w-0">
                    <label className="block text-xs font-bold text-gray-700 mb-1">City / District *</label>
                    <Input required value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="h-10 text-sm rounded-xl w-full" />
                  </div>
                </div>

                <div className="pt-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Address Type</label>
                  <div className="flex gap-2">
                    {(["Home", "Work", "Other"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setAddressType(t)}
                        className={cn(
                          "px-4 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer",
                          addressType === t ? "bg-[#4A1942] text-white border-[#4A1942]" : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Button type="submit" disabled={profileSaving} size="lg" className="w-full h-11 bg-[#4A1942] hover:bg-[#381132] font-bold text-sm mt-2 rounded-xl">
                {profileSaving ? <Loader2 className="size-4 animate-spin" /> : "Save Profile & Continue to Payment"}
              </Button>
            </form>
          ) : (

            /* 3. FUTURE ORDERS PRE-FILLED ADDRESS & PAYMENT FLOW */
            <>
              {/* Delivery Address Card — ref used for auto-scroll on first visit */}
              <div
                ref={addressSectionRef}
                className={cn(
                  "bg-white border rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all",
                  addresses.length === 0
                    ? "border-purple-400 ring-2 ring-purple-200 ring-offset-1"
                    : "border-purple-100/80"
                )}
              >
                <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
                      <MapPin className="size-4.5" />
                    </div>
                    <div>
                      <h2 className="font-serif font-extrabold text-base text-gray-900">Delivery Address</h2>
                      {addresses.length === 0 && !showAddForm && (
                        <p className="text-[11px] font-bold text-purple-600 mt-0.5">Add your delivery address to continue</p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(!showAddForm)}
                    title={showAddForm ? "Cancel" : "Add / Change Address"}
                    aria-label={showAddForm ? "Cancel" : "Add / Change Address"}
                    className={cn(
                      "grid size-9 place-items-center rounded-xl border transition-all cursor-pointer shadow-2xs",
                      addresses.length === 0 && !showAddForm
                        ? "border-purple-400 bg-purple-100 text-purple-800 hover:bg-purple-200"
                        : "border-purple-200 bg-purple-50/70 text-purple-700 hover:bg-purple-100 hover:border-purple-300"
                    )}
                  >
                    {showAddForm ? (
                      <X className="size-4 text-purple-700" />
                    ) : addresses.length === 0 ? (
                      <Plus className="size-4 text-purple-700" />
                    ) : (
                      <Edit2 className="size-4 text-purple-700" />
                    )}
                  </button>
                </div>

                {/* No-address banner — shown only when user has no addresses and form is closed */}
                {addresses.length === 0 && !showAddForm && (
                  <button
                    type="button"
                    onClick={() => setShowAddForm(true)}
                    className="w-full flex items-center gap-3 rounded-2xl border-2 border-dashed border-purple-300 bg-purple-50/50 p-4 text-left hover:bg-purple-50 hover:border-purple-400 transition-all group"
                  >
                    <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-purple-100 text-purple-700 group-hover:bg-purple-200 transition-colors">
                      <Plus className="size-4.5" />
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-[#4A1942]">Add Delivery Address</p>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">Enter your house, street, city & PIN to continue</p>
                    </div>
                    <ArrowLeft className="size-4 text-purple-400 ml-auto rotate-180 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                )}

                {showAddForm ? (
                  <div className="pt-2">
                    <AddressForm
                      onSubmit={async (addr) => {
                        await addAddress(addr);
                        setShowAddForm(false);
                        toast.success("Address added & selected");
                      }}
                      onCancel={() => setShowAddForm(false)}
                    />
                  </div>
                ) : selectedAddress ? (
                  <div className="flex flex-col gap-3.5">
                    {/* Active Address Card */}
                    <div className="relative group rounded-2xl border border-purple-200/80 bg-gradient-to-br from-purple-50/60 via-white to-purple-50/30 p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all">
                      <div className="flex items-center justify-between gap-2 border-b border-purple-100/70 pb-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-purple-100/80 text-[#4A1942]">
                            <User className="size-3.5" />
                          </div>
                          <span className="font-extrabold text-sm text-[#4A1942] truncate">
                            {selectedAddress.fullName || user?.name || "Customer"}
                          </span>
                        </div>
                        <Badge variant="primary" size="sm" className="bg-[#4A1942] text-white text-[10px] sm:text-[11px] font-extrabold px-3 py-0.5 rounded-full shrink-0">
                          {selectedAddress.addressType || "Home"}
                        </Badge>
                      </div>

                      <div className="mt-2.5 space-y-1.5">
                        {(selectedAddress.phone || user?.phone) && (
                          <p className="text-xs font-bold text-gray-600 flex items-center gap-1.5 font-numbers">
                            <Phone className="size-3.5 text-purple-600 shrink-0" />
                            <span>{selectedAddress.phone || user?.phone}</span>
                          </p>
                        )}
                        <p className="text-xs text-gray-700 leading-relaxed font-medium pt-0.5">
                          {selectedAddress.houseNo ? `${selectedAddress.houseNo}, ` : ""}
                          {selectedAddress.street ? `${selectedAddress.street}, ` : ""}
                          {selectedAddress.area ? `${selectedAddress.area}, ` : ""}
                          {selectedAddress.landmark ? `(Landmark: ${selectedAddress.landmark}), ` : ""}
                          {selectedAddress.city}, {selectedAddress.state} - <span className="font-bold text-gray-900 font-numbers">{selectedAddress.pinCode || selectedAddress.pincode}</span>
                        </p>
                      </div>
                    </div>

                    {/* Choose Other Address toggle button — shown ONLY if user has MULTIPLE saved addresses (> 1) */}
                    {addresses.length > 1 && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setShowAddressPicker(!showAddressPicker)}
                          className="w-full sm:w-auto inline-flex items-center justify-between sm:justify-start gap-2.5 rounded-xl border border-purple-200 bg-purple-50/80 hover:bg-purple-100 hover:border-purple-300 px-3.5 py-2 text-xs font-extrabold text-[#4A1942] transition-all cursor-pointer shadow-2xs group"
                        >
                          <span className="flex items-center gap-2">
                            <MapPin className="size-3.5 text-purple-700 shrink-0 group-hover:scale-110 transition-transform" />
                            <span>{showAddressPicker ? "Hide Saved Addresses" : `Choose Other Address (${addresses.length - 1} available)`}</span>
                          </span>
                          <ChevronDown className={cn("size-3.5 text-purple-700 transition-transform duration-200 shrink-0", showAddressPicker && "rotate-180")} />
                        </button>
                      </div>
                    )}

                    {/* Address Selection Grid — open when showAddressPicker is true */}
                    {showAddressPicker && addresses.length > 1 && (
                      <div className="space-y-2.5 rounded-2xl border border-purple-200/90 bg-purple-50/40 p-4 transition-all animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                          <p className="text-xs font-extrabold text-[#4A1942] flex items-center gap-1.5">
                            <MapPin className="size-3.5 text-purple-600" />
                            <span>Select Delivery Location</span>
                          </p>
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                            {addresses.length} addresses
                          </span>
                        </div>
                        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                          {addresses.map((addr) => {
                            const addrId = String(addr.id || addr._id);
                            const selectedId = String(selectedAddress.id || selectedAddress._id);
                            const isCurrent = addrId === selectedId;
                            return (
                              <div
                                key={addrId}
                                onClick={async () => {
                                  await setActiveAddress(addrId);
                                  setShowAddressPicker(false);
                                  toast.success("Delivery address selected");
                                }}
                                className={cn(
                                  "relative flex cursor-pointer flex-col justify-between rounded-xl border p-3.5 transition-all text-left group",
                                  isCurrent
                                    ? "border-purple-600 bg-white ring-2 ring-purple-500/20 shadow-sm"
                                    : "border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/30 hover:shadow-2xs"
                                )}
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-1.5 mb-1">
                                    <span className="font-extrabold text-xs text-[#4A1942] truncate">
                                      {addr.fullName || user?.name || "Customer"}
                                    </span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 shrink-0">
                                      {addr.addressType || "Home"}
                                    </span>
                                  </div>
                                  {(addr.phone || user?.phone) && (
                                    <p className="text-[11px] text-gray-500 font-bold font-numbers">{addr.phone || user?.phone}</p>
                                  )}
                                  <p className="text-xs text-gray-600 mt-1.5 leading-relaxed font-medium line-clamp-3">
                                    {addr.houseNo ? `${addr.houseNo}, ` : ""}
                                    {addr.street ? `${addr.street}, ` : ""}
                                    {addr.area ? `${addr.area}, ` : ""}
                                    {addr.city}, {addr.state} - {addr.pinCode || addr.pincode}
                                  </p>
                                </div>
                                {isCurrent ? (
                                  <div className="mt-2.5 pt-2 border-t border-purple-100 text-[10px] font-extrabold text-purple-700 uppercase tracking-wider flex items-center gap-1">
                                    <CheckCircle2 className="size-3.5 text-purple-600 shrink-0" />
                                    <span>Active Address</span>
                                  </div>
                                ) : (
                                  <div className="mt-2.5 pt-2 border-t border-gray-100 text-[10px] font-bold text-purple-600 group-hover:text-purple-800 group-hover:underline flex items-center justify-between">
                                    <span>Click to select</span>
                                    <ArrowLeft className="size-3 rotate-180 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 italic">No delivery address selected. Please add an address.</div>
                )}
              </div>

              {/* Payment Methods */}
              <form onSubmit={handlePlaceOrder} className="bg-white border border-gray-200 rounded-3xl p-5 sm:p-6 shadow-sm">
                <h2 className="font-extrabold text-base text-gray-900 mb-4 border-b border-gray-100 pb-3">Payment Method</h2>
                
                {checkoutError && (
                  <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600 border border-red-100">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>{checkoutError}</span>
                  </div>
                )}

                <div className="space-y-3">
                  {paymentOptions.map((option) => {
                    const Icon = option.icon;
                    const selected = method === option.key;
                    return (
                      <div
                        key={option.key}
                        onClick={() => setMethod(option.key)}
                        className={cn(
                          "flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition-all",
                          selected ? "border-purple-600 bg-purple-50/40 ring-1 ring-purple-500" : "border-gray-200 bg-white hover:border-gray-300"
                        )}
                      >
                        <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", selected ? "bg-[#4A1942] text-white" : "bg-gray-100 text-gray-500")}>
                          <Icon className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-sm text-gray-900">{option.title}</p>
                            {option.badge && <span className="text-[10px] font-extrabold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">{option.badge}</span>}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{option.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Button
                  type="submit"
                  disabled={placing}
                  size="lg"
                  className="w-full h-12 rounded-xl bg-[#4A1942] hover:bg-[#381132] text-white font-extrabold text-sm shadow-md mt-6"
                >
                  {placing ? <Loader2 className="size-5 animate-spin" /> : `Place Order • ${formatINR(totals.total)}`}
                </Button>
              </form>
            </>
          )}

        </div>

        {/* RIGHT COLUMN: ORDER SUMMARY & DELIVERY INSTRUCTIONS */}
        <div className="flex flex-col gap-6 w-full min-w-0">
          <div className="bg-white border border-gray-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm sticky top-24 space-y-5 w-full min-w-0 overflow-hidden">
            <div>
              <h3 className="font-serif font-extrabold text-base text-gray-900 border-b border-gray-100 pb-3 mb-3">
                Order Summary ({items.length} items)
              </h3>
              
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={`${item.flavorId}_${item.packId}`} className="flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-800 truncate">{item.flavorName}</p>
                      <p className="text-[11px] text-gray-500 font-medium">{item.packLabel} × {item.quantity}</p>
                    </div>
                    <span className="font-extrabold text-gray-900 shrink-0 text-right">{formatINR(item.unitPrice * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 mt-4 pt-3 space-y-2 text-xs">
                <div className="flex items-center justify-between text-gray-600 font-medium">
                  <span>Subtotal</span>
                  <span className="font-bold text-gray-800">{formatINR(totals.subtotal)}</span>
                </div>
                {totals.discount > 0 && (
                  <div className="flex items-center justify-between text-emerald-600 font-bold">
                    <span>Coupon Discount</span>
                    <span>- {formatINR(totals.discount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-gray-600 font-medium">
                  <span>Shipping</span>
                  <span className="font-bold text-gray-800">{totals.shipping === 0 ? "FREE" : formatINR(totals.shipping)}</span>
                </div>
                <div className="border-t border-gray-200 pt-3 flex items-center justify-between text-sm font-extrabold text-gray-900">
                  <span>Total Amount</span>
                  <span className="text-[#4A1942] text-base shrink-0 font-bold">{formatINR(totals.total)}</span>
                </div>
              </div>
            </div>

            {/* Delivery Instructions & Return Policy Section */}
            <div className="rounded-xl sm:rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50/50 via-purple-50/30 to-white p-3.5 sm:p-4 text-left w-full min-w-0">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#4A1942] mb-2.5 flex items-center gap-1.5">
                <Truck className="size-4 text-purple-700 shrink-0" />
                <span>Delivery &amp; Policy Instructions</span>
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5 text-xs w-full min-w-0">
                {/* Delivery Timeline */}
                <div className="flex items-start gap-2.5 rounded-xl bg-white/80 p-2.5 border border-purple-100/50 shadow-2xs w-full min-w-0">
                  <div className="p-1 rounded-md bg-purple-100 text-purple-700 shrink-0 mt-0.5">
                    <Truck className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold text-gray-900 text-[11px]">Estimated Delivery</p>
                    <p className="text-[11px] text-gray-600 font-medium leading-tight">
                      Delivered within <span className="font-bold text-purple-900">{settings?.estimatedDeliveryDays || "3–5 Business Days"}</span>
                    </p>
                  </div>
                </div>

                {/* Return Policy */}
                <div className="flex items-start gap-2.5 rounded-xl bg-white/80 p-2.5 border border-amber-200/50 shadow-2xs w-full min-w-0">
                  <div className="p-1 rounded-md bg-amber-100 text-amber-800 shrink-0 mt-0.5">
                    <RotateCcw className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold text-gray-900 text-[11px]">Return &amp; Refund Policy</p>
                    <p className="text-[11px] text-gray-600 font-medium leading-tight">
                      <span className="font-bold text-amber-900">Non-Returnable</span> (Fresh Food Hygiene Policy)
                    </p>
                  </div>
                </div>

                {/* Security Guarantee */}
                <div className="flex items-start gap-2.5 rounded-xl bg-white/80 p-2.5 border border-emerald-100/60 shadow-2xs w-full min-w-0">
                  <div className="p-1 rounded-md bg-emerald-100 text-emerald-700 shrink-0 mt-0.5">
                    <ShieldCheck className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold text-gray-900 text-[11px]">100% Protected Checkout</p>
                    <p className="text-[11px] text-gray-600 font-medium leading-tight">
                      Encrypted payments secured by Razorpay
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function OrderConfirmation({ orderId }: { orderId: string }) {
  const router = useRouter();

  React.useEffect(() => {
    if (orderId) {
      router.push(`/order-success?orderId=${orderId}`);
    }
  }, [orderId, router]);

  return (
    <div className="container-px mx-auto flex max-w-md flex-col items-center gap-6 py-20 text-center px-4">
      <div className="size-16 grid place-items-center rounded-full bg-emerald-100 text-emerald-600 animate-bounce">
        <CheckCircle2 className="size-9 stroke-[2.5]" />
      </div>
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-gray-900">Order Placed Successfully!</h1>
        <div className="mt-3 flex items-center justify-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Order ID:</span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(orderId);
              toast.success("Order ID copied to clipboard!");
            }}
            className="font-mono font-extrabold text-[#5B2C83] bg-purple-50 hover:bg-purple-100 px-3 py-1 rounded-xl border border-purple-200 text-xs transition-colors flex items-center gap-1 cursor-pointer"
          >
            #{orderId}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">Redirecting to your order confirmation summary...</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs mt-2">
        <Button asChild size="lg" className="w-full h-11 bg-[#4A1942] hover:bg-[#381132] font-bold text-xs">
          <Link href={`/order-success?orderId=${orderId}`}>View Order Summary</Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="w-full h-11 border-gray-300 font-bold text-xs">
          <Link href="/shop">Continue Shopping</Link>
        </Button>
      </div>
    </div>
  );
}
