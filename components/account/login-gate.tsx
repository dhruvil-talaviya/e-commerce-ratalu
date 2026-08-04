"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X, Loader2 } from "lucide-react";
import { useAccount } from "./account-provider";
import { toast } from "@/components/ui/toast";
import { Logo } from "@/components/layout/logo";
import Link from "next/link";
import { useGoogleAuth } from "@/lib/hooks/use-google-auth";

function LoginGateContent() {
  const { isLoggedIn, hydrated, loginWithGoogle, loginWithEmailDirect } = useAccount();
  const [emailInput, setEmailInput] = React.useState("");
  const [showEmailForm, setShowEmailForm] = React.useState(false);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setLoading(true);
    const res = await loginWithEmailDirect(emailInput);
    setLoading(false);
    if (res.success) {
      toast.success(res.message || "Signed in successfully!");
      handleClose();
    } else {
      setError(res.message || "Failed to sign in. Please try again.");
    }
  };
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [dismissed, setDismissed] = React.useState(false);

  const isProtectedPage = pathname === "/checkout";
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

  const showGate = hydrated && !isAdminArea && (!isLoggedIn && (isProtectedPage || isLoginParam) && !dismissed);

  React.useEffect(() => {
    if (isLoginParam) {
      setDismissed(false);
    }
  }, [isLoginParam]);

  const { signIn } = useGoogleAuth({
    onSuccess: async (googleUser) => {
      setError("");
      setLoading(true);
      const res = await loginWithGoogle({
        googleId: googleUser.googleId,
        email: googleUser.email,
        name: googleUser.name,
        avatar: googleUser.avatar,
        idToken: googleUser.idToken,
      });
      setLoading(false);

      if (res.success) {
        toast.success(res.message || "Welcome to Yamora Ratalu Wafers!");
        handleClose();
      } else {
        setError(res.message || "Google Authentication failed. Please try again.");
      }
    },
    onError: (err) => {
      setLoading(false);
      setError(err);
    },
  });

  const handleGoogleSignIn = () => {
    setError("");
    setLoading(true);
    signIn();
    // Loading will be turned off in onSuccess/onError callback
    // But set a timeout to reset loading if user cancels the popup
    setTimeout(() => setLoading(false), 30000);
  };

  if (!showGate) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#2A1028]/75 backdrop-blur-md transition-opacity"
        onClick={handleClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-sm rounded-3xl bg-white p-8 sm:p-10 shadow-2xl transition-all z-10 my-auto border border-amber-200/40 text-center">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 grid size-8 place-items-center rounded-full bg-gray-100/80 text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>

        {/* Brand & Heading */}
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="mb-3 flex justify-center">
            <Logo className="h-14 sm:h-16 w-auto max-w-[200px] object-contain" />
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-black text-[#4A1942] tracking-tight">
            Welcome to Yamora
          </h2>
          <p className="mt-2 text-sm text-gray-600 font-medium leading-relaxed">
            Fresh Ratalu Wafers Delivered.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600 border border-red-100">
            {error}
          </div>
        )}

        {/* Authentication Options */}
        <div className="space-y-4">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="group relative flex w-full items-center justify-center gap-3.5 h-12 rounded-2xl bg-gradient-to-r from-[#4A1942] to-[#5B2C83] hover:from-[#381132] hover:to-[#481f6d] text-sm font-extrabold text-white shadow-md transition-all duration-200 active:scale-[0.99] cursor-pointer disabled:opacity-60 border border-amber-400/30"
          >
            {loading ? (
              <Loader2 className="size-5 animate-spin text-white" />
            ) : (
              <>
                <div className="p-1 rounded-full bg-white flex items-center justify-center shadow-xs">
                  <svg className="size-4 transition-transform duration-200 group-hover:scale-110" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                </div>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Legal / Policy Disclaimer */}
          <p className="text-xs text-gray-500 font-medium leading-normal px-2 pt-2">
            By continuing you agree to our{" "}
            <Link href="/policies/terms" className="text-purple-900 font-bold underline hover:text-purple-950">
              Terms
            </Link>{" "}
            &{" "}
            <Link href="/policies/privacy" className="text-purple-900 font-bold underline hover:text-purple-950">
              Privacy Policy
            </Link>
          </p>
        </div>
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
