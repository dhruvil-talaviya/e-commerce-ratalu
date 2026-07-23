"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { WifiOff, Wrench, RefreshCw, Clock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_EVENTS, clearTokens, type MaintenanceInfo } from "@/lib/api";
import { cn } from "@/lib/utils";

type Status = "ok" | "maintenance" | "offline";

/**
 * Watches the health of the API and takes over the screen when the store is
 * either intentionally closed (admin maintenance mode) or unreachable
 * (offline / backend down). Admin routes are never gated — the admin has to be
 * able to reach the dashboard to turn maintenance back off.
 */
export function SystemStatusProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [status, setStatus] = React.useState<Status>("ok");
  const [info, setInfo] = React.useState<MaintenanceInfo | null>(null);
  const [checking, setChecking] = React.useState(false);
  const [hasSession, setHasSession] = React.useState<boolean>(false);

  React.useEffect(() => {
    const syncSession = () => {
      if (typeof window !== "undefined") {
        const tokens = localStorage.getItem("ratalu.tokens.v1");
        const account = localStorage.getItem("ratalu.account.v2");
        setHasSession(!!(tokens || account));
      }
    };
    syncSession();
    window.addEventListener("storage", syncSession);
    return () => window.removeEventListener("storage", syncSession);
  }, [pathname]);

  const isAdminRoute = pathname?.startsWith("/admin") ?? false;
  const isAccountRoute = pathname?.startsWith("/account") ?? false;
  const isLoginModalOpen = typeof window !== "undefined" && window.location.search.includes("login=true");

  // Allow unauthenticated visitors to reach /account login gate or login modal
  const allowUnauthenticatedLogin = (isAccountRoute && !hasSession) || (isLoginModalOpen && !hasSession);

  /**
   * Ask the API how it's doing. GET /admin/settings is a public read (it backs
   * the storefront's announcement bar) and is exempt from the maintenance gate,
   * so it still answers while the store is closed.
   */
  const check = React.useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/v1/admin/settings");
      const json = await res.json().catch(() => ({}));

      if (json?.data?.maintenanceMode) {
        setInfo({
          active: true,
          title: json.data.maintenanceTitle || "We'll be right back",
          message: json.data.maintenanceMessage || "",
          endsAt: json.data.maintenanceEndsAt || null,
        });
        setStatus("maintenance");
      } else {
        setStatus("ok");
      }
    } catch {
      setStatus("offline");
    } finally {
      setChecking(false);
    }
  }, []);

  React.useEffect(() => {
    check();
  }, [check]);

  // React to what the rest of the app sees while making its own calls.
  React.useEffect(() => {
    const onMaintenance = (e: Event) => {
      setInfo((e as CustomEvent<MaintenanceInfo>).detail);
      setStatus("maintenance");
    };
    const onOffline = () => setStatus("offline");
    const onOnline = () => setStatus((s) => (s === "offline" ? "ok" : s));

    window.addEventListener(API_EVENTS.maintenance, onMaintenance);
    window.addEventListener(API_EVENTS.offline, onOffline);
    window.addEventListener(API_EVENTS.online, onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    return () => {
      window.removeEventListener(API_EVENTS.maintenance, onMaintenance);
      window.removeEventListener(API_EVENTS.offline, onOffline);
      window.removeEventListener(API_EVENTS.online, onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  // While down, keep retrying quietly so the store reopens by itself.
  React.useEffect(() => {
    if (status === "ok" || isAdminRoute) return;
    const timer = setInterval(check, 15_000);
    return () => clearInterval(timer);
  }, [status, isAdminRoute, check]);

  const handleLogout = React.useCallback(() => {
    if (typeof window !== "undefined") {
      clearTokens();
      localStorage.removeItem("ratalu.account.v2");
      localStorage.removeItem("ratalu.tokens.v1");
      setHasSession(false);
      window.dispatchEvent(new Event("storage"));
      window.location.href = "/account";
    }
  }, []);

  if (isAdminRoute || allowUnauthenticatedLogin || status === "ok") return <>{children}</>;

  return status === "maintenance" ? (
    <MaintenanceScreen info={info} onRetry={check} checking={checking} hasSession={hasSession} onLogout={handleLogout} />
  ) : (
    <OfflineScreen onRetry={check} checking={checking} />
  );
}

/* ------------------------------------------------------------------ */
/* SCREENS                                                            */
/* ------------------------------------------------------------------ */

function MaintenanceScreen({
  info,
  onRetry,
  checking,
  hasSession,
  onLogout,
}: {
  info: MaintenanceInfo | null;
  onRetry: () => void;
  checking: boolean;
  hasSession: boolean;
  onLogout: () => void;
}) {
  const endsAt = info?.endsAt ? new Date(info.endsAt) : null;

  return (
    <main className="min-h-[85vh] w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-gradient-to-b from-purple-50/40 via-white to-gray-50/50">
      <div className="w-full max-w-md mx-auto flex flex-col items-center text-center rounded-3xl border border-purple-100 bg-white/95 p-6 sm:p-8 md:p-10 shadow-xl shadow-purple-900/5 backdrop-blur-md transition-all">
        {/* Animated Badge & Icon */}
        <div className="relative mb-6">
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-purple-600 to-amber-500 opacity-20 blur-md animate-pulse" />
          <div className="relative grid size-16 sm:size-20 place-items-center rounded-2xl bg-gradient-to-br from-[#5B2C83] to-purple-800 text-white shadow-md">
            <Wrench className="size-8 sm:size-9" />
          </div>
        </div>

        {/* Live Status Tag */}
        <div className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-3.5 py-1 text-[11px] font-extrabold text-purple-700 border border-purple-200 mb-3">
          <span className="relative flex size-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
            <span className="relative inline-flex rounded-full size-2 bg-purple-600" />
          </span>
          Store Kitchen Maintenance Active
        </div>

        {/* Headline */}
        <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
          {info?.title || "We'll be right back"}
        </h1>

        {/* Subtitle / Message */}
        <p className="mt-2 text-xs sm:text-sm text-gray-600 font-medium leading-relaxed max-w-sm">
          {info?.message ||
            "We're currently performing a scheduled store system update. Fresh handcrafted purple yam wafer batches will be back live shortly!"}
        </p>

        {/* End Time Badge */}
        {endsAt && (
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-3.5 py-1.5 text-xs font-bold text-amber-900 border border-amber-200">
            <Clock className="size-3.5 text-amber-700" />
            <span>
              Expected back by{" "}
              {endsAt.toLocaleString("en-IN", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-2.5 w-full">
          <Button
            onClick={onRetry}
            disabled={checking}
            className="w-full sm:flex-1 h-11 text-xs font-bold rounded-xl bg-[#5B2C83] hover:bg-[#4a236c] text-white shadow-md transition-all cursor-pointer"
          >
            <RefreshCw className={cn("size-3.5 mr-1.5", checking && "animate-spin")} />
            {checking ? "Checking Status…" : "Check Status Again"}
          </Button>

          <Button
            onClick={onLogout}
            variant="outline"
            className="w-full sm:w-auto h-11 text-xs font-bold rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 transition-all cursor-pointer px-4"
          >
            <LogOut className="size-3.5 mr-1.5" /> Sign Out
          </Button>
        </div>

        {/* Footer Guidance */}
        <p className="mt-5 text-[11px] text-gray-400 font-medium flex items-center justify-center gap-1.5">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          This page auto-checks backend status &amp; reopens automatically.
        </p>
      </div>
    </main>
  );
}

function OfflineScreen({ onRetry, checking }: { onRetry: () => void; checking: boolean }) {
  return (
    <main className="min-h-[85vh] w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-gradient-to-b from-orange-50/40 via-white to-gray-50/50">
      <div className="w-full max-w-md mx-auto flex flex-col items-center text-center rounded-3xl border border-orange-100 bg-white/95 p-6 sm:p-8 md:p-10 shadow-xl shadow-orange-900/5 backdrop-blur-md transition-all">
        <div className="relative mb-6">
          <div className="relative grid size-16 sm:size-20 place-items-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md">
            <WifiOff className="size-8 sm:size-9" />
          </div>
        </div>

        <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
          No Internet Connection
        </h1>

        <p className="mt-2 text-xs sm:text-sm text-gray-600 font-medium leading-relaxed max-w-sm">
          We can&apos;t reach the store right now. Check your internet connection and try again — your cart items are saved safely.
        </p>

        <div className="mt-6 flex justify-center w-full">
          <Button
            onClick={onRetry}
            disabled={checking}
            className="w-full h-11 text-xs font-bold rounded-xl bg-orange-600 hover:bg-orange-700 text-white shadow-md transition-all cursor-pointer"
          >
            <RefreshCw className={cn("size-3.5 mr-1.5", checking && "animate-spin")} />
            {checking ? "Reconnecting…" : "Try Connecting Again"}
          </Button>
        </div>

        <p className="mt-5 text-[11px] text-gray-400 font-medium flex items-center justify-center gap-1.5">
          <span className="size-1.5 rounded-full bg-orange-500" />
          We&apos;ll keep retrying connection in the background.
        </p>
      </div>
    </main>
  );
}
