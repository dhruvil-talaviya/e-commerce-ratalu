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
        <p className="mt-1 text-xs text-rose-700">
          This order was cancelled on {cancelledAt ? new Date(cancelledAt).toLocaleString("en-IN") : "request"}. Reserved items were released back to stock.
        </p>
      </div>
    );
  }

  // 5 Steps Milestone Pipeline
  const steps = [
    {
      id: "payment",
      title: "Payment Received",
      done: paymentStatus === "Paid" || orderStatus !== "Pending",
      subtitle: paymentStatus === "Paid" ? "Payment Confirmed" : "COD / Pending",
      icon: CheckCircle2,
    },
    {
      id: "hold",
      title: "Cancellation Window",
      done: !isPendingHold || (cancellationDeadline && new Date(cancellationDeadline) <= new Date()),
      inProgress: isPendingHold,
      subtitle: isPendingHold ? (
        <LiveCountdown deadline={cancellationDeadline} badgeMode={false} />
      ) : (
        "5-Min Window Passed"
      ),
      icon: Clock,
    },
    {
      id: "confirmed",
      title: "Order Confirmed",
      done: ["Confirmed", "Packed", "Ready to Ship", "Shipped", "Out for Delivery", "Delivered", "Completed"].includes(orderStatus) || Boolean(confirmedAt),
      subtitle: confirmedAt ? new Date(confirmedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Ready for packing",
      icon: CheckCircle2,
    },
    {
      id: "packed",
      title: "Packed & AWB",
      done: ["Packed", "Ready to Ship", "Shipped", "Out for Delivery", "Delivered", "Completed"].includes(orderStatus) || Boolean(packedAt),
      subtitle: trackingNumber ? `AWB: ${trackingNumber}` : "Packing in progress",
      icon: Package,
    },
    {
      id: "shipped",
      title: "Shipped & Out for Delivery",
      done: ["Shipped", "Out for Delivery", "Delivered", "Completed"].includes(orderStatus) || Boolean(shippedAt),
      subtitle: courierName ? `${courierName}` : "In transit",
      icon: Truck,
    },
    {
      id: "delivered",
      title: "Delivered",
      done: ["Delivered", "Completed"].includes(orderStatus) || Boolean(deliveredAt),
      subtitle: deliveredAt ? new Date(deliveredAt).toLocaleDateString("en-IN") : "Enjoy your chips!",
      icon: Home,
    },
  ];

  return (
    <div className={cn("rounded-2xl border border-purple-100 bg-white p-5 shadow-xs", className)}>
      <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-500">Order Progress Timeline</h4>

      <div className="relative flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-2">
        {steps.map((step, idx) => {
          const StepIcon = step.icon;

          return (
            <div key={step.id} className="relative flex sm:flex-col items-center gap-3 sm:gap-2 flex-1 text-left sm:text-center min-w-0 w-full">
              {/* Connector line for desktop */}
              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    "hidden sm:block absolute left-1/2 top-4 h-0.5 w-full z-0 transition-colors",
                    step.done ? "bg-purple-600" : "bg-gray-200"
                  )}
                />
              )}

              {/* Icon Circle */}
              <div
                className={cn(
                  "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all shadow-xs",
                  step.done
                    ? "bg-purple-600 text-white ring-4 ring-purple-100"
                    : step.inProgress
                    ? "bg-amber-400 text-purple-950 ring-4 ring-amber-100 animate-pulse"
                    : "bg-gray-100 text-gray-400 border border-gray-200"
                )}
              >
                <StepIcon className="size-4" />
              </div>

              {/* Text Info */}
              <div className="min-w-0 flex-1">
                <p className={cn("text-xs font-bold truncate", step.done || step.inProgress ? "text-gray-900" : "text-gray-400")}>
                  {step.title}
                </p>
                <div className="mt-0.5 text-[11px] text-gray-500 truncate">
                  {step.subtitle}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
