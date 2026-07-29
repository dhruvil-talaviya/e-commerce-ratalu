"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "@/components/account/account-provider";

export default function LoginPage() {
  const router = useRouter();
  const { isLoggedIn } = useAccount();

  React.useEffect(() => {
    if (isLoggedIn) {
      router.replace("/account");
    } else {
      router.replace("/account?login=true");
    }
  }, [isLoggedIn, router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="size-8 animate-spin rounded-full border-2 border-purple-800 border-t-transparent" />
    </div>
  );
}
