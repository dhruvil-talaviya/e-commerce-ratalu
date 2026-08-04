"use client";

import * as React from "react";
import { CheckCircle2, Clock, Package, Truck, Home, AlertCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { LiveCountdown } from "./live-countdown";

export interface OrderTimelineProps {
  orderStatus: string;
  paymentStatus: string;
  fulfilmentStatus?: string;
  cancellationDeadline?: string | Date | null;
  confirmedAt?: string | Date | null;
  packedAt?: string | Date | null;
  shippedAt?: string | Date | null;
  deliveredAt?: string | Date | null;
  cancelledAt?: string | Date | null;
  trackingNumber?: string;
  courierName?: string;
  className?: string;
}

export function OrderTimeline({
  orderStatus,
  paymentStatus,
  fulfilmentStatus,
  cancellationDeadline,
  confirmedAt,
  packedAt,
  shippedAt,
  deliveredAt,
  cancelledAt,
  trackingNumber,
  courierName,
  className,
}: OrderTimelineProps) {
  const isCancelled = orderStatus === "Cancelled" || Boolean(cancelledAt);
  const isPendingHold = orderStatus === "Pending Confirmation" || orderStatus === "Pending";

  if (isCancelled) {
    return (
      <div className={cn("rounded-2xl border border-rose-200 bg-rose-50/50 p-4 text-rose-900", className)}>
        <div className="flex items-center gap-2">
          <XCircle className="size-5 text-rose-600" />
          <h4 className="text-sm font-extrabold text-rose-950">Order Cancelled</h4>
        </div>
        <p className="mt-1 text-xs text-rose-700 font-medium">
          This order was cancelled {cancelledAt ? `on ${new Date(cancelledAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : ""}. Any paid amount will be automatically refunded to your original payment method within 3 to 5 business days.
        </p>
      </div>
    );
  }

  // 6 Steps Milestone Pipeline
  const steps = [
    {
      id: "payment",
      title: "Payment",
      done: paymentStatus === "Paid" || orderStatus !== "Pending",
      subtitle: paymentStatus === "Paid" ? "Confirmed" : "COD",
      icon: CheckCircle2,
    },
    {
      id: "hold",
      title: "Cancel Window",
      done: !isPendingHold || (cancellationDeadline && new Date(cancellationDeadline) <= new Date()),
      inProgress: isPendingHold,
      subtitle: isPendingHold ? (
        <LiveCountdown deadline={cancellationDeadline} badgeMode={false} />
      ) : (
        "Passed"
      ),
      icon: Clock,
    },
    {
      id: "confirmed",
      title: "Confirmed",
      done: ["Confirmed", "Packed", "Ready to Ship", "Shipped", "Out for Delivery", "Delivered", "Completed"].includes(orderStatus) || Boolean(confirmedAt),
      subtitle: confirmedAt ? new Date(confirmedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Ready",
      icon: CheckCircle2,
    },
    {
      id: "packed",
      title: "Packed",
      done: ["Packed", "Ready to Ship", "Shipped", "Out for Delivery", "Delivered", "Completed"].includes(orderStatus) || Boolean(packedAt),
      subtitle: trackingNumber ? `AWB: ${trackingNumber}` : "Packing",
      icon: Package,
    },
    {
      id: "shipped",
      title: "Shipped",
      done: ["Shipped", "Out for Delivery", "Delivered", "Completed"].includes(orderStatus) || Boolean(shippedAt),
      subtitle: courierName ? `${courierName}` : "In transit",
      icon: Truck,
    },
    {
      id: "delivered",
      title: "Delivered",
      done: ["Delivered", "Completed"].includes(orderStatus) || Boolean(deliveredAt),
      subtitle: deliveredAt ? new Date(deliveredAt).toLocaleDateString("en-IN") : "Enjoy!",
      icon: Home,
    },
  ];

  return (
    <div className={cn("rounded-2xl border border-purple-100 bg-white p-3.5 sm:p-5 shadow-xs overflow-hidden", className)}>
      <h4 className="mb-3 sm:mb-4 text-[11px] font-bold uppercase tracking-wider text-purple-700">Order Progress Timeline</h4>

      <div className="overflow-x-auto pb-1.5 scrollbar-none">
        <div className="grid grid-cols-6 gap-1 relative min-w-[480px] sm:min-w-0">
          {steps.map((step, idx) => {
            const StepIcon = step.icon;

            return (
              <div key={step.id} className="relative flex flex-col items-center text-center min-w-0">
                {/* Connector line */}
                {idx < steps.length - 1 && (
                  <div
                    className={cn(
                      "absolute left-[50%] top-3.5 sm:top-4 h-0.5 w-full z-0 transition-colors",
                      step.done ? "bg-purple-600" : "bg-gray-200"
                    )}
                  />
                )}

                {/* Icon Circle */}
                <div
                  className={cn(
                    "relative z-10 flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all shadow-xs",
                    step.done
                      ? "bg-purple-600 text-white ring-2 sm:ring-4 ring-purple-100"
                      : step.inProgress
                      ? "bg-amber-400 text-purple-950 ring-2 sm:ring-4 ring-amber-100 animate-pulse"
                      : "bg-gray-100 text-gray-400 border border-gray-200"
                  )}
                >
                  <StepIcon className="size-3.5 sm:size-4" />
                </div>

                {/* Text Info */}
                <div className="mt-2 min-w-0 w-full px-0.5">
                  <p className={cn("text-[10px] sm:text-xs font-extrabold leading-tight break-words", step.done || step.inProgress ? "text-gray-900" : "text-gray-400")}>
                    {step.id === "hold" ? (
                      <>
                        <span className="hidden sm:inline">Cancel Window</span>
                        <span className="inline sm:hidden">Cancel</span>
                      </>
                    ) : (
                      step.title
                    )}
                  </p>
                  <div className="mt-0.5 text-[9px] sm:text-[10px] text-gray-500 font-medium leading-tight truncate">
                    {step.subtitle}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
