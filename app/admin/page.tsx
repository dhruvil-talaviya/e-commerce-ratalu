"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "@/components/account/account-provider";

export default function AdminPage() {
  const { isLoggedIn, user } = useAccount();
  const router = useRouter();

  useEffect(() => {
    if (isLoggedIn && user?.phone === "9999999999") {
      router.push("/admin/dashboard");
    } else {
      router.push("/admin/login");
    }
  }, [isLoggedIn, user, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center text-sm font-semibold text-gray-500">
        Redirecting to Admin Portal...
      </div>
    </div>
  );
}
