"use client";

import * as React from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { KeyRound, Phone, User, ShieldAlert, ArrowLeft, X, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAccount } from "./account-provider";
import { useStoreSettings } from "@/components/common/settings-provider";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export function LoginGate() {
  const { isLoggedIn, sendOtp, verifyOtp } = useAccount();
  const { settings } = useStoreSettings();
  const pathname = usePathname();

  const [visible, setVisible] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  
  const [mode, setMode] = React.useState<"login" | "register">("login");
  const [step, setStep] = React.useState<"mobile" | "otp">("mobile");
  
  const [phone, setPhone] = React.useState("");
  const [name, setName] = React.useState("");
  const [otpCode, setOtpCode] = React.useState("");
  const [countdown, setCountdown] = React.useState(30);
  const [resendActive, setResendActive] = React.useState(false);

  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const isProtectedPage = pathname === "/account" || pathname === "/checkout";

  // Control visibility - only show if on protected pages (account, checkout) and not logged in
  React.useEffect(() => {
    if (isLoggedIn) {
      setVisible(false);
      return;
    }

    if (isProtectedPage) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [isLoggedIn, isProtectedPage]);

  // Timer countdown for OTP
  React.useEffect(() => {
    if (step !== "otp" || countdown <= 0) {
      if (countdown === 0) setResendActive(true);
      return;
    }
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [step, countdown]);

  if (!visible || isLoggedIn) return null;

  const handleClose = () => {
    if (isProtectedPage) {
      toast.error("Sign-in required to view this page.");
      return;
    }
    setVisible(false);
    localStorage.setItem("ratalu.welcomeDismissed", "true");
  };

  const copyCouponCode = () => {
    navigator.clipboard.writeText(settings.welcomeOfferCoupon || "WELCOME10");
    setCopied(true);
    toast.success(`Coupon code ${settings.welcomeOfferCoupon} copied!`);
    setTimeout(() => setCopied(false), 2000);
  };

  const isValidPhone = (num: string) => {
    const cleaned = num.replace(/\D/g, "");
    return cleaned.length === 10;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isValidPhone(phone)) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (mode === "register" && !name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    setLoading(true);
    const result = await sendOtp(phone);
    setLoading(false);

    if (!result.success) {
      setError(result.message || "Failed to dispatch verification code.");
      return;
    }

    setCountdown(30);
    setResendActive(false);
    setStep("otp");

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

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (otpCode.length !== 6) {
      setError("OTP must be exactly 6 digits.");
      return;
    }

    setLoading(true);
    const result = await verifyOtp(phone, otpCode, mode, name);
    setLoading(false);

    if (result.success) {
      if (mode === "login") {
        toast.success("Welcome back!", { description: "Logged in successfully via OTP." });
      } else {
        toast.success("Welcome to Ratalu Chips!", { description: "Account created successfully." });
      }
    } else {
      if (result.message && result.message.includes("No profile registered")) {
        setMode("register");
        setStep("mobile");
        setError("No profile registered for this number. Complete registration details below.");
      } else {
        setError(result.message || "Invalid OTP code. Please try again.");
      }
    }
  };

  const handleResend = async () => {
    setLoading(true);
    const result = await sendOtp(phone);
    setLoading(false);

    if (!result.success) {
      setError(result.message || "Failed to resend code.");
      return;
    }

    setCountdown(30);
    setResendActive(false);
    setOtpCode("");

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

  const resetGate = () => {
    setStep("mobile");
    setError("");
    setOtpCode("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-[fade-in_0.3s_ease]">
      {/* Clean Single-Column Authentication Card */}
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-gray-250 bg-white p-6 sm:p-7 shadow-2xl flex flex-col gap-4 animate-[modal-in_0.4s_cubic-bezier(0.22,1,0.36,1)]">
        
        {/* Close button X */}
        {!isProtectedPage && (
          <button
            onClick={handleClose}
            className="absolute right-3.5 top-3.5 z-10 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        )}

        {/* Modal Header */}
        <div className="flex flex-col items-center text-center gap-2 mt-1">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-purple-100 bg-purple-50 p-1 shadow-sm">
            <Image
              src="/logo.jpg"
              alt="Ratalu Chips Logo"
              width={40}
              height={40}
              className="rounded-xl object-cover"
            />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 leading-tight">
              {mode === "login" ? "Sign In to Ratalu" : "Register Account"}
            </h2>
            <p className="text-xs text-gray-500 mt-1 max-w-[280px]">
              {mode === "login"
                ? "Enter your mobile number to sign in via OTP."
                : "Create an account to track orders and save details."}
            </p>
          </div>
        </div>

        {/* Promotional Coupon Chip */}
        <button
          onClick={copyCouponCode}
          className="w-full flex items-center justify-between gap-2.5 rounded-xl bg-orange-50 hover:bg-orange-100/70 border border-orange-100 p-2.5 transition-colors focus:outline-none"
        >
          <div className="text-left">
            <span className="text-[9px] font-bold uppercase text-orange-600 tracking-wider">Newcomer Discount Code</span>
            <p className="text-xs font-extrabold text-gray-800 leading-none mt-0.5">
              Code: {settings.welcomeOfferCoupon} ({settings.welcomeOfferDiscount})
            </p>
          </div>
          <span className="text-[10px] font-bold text-orange-600 inline-flex items-center gap-1">
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
            {copied ? "Copied" : "Copy"}
          </span>
        </button>

        {/* Error notification */}
        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-700 border border-red-100">
            <ShieldAlert className="size-4 shrink-0 text-red-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Auth Steps */}
        {step === "mobile" ? (
          <form onSubmit={handleSendOtp} className="flex flex-col gap-3.5">
            {/* Login / Register tab selectors */}
            <div className="flex gap-1 rounded-xl bg-gray-50 p-1 border border-gray-150">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
                className={cn(
                  "flex-1 rounded-lg py-2 text-xs font-bold transition-all focus:outline-none",
                  mode === "login" ? "bg-purple-600 text-white shadow-sm" : "text-gray-500 hover:text-purple-700"
                )}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError("");
                }}
                className={cn(
                  "flex-1 rounded-lg py-2 text-xs font-bold transition-all focus:outline-none",
                  mode === "register" ? "bg-purple-600 text-white shadow-sm" : "text-gray-500 hover:text-purple-700"
                )}
              >
                Register
              </button>
            </div>

            {mode === "register" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Full Name</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <User className="size-4" />
                  </span>
                  <Input
                    required
                    placeholder="Enter full name"
                    className="pl-10 h-11 text-sm border-gray-200 bg-white"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
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

            <Button type="submit" size="lg" className="w-full mt-1">
              {loading ? "Requesting..." : "Send Verification OTP"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Verification Code</label>
                <button
                  type="button"
                  onClick={resetGate}
                  className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-1 focus:outline-none"
                >
                  <ArrowLeft className="size-3" /> Change number
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <KeyRound className="size-4" />
                </span>
                <Input
                  required
                  maxLength={6}
                  placeholder="6-digit OTP"
                  className="pl-10 h-11 text-center font-bold tracking-[0.2em] text-sm border-gray-200 bg-white"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                />
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full">
              Verify & Continue
            </Button>

            <div className="flex items-center justify-center text-xs text-gray-500 gap-1.5 border-t border-gray-100 pt-3">
              {resendActive ? (
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-purple-600 font-bold hover:underline focus:outline-none"
                >
                  Resend Code
                </button>
              ) : (
                <span>Resend code in {countdown}s</span>
              )}
            </div>
          </form>
        )}

        {/* Continue Shopping button */}
        {!isProtectedPage && (
          <button
            onClick={handleClose}
            className="text-center text-xs font-bold text-gray-400 hover:text-gray-600 py-1 transition-colors focus:outline-none mt-1"
          >
            Continue Shopping
          </button>
        )}
      </div>
    </div>
  );
}
