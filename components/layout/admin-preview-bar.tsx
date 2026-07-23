"use client";

import Link from "next/link";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { useAccount, isAdminSession } from "@/components/account/account-provider";

/**
 * Shown across the top of the storefront while the store owner is previewing it
 * from "View Shop".
 *
 * Two jobs: make it unmistakable that this is still the admin session (not a
 * customer one), and give a one-click way back to the console. Nothing the
 * admin does out here touches a customer account — their cart and wishlist stay
 * local and are never synced to the server.
 */
export function AdminPreviewBar() {
  const { isLoggedIn, user } = useAccount();

  if (!isLoggedIn || !isAdminSession(user)) return null;

  return (
    <div className="sticky top-0 z-[60] w-full bg-purple-900 text-white">
      <div className="container-px mx-auto flex max-w-7xl items-center justify-between gap-3 py-1.5">
        <span className="flex min-w-0 items-center gap-2 text-[10px] font-semibold sm:text-xs">
          <ShieldCheck className="size-3.5 shrink-0 text-purple-300 sm:size-4" />
          <span className="truncate">
            Viewing the shop as <strong className="font-bold">admin</strong>
            <span className="hidden sm:inline">
              {" "}— you&apos;re still signed in to the console, not a customer account.
            </span>
          </span>
        </span>

        <Link
          href="/admin/dashboard"
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold transition-colors hover:bg-white/25 sm:text-xs"
        >
          <ArrowLeft className="size-3 sm:size-3.5" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
