"use client";

import * as React from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Phone, User, Mail, ArrowLeft, X, ShieldCheck, Loader2, Eye, EyeOff, Lock, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAccount, isAdminSession } from "./account-provider";
import { useStoreSettings } from "@/components/common/settings-provider";
import { useCouponPlacements } from "@/lib/hooks/use-coupon-placements";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type Step = "mobile" | "otp" | "password" | "profile";

/**
 * Unified passwordless authentication.
 *
 * The customer never picks "Login" or "Register". They verify their mobile
 * number; the backend either signs them in or auto-creates the account and
 * signs them in. Brand-new customers are then asked to complete their
 * profile (name, optional email) before continuing.
 */
function LoginGateContent() {
  const { isLoggedIn, user, sendOtp, verifyOtp, updateProfile, verifyAdminPassword } = useAccount();
  const { settings } = useStoreSettings();
  const { loginPopup: loginOffer } = useCouponPlacements();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = React.useState<Step>("mobile");
  const [phone, setPhone] = React.useState("");
  const [otpCode, setOtpCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [countdown, setCountdown] = React.useState(30);
  const [dismissed, setDismissed] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [lockoutTime, setLockoutTime] = React.useState<number>(0);

  const isProtectedPage = pathname === "/account" || pathname === "/checkout";
  const isAdminArea = pathname?.startsWith("/admin") ?? false;
  const isLoginParam = searchParams?.get("login") === "true";

  const handleClose = React.useCallback(() => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.delete("login");
      const nextQuery = params.toString();
      router.replace(`${pathname}${nextQuery ? `?${nextQuery}` : ""}`, { scroll: false });
    }
  }, [router, pathname]);

  const isAdmin = isAdminSession(user);

  const needsProfile = Boolean(
    isLoggedIn && user && !isAdmin && !(user.name || "").trim()
  );
  const showGate =
    !isAdminArea && (needsProfile || (!isLoggedIn && (isProtectedPage || isLoginParam) && !dismissed));

  // Reset dismissed state when login query parameter is active
  React.useEffect(() => {
    if (isLoginParam) {
      setDismissed(false);
    }
  }, [isLoginParam]);

  // Reset local form states when the login gate opens
  const previousShowGate = React.useRef(false);
  React.useEffect(() => {
    if (showGate && !previousShowGate.current) {
      setStep("mobile");
      setPhone("");
      setOtpCode("");
      setName("");
      setEmail("");
      setError("");
      setPassword("");
    }
    previousShowGate.current = showGate;
  }, [showGate]);

  // OTP resend countdown
  React.useEffect(() => {
    if (step !== "otp" || countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [step, countdown]);

  // Lockout countdown timer
  React.useEffect(() => {
    if (lockoutTime <= 0) return;
    const timer = setInterval(() => {
      setLockoutTime((t) => t - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutTime]);

  if (!showGate) return null;

  // Force the profile step for auto-created customers.
  const activeStep: Step = needsProfile ? "profile" : step;

  const isValidPhone = (v: string) => v.replace(/\D/g, "").length === 10;

  const requestOtp = async (target: string) => {
    const res = await sendOtp(target);
    if (!res.success) {
      setError(res.message || "Couldn't send the verification code.");
      if (res.remainingSeconds) {
        setLockoutTime(res.remainingSeconds);
      }
      return false;
    }
    setCountdown(30);
    if (res.otp) {
      // Development convenience: backend echoes the code so it's testable.
      toast.info("Verification code sent", { description: `Demo OTP: ${res.otp}` });
    } else {
      toast.success("Verification code sent", { description: `Sent to +91 ${target}` });
    }
    return true;
  };

  /** Step 1 — mobile number → send OTP or request password */
  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isValidPhone(phone)) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setLoading(true);
    const res = await sendOtp(phone);
    setLoading(false);
    if (!res.success) {
      setError(res.message || "Couldn't send the verification code.");
      if (res.remainingSeconds) {
        setLockoutTime(res.remainingSeconds);
      }
      return;
    }

    if (res.passwordRequired) {
      setPassword("");
      setShowPassword(false);
      setStep("password");
      toast.info("Admin password required", { description: "Please authenticate with your secure password." });
    } else {
      setOtpCode("");
      setStep("otp");
      setCountdown(30);
      if (res.otp) {
        toast.info("Verification code sent", { description: `Demo OTP: ${res.otp}` });
      } else {
        toast.success("Verification code sent", { description: `Sent to +91 ${phone}` });
      }
    }
  };

  /** Step 2b — verify admin password */
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!password) {
      setError("Please enter your password.");
      return;
    }
    setLoading(true);
    const res = await verifyAdminPassword(phone, password);
    setLoading(false);

    if (!res.success) {
      setError(res.message || "Incorrect password. Please try again.");
      return;
    }

    toast.success("Signed in as admin", { description: "Opening the admin console…" });
    router.push("/admin/dashboard");
  };

  /** Step 2 — verify OTP → auto login or auto register */
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (otpCode.replace(/\D/g, "").length !== 6) {
      setError("Enter the 6-digit code we sent you.");
      return;
    }
    setLoading(true);
    const res = await verifyOtp(phone, otpCode);
    setLoading(false);

    if (!res.success) {
      setError(res.message || "Incorrect code. Please try again.");
      if (res.remainingSeconds) {
        setLockoutTime(res.remainingSeconds);
      }
      return;
    }

    // The store owner signed in — send them to the console, not a customer
    // profile step. They have no customer account and never will.
    if (res.isAdmin) {
      toast.success("Signed in as admin", { description: "Opening the admin console…" });
      router.push("/admin/dashboard");
      return;
    }

    if (res.isNewUser || !res.profileComplete) {
      // Auto-created — collect their name next. `needsProfile` keeps us open.
      setStep("profile");
      toast.success("Mobile verified", { description: "Just one more step." });
    } else {
      toast.success("Welcome back!", { description: "You're signed in." });
      if (pathname === "/account") {
        router.push("/");
      }
    }
  };

  /** Step 3 — complete profile (new customers only) */
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (name.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }
    setLoading(true);
    try {
      await updateProfile({ name: name.trim(), ...(email.trim() ? { email: email.trim() } : {}) });
      toast.success("Welcome to Ratalu Chips!", { description: "Your account is ready." });
      if (pathname === "/account") {
        router.push("/");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    await requestOtp(phone);
    setOtpCode("");
    setLoading(false);
  };

  const titles: Record<Step, { title: string; subtitle: string }> = {
    mobile: {
      title: "Verify Your Mobile Number",
      subtitle: "Enter your mobile number to continue.",
    },
    otp: {
      title: "Enter Verification Code",
      subtitle: `We sent a 6-digit code to +91 ${phone}.`,
    },
    password: {
      title: "Admin Security Login",
      subtitle: "Enter your admin security password to access the console.",
    },
    profile: {
      title: "Complete Your Profile",
      subtitle: "Tell us your name so we can personalise your orders.",
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-gray-900/60 p-4 backdrop-blur-sm animate-[fade-in_0.3s_ease]">
      <div className="relative flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl animate-[modal-in_0.4s_cubic-bezier(0.22,1,0.36,1)] sm:p-7">
        {/* Close — never on a protected page, never mid-profile */}
        {!isProtectedPage && !needsProfile && (
          <button
            onClick={handleClose}
            aria-label="Close"
            className="absolute right-3.5 top-3.5 z-10 grid size-8 place-items-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="size-4" />
          </button>
        )}

        {/* Back — only from the OTP or Password steps */}
        {(activeStep === "otp" || activeStep === "password") && (
          <button
            onClick={() => {
              setStep("mobile");
              setError("");
            }}
            aria-label="Back"
            className="absolute left-3.5 top-3.5 z-10 grid size-8 place-items-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <ArrowLeft className="size-4" />
          </button>
        )}

        {/* Header */}
        <div className="mt-1 flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-purple-100 bg-purple-50 p-1 shadow-sm">
            <Image src="/logo.jpg" alt="Ratalu Chips" width={40} height={40} className="rounded-xl object-cover" />
          </div>
          <div>
            <h2 className="text-lg font-bold leading-tight text-gray-900">{titles[activeStep].title}</h2>
            <p className="mx-auto mt-1 max-w-[280px] text-xs text-gray-500">{titles[activeStep].subtitle}</p>
          </div>
        </div>

        {/*
          The offer the admin has pinned to this popup on the Coupons page.
          Nothing is shown unless a real, active, redeemable coupon holds the
          slot — the old version printed a code straight from Settings that had
          never been created, so everyone who typed it was told it was invalid.
        */}
        {activeStep !== "profile" && loginOffer && (
          <div className="flex w-full items-center gap-2.5 rounded-xl border border-orange-100 bg-orange-50 p-2.5">
            <div className="text-left">
              <span className="text-[9px] font-bold uppercase tracking-wider text-orange-600">
                {loginOffer.firstOrderOnly ? "First order discount" : "Discount code"}
              </span>
              <p className="mt-0.5 text-xs font-extrabold leading-none text-gray-800">
                Code: {loginOffer.code} ({loginOffer.displayLabel})
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        {/* STEP 1 — mobile */}
        {activeStep === "mobile" && (
          <form onSubmit={handleContinue} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="phone" className="text-xs font-bold text-gray-700">
                Mobile Number
              </label>
              <div className="flex h-12 w-full items-center overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all focus-within:border-[#5B2C83] focus-within:ring-4 focus-within:ring-[#5B2C83]/10 shadow-2xs">
                <div className="flex h-full items-center gap-1.5 border-r border-gray-200 bg-gray-50/80 px-3.5 text-sm font-extrabold text-gray-700 shrink-0 select-none">
                  <Phone className="size-4 text-[#5B2C83]" />
                  <span>+91</span>
                </div>
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={10}
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                    setError("");
                  }}
                  className="h-full w-full flex-1 bg-transparent px-3.5 text-base font-extrabold tracking-wide text-gray-900 placeholder:text-gray-400 placeholder:font-normal focus:outline-none"
                />
              </div>
            </div>

            {lockoutTime > 0 && (
              <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-medium text-red-700">
                Too many OTP requests. Please try again after {Math.floor(lockoutTime / 60)}:{(lockoutTime % 60).toString().padStart(2, '0')} minutes.
              </div>
            )}

            <Button type="submit" size="lg" className="h-12 w-full rounded-2xl bg-[#5B2C83] hover:bg-[#4a236c] font-bold text-white shadow-md transition-all active:scale-[0.99]" disabled={loading || lockoutTime > 0}>
              {loading ? <><Loader2 className="animate-spin" /> Sending…</> : "Continue"}
            </Button>

            <p className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-gray-400">
              <ShieldCheck className="size-3.5 text-purple-600" /> No password needed — we verify by OTP.
            </p>
          </form>
        )}

        {/* STEP 2 — OTP */}
        {activeStep === "otp" && (
          <form onSubmit={handleVerify} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="otp" className="text-xs font-bold text-gray-700">
                Verification Code
              </label>
              <div className="flex h-12 w-full items-center overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all focus-within:border-[#5B2C83] focus-within:ring-4 focus-within:ring-[#5B2C83]/10 shadow-2xs">
                <div className="flex h-full items-center justify-center border-r border-gray-200 bg-gray-50/80 px-3.5 shrink-0">
                  <KeyRound className="size-4 text-[#5B2C83]" />
                </div>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="● ● ● ● ● ●"
                  value={otpCode}
                  onChange={(e) => {
                    setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setError("");
                  }}
                  className="h-full w-full flex-1 bg-transparent px-3 text-center text-base font-extrabold tracking-[0.35em] text-gray-900 placeholder:text-gray-300 focus:outline-none"
                />
              </div>
            </div>

            {lockoutTime > 0 && (
              <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-medium text-red-700">
                Too many incorrect OTP attempts. Verification locked for {Math.floor(lockoutTime / 60)}:{(lockoutTime % 60).toString().padStart(2, '0')} minutes.
              </div>
            )}

            <Button type="submit" size="lg" className="h-12 w-full rounded-2xl bg-[#5B2C83] hover:bg-[#4a236c] font-bold text-white shadow-md transition-all active:scale-[0.99]" disabled={loading || lockoutTime > 0}>
              {loading ? <><Loader2 className="animate-spin" /> Verifying…</> : "Verify & Continue"}
            </Button>

            <button
              type="button"
              onClick={handleResend}
              disabled={countdown > 0 || loading || lockoutTime > 0}
              className={cn(
                "text-center text-xs font-bold transition-colors",
                (countdown > 0 || lockoutTime > 0) ? "cursor-not-allowed text-gray-400" : "text-purple-700 hover:underline"
              )}
            >
              {lockoutTime > 0
                ? `Resend locked`
                : countdown > 0 
                  ? `Resend code in ${countdown}s` 
                  : "Resend code"
              }
            </button>
          </form>
        )}

        {/* STEP 2b — Password */}
        {activeStep === "password" && (
          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-xs font-bold text-gray-700">
                Security Password
              </label>
              <div className="flex h-12 w-full items-center overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all focus-within:border-[#5B2C83] focus-within:ring-4 focus-within:ring-[#5B2C83]/10 shadow-2xs">
                <div className="flex h-full items-center justify-center border-r border-gray-200 bg-gray-50/80 px-3.5 shrink-0">
                  <Lock className="size-4 text-[#5B2C83]" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter security password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  className="h-full w-full flex-1 bg-transparent px-3 text-sm font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="grid size-10 place-items-center pr-2 text-gray-400 transition-colors hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" size="lg" className="h-12 w-full rounded-2xl bg-[#5B2C83] hover:bg-[#4a236c] font-bold text-white shadow-md transition-all active:scale-[0.99]" disabled={loading}>
              {loading ? <><Loader2 className="animate-spin" /> Verifying…</> : "Sign In to Console"}
            </Button>
          </form>
        )}

        {/* STEP 3 — complete profile */}
        {activeStep === "profile" && (
          <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-xs font-bold text-gray-700">
                Full Name
              </label>
              <div className="flex h-12 w-full items-center overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all focus-within:border-[#5B2C83] focus-within:ring-4 focus-within:ring-[#5B2C83]/10 shadow-2xs">
                <div className="flex h-full items-center justify-center border-r border-gray-200 bg-gray-50/80 px-3.5 shrink-0">
                  <User className="size-4 text-[#5B2C83]" />
                </div>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  placeholder="e.g. Ananya Mehta"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError("");
                  }}
                  className="h-full w-full flex-1 bg-transparent px-3 text-sm font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-xs font-bold text-gray-700">
                Email Address <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <div className="flex h-12 w-full items-center overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all focus-within:border-[#5B2C83] focus-within:ring-4 focus-within:ring-[#5B2C83]/10 shadow-2xs">
                <div className="flex h-full items-center justify-center border-r border-gray-200 bg-gray-50/80 px-3.5 shrink-0">
                  <Mail className="size-4 text-[#5B2C83]" />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  className="h-full w-full flex-1 bg-transparent px-3 text-sm font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none"
                />
              </div>
            </div>

            <Button type="submit" size="lg" className="h-12 w-full rounded-2xl bg-[#5B2C83] hover:bg-[#4a236c] font-bold text-white shadow-md transition-all active:scale-[0.99]" disabled={loading}>
              {loading ? <><Loader2 className="animate-spin" /> Saving…</> : "Save & Continue"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

export function LoginGate() {
  return (
    <React.Suspense fallback={null}>
      <LoginGateContent />
    </React.Suspense>
  );
}
