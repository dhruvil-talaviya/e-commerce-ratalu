"use client";

import * as React from "react";
import { X, Sparkles, Gift, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/components/account/account-provider";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export function WelcomePopup() {
  const { isLoggedIn } = useAccount();
  const [visible, setVisible] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    // If user is already logged in, do not display popup.
    if (isLoggedIn) return;

    // Check if dismissed before in localStorage
    const dismissed = localStorage.getItem("ratalu.welcomeDismissed");
    if (dismissed === "true") return;

    const timer = setTimeout(() => {
      setVisible(true);
    }, 5000); // 5 seconds delay

    return () => clearTimeout(timer);
  }, [isLoggedIn]);

  const handleClose = () => {
    setVisible(false);
    localStorage.setItem("ratalu.welcomeDismissed", "true");
  };

  const copyCode = () => {
    navigator.clipboard.writeText("WELCOME10");
    setCopied(true);
    toast.success("Coupon code WELCOME10 copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-[fade-in_0.3s_ease]">
      {/* Container */}
      <div 
        className="relative w-full max-w-lg overflow-hidden rounded-[16px] bg-white shadow-2xl transition-all border border-gray-100 flex flex-col sm:flex-row max-h-[90vh] sm:max-h-[500px] animate-[modal-in_0.4s_cubic-bezier(0.22,1,0.36,1)]"
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute right-3.5 top-3.5 z-25 grid size-8 place-items-center rounded-full bg-white/80 text-gray-500 hover:text-gray-800 transition-colors border border-gray-200"
          aria-label="Close dialogue"
        >
          <X className="size-4" />
        </button>

        {/* Decorative left art banner */}
        <div className="relative w-full sm:w-[40%] bg-gradient-to-br from-purple-700 via-purple-600 to-orange-500 p-6 flex flex-col justify-between text-white overflow-hidden shrink-0 min-h-[160px] sm:min-h-full">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] bg-[size:16px_16px]" />
          <div className="absolute -left-12 -top-12 size-32 rounded-full bg-orange-400/20 blur-2xl" />
          
          <div className="relative z-10 flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider self-start">
            <Sparkles className="size-3 text-yellow-300" /> Welcome Offer
          </div>

          <div className="relative z-10 mt-auto">
            <h2 className="font-brand text-3xl font-extrabold tracking-tight leading-tight">
              Ratalu Wafers
            </h2>
            <p className="text-xs text-white/80 mt-1 leading-relaxed">
              Premium Kettle-Cooked Purple Yam Chips
            </p>
          </div>
        </div>

        {/* Content right area */}
        <div className="w-full sm:w-[60%] p-6 sm:p-8 flex flex-col justify-between overflow-y-auto">
          <div>
            <span className="text-xs font-bold text-orange-500 uppercase tracking-widest flex items-center gap-1">
              <Gift className="size-3.5" /> First Order Special
            </span>
            <h3 className="text-[1.5rem] font-bold text-gray-900 mt-2 leading-snug">
              Get <span className="text-purple-600 font-extrabold">10% OFF</span> on your very first order!
            </h3>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              Join thousands of happy snackers who love our natural, perfectly crispy purple yam wafers.
            </p>

            {/* Coupon Code Section */}
            <div className="mt-5 rounded-xl bg-purple-50/50 border border-purple-100/80 p-3.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Coupon Code</p>
                <p className="text-base font-extrabold tracking-wide text-gray-900 mt-0.5">WELCOME10</p>
              </div>
              <button
                onClick={copyCode}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
                  copied
                    ? "bg-green-600 text-white"
                    : "bg-purple-600 text-white hover:bg-purple-700 active:scale-95"
                )}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex flex-col gap-2.5">
            <div className="flex gap-2">
              <Button asChild className="flex-1 text-xs" size="md">
                <a href="/account" onClick={handleClose}>
                  Register Now
                </a>
              </Button>
              <Button asChild variant="outline" className="flex-1 text-xs" size="md">
                <a href="/account" onClick={handleClose}>
                  Login
                </a>
              </Button>
            </div>
            <button
              onClick={handleClose}
              className="text-center text-xs font-semibold text-gray-400 hover:text-gray-600 py-1 transition-colors flex items-center justify-center gap-1 focus:outline-none"
            >
              Continue Shopping <ArrowRight className="size-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
