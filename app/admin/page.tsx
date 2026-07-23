"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount, isAdminSession } from "@/components/account/account-provider";

/**
 * /admin is just a doorway.
 *
 * There is no separate admin login page — the owner signs in through the same
 * OTP gate as everyone else, and that gate sends them straight to the dashboard.
 * A signed-in admin goes to the console; anyone else is sent to /account, where
 * the login gate opens. Entering the admin number there lands them back here.
 */
export default function AdminPage() {
  const { isLoggedIn, user, hydrated } = useAccount();
  const router = useRouter();

  useEffect(() => {
    // Wait for the stored session to load, or we would bounce a signed-in admin.
    if (!hydrated) return;

    if (isLoggedIn && isAdminSession(user)) {
      router.replace("/admin/dashboard");
    } else {
      router.replace("/account");
    }
  }, [hydrated, isLoggedIn, user, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="text-center text-sm font-semibold text-gray-500">
        Opening the admin console…
      </div>
    </div>
  );
}
