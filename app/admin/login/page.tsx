"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, Eye, EyeOff, Loader2, ShieldCheck, AlertCircle, CheckSquare, Square } from "lucide-react";
import { useAccount, isAdminSession } from "@/components/account/account-provider";
import { Logo, YamoraSymbol } from "@/components/layout/logo";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export default function AdminLoginPage() {
  const router = useRouter();
  const { isLoggedIn, user, hydrated, loginWithEmailPassword } = useAccount();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [rememberMe, setRememberMe] = React.useState(true);
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  // Restore remembered credentials on mount
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("yamora_admin_remember");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.email) setEmail(parsed.email);
        if (parsed.password) setPassword(parsed.password);
        setRememberMe(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  React.useEffect(() => {
    if (hydrated && isLoggedIn && isAdminSession(user)) {
      router.replace("/admin/dashboard");
    }
  }, [hydrated, isLoggedIn, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your admin email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    const res = await loginWithEmailPassword(email.trim(), password);
    setLoading(false);

    if (!res.success) {
      setError(res.message || "Invalid credentials. Please verify your admin email and password.");
      return;
    }

    // Save or clear Remember Me preference
    if (rememberMe) {
      try {
        localStorage.setItem(
          "yamora_admin_remember",
          JSON.stringify({ email: email.trim(), password })
        );
      } catch {
        /* ignore */
      }
    } else {
      try {
        localStorage.removeItem("yamora_admin_remember");
      } catch {
        /* ignore */
      }
    }

    toast.success("Welcome back!", { description: "Signed in to admin panel" });
    router.replace("/admin/dashboard");
  };

  if (!hydrated) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f0a14] via-[#1e1228] to-[#0d0710] p-4 sm:p-6 relative overflow-hidden">
      {/* Ambient background effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-purple-800/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-8%] w-[400px] h-[400px] rounded-full bg-amber-600/8 blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-purple-900/5 blur-[150px] pointer-events-none" />

      <div className="relative w-full max-w-[420px] z-10">
        {/* Card */}
        <div className="bg-white/[0.97] backdrop-blur-2xl rounded-[28px] p-8 sm:p-10 shadow-[0_24px_80px_rgba(0,0,0,0.45)] border border-white/20">

          {/* Logo & header */}
          <div className="flex flex-col items-center text-center mb-7">
            <div className="mb-4 flex items-center justify-center">
              <Logo zoomOnHover={false} className="h-14 sm:h-16 w-auto" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#4A1942]/10 border border-[#4A1942]/15 text-[#4A1942] text-[12px] font-bold tracking-wide mb-3">
              <ShieldCheck className="size-3.5 text-[#4A1942]" />
              <span>Admin Panel</span>
            </div>

            <h1 className="font-serif text-[28px] sm:text-[32px] font-extrabold text-[#2A1028] leading-tight">
              Welcome Back
            </h1>
            <p className="mt-2 text-[13px] text-gray-500 font-medium leading-relaxed max-w-[290px]">
              Sign in with your admin credentials to manage the store
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 flex items-start gap-2.5 rounded-2xl bg-red-50/90 p-3.5 text-[12px] font-semibold text-red-600 border border-red-150 shadow-xs">
              <AlertCircle className="size-4 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-[12px] font-bold text-gray-700 mb-1.5 ml-0.5">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400 group-focus-within:text-[#4A1942] transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@yamorawafers.com"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-4 h-[48px] text-[14px] rounded-[14px] border border-gray-200 bg-gray-50/60 focus:bg-white focus:border-[#4A1942] focus:ring-2 focus:ring-[#4A1942]/15 outline-none transition-all font-medium text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[12px] font-bold text-gray-700 ml-0.5">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => toast.info("Please contact super admin to reset your password.")}
                  className="text-[12px] text-[#4A1942] hover:text-[#5B2C83] font-bold hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400 group-focus-within:text-[#4A1942] transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-12 h-[48px] text-[14px] rounded-[14px] border border-gray-200 bg-gray-50/60 focus:bg-white focus:border-[#4A1942] focus:ring-2 focus:ring-[#4A1942]/15 outline-none transition-all font-medium text-gray-900 placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#4A1942] cursor-pointer p-1 rounded-lg hover:bg-purple-50 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between py-1">
              <label
                onClick={() => setRememberMe(!rememberMe)}
                className="flex items-center gap-2.5 text-[12px] font-semibold text-gray-700 cursor-pointer select-none"
              >
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={cn(
                      "size-4 rounded-md border flex items-center justify-center transition-all",
                      rememberMe
                        ? "bg-[#4A1942] border-[#4A1942] text-white shadow-xs"
                        : "border-gray-300 bg-white"
                    )}
                  >
                    {rememberMe && (
                      <svg className="size-3 fill-current text-white" viewBox="0 0 20 20">
                        <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-gray-800 font-semibold">Remember Me</span>
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-[52px] rounded-2xl bg-gradient-to-r from-[#4A1942] via-[#5B2C83] to-[#4A1942] hover:opacity-95 text-white font-extrabold text-[15px] tracking-wide shadow-md shadow-[#4A1942]/30 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-3"
            >
              {loading ? (
                <Loader2 className="size-5 animate-spin text-white" />
              ) : (
                <>
                  <ShieldCheck className="size-4.5 text-white" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Footer hint */}
          <p className="mt-6 text-center text-[11px] text-gray-400 font-medium leading-relaxed">
            This is a restricted area. Only authorized administrators can access the management panel.
          </p>
        </div>

        {/* Branding footer */}
        <p className="mt-6 text-center text-[12px] text-white/40 font-semibold tracking-wide">
          Yamora Admin &middot; Ratalu Wafers
        </p>
      </div>
    </div>
  );
}
