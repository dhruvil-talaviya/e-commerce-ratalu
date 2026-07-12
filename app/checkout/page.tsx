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
  Phone,
  KeyRound,
  ShieldCheck,
  MapPin,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/components/cart/cart-provider";
import { useAccount } from "@/components/account/account-provider";
import { useOrders } from "@/components/shop/order-provider";
import { formatINR, cn } from "@/lib/utils";
import { SITE } from "@/lib/constants";
import { toast } from "@/components/ui/toast";

type PayMethod = "upi" | "card" | "netbanking";
const PAY_METHODS: { key: PayMethod; label: string; icon: React.ElementType; hint: string }[] = [
  { key: "upi", label: "UPI", icon: Smartphone, hint: "GPay, PhonePe, Paytm & more" },
  { key: "card", label: "Card", icon: CreditCard, hint: "Credit / Debit cards" },
  { key: "netbanking", label: "Net Banking", icon: Landmark, hint: "All major banks" },
];

export default function CheckoutPage() {
  const { items, totals, clear, coupon } = useCart();
  const { user, isLoggedIn, sendOtp, verifyOtp, addAddress, setActiveAddress } = useAccount();
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

  // Normal Checkout States
  const [method, setMethod] = React.useState<PayMethod>("upi");
  const [placing, setPlacing] = React.useState(false);
  const [orderId, setOrderId] = React.useState<string | null>(null);
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [newTag, setNewTag] = React.useState<"Home" | "Work" | "Other">("Home");
  const [addressLine, setAddressLine] = React.useState("");
  const [city, setCity] = React.useState("");
  const [state, setState] = React.useState("");
  const [pincode, setPincode] = React.useState("");
  const [locLoading, setLocLoading] = React.useState(false);
  const [checkoutError, setCheckoutError] = React.useState("");

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
    const result = await verifyOtp(phone, code, "login");
    setAuthLoading(false);

    if (result.success) {
      toast.success("Welcome back!", { description: "Logged in successfully. Saved details pre-filled." });
    } else {
      if (result.message && result.message.includes("No profile registered")) {
        setAuthStep("register");
      } else {
        setAuthError(result.message || "Invalid verification code. Please enter the correct OTP.");
      }
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
    // Register user profile via verifyOtp in "register" mode
    const result = await verifyOtp(phone, "000000", "register", regName);
    
    if (result.success) {
      // Save and link delivery address
      const fullLine = `${regHouse}, ${regStreet}, ${regArea} ${regLandmark ? `(Landmark: ${regLandmark})` : ""}`.trim();
      if (saveRegAddress) {
        try {
          await addAddress({
            tag: regTag,
            addressLine: fullLine,
            city: regCity,
            state: regState,
            pincode: regPin,
          });
        } catch (err) {
          console.error("Failed to save delivery address:", err);
        }
      }
      toast.success("Welcome!", { description: "Account created successfully. Processing your order..." });
    } else {
      setAuthError(result.message || "Failed to register account.");
    }
    setAuthLoading(false);
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError("");

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
    await new Promise((r) => setTimeout(r, 1200));

    // Save to global order provider
    const newId = await placeOrder(
      user?.name || "",
      user?.phone || "",
      items,
      totals,
      activeAddr,
      method,
      coupon?.code
    );

    setOrderId(newId);
    clear();
    setPlacing(false);
  };

  const handleUseLocation = () => {
    setLocLoading(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => {
          const mockLocations = [
            { line: "Flat 402, Sea Breeze, Marine Drive", city: "Mumbai", state: "Maharashtra", pin: "400021" },
            { line: "Block G, Naman BKC Centre, Bandra East", city: "Mumbai", state: "Maharashtra", pin: "400051" },
            { line: "B-204 Dev Aurum, Prahlad Nagar", city: "Ahmedabad", state: "Gujarat", pin: "380015" },
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
      tag: newTag,
      addressLine,
      city,
      state,
      pincode,
    });

    setNewTag("Home");
    setAddressLine("");
    setCity("");
    setState("");
    setPincode("");
    setShowAddForm(false);
  };

  const selectedAddress = user?.addresses?.find((a) => a.id === user?.activeAddressId);

  return (
    <div className="container-px mx-auto max-w-6xl py-8 sm:py-12">
      {/* Checkout Progress Steps */}
      <div className="mb-8 w-full max-w-3xl mx-auto flex items-center justify-between text-[10px] sm:text-xs font-bold text-gray-400">
        <div className="flex flex-col items-center gap-1">
          <span className="flex size-6 items-center justify-center rounded-full bg-purple-100 text-purple-700 font-bold border border-purple-200">
            ✓
          </span>
          <span className="text-gray-900">Cart</span>
        </div>
        <div className="flex-1 h-0.5 bg-purple-200 mx-2" />
        <div className="flex flex-col items-center gap-1">
          <span className={cn(
            "flex size-6 items-center justify-center rounded-full border",
            currentStepNum >= 2 ? "bg-purple-600 border-purple-600 text-white" : "bg-white border-gray-200"
          )}>
            {currentStepNum > 2 ? "✓" : "2"}
          </span>
          <span className={cn(currentStepNum >= 2 ? "text-gray-900" : "text-gray-400")}>Verification</span>
        </div>
        <div className={cn("flex-1 h-0.5 mx-2", currentStepNum >= 3 ? "bg-purple-200" : "bg-gray-200")} />
        <div className="flex flex-col items-center gap-1">
          <span className={cn(
            "flex size-6 items-center justify-center rounded-full border",
            isLoggedIn ? "bg-purple-600 border-purple-600 text-white" : "bg-white border-gray-200"
          )}>
            3
          </span>
          <span className={cn(isLoggedIn ? "text-gray-900" : "text-gray-400")}>Shipping & Pay</span>
        </div>
        <div className="flex-1 h-0.5 bg-gray-200 mx-2" />
        <div className="flex flex-col items-center gap-1">
          <span className="flex size-6 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-400">
            4
          </span>
          <span>Confirmation</span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        
        {/* --- LEFT AREA --- */}
        <div className="flex flex-col gap-6">
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
                <div className="rounded-2xl border border-red-150 bg-red-50 p-4 text-xs font-semibold text-red-700">
                  {checkoutError}
                </div>
              )}

              <form onSubmit={handlePlaceOrder} className="flex flex-col gap-6">
                {/* Delivery Address Section */}
                <Section step={1} title="Contact & Delivery Address">
                  {/* Contact Preview */}
                  <div className="grid gap-4 sm:grid-cols-2 rounded-2xl bg-gray-50 border border-gray-150 p-4 mb-5">
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
                  <div className="flex flex-col gap-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Select Delivery Address</span>
                    
                    <div className="grid gap-4 sm:grid-cols-2">
                      {user?.addresses?.map((addr) => {
                        const active = user?.activeAddressId === addr.id;
                        return (
                          <div
                            key={addr.id}
                            onClick={() => setActiveAddress(addr.id)}
                            className={cn(
                              "relative flex flex-col justify-between rounded-2xl border p-4 cursor-pointer text-left transition-all",
                              active
                                ? "border-purple-600 bg-purple-50/40 ring-1 ring-purple-500 shadow-sm"
                                : "border-gray-200 bg-white hover:border-purple-200"
                            )}
                          >
                            <div>
                              <Badge variant={addr.tag === "Home" ? "primary" : addr.tag === "Work" ? "gold" : "orange"} size="sm">
                                {addr.tag}
                              </Badge>
                              <p className="mt-3 text-xs font-semibold text-gray-600 leading-relaxed">
                                {addr.addressLine},
                                <br />
                                {addr.city}, {addr.state} {addr.pincode}
                              </p>
                            </div>

                            {active && (
                              <div className="mt-3 text-[9px] font-bold text-purple-700 uppercase tracking-wider border-t border-purple-100 pt-2">
                                ✓ Selected Address
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {!showAddForm ? (
                        <button
                          type="button"
                          onClick={() => setShowAddForm(true)}
                          className="flex min-h-[120px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-purple-200 text-purple-600 transition-colors hover:border-purple-400 hover:bg-purple-50/30"
                        >
                          <Plus className="size-5" />
                          <span className="text-xs font-bold">Add New Address</span>
                        </button>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-purple-300 bg-purple-50/10 p-4 flex flex-col gap-4 sm:col-span-2">
                          <div className="flex flex-col gap-2">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Address Type</span>
                            <div className="flex flex-wrap items-center gap-2">
                              {(["Home", "Work", "Other"] as const).map((t) => (
                                <button
                                  type="button"
                                  key={t}
                                  onClick={() => setNewTag(t)}
                                  className={cn(
                                    "rounded-lg px-3 py-1 text-xs font-semibold border transition-all focus:outline-none",
                                    newTag === t
                                      ? "bg-purple-600 border-purple-600 text-white"
                                      : "bg-white border-gray-250 text-gray-600 hover:border-purple-200"
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
                            <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Address details</label>
                            <textarea
                              required
                              rows={2}
                              placeholder="Flat / House no, building, street, area"
                              value={addressLine}
                              onChange={(e) => setAddressLine(e.target.value)}
                              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs text-gray-800 outline-none transition-all focus-visible:border-purple-400 focus-visible:ring-2 focus-visible:ring-purple-200"
                            />
                          </div>

                          <div className="grid gap-3 sm:grid-cols-3">
                            <div className="flex flex-col gap-1">
                              <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">City</label>
                              <Input required placeholder="Mumbai" className="h-9 text-xs" value={city} onChange={(e) => setCity(e.target.value)} />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">State</label>
                              <Input required placeholder="Maharashtra" className="h-9 text-xs" value={state} onChange={(e) => setState(e.target.value)} />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">PIN Code</label>
                              <Input required placeholder="400001" className="h-9 text-xs" value={pincode} onChange={(e) => setPincode(e.target.value)} />
                            </div>
                          </div>

                          <div className="flex gap-2 mt-1">
                            <button
                              type="button"
                              onClick={handleSaveAddress}
                              className="rounded-lg bg-purple-600 hover:bg-purple-700 px-4 py-2 text-xs font-bold text-white transition-colors"
                            >
                              Save Address
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowAddForm(false)}
                              className="rounded-lg hover:bg-gray-100 px-4 py-2 text-xs font-bold text-gray-700 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Section>

                {/* Payment Method Section */}
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
                              ? "border-purple-600 bg-purple-50 shadow-sm"
                              : "border-gray-200 bg-white hover:border-purple-200"
                          )}
                        >
                          <span className={cn(
                            "grid size-9 place-items-center rounded-xl",
                            active ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-400"
                          )}>
                            <Icon className="size-4.5" />
                          </span>
                          <span className="text-xs font-bold text-gray-800">{m.label}</span>
                          <span className="text-[10px] text-gray-400">{m.hint}</span>
                        </button>
                      );
                    })}
                  </div>
                </Section>
              </form>
            </>
          )}
        </div>

        {/* --- RIGHT AREA (Order Summary) --- */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col">
            <h2 className="text-base font-bold text-gray-800">Order Summary</h2>
            
            <ul className="mt-4 flex flex-col gap-3">
              {items.map((item) => (
                <li key={item.key} className="flex items-center gap-3">
                  <span
                    className="grid size-10 shrink-0 place-items-center rounded-xl text-xs font-bold text-white"
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

            <dl className="mt-5 flex flex-col gap-2.5 border-t border-gray-100 pt-5 text-xs font-semibold text-gray-500">
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

            {selectedAddress && (
              <div className="mt-4 border-t border-gray-100 pt-4 text-[10px] text-gray-400">
                <p className="font-bold text-purple-600 uppercase tracking-wider text-[9px] mb-1">Shipping Details ({selectedAddress.tag})</p>
                <p className="truncate font-semibold">{selectedAddress.addressLine}, {selectedAddress.city}</p>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
              <span className="text-sm font-bold text-gray-800">Total Amount</span>
              <span className="text-xl font-bold text-purple-700">
                {formatINR(totals.total)}
              </span>
            </div>

            {isLoggedIn ? (
              <Button type="button" onClick={handlePlaceOrder} size="lg" disabled={placing} className="mt-6 w-full">
                {placing ? (
                  <>
                    <Loader2 className="animate-spin" /> Placing Order…
                  </>
                ) : (
                  <>
                    <Lock className="size-4" /> Place Order ({formatINR(totals.total)})
                  </>
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
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-7">
      <div className="flex items-center gap-3">
        <span className="grid size-7 place-items-center rounded-lg bg-purple-600 text-xs font-bold text-white">
          {step}
        </span>
        <h2 className="text-base font-bold text-gray-800">{title}</h2>
      </div>
      <div className="mt-6">{children}</div>
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
            <Link href="/account">Track Order</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/shop">Continue Shopping</Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
