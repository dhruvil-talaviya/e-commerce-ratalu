"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  RotateCcw,
  ShoppingBag,
  LifeBuoy,
  ShieldAlert,
  ArrowRight,
  Copy,
  Check,
  CreditCard,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api";

// ─── Razorpay script loader ────────────────────────────────────────────────────
const loadRazorpayScript = (): Promise<boolean> =>
  new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if ((window as any).Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

// ─── State machine for the retry flow ─────────────────────────────────────────
type RetryState =
  | "idle"        // initial — showing error, waiting for user action
  | "loading"     // calling /payment/retry-order
  | "gateway"     // Razorpay modal is open
  | "verifying"   // calling /payment/verify
  | "success"     // payment verified ✅
  | "failed";     // retry itself failed ❌

function PaymentFailedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderId = searchParams.get("orderId") || "";
  const initialReason =
    searchParams.get("reason") ||
    "Payment transaction was cancelled or declined by your bank.";

  const [copied, setCopied] = React.useState(false);
  const [retryState, setRetryState] = React.useState<RetryState>("idle");
  const [retryError, setRetryError] = React.useState("");
  const [attemptCount, setAttemptCount] = React.useState(0);

  const handleCopy = () => {
    if (!orderId) return;
    navigator.clipboard.writeText(orderId);
    setCopied(true);
    toast.success("Order ID copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Main retry handler ──────────────────────────────────────────────────────
  const handleRetryPayment = async () => {
    if (!orderId) {
      toast.error("No order ID found. Please check your Orders.");
      return;
    }

    setRetryState("loading");
    setRetryError("");

    try {
      // 1. Get a fresh Razorpay gateway order for the SAME MongoDB order
      const retryRes = await apiFetch<any>(`/payment/retry-order/${orderId}`, {
        method: "POST",
      });

      const rzpData = retryRes?.razorpay;
      if (!rzpData?.orderId) {
        throw new Error(
          retryRes?.message || "Could not initialise payment gateway. Please try again."
        );
      }

      // 2. Load the Razorpay SDK
      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded) {
        throw new Error("Payment SDK failed to load. Please refresh and try again.");
      }

      setRetryState("gateway");

      // 3. Open Razorpay checkout
      await new Promise<void>((resolve, reject) => {
        const rzp = new (window as any).Razorpay({
          key: rzpData.keyId,
          amount: rzpData.amount,
          currency: rzpData.currency,
          name: "Ratalu Wafers",
          description: `Retry Payment for Order #${orderId}`,
          order_id: rzpData.orderId,

          handler: async function (response: any) {
            // 4. Verify the payment on the backend
            setRetryState("verifying");
            try {
              await apiFetch("/payment/verify", {
                method: "POST",
                body: {
                  orderId,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                },
              });
              setRetryState("success");
              setAttemptCount((c) => c + 1);
              resolve();
            } catch (verifyErr: any) {
              reject(new Error(verifyErr.message || "Payment verification failed."));
            }
          },

          modal: {
            ondismiss: () => {
              // User closed the popup — back to idle so they can try again
              setRetryState("idle");
              setRetryError("Payment window closed. You can try again below.");
              resolve();
            },
          },

          theme: { color: "#4A1942" },
        });

        rzp.on("payment.failed", function (response: any) {
          const msg =
            response.error?.description ||
            "Payment declined. Please try a different payment method.";
          reject(new Error(msg));
        });

        rzp.open();
      });
    } catch (err: any) {
      setRetryState("failed");
      const msg = err.message || "Something went wrong. Please try again.";
      setRetryError(msg);
      // Don't throw — we handle the error in-page
    }
  };

  // Auto-redirect to success after 3s when verified
  React.useEffect(() => {
    if (retryState === "success") {
      const t = setTimeout(() => {
        router.push(`/order-success?orderId=${orderId}`);
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [retryState, orderId, router]);

  // ── Success screen ──────────────────────────────────────────────────────────
  if (retryState === "success") {
    return (
      <div className="min-h-[85vh] bg-gradient-to-b from-emerald-50/60 via-white to-purple-50/20 py-12 px-4 sm:px-6 flex items-center justify-center">
        <div className="mx-auto max-w-md w-full text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="mx-auto mb-6 flex size-24 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-lg shadow-emerald-200"
          >
            <CheckCircle2 className="size-12 stroke-[2]" />
          </motion.div>
          <h1 className="font-serif text-3xl font-extrabold text-gray-900">
            Payment Successful! 🎉
          </h1>
          <p className="mt-3 text-sm font-medium text-gray-500">
            Your order <span className="font-bold text-gray-800">#{orderId}</span> has been confirmed.
          </p>
          <p className="mt-1 text-xs text-gray-400">Redirecting to your order summary…</p>
          <div className="mt-6 flex justify-center">
            <div className="size-5 animate-spin rounded-full border-2 border-purple-700 border-t-transparent" />
          </div>
        </div>
      </div>
    );
  }

  // ── Main failed / retry screen ──────────────────────────────────────────────
  const isLoading = retryState === "loading" || retryState === "verifying" || retryState === "gateway";

  return (
    <div className="min-h-[85vh] bg-gradient-to-b from-red-50/50 via-white to-amber-50/20 py-10 px-4 sm:px-6 flex items-center justify-center">
      <div className="mx-auto max-w-lg w-full">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="overflow-hidden rounded-3xl border border-red-100 bg-white shadow-2xl shadow-red-900/5"
        >
          {/* ── Top gradient bar ─────────────────────────────────────────────── */}
          <div className="h-1.5 w-full bg-gradient-to-r from-red-400 via-orange-400 to-amber-400" />

          <div className="p-6 sm:p-10 text-center">
            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 280, damping: 18, delay: 0.1 }}
              className="mx-auto mb-5 flex size-20 items-center justify-center rounded-full bg-red-100 text-red-500 shadow-inner shadow-red-200"
            >
              {retryState === "failed" ? (
                <XCircle className="size-10 stroke-[2]" />
              ) : (
                <AlertTriangle className="size-10 stroke-[2.5]" />
              )}
            </motion.div>

            {/* Badge */}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3.5 py-1 text-xs font-extrabold text-red-700 border border-red-200 mb-3">
              <CreditCard className="size-3 text-red-500" />
              {retryState === "failed" ? "Retry Failed" : "Payment Declined"}
            </span>

            {/* Title */}
            <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              {retryState === "failed" ? "Payment Failed Again" : "Payment Unsuccessful"}
            </h1>

            {/* Reason */}
            <p className="mt-3 text-sm text-gray-500 font-medium leading-relaxed max-w-md mx-auto">
              {retryState === "failed" && retryError
                ? retryError
                : retryState === "idle" && retryError
                ? retryError
                : initialReason}
            </p>

            {/* Order ID card */}
            {orderId && (
              <div className="mt-5 rounded-2xl border border-red-100 bg-red-50/40 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                <div>
                  <p className="text-[10px] font-extrabold text-red-700 uppercase tracking-wider">
                    Order Reference
                  </p>
                  <p className="font-mono text-sm font-extrabold text-gray-900 mt-0.5">
                    #{orderId}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="h-8 text-xs border-red-200 text-red-700 hover:bg-red-100 rounded-xl font-bold shrink-0"
                >
                  {copied ? (
                    <Check className="size-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  {copied ? "Copied!" : "Copy ID"}
                </Button>
              </div>
            )}

            {/* Money safety notice */}
            <div className="mt-4 rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4 text-left flex items-start gap-3">
              <ShieldAlert className="size-4.5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed">
                <span className="font-bold">Money safe? </span>
                If any amount was deducted, it will be automatically refunded by your bank
                within <strong>3–5 business days</strong>. Nothing was charged for a failed payment.
              </p>
            </div>

            {/* ── PRIMARY CTA: Retry Payment ──────────────────────────────── */}
            {orderId && (
              <div className="mt-7">
                <Button
                  size="lg"
                  disabled={isLoading}
                  onClick={handleRetryPayment}
                  className="w-full h-14 rounded-2xl bg-[#5B2C83] hover:bg-[#451A67] active:scale-[0.98] font-extrabold text-sm shadow-lg shadow-purple-900/25 flex items-center justify-center gap-2.5 transition-all"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {retryState === "loading" ? (
                      <motion.span
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2"
                      >
                        <Loader2 className="size-4 animate-spin" />
                        Preparing Payment…
                      </motion.span>
                    ) : retryState === "gateway" ? (
                      <motion.span
                        key="gateway"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2"
                      >
                        <Loader2 className="size-4 animate-spin" />
                        Payment Gateway Open…
                      </motion.span>
                    ) : retryState === "verifying" ? (
                      <motion.span
                        key="verifying"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2"
                      >
                        <Loader2 className="size-4 animate-spin" />
                        Verifying Payment…
                      </motion.span>
                    ) : (
                      <motion.span
                        key="idle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2"
                      >
                        <RefreshCw className="size-4" />
                        {retryState === "failed" ? "Try Again" : "Retry Payment Now"}
                        <ArrowRight className="size-4" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>

                {/* Attempt info — shown after first failed retry */}
                {retryState === "failed" && (
                  <p className="mt-2 text-xs text-gray-400 font-medium">
                    Having trouble? Try a different payment method (UPI, Card, or Netbanking) or{" "}
                    <Link href="/contact" className="text-purple-700 font-bold underline-offset-2 hover:underline">
                      contact support
                    </Link>
                    .
                  </p>
                )}
              </div>
            )}

            {/* Divider */}
            <div className="my-6 flex items-center gap-3">
              <div className="flex-1 border-t border-gray-100" />
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">or</span>
              <div className="flex-1 border-t border-gray-100" />
            </div>

            {/* Secondary actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                asChild
                variant="outline"
                size="lg"
                className="flex-1 h-11 rounded-2xl border-gray-200 hover:bg-gray-50 font-bold text-sm text-gray-700"
              >
                <Link href="/account?tab=orders" className="flex items-center justify-center gap-2">
                  <RotateCcw className="size-3.5" />
                  My Orders
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="flex-1 h-11 rounded-2xl border-gray-200 hover:bg-gray-50 font-bold text-sm text-gray-700"
              >
                <Link href="/contact" className="flex items-center justify-center gap-2">
                  <LifeBuoy className="size-3.5 text-purple-600" />
                  Support
                </Link>
              </Button>
            </div>

            {/* Return to shop */}
            <div className="mt-5 pt-4 border-t border-gray-100">
              <Link
                href="/shop"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-purple-900 transition-colors"
              >
                <ShoppingBag className="size-3.5" />
                Return to Shop
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function PaymentFailedPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="size-8 animate-spin rounded-full border-2 border-purple-800 border-t-transparent" />
        </div>
      }
    >
      <PaymentFailedContent />
    </React.Suspense>
  );
}
