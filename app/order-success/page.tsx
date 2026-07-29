"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import {
  CheckCircle2,
  Package,
  ShoppingBag,
  Truck,
  ArrowRight,
  MapPin,
  Clock,
  Sparkles,
  Tag,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { formatINR } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

interface OrderDetail {
  id: string;
  displayId?: string;
  orderNumber?: number;
  createdAt: string;
  status: string;
  items: Array<{
    flavorId: string;
    flavorName: string;
    packId: string;
    packLabel: string;
    unitPrice: number;
    quantity: number;
  }>;
  totals: {
    subtotal: number;
    discount: number;
    gst: number;
    shipping: number;
    total: number;
  };
  address: {
    tag?: string;
    addressLine: string;
    city: string;
    state: string;
    pincode: string;
  };
  payment?: {
    method: string;
    status: string;
    transactionId?: string;
  };
  method?: string;
  courierName?: string;
  trackingNumber?: string;
}

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  const [order, setOrder] = React.useState<OrderDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    apiFetch<OrderDetail>(`/orders/${orderId}`)
      .then((data: any) => {
        setOrder(data);
        setError("");
      })
      .catch((err: any) => {
        setError(err.message || "Failed to load order details");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="size-10 animate-spin text-[#5B2C83] mb-4" />
        <p className="text-sm font-semibold text-gray-600">Loading your order confirmation...</p>
      </div>
    );
  }

  const displayId = order?.displayId || order?.id || orderId || "";

  return (
    <div className="min-h-[85vh] bg-gradient-to-b from-purple-50/60 via-white to-amber-50/30 py-10 px-4 sm:px-6">
      <div className="mx-auto max-w-3xl">
        {/* Main Success Card */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="overflow-hidden rounded-3xl border border-purple-100 bg-white p-6 sm:p-10 shadow-xl shadow-purple-900/5"
        >
          {/* Header Banner */}
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
              className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-inner"
            >
              <CheckCircle2 className="size-11 stroke-[2.5]" />
            </motion.div>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-extrabold text-emerald-700 border border-emerald-200 mb-3">
              <Sparkles className="size-3 text-amber-500" /> Order Placed Successfully!
            </span>

            <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              Thank You for Your Order!
            </h1>

            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="text-sm text-gray-600 font-medium">Order ID:</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(displayId);
                  toast.success("Order ID copied to clipboard!");
                }}
                title="Click to copy Order ID"
                className="font-mono font-extrabold text-[#5B2C83] bg-purple-50 hover:bg-purple-100 px-3 py-1 rounded-xl border border-purple-200 transition-colors flex items-center gap-1.5 cursor-pointer text-sm"
              >
                #{displayId}
                <span className="text-[10px] uppercase tracking-wider text-purple-700 font-bold bg-white px-1.5 py-0.5 rounded border border-purple-200">Copy</span>
              </button>
            </div>

            <p className="mt-2 text-xs text-gray-500">
              We have received your order and are getting it ready with love &amp; fresh crunch!
            </p>
          </div>

          {/* Live Order Timeline */}
          <div className="mt-8 rounded-2xl border border-purple-100/80 bg-gradient-to-r from-purple-50/50 via-amber-50/20 to-purple-50/50 p-4 sm:p-5">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-purple-900 mb-4 flex items-center gap-1.5">
              <Clock className="size-3.5 text-purple-700" /> Live Order Status
            </p>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="flex flex-col items-center">
                <div className="grid size-8 place-items-center rounded-full bg-[#5B2C83] text-white shadow-xs font-bold text-xs">
                  ✓
                </div>
                <span className="mt-1.5 font-extrabold text-[#5B2C83]">Paid</span>
              </div>
              <div className="flex flex-col items-center opacity-80">
                <div className="grid size-8 place-items-center rounded-full bg-amber-400 text-purple-950 font-bold text-xs shadow-xs">
                  2
                </div>
                <span className="mt-1.5 font-bold text-gray-700">Packing</span>
              </div>
              <div className="flex flex-col items-center opacity-40">
                <div className="grid size-8 place-items-center rounded-full bg-gray-200 text-gray-600 font-bold text-xs">
                  3
                </div>
                <span className="mt-1.5 font-semibold text-gray-500">Shipped</span>
              </div>
              <div className="flex flex-col items-center opacity-40">
                <div className="grid size-8 place-items-center rounded-full bg-gray-200 text-gray-600 font-bold text-xs">
                  4
                </div>
                <span className="mt-1.5 font-semibold text-gray-500">Delivered</span>
              </div>
            </div>
          </div>

          {order && (
            <div className="mt-8 space-y-6">
              {/* Items List */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 sm:p-5">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                  <Package className="size-4 text-purple-600" /> Items Ordered ({order.items.reduce((s, i) => s + i.quantity, 0)})
                </h3>
                <ul className="divide-y divide-gray-200/60">
                  {order.items.map((item, idx) => (
                    <li key={idx} className="py-2.5 flex items-center justify-between text-xs sm:text-sm">
                      <div className="min-w-0 pr-2">
                        <p className="font-bold text-gray-900">
                          {item.quantity}× {item.flavorName}
                        </p>
                        <p className="text-[11px] text-gray-500">{item.packLabel}</p>
                      </div>
                      <span className="font-extrabold text-gray-900 shrink-0">
                        {formatINR(item.unitPrice * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Price Breakdown */}
                <div className="mt-4 border-t border-dashed border-gray-300 pt-3 space-y-2 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Items Subtotal</span>
                    <span className="font-semibold text-gray-800">
                      {formatINR(order.totals?.subtotal || order.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0))}
                    </span>
                  </div>

                  {Boolean(order.totals?.discount && order.totals.discount > 0) && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span className="flex items-center gap-1 font-bold">
                        <Tag className="size-3 text-emerald-600" /> Discount / Coupon Savings
                      </span>
                      <span className="font-extrabold text-emerald-700">- {formatINR(order.totals.discount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-gray-600">
                    <span>Delivery Charges</span>
                    {order.totals?.shipping === 0 || !order.totals?.shipping ? (
                      <span className="font-extrabold text-emerald-600">FREE</span>
                    ) : (
                      <span className="font-semibold text-gray-800">{formatINR(order.totals.shipping)}</span>
                    )}
                  </div>

                  {Boolean(order.totals?.gst && order.totals.gst > 0) && (
                    <div className="flex justify-between text-gray-600">
                      <span>Taxes (GST)</span>
                      <span className="font-semibold text-gray-800">{formatINR(order.totals.gst)}</span>
                    </div>
                  )}

                  {/* Net Paid Amount Highlight */}
                  <div className="flex justify-between items-center pt-2.5 border-t border-gray-300 text-sm sm:text-base font-extrabold text-[#5B2C83]">
                    <span>Total Amount Paid</span>
                    <span className="text-lg text-emerald-700 font-extrabold bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                      {formatINR(order.totals?.total || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Delivery Address Details */}
              {order.address && (
                <div className="rounded-2xl border border-purple-100 bg-purple-50/40 p-4 sm:p-5">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-purple-900 mb-2 flex items-center gap-1.5">
                    <MapPin className="size-4 text-purple-700" /> Delivery Address
                  </h3>
                  <p className="text-xs sm:text-sm font-semibold text-gray-800">
                    {order.address.tag ? <span className="font-extrabold text-purple-800">[{order.address.tag}] </span> : null}
                    {order.address.addressLine}, {order.address.city}, {order.address.state} — {order.address.pincode}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="h-12 px-6 rounded-2xl bg-[#5B2C83] hover:bg-[#451A67] font-extrabold text-sm shadow-md shadow-purple-900/20">
              <Link href="/account?tab=orders" className="flex items-center gap-2">
                <Truck className="size-4" />
                <span>Track Order in My Account</span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>

            <Button asChild variant="outline" size="lg" className="h-12 px-6 rounded-2xl border-gray-300 hover:bg-gray-50 font-bold text-sm">
              <Link href="/shop" className="flex items-center gap-2">
                <ShoppingBag className="size-4" />
                <span>Continue Shopping</span>
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#5B2C83]" />
      </div>
    }>
      <OrderSuccessContent />
    </React.Suspense>
  );
}
