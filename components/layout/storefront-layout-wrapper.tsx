"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { LoginGate } from "@/components/account/login-gate";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { SystemStatusProvider } from "@/components/system/system-status-provider";
import { AdminPreviewBar } from "@/components/layout/admin-preview-bar";
import { CmsProvider, type CmsPage } from "@/components/cms/cms-provider";
import { CmsPreviewBanner } from "@/components/cms/cms-preview-banner";
import { VisitorTracker } from "@/components/common/visitor-tracker";
import { useAccount } from "@/components/account/account-provider";
import { useOrders } from "@/components/shop/order-provider";
import { X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

function OrderStatusBanner() {
  const pathname = usePathname();
  const { isLoggedIn } = useAccount();
  const { orders } = useOrders();
  const [dismissed, setDismissed] = React.useState(false);

  const activeOrder = orders?.find(
    (o) =>
      ["Pending", "Confirmed", "Packed", "Ready for Dispatch", "In Transit", "Out for Delivery"].includes(o.status)
  );

  const showBanner =
    isLoggedIn &&
    activeOrder &&
    !dismissed &&
    (pathname === "/" || pathname?.startsWith("/shop") || pathname?.startsWith("/products"));

  if (!showBanner) return null;

  return (
    <div className="bg-orange-50 border-b border-orange-100 py-3 text-orange-950 px-4 transition-all duration-300 animate-in slide-in-from-top duration-300">
      <div className="container mx-auto max-w-7xl flex items-center justify-between gap-3 text-xs sm:text-sm font-medium">
        <div className="flex items-center gap-3 min-w-0">
          <span className="relative flex size-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex size-2 rounded-full bg-orange-500"></span>
          </span>
          <span className="truncate">
            Your order <strong className="font-bold text-orange-950">{activeOrder.displayId || `#${activeOrder.orderNumber}`}</strong> status is: <strong className="font-extrabold text-orange-600 uppercase tracking-wide text-[11px] bg-orange-100/60 px-2 py-0.5 rounded-md ml-1">{activeOrder.status}</strong>
          </span>
          <Link
            href="/account?tab=orders"
            className="hidden sm:inline-flex items-center gap-1 text-purple-650 hover:text-purple-750 font-semibold transition-colors shrink-0 ml-2"
          >
            Track Order Details <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/account?tab=orders"
            className="sm:hidden text-purple-650 hover:text-purple-750 font-bold text-xs"
          >
            Track
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-full hover:bg-orange-100 text-orange-400 hover:text-orange-600 transition-colors focus:outline-none"
            aria-label="Dismiss banner"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function StorefrontLayoutWrapper({
  cms,
  children,
}: {
  /** Website Builder content, fetched on the server in app/layout.tsx. */
  cms?: CmsPage;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) {
    // The console is light-theme only and owns its own chrome (AdminShell), so
    // this stays a bare passthrough — no storefront navbar, footer or theme.
    return (
      <div className="min-h-screen font-sans antialiased">
        <main className="flex min-h-screen flex-col">{children}</main>
      </div>
    );
  }

  // When the store is closed or unreachable, this replaces the whole storefront
  // (chrome included) with the maintenance / offline screen. Admin is exempt.
  return (
    <SystemStatusProvider>
      {/* Serves published Website Builder content to every storefront section. */}
      <CmsProvider page="homepage" initial={cms}>
        <div className="flex min-h-screen flex-col bg-background text-foreground overflow-x-hidden">
          <CmsPreviewBanner />
          <VisitorTracker />
          <AdminPreviewBar />
          <AnnouncementBar />
          <Navbar />
          <OrderStatusBanner />
          <LoginGate />
          <main className="flex-1">{children}</main>
          <Footer />
          <WhatsAppButton />
        </div>
      </CmsProvider>
    </SystemStatusProvider>
  );
}
