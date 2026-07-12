"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { KeyRound, Phone, ShieldAlert, ArrowLeft, RefreshCw, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAccount } from "@/components/account/account-provider";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export default function AdminLoginPage() {
  const { isLoggedIn, sendAdminOtp, verifyAdminOtp, user } = useAccount();
  const router = useRouter();
  const [step, setStep] = React.useState<"mobile" | "otp">("mobile");
  
  const [phone, setPhone] = React.useState("");
  const [otpCode, setOtpCode] = React.useState("");
  const [countdown, setCountdown] = React.useState(30);
  const [resendActive, setResendActive] = React.useState(false);

  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

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

  // Protect page: Redirect if already logged in as Admin
  React.useEffect(() => {
    if (isLoggedIn && user?.role === "Admin") {
      router.push("/admin/dashboard");
    } else if (isLoggedIn && user?.role === "Customer") {
      router.push("/account"); // Customers shouldn't access admin login
    }
  }, [isLoggedIn, user, router]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (phone.replace(/\D/g, "") !== "9999999999") {
      setError("Unauthorized access. This gate is restricted to Admin Store Owners only.");
      return;
    }

    setLoading(true);
    const result = await sendAdminOtp(phone);
    setLoading(false);

    if (!result.success) {
      setError(result.message || "Failed to dispatch verification code.");
      return;
    }

    setCountdown(30);
    setResendActive(false);
    setStep("otp");

    if (result.otp) {
      toast.info("Admin Authentication Required", {
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
    const result = await verifyAdminOtp(phone, otpCode);
    setLoading(false);

    if (result.success) {
      toast.success("Access Granted", { description: "Authenticated successfully as Store Owner." });
      router.push("/admin/dashboard");
    } else {
      setError(result.message || "Invalid OTP code. Please enter the generated code.");
    }
  };

  const handleResend = async () => {
    setLoading(true);
    const result = await sendAdminOtp(phone);
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
        description: `Resent Admin OTP Code: ${result.otp}`,
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 selection:bg-purple-500 selection:text-white">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-1/4 left-1/4 -z-10 size-80 rounded-full bg-purple-500/10 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 -z-10 size-80 rounded-full bg-orange-500/10 blur-3xl" />

      <div className="w-full max-w-md overflow-hidden rounded-[16px] border border-gray-200 bg-white p-6 shadow-xl sm:p-8">
        <div className="text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-purple-100 bg-white p-1 shadow-sm">
            <Image
              src="/logo.jpg"
              alt="Ratalu Wafers Logo"
              width={48}
              height={48}
              className="rounded-full object-cover"
            />
          </div>
          <h1 className="mt-4 font-brand text-3xl font-extrabold leading-none text-gray-900">
            Admin <span className="text-purple-600">Portal</span>
          </h1>
          <p className="mt-2 text-xs text-gray-500">
            {step === "mobile" 
              ? "Restricted Access. Store manager login page."
              : `Admin verification code sent to +91 ${phone}`}
          </p>
        </div>

        {error && (
          <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-red-50 p-3.5 text-xs font-semibold text-red-700 border border-red-100">
            <ShieldAlert className="size-4 shrink-0 text-red-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {step === "mobile" ? (
          <form onSubmit={handleSendOtp} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Admin Mobile
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-xs">
                  +91
                </span>
                <Input
                  required
                  type="tel"
                  maxLength={10}
                  placeholder="9999999999"
                  className="pl-13 h-11 border-gray-200 focus-visible:ring-purple-500/20 text-gray-800 font-medium tracking-wide"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                />
              </div>
            </div>

            <Button type="submit" size="lg" className="mt-2 w-full" disabled={loading}>
              {loading ? "Verifying Authority..." : "Send Admin OTP"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="mt-6 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Verification Code
                </label>
                <button
                  type="button"
                  onClick={resetGate}
                  className="text-[11px] font-semibold text-purple-600 hover:underline flex items-center gap-1 focus:outline-none"
                >
                  <ArrowLeft className="size-3" /> Change Number
                </button>
              </div>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <KeyRound className="size-4" />
                </span>
                <Input
                  required
                  type="text"
                  maxLength={6}
                  placeholder="6-digit OTP code"
                  className="pl-11 h-11 text-center font-bold tracking-[0.25em] text-lg border-gray-200 focus-visible:ring-purple-500/20 text-gray-800"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                />
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "Verifying..." : "Verify & Enter Console"}
            </Button>

            <div className="flex items-center justify-center text-xs text-gray-500 gap-1.5 border-t border-gray-100 pt-4">
              {resendActive ? (
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-purple-600 font-bold hover:underline inline-flex items-center gap-1 focus:outline-none"
                >
                  <RefreshCw className="size-3.5" /> Resend OTP Code
                </button>
              ) : (
                <span>Resend OTP code in <span className="font-bold text-gray-700">{countdown}s</span></span>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
