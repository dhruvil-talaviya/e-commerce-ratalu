"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  CreditCard,
  Banknote,
  Smartphone,
  Landmark,
  ShoppingBag,
  Check,
  ArrowLeft,
  Loader2,
  PartyPopper,
  Plus,
  Compass,
  Phone,
  KeyRound,
  ShieldCheck,
  MapPin,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useStoreSettings } from "@/components/common/settings-provider";
import { useCart } from "@/components/cart/cart-provider";
import { useAccount, type SavedAddress } from "@/components/account/account-provider";
import { useOrders } from "@/components/shop/order-provider";
import { formatINR, cn } from "@/lib/utils";
import { SITE } from "@/lib/constants";
import { toast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api";
import { AddressForm } from "@/components/shop/address-form";
import { Edit2, Trash2, CheckCircle2 } from "lucide-react";

type PayMethod = "Razorpay" | "COD";

interface PayOption {
  key: PayMethod;
  title: string;
  description: string;
  badge?: string;
  icon: typeof CreditCard;
}

/**
 * The payment methods offered at checkout, filtered by what the admin has
 * enabled in Settings. "Pay Online" is Razorpay, whose own screen includes UPI
 * QR, Google Pay / PhonePe / Paytm, cards, net-banking and wallets.
 */
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
  const { user, isLoggedIn, sendOtp, verifyOtp, updateProfile, addAddress, updateAddress, deleteAddress, setDefaultAddress, setActiveAddress } = useAccount();
  const { placeOrder } = useOrders();
  const router = useRouter();

  // Auth States for Guest Checkout
  const [authStep, setAuthStep] = React.useState<"mobile" | "otp" | "register">("mobile");
  const [phone, setPhone] = React.useState("");
  const [otpVal, setOtpVal] = React.useState<string[]>(Array(6).fill(""));
  const [serverOtp, setServerOtp] = React.useState("");
  const [countdown, setCountdown] = React.useState(30);
  const [resendActive, setResendActive] = React.useState(false);
  const [authError, setAuthError] = React.useState("");
  const [authLoading, setAuthLoading] = React.useState(false);
  
  // Registration Form States
  const [regName, setRegName] = React.useState("");
  const [regHouse, setRegHouse] = React.useState("");
  const [regStreet, setRegStreet] = React.useState("");
  const [regArea, setRegArea] = React.useState("");
  const [regLandmark, setRegLandmark] = React.useState("");
  const [regCity, setRegCity] = React.useState("");
  const [regState, setRegState] = React.useState("");
  const [regPin, setRegPin] = React.useState("");
  const [regTag, setRegTag] = React.useState<"Home" | "Work" | "Other">("Home");
  const [saveRegAddress, setSaveRegAddress] = React.useState(true);

  // Payment methods the admin has switched on, in Settings.
  const paymentOptions = React.useMemo(
    () =>
      ALL_PAYMENT_OPTIONS.filter((o) =>
        o.key === "COD" ? settings.codEnabled !== false : settings.razorpayEnabled !== false
      ),
    [settings.codEnabled, settings.razorpayEnabled]
  );

  // Normal Checkout States
  const [method, setMethod] = React.useState<PayMethod>("Razorpay");

  // Keep the selection valid as the enabled methods load/change.
  React.useEffect(() => {
    if (paymentOptions.length && !paymentOptions.some((o) => o.key === method)) {
      setMethod(paymentOptions[0].key);
    }
  }, [paymentOptions, method]);
  const [placing, setPlacing] = React.useState(false);
  const [orderId, setOrderId] = React.useState<string | null>(null);
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [checkoutError, setCheckoutError] = React.useState("");
  const [editingAddress, setEditingAddress] = React.useState<SavedAddress | null>(null);
  const [paymentFailed, setPaymentFailed] = React.useState(false);
  /**
   * The order that was already created for this cart (online payment only).
   * Kept so a failed attempt can be RETRIED against the SAME order — no new
   * order id, no second stock decrement, no second coupon use. Holds everything
   * needed to re-open the Razorpay modal without hitting create-order again.
   */
  const [createdOrder, setCreatedOrder] = React.useState<{
    orderId: string;
    rzpOrderId: string;
    amount: number;
    currency: string;
    keyId: string;
  } | null>(null);

  const selectedAddress = user?.addresses?.find((a) => a.id === user?.activeAddressId);

  const distanceKm = React.useMemo(() => {
    if (!selectedAddress?.latitude || !selectedAddress?.longitude) return null;
    const hubLat = 21.1702;
    const hubLon = 72.8311;
    const R = 6371;
    const dLat = ((selectedAddress.latitude - hubLat) * Math.PI) / 180;
    const dLon = ((selectedAddress.longitude - hubLon) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((hubLat * Math.PI) / 180) *
        Math.cos((selectedAddress.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, [selectedAddress]);

  const alertStyles = React.useMemo(() => {
    const bg = settings.announcementBgColor || "";
    const isHex = bg.startsWith("#") && bg.length === 7;
    return {
      bgTint: isHex ? `${bg}12` : "rgba(251, 191, 36, 0.08)",
      borderTint: isHex ? `${bg}25` : "rgba(251, 191, 36, 0.2)",
      solidBg: bg || "#f59e0b",
      textColor: settings.announcementTextColor || "#92400e",
    };
  }, [settings.announcementBgColor, settings.announcementTextColor]);

  React.useEffect(() => {
    if (isLoggedIn && user && (!user.addresses || user.addresses.length === 0)) {
      setShowAddForm(true);
    }
  }, [isLoggedIn, user]);

  // OTP Box Refs
  const otpRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  // OTP Countdown Timer
  React.useEffect(() => {
    if (authStep !== "otp" || countdown <= 0) {
      if (countdown === 0) setResendActive(true);
      return;
    }
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [authStep, countdown]);

  // Auto focus first OTP field when entering OTP step
  React.useEffect(() => {
    if (authStep === "otp" && otpRefs.current[0]) {
      setTimeout(() => otpRefs.current[0]?.focus(), 150);
    }
  }, [authStep]);

  // Auto-submit OTP check when array length is filled
  React.useEffect(() => {
    const code = otpVal.join("");
    if (code.length === 6 && authStep === "otp") {
      handleVerifyOtp(code);
    }
  }, [otpVal, authStep]);

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

  // --- Step Indicator calculation ---
  const currentStepNum = !isLoggedIn
    ? authStep === "register" ? 3 : 2
    : 3; // 1 = Cart, 2 = Verification, 3 = Address/Payment, 4 = Confirmation

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    if (phone.length !== 10) {
      setAuthError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setAuthLoading(true);
    const result = await sendOtp(phone);
    setAuthLoading(false);

    if (!result.success) {
      setAuthError(result.message || "Failed to dispatch verification code.");
      return;
    }

    setCountdown(30);
    setResendActive(false);
    setOtpVal(Array(6).fill(""));
    setAuthStep("otp");

    if (result.otp) {
      toast.info("Security Verification Required", {
        description: `Simulated SMS OTP Code: ${result.otp}`,
      });
    } else {
      toast.success("OTP Dispatched", {
        description: `A 6-digit security code has been sent to +91 ${phone}`,
      });
    }
  };

  const handleVerifyOtp = async (code: string) => {
    setAuthError("");
    setAuthLoading(true);
    // Unified passwordless verify: existing customers are signed in, brand-new
    // numbers are auto-registered — either way we're authenticated afterwards.
    const result = await verifyOtp(phone, code);
    setAuthLoading(false);

    if (!result.success) {
      setAuthError(result.message || "Invalid verification code. Please enter the correct OTP.");
      return;
    }

    if (result.isNewUser || !result.profileComplete) {
      // Account exists now; we just need their name + delivery address.
      setAuthStep("register");
      toast.success("Mobile verified", { description: "Just add your details to continue." });
    } else {
      toast.success("Welcome back!", { description: "Logged in successfully. Saved details pre-filled." });
    }
  };

  const handleResendOtp = async () => {
    setAuthLoading(true);
    const result = await sendOtp(phone);
    setAuthLoading(false);

    if (!result.success) {
      setAuthError(result.message || "Failed to resend code.");
      return;
    }

    setCountdown(30);
    setResendActive(false);
    setOtpVal(Array(6).fill(""));

    if (result.otp) {
      toast.info("New OTP Dispatched", {
        description: `Resent Simulated OTP Code: ${result.otp}`,
      });
    } else {
      toast.success("New OTP Dispatched", {
        description: `A fresh code has been sent to +91 ${phone}`,
      });
    }
  };

  const handleOtpInputChange = (val: string, index: number) => {
    const cleaned = val.replace(/\D/g, "");
    if (!cleaned) return;

    setOtpVal((prev) => {
      const copy = [...prev];
      copy[index] = cleaned.substring(cleaned.length - 1);
      return copy;
    });

    // Shift focus forward
    if (index < 5 && otpRefs.current[index + 1]) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      setOtpVal((prev) => {
        const copy = [...prev];
        copy[index] = "";
        return copy;
      });
      // Shift focus backward
      if (index > 0 && otpRefs.current[index - 1]) {
        otpRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regHouse.trim() || !regStreet.trim() || !regCity.trim() || !regState.trim() || !regPin.trim()) {
      setAuthError("Please fill out all mandatory registration fields.");
      return;
    }

    setAuthLoading(true);
    try {
      // The customer is ALREADY authenticated (auto-registered on OTP verify).
      // This step only completes their profile and saves the delivery address.
      await updateProfile({ name: regName.trim() });

      const fullLine = `${regHouse}, ${regStreet}, ${regArea} ${regLandmark ? `(Landmark: ${regLandmark})` : ""}`.trim();
      if (saveRegAddress) {
        await addAddress({
          tag: regTag,
          addressLine: fullLine,
          city: regCity,
          state: regState,
          pincode: regPin,
        });
      }

      toast.success("Welcome!", { description: "Your details are saved. Continue to payment." });
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Failed to save your details.");
    } finally {
      setAuthLoading(false);
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

  /**
   * Open the Razorpay modal for an ALREADY-created order.
   *
   * This is what makes retry safe: a failed payment re-opens the gateway against
   * the same order id (and the same Razorpay order), so no duplicate order is
   * created and stock/coupon aren't consumed twice.
   */
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
        handler: async function (response: any) {
          setPlacing(true);
          try {
            await apiFetch("/payment/verify", {
              method: "POST",
              body: {
                orderId: co.orderId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
            });
            setOrderId(co.orderId);
            clear();
            toast.success("Payment successful! Order placed.");
          } catch (err: any) {
            setCheckoutError(err.message || "We couldn't verify your payment.");
            setPaymentFailed(true);
          } finally {
            setPlacing(false);
          }
        },
        prefill: {
          name: user?.name || "",
          contact: user?.phone || "",
          email: user?.email || "",
        },
        theme: { color: "#7c3aed" },
        modal: { ondismiss: () => setPlacing(false) },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        setCheckoutError(response.error?.description || "Payment failed. Please try again.");
        setPaymentFailed(true);
        setPlacing(false);
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

    // ── Retry ──────────────────────────────────────────────────────────────
    // An order already exists for this cart (a previous attempt). Re-open the
    // gateway for THAT order — never create a new one.
    if (createdOrder) {
      await launchRazorpay(createdOrder);
      return;
    }

    if (!user?.activeAddressId) {
      setCheckoutError("Please select or add a delivery address to place your order.");
      return;
    }
    const activeAddr = user?.addresses?.find((a) => a.id === user?.activeAddressId);
    if (!activeAddr) {
      setCheckoutError("Selected address details are missing.");
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
          })),
          couponCode: coupon?.code,
          address: activeAddr,
          paymentMethod: method,
        },
      });

      // COD (and any offline method): the order is placed, nothing to collect.
      if (!res.requiresPayment) {
        setOrderId(res.order.id);
        clear();
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

  // Placed AFTER the handlers so onRetry can reference launchRazorpay (a const
  // arrow function). Retry re-opens the gateway for the SAME order — no new id.
  if (paymentFailed) {
    return (
      <OrderFailed
        onRetry={() => {
          if (createdOrder) void launchRazorpay(createdOrder);
          else setPaymentFailed(false);
        }}
      />
    );
  }

  return (
    <div className="container-px mx-auto max-w-6xl py-6 sm:py-12">
      {/* Checkout Progress Steps */}
      <div className="mb-6 sm:mb-8 w-full max-w-3xl mx-auto flex items-center justify-between text-[9px] sm:text-xs font-bold text-gray-400">
        <div className="flex flex-col items-center gap-1">
          <span className="flex size-5 sm:size-6 items-center justify-center rounded-full bg-purple-100 text-purple-700 font-bold border border-purple-200">
            ✓
          </span>
          <span className="text-gray-900">Cart</span>
        </div>
        <div className="flex-1 h-0.5 bg-purple-200 mx-1.5 sm:mx-2" />
        <div className="flex flex-col items-center gap-1">
          <span className={cn(
            "flex size-5 sm:size-6 items-center justify-center rounded-full border",
            currentStepNum >= 2 ? "bg-purple-600 border-purple-600 text-white" : "bg-white border-gray-200"
          )}>
            {currentStepNum > 2 ? "✓" : "2"}
          </span>
          <span className={cn(currentStepNum >= 2 ? "text-gray-900" : "text-gray-400")}>Verification</span>
        </div>
        <div className={cn("flex-1 h-0.5 mx-1.5 sm:mx-2", currentStepNum >= 3 ? "bg-purple-200" : "bg-gray-200")} />
        <div className="flex flex-col items-center gap-1">
          <span className={cn(
            "flex size-5 sm:size-6 items-center justify-center rounded-full border",
            isLoggedIn ? "bg-purple-600 border-purple-600 text-white" : "bg-white border-gray-200"
          )}>
            3
          </span>
          <span className={cn(isLoggedIn ? "text-gray-900" : "text-gray-400")}>Shipping &amp; Pay</span>
        </div>
        <div className="flex-1 h-0.5 bg-gray-200 mx-1.5 sm:mx-2" />
        <div className="flex flex-col items-center gap-1">
          <span className="flex size-5 sm:size-6 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-400">
            4
          </span>
          <span>Confirmation</span>
        </div>
      </div>

      <div className="grid gap-5 sm:gap-8 lg:grid-cols-[1.4fr_1fr]">

        {/* --- LEFT AREA --- */}
        <div className="flex flex-col gap-4 sm:gap-6">
          {!isLoggedIn ? (
            <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col gap-5">
              
              {/* Step 1: Mobile Number Form */}
              {authStep === "mobile" && (
                <form onSubmit={handleSendOtp} className="flex flex-col gap-4 max-w-sm mx-auto w-full py-4">
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-900">Continue Your Order</h2>
                    <p className="text-xs text-gray-500 mt-1">Enter your mobile number to proceed to checkout.</p>
                  </div>

                  {authError && (
                    <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-100">
                      <ShieldCheck className="size-4 shrink-0 text-red-600" />
                      <span>{authError}</span>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Mobile Number</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
                        +91
                      </span>
                      <Input
                        required
                        type="tel"
                        maxLength={10}
                        placeholder="Enter 10-digit number"
                        className="pl-12 h-11 text-sm border-gray-200 bg-white font-medium"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                      />
                    </div>
                  </div>

                  <Button type="submit" size="lg" className="w-full mt-2">
                    {authLoading ? "Verifying..." : "Continue"}
                  </Button>
                </form>
              )}

              {/* Step 2: OTP Entry Form */}
              {authStep === "otp" && (
                <div className="flex flex-col gap-4 max-w-sm mx-auto w-full py-4">
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-900">Enter Verification Code</h2>
                    <p className="text-xs text-gray-500 mt-1">We sent a 6-digit OTP code to +91 {phone}.</p>
                  </div>

                  {authError && (
                    <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-100">
                      <ShieldCheck className="size-4 shrink-0 text-red-600" />
                      <span>{authError}</span>
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 text-center">Verification OTP</label>
                    <div className="flex gap-2 justify-center">
                      {otpVal.map((digit, idx) => (
                        <input
                          key={idx}
                          type="text"
                          maxLength={1}
                          pattern="\d*"
                          ref={(el) => { otpRefs.current[idx] = el; }}
                          value={digit}
                          onChange={(e) => handleOtpInputChange(e.target.value, idx)}
                          onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                          className="size-11 sm:size-12 rounded-xl border border-gray-250 bg-white text-center text-lg font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs mt-2 text-gray-500">
                    <button
                      onClick={() => {
                        setAuthStep("mobile");
                        setAuthError("");
                      }}
                      className="font-bold text-purple-600 hover:underline flex items-center gap-0.5 focus:outline-none"
                    >
                      <ArrowLeft className="size-3.5" /> Edit Number
                    </button>

                    {resendActive ? (
                      <button
                        onClick={handleResendOtp}
                        className="font-bold text-purple-600 hover:underline focus:outline-none"
                      >
                        Resend OTP
                      </button>
                    ) : (
                      <span>Resend in {countdown}s</span>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Registration Form for New Customer */}
              {authStep === "register" && (
                <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-5">
                  <div className="border-b border-gray-100 pb-3">
                    <h2 className="text-xl font-bold text-gray-900">Customer Registration</h2>
                    <p className="text-xs text-gray-500 mt-1">Complete your registration to save delivery settings.</p>
                  </div>

                  {settings.announcementEnabled && settings.announcementText && (
                    <div 
                      className="flex items-start gap-3 rounded-2xl border p-4.5 shadow-sm"
                      style={{ 
                        backgroundColor: alertStyles.bgTint, 
                        borderColor: alertStyles.borderTint,
                        borderLeftWidth: "4px",
                        borderLeftColor: alertStyles.solidBg,
                        color: alertStyles.textColor 
                      }}
                    >
                      <AlertCircle 
                        className="size-5 shrink-0 mt-0.5" 
                        style={{ color: alertStyles.solidBg }}
                      />
                      <div>
                        <p className="text-[9px] font-extrabold uppercase tracking-wider opacity-60">Delivery Notice</p>
                        <p className="mt-0.5 text-xs font-bold leading-relaxed">{settings.announcementText}</p>
                      </div>
                    </div>
                  )}

                  {authError && (
                    <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-100">
                      <ShieldCheck className="size-4 shrink-0 text-red-600" />
                      <span>{authError}</span>
                    </div>
                  )}

                  {/* Profile Info */}
                  <div className="flex flex-col gap-3">
                    <h3 className="text-xs font-bold text-purple-700 uppercase tracking-wider">Contact details</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-500">Full Name</label>
                        <Input
                          required
                          placeholder="e.g. Rahul Sharma"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-400">Mobile Number (Read-only)</label>
                        <Input readOnly value={"+91 " + phone} className="bg-gray-50 text-gray-400 cursor-not-allowed" />
                      </div>
                    </div>
                  </div>

                  {/* Address Info */}
                  <div className="flex flex-col gap-4 border-t border-gray-100 pt-4">
                    <h3 className="text-xs font-bold text-purple-700 uppercase tracking-wider">Delivery Address</h3>
                    
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-500">House / Flat / Block No.</label>
                        <Input required placeholder="e.g. Flat 302, Royal Residency" value={regHouse} onChange={(e) => setRegHouse(e.target.value)} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-500">Street / Society / Colony</label>
                        <Input required placeholder="e.g. MG Road, Sector 4" value={regStreet} onChange={(e) => setRegStreet(e.target.value)} />
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-500">Area / Locality</label>
                        <Input required placeholder="e.g. Bandra Kurla Complex" value={regArea} onChange={(e) => setRegArea(e.target.value)} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-500">Landmark (Optional)</label>
                        <Input placeholder="e.g. Near BKC Metro Station" value={regLandmark} onChange={(e) => setRegLandmark(e.target.value)} />
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-500">City</label>
                        <Input required placeholder="Mumbai" value={regCity} onChange={(e) => setRegCity(e.target.value)} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-500">State</label>
                        <Input required placeholder="Maharashtra" value={regState} onChange={(e) => setRegState(e.target.value)} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-500">Pincode</label>
                        <Input required placeholder="400051" value={regPin} onChange={(e) => setRegPin(e.target.value)} />
                      </div>
                    </div>
                  </div>

                  {/* Address Type Tag */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gray-500">Address Type Tag</label>
                    <div className="flex gap-2">
                      {(["Home", "Work", "Other"] as const).map((tag) => (
                        <button
                          type="button"
                          key={tag}
                          onClick={() => setRegTag(tag)}
                          className={cn(
                            "rounded-lg px-4 py-2 text-xs font-bold border transition-colors",
                            regTag === tag
                              ? "bg-purple-600 border-purple-600 text-white shadow-sm"
                              : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                          )}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 py-1">
                    <input
                      type="checkbox"
                      id="saveRegAddress"
                      checked={saveRegAddress}
                      onChange={(e) => setSaveRegAddress(e.target.checked)}
                    />
                    <label htmlFor="saveRegAddress" className="text-xs font-semibold text-gray-600 select-none">
                      Save this address for future orders
                    </label>
                  </div>

                  <Button type="submit" size="lg" className="w-full mt-2">
                    Complete Registration & Pay
                  </Button>
                </form>
              )}
            </div>
          ) : (
            <>
              {/* Authenticated Checkout Form */}
              {checkoutError && (
                <div className="flex items-start gap-2.5 rounded-2xl border border-red-100 bg-red-50 p-3.5 text-xs font-semibold text-red-700 sm:text-sm">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{checkoutError}</span>
                </div>
              )}

              <div className="flex flex-col gap-4 sm:gap-6">
                {/* Delivery Address Section */}
                <Section step={1} title="Contact & Delivery Address">
                  {settings.announcementEnabled && settings.announcementText && (
                    <div 
                      className="mb-4 flex items-start gap-3 rounded-2xl border p-4.5 shadow-sm"
                      style={{ 
                        backgroundColor: alertStyles.bgTint, 
                        borderColor: alertStyles.borderTint,
                        borderLeftWidth: "4px",
                        borderLeftColor: alertStyles.solidBg,
                        color: alertStyles.textColor 
                      }}
                    >
                      <AlertCircle 
                        className="size-5 shrink-0 mt-0.5" 
                        style={{ color: alertStyles.solidBg }}
                      />
                      <div>
                        <p className="text-[9px] font-extrabold uppercase tracking-wider opacity-60">Delivery Notice</p>
                        <p className="mt-0.5 text-xs font-bold leading-relaxed">{settings.announcementText}</p>
                      </div>
                    </div>
                  )}

                  {/* Contact Preview */}
                  <div className="grid gap-2.5 sm:gap-4 sm:grid-cols-2 rounded-xl sm:rounded-2xl bg-gray-50 border border-gray-150 p-3 sm:p-4 mb-4 sm:mb-5">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Customer Name</span>
                      <span className="text-xs font-bold text-gray-800">{user?.name}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Mobile Number</span>
                      <span className="text-xs font-bold text-gray-800">+91 {user?.phone}</span>
                    </div>
                  </div>

                  {/* Address List Selection */}
                  <div className="flex flex-col gap-4 mt-5">
                    {showAddForm ? (
                      <div className="border border-purple-200 rounded-3xl p-5 bg-purple-50/5">
                        <h4 className="text-sm font-bold text-purple-900 mb-4">Add New Delivery Address</h4>
                        <AddressForm
                          onSubmit={async (addr) => {
                            await addAddress(addr);
                            setShowAddForm(false);
                          }}
                          onCancel={() => setShowAddForm(false)}
                        />
                      </div>
                    ) : editingAddress ? (
                      <div className="border border-purple-200 rounded-3xl p-5 bg-purple-50/5">
                        <h4 className="text-sm font-bold text-purple-900 mb-4">Edit Delivery Address</h4>
                        <AddressForm
                          initialAddress={editingAddress}
                          onSubmit={async (addr) => {
                            await updateAddress(editingAddress.id, addr);
                            setEditingAddress(null);
                          }}
                          onCancel={() => setEditingAddress(null)}
                        />
                      </div>
                    ) : (
                      <>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Select Delivery Address</span>
                        
                        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                          {user?.addresses?.map((addr) => {
                            const active = user?.activeAddressId === addr.id;
                            return (
                              <div
                                key={addr.id}
                                onClick={() => setActiveAddress(addr.id)}
                                className={cn(
                                  "relative flex flex-col justify-between rounded-xl sm:rounded-2xl border p-3 sm:p-4 cursor-pointer text-left transition-all",
                                  active
                                    ? "border-purple-600 bg-purple-50/40 ring-1 ring-purple-500 shadow-sm"
                                    : "border-gray-200 bg-white hover:border-purple-200"
                                )}
                              >
                                <div>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <Badge variant={addr.addressType === "Home" ? "primary" : addr.addressType === "Work" ? "gold" : "orange"} size="sm">
                                        {addr.addressType || addr.tag}
                                      </Badge>
                                      {addr.isDefault && (
                                        <Badge variant="soft" className="text-green-700 bg-green-50 border-green-200">
                                          Default
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingAddress(addr);
                                        }}
                                        className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                                        title="Edit Address"
                                      >
                                        <Edit2 className="size-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteAddress(addr.id);
                                        }}
                                        className="p-1 text-gray-400 hover:text-red-650 transition-colors"
                                        title="Delete Address"
                                      >
                                        <Trash2 className="size-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  <p className="mt-2.5 sm:mt-3 text-[11px] sm:text-xs font-semibold text-gray-800">
                                    {addr.fullName} • {addr.phone}
                                  </p>
                                  <p className="mt-1 text-[11px] sm:text-xs font-medium text-gray-500 leading-relaxed">
                                    {addr.houseNo ? `${addr.houseNo}, ` : ""}
                                    {addr.building ? `${addr.building}, ` : ""}
                                    {addr.street ? `${addr.street}, ` : ""}
                                    {addr.area ? `${addr.area}, ` : ""}
                                    {addr.landmark ? `(Landmark: ${addr.landmark}), ` : ""}
                                    {addr.city}, {addr.state} {addr.pinCode || addr.pincode}
                                  </p>
                                  
                                  {addr.latitude && (
                                    <p className="mt-1.5 flex items-center gap-1 text-[10px] text-green-600 font-semibold">
                                      <CheckCircle2 className="size-3" />
                                      <span>📍 GPS Captured</span>
                                    </p>
                                  )}
                                </div>

                                {active ? (
                                  <div className="mt-3 text-[9px] font-bold text-purple-700 uppercase tracking-wider border-t border-purple-100 pt-2 flex items-center justify-between">
                                    <span>✓ Selected Address</span>
                                    {!addr.isDefault && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDefaultAddress(addr.id);
                                        }}
                                        className="text-[9px] font-bold text-purple-500 hover:text-purple-700 underline uppercase"
                                      >
                                        Set Default
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  !addr.isDefault && (
                                    <div className="mt-3 border-t border-gray-100 pt-2 text-right">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDefaultAddress(addr.id);
                                        }}
                                        className="text-[9px] font-bold text-gray-400 hover:text-purple-600 uppercase"
                                      >
                                        Set Default
                                      </button>
                                    </div>
                                  )
                                )}
                              </div>
                            );
                          })}

                          <button
                            type="button"
                            onClick={() => setShowAddForm(true)}
                            className="flex min-h-22 sm:min-h-35 flex-col items-center justify-center gap-1.5 rounded-xl sm:rounded-2xl border border-dashed border-purple-200 text-purple-600 transition-colors hover:border-purple-400 hover:bg-purple-50/30"
                          >
                            <Plus className="size-4 sm:size-5" />
                            <span className="text-[11px] sm:text-xs font-bold">Add New Address</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </Section>

                {/* Payment Method Section */}
                <Section step={2} title="Payment method">
                  <div className="flex flex-col gap-3">
                    {paymentOptions.map((opt) => {
                      const Icon = opt.icon;
                      const active = method === opt.key;
                      return (
                        <div
                          key={opt.key}
                          onClick={() => setMethod(opt.key)}
                          className={cn(
                            "relative flex items-center justify-between rounded-xl sm:rounded-2xl border p-3 sm:p-5 cursor-pointer transition-all select-none",
                            active
                              ? "border-purple-600 bg-purple-50/40 ring-1 ring-purple-500 shadow-sm"
                              : "border-gray-200 bg-white hover:border-purple-200 hover:bg-gray-50/30"
                          )}
                        >
                          <div className="flex min-w-0 items-center gap-2.5 sm:gap-4">
                            <span className={cn(
                              "grid size-9 sm:size-11 place-items-center rounded-lg sm:rounded-xl shrink-0",
                              active ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-500"
                            )}>
                              <Icon className="size-4 sm:size-5" />
                            </span>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                <span className="text-xs sm:text-sm font-bold text-gray-900">{opt.title}</span>
                                {opt.badge && (
                                  <span className="text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-700 px-1.5 sm:px-2 py-0.5 rounded-full">
                                    {opt.badge}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] sm:text-xs text-gray-500 mt-0.5 block">{opt.description}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-center shrink-0 ml-2 sm:ml-4">
                            <span className={cn(
                              "size-5 rounded-full border flex items-center justify-center transition-all",
                              active ? "border-purple-600 bg-purple-600" : "border-gray-300 bg-white"
                            )}>
                              {active && <span className="size-2 rounded-full bg-white" />}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Section>
              </div>
            </>
          )}
        </div>

        {/* --- RIGHT AREA (Order Summary) --- */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl sm:rounded-3xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm flex flex-col">
            <h2 className="text-sm sm:text-base font-bold text-gray-800">Order Summary</h2>

            <ul className="mt-3 sm:mt-4 flex flex-col gap-2.5 sm:gap-3">
              {items.map((item) => (
                <li key={item.key} className="flex items-center gap-2.5 sm:gap-3">
                  <span
                    className="grid size-9 sm:size-10 shrink-0 place-items-center rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold text-white"
                    style={{
                      background: `radial-gradient(120% 120% at 30% 20%, ${item.gradient.from}, ${item.gradient.to})`,
                    }}
                  >
                    {item.quantity}×
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-gray-800">{item.flavorName}</p>
                    <p className="text-[10px] text-gray-400 font-semibold">{item.packLabel}</p>
                  </div>
                  <span className="text-xs font-bold text-gray-800">
                    {formatINR(item.unitPrice * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="mt-4 sm:mt-5 flex flex-col gap-2 sm:gap-2.5 border-t border-gray-100 pt-4 sm:pt-5 text-[11px] sm:text-xs font-semibold text-gray-500">
              <Row label="Subtotal" value={formatINR(totals.subtotal)} />
              {totals.discount > 0 && (
                <Row label="Discount" value={`− ${formatINR(totals.discount)}`} accent />
              )}
              {settings.gstEnabled !== false && (
                (() => {
                  const orderState = (selectedAddress?.state || regState || "").trim().toLowerCase();
                  const storeState = (settings.businessState || "Maharashtra").trim().toLowerCase();
                  const isSameState = orderState ? orderState === storeState : true;
                  const cgst = isSameState ? totals.gst / 2 : 0;
                  const sgst = isSameState ? totals.gst / 2 : 0;
                  const igst = isSameState ? 0 : totals.gst;

                  return isSameState ? (
                    <>
                      <Row label="CGST" value={formatINR(cgst)} />
                      <Row label="SGST" value={formatINR(sgst)} />
                    </>
                  ) : (
                    <Row label="IGST" value={formatINR(igst)} />
                  );
                })()
              )}
              <Row
                label="Shipping"
                value={totals.shipping === 0 ? "Free" : formatINR(totals.shipping)}
                accent={totals.shipping === 0}
              />
            </dl>

            {selectedAddress && (
              <div className="mt-4 border-t border-gray-100 pt-4 text-[10px] text-gray-400">
                <p className="font-bold text-purple-600 uppercase tracking-wider text-[9px] mb-1">
                  Shipping Details ({selectedAddress.addressType || selectedAddress.tag})
                </p>
                <p className="truncate font-semibold">
                  {selectedAddress.houseNo ? `${selectedAddress.houseNo}, ` : ""}
                  {selectedAddress.building ? `${selectedAddress.building}, ` : ""}
                  {selectedAddress.street ? `${selectedAddress.street}, ` : ""}
                  {selectedAddress.city}
                </p>
                {distanceKm !== null && (
                  <p className="mt-1 flex items-center gap-1 text-[9px] text-green-600 font-bold uppercase tracking-wider">
                    <CheckCircle2 className="size-3" />
                    <span>📍 {distanceKm.toFixed(1)} km from hub</span>
                  </p>
                )}
              </div>
            )}

            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
              <span className="text-xs sm:text-sm font-bold text-gray-800">Total Amount</span>
              <span className="text-lg sm:text-xl font-bold text-purple-700">
                {formatINR(totals.total)}
              </span>
            </div>

            {isLoggedIn ? (
              <Button type="button" onClick={handlePlaceOrder} size="lg" disabled={placing} className="mt-4 sm:mt-6 w-full">
                {placing ? (
                  <>
                    <Loader2 className="animate-spin" />{" "}
                    {method === "COD" ? "Placing order…" : "Processing payment…"}
                  </>
                ) : method === "COD" ? (
                  `Place order · ${formatINR(totals.total)}`
                ) : (
                  `Pay ${formatINR(totals.total)}`
                )}
              </Button>
            ) : (
              <div className="mt-6 rounded-2xl bg-gray-50 border border-gray-200 p-4 text-center text-[10px] text-gray-500 font-semibold">
                Complete mobile verification in the left section to submit your purchase.
              </div>
            )}

            <p className="mt-3.5 text-center text-[10px] text-gray-400 font-semibold">
              Estimated Delivery: 2–4 Business Days
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Section({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl sm:rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-7">
      <div className="flex items-center gap-2.5 sm:gap-3">
        <span className="grid size-6 sm:size-7 place-items-center rounded-lg bg-purple-600 text-[10px] sm:text-xs font-bold text-white">
          {step}
        </span>
        <h2 className="text-sm sm:text-base font-bold text-gray-800">{title}</h2>
      </div>
      <div className="mt-4 sm:mt-6">{children}</div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className={cn("font-bold", accent ? "text-green-600" : "text-gray-800")}>{value}</dd>
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
        className="mx-auto grid size-20 place-items-center rounded-full bg-gradient-to-br from-green-400 to-green-600 text-white shadow-lg"
      >
        <Check className="size-10" strokeWidth={3} />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Badge variant="soft" className="mt-8 text-xs px-3 py-1">
          <PartyPopper className="size-3.5" /> Order confirmed
        </Badge>
        <h1 className="mt-5 text-2xl font-bold text-gray-900">Your order has been placed!</h1>
        <p className="mt-3 text-xs leading-relaxed text-gray-500 max-w-md mx-auto">
          Your order ID is <span className="font-bold text-purple-700">#{orderId}</span>. 
          Your chips will be kettle-cooked fresh, packed securely, and dispatched to your address shortly.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/account?tab=orders">Track Order</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/shop">Continue Shopping</Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function OrderFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="container-px mx-auto max-w-xl py-16 text-center sm:py-24">
      <motion.div
        initial={{ scale: 0, rotate: 20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="mx-auto grid size-16 place-items-center rounded-full bg-gradient-to-br from-red-400 to-red-600 text-white shadow-lg sm:size-20"
      >
        <AlertCircle className="size-8 sm:size-10" strokeWidth={3} />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Badge variant="soft" className="mt-6 border-red-200 bg-red-50 px-3 py-1 text-xs text-red-600 sm:mt-8">
          Payment not completed
        </Badge>
        <h1 className="mt-4 text-xl font-bold text-gray-900 sm:mt-5 sm:text-2xl">
          Your payment didn&apos;t go through
        </h1>
        <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-gray-500 sm:text-sm">
          Your order is saved and waiting — <strong>retry to pay for the same order</strong>, no need
          to start over. If any amount was debited, your bank refunds it within 3–5 business days.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:mt-8 sm:flex-row">
          <Button onClick={onRetry} size="lg" className="w-full sm:w-auto">
            Retry payment
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
            <Link href="/account?tab=orders">View my orders</Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
