"use client";

import * as React from "react";
import Image from "next/image";
import { KeyRound, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAccount } from "./account-provider";
import { cn } from "@/lib/utils";

export function LoginGate() {
  const { isLoggedIn, login, register } = useAccount();
  const [mode, setMode] = React.useState<"login" | "register">("login");
  const [phone, setPhone] = React.useState("");
  const [name, setName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  // If already logged in, do not render the login gate
  if (isLoggedIn) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Mock API delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (mode === "login") {
      if (!phone || !password) {
        setError("Please enter both your mobile number and password.");
        setLoading(false);
        return;
      }
      if (phone.length < 10) {
        setError("Please enter a valid 10-digit mobile number.");
        setLoading(false);
        return;
      }
      login(phone);
    } else {
      if (!name || !phone || !password) {
        setError("All fields are required to create an account.");
        setLoading(false);
        return;
      }
      if (phone.length < 10) {
        setError("Please enter a valid 10-digit mobile number.");
        setLoading(false);
        return;
      }
      register(name, phone);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-purple-950/60 p-4 backdrop-blur-md">
      {/* Background Decorative Rings */}
      <div className="absolute top-1/4 left-1/4 -z-10 size-80 rounded-full bg-purple-500/20 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 -z-10 size-80 rounded-full bg-orange-500/20 blur-3xl" />

      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-[var(--color-border)] bg-white/90 p-6 shadow-[var(--shadow-lift)] backdrop-blur-sm sm:p-8">
        {/* Brand Logo and Header */}
        <div className="text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-purple-100 bg-white p-1 shadow-sm">
            <Image
              src="/logo.jpg"
              alt="Ratalu Chips Logo"
              width={48}
              height={48}
              className="rounded-full object-cover"
            />
          </div>
          <h1 className="mt-4 font-serif text-3xl font-bold leading-tight text-charcoal">
            Welcome to <span className="text-gradient-warm">Ratalu Chips</span>
          </h1>
          <p className="mt-2 text-sm text-charcoal-muted">
            Please sign in or create an account to browse flavors and shop.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="mt-8 flex gap-2 rounded-2xl bg-cream-100 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError("");
            }}
            className={cn(
              "flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all focus:outline-none",
              mode === "login" ? "bg-purple-500 text-cream shadow-sm" : "text-charcoal-muted hover:text-purple-700"
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
              "flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all focus:outline-none",
              mode === "register" ? "bg-purple-500 text-cream shadow-sm" : "text-charcoal-muted hover:text-purple-700"
            )}
          >
            Register
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mt-4 rounded-xl bg-red-50 p-3.5 text-xs font-semibold text-red-600 border border-red-100">
            {error}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {mode === "register" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-charcoal-soft">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-soft">
                  <User className="size-4" />
                </span>
                <Input
                  required
                  placeholder="Ananya Mehta"
                  className="pl-11 h-11"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-charcoal-soft">
              Mobile Number
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-soft">
                <Phone className="size-4" />
              </span>
              <Input
                required
                type="tel"
                placeholder="98250 00000"
                className="pl-11 h-11"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-charcoal-soft">
              Password
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-soft">
                <KeyRound className="size-4" />
              </span>
              <Input
                required
                type="password"
                placeholder="••••••••"
                className="pl-11 h-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <Button type="submit" size="lg" className="mt-2 w-full" disabled={loading}>
            {loading ? "Verifying..." : mode === "login" ? "Sign In" : "Create Account"}
          </Button>
        </form>
      </div>
    </div>
  );
}
