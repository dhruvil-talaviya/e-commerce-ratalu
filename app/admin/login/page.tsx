"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, Eye, EyeOff, Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { useAccount, isAdminSession } from "@/components/account/account-provider";
import { Logo } from "@/components/layout/logo";
import { toast } from "@/components/ui/toast";

export default function AdminLoginPage() {
  const router = useRouter();
  const { isLoggedIn, user, hydrated, loginWithEmailPassword } = useAccount();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

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
          <div className="flex flex-col items-center text-center mb-8">
            <div className="size-14 rounded-2xl bg-gradient-to-br from-[#4A1942]/10 to-amber-100/40 border border-[#4A1942]/15 flex items-center justify-center mb-5 shadow-sm">
              <Logo className="h-9 w-auto" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-100 text-purple-800 text-[11px] font-semibold tracking-wide mb-3">
              <ShieldCheck className="size-3.5" />
              <span>admin panel</span>
            </div>

            <h1 className="font-serif text-[26px] sm:text-[30px] font-black text-[#2A1028] leading-tight">
              welcome back
            </h1>
            <p className="mt-2 text-[13px] text-gray-500 font-medium leading-relaxed max-w-[280px]">
              sign in with your admin credentials to manage the store
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 flex items-start gap-2.5 rounded-2xl bg-red-50/80 p-3.5 text-[12px] font-semibold text-red-600 border border-red-100">
              <AlertCircle className="size-4 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-[12px] font-bold text-gray-600 mb-1.5 ml-0.5">
                email address
              </label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-[16px] text-gray-400 group-focus-within:text-[#4A1942] transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder=""
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-4 h-[48px] text-[14px] rounded-[14px] border border-gray-200 bg-gray-50/60 focus:bg-white focus:border-[#4A1942] focus:ring-2 focus:ring-[#4A1942]/15 outline-none transition-all font-medium text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[12px] font-bold text-gray-600 ml-0.5">
                  password
                </label>
                <button
                  type="button"
                  onClick={() => toast.info("Please contact super admin to reset your password.")}
                  className="text-[11px] text-purple-700 hover:text-purple-900 font-semibold hover:underline cursor-pointer"
                >
                  forgot password?
                </button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-[16px] text-gray-400 group-focus-within:text-[#4A1942] transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=""
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-12 h-[48px] text-[14px] rounded-[14px] border border-gray-200 bg-gray-50/60 focus:bg-white focus:border-[#4A1942] focus:ring-2 focus:ring-[#4A1942]/15 outline-none transition-all font-medium text-gray-900 placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer p-0.5 rounded-md hover:bg-gray-100 transition-colors"
                  aria-label={showPassword ? "hide password" : "show password"}
                >
                  {showPassword ? <EyeOff className="size-[16px]" /> : <Eye className="size-[16px]" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-[50px] rounded-2xl bg-gradient-to-r from-[#4A1942] to-[#5B2C83] hover:from-[#381132] hover:to-[#481f6d] text-white font-bold text-[14px] shadow-lg shadow-purple-900/25 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <Loader2 className="size-5 animate-spin text-white/90" />
              ) : (
                <>
                  <ShieldCheck className="size-4" />
                  <span>sign in</span>
                </>
              )}
            </button>
          </form>

          {/* Footer hint */}
          <p className="mt-6 text-center text-[11px] text-gray-400 font-medium leading-relaxed">
            this is a restricted area. only authorized administrators can access the management panel.
          </p>
        </div>

        {/* Branding footer */}
        <p className="mt-6 text-center text-[11px] text-white/30 font-medium">
          yamora admin &middot; ratalu wafers
        </p>
      </div>
    </div>
  );
}
