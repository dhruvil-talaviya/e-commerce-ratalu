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
  Loader2,
  Copy,
  Check,
  User,
  Phone,
  CreditCard,
  ShieldCheck,
  Calendar,
  HelpCircle
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
  userName?: string;
  userPhone?: string;
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
    houseNo?: string;
    street?: string;
    landmark?: string;
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
  const [copied, setCopied] = React.useState(false);

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

  const handleCopyId = (idToCopy: string) => {
    navigator.clipboard.writeText(idToCopy);
    setCopied(true);
    toast.success("Order ID copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 text-center bg-[#FDF8F0]">
        <div className="size-16 rounded-2xl bg-purple-100/70 flex items-center justify-center mb-4">
          <Loader2 className="size-8 animate-spin text-[#5B2C83]" />
        </div>
        <p className="text-base font-extrabold text-gray-900">Loading Order Confirmation...</p>
        <p className="text-xs text-gray-500 mt-1">Fetching order details from Yamora Wafers kitchen</p>
      </div>
    );
  }

  const displayId = order?.displayId || order?.id || orderId || "";

  return (
    <div className="min-h-[90vh] bg-gradient-to-b from-[#FDF8F0] via-purple-50/20 to-white py-8 sm:py-14 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Main Success Container */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="overflow-hidden rounded-3xl border border-purple-100/80 bg-white p-6 sm:p-10 shadow-2xl shadow-purple-950/5"
        >
          {/* Header Banner */}
          <div className="text-center flex flex-col items-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 350, damping: 18, delay: 0.1 }}
              className="relative mb-5 flex size-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-emerald-500 to-emerald-400 text-white shadow-lg shadow-emerald-500/25 ring-8 ring-emerald-50"
            >
              <CheckCircle2 className="size-11 stroke-[2.5]" />
            </motion.div>

            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50/90 px-4 py-1.5 text-xs font-extrabold text-emerald-800 border border-emerald-200/80 mb-3 shadow-xs">
              <Sparkles className="size-3.5 text-amber-500 animate-pulse" />
              <span>Order Placed &amp; Confirmed</span>
            </div>

            <h1 className="font-serif text-2xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              Thank You for Your Order!
            </h1>

            <p className="mt-2 text-xs sm:text-sm text-gray-600 max-w-md font-medium">
              We have received your order and are getting it handcrafted with love &amp; fresh crunch!
            </p>

            {/* Order ID Pill with Copy button */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Order Number:</span>
              <button
                type="button"
                onClick={() => handleCopyId(displayId)}
                title="Click to copy Order ID"
                className="group flex items-center gap-2 rounded-2xl border border-purple-200 bg-purple-50/70 hover:bg-purple-100/80 px-3.5 py-1.5 text-xs font-mono font-extrabold text-[#5B2C83] transition-all cursor-pointer shadow-2xs"
              >
                <span>#{displayId}</span>
                {copied ? (
                  <Check className="size-3.5 text-emerald-600" />
                ) : (
                  <Copy className="size-3.5 text-purple-600 group-hover:scale-110 transition-transform" />
                )}
              </button>
            </div>
          </div>

          {/* Live Order Stepper Timeline */}
          <div className="mt-8 rounded-2xl border border-purple-100 bg-gradient-to-r from-purple-50/60 via-amber-50/30 to-purple-50/60 p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-purple-200/40 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-purple-700" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-purple-900">
                  Live Fulfillment Tracker
                </span>
              </div>
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-200">
                Est. Delivery: 3–5 Business Days
              </span>
            </div>

            {/* Visual Stepper */}
            <div className="relative flex items-center justify-between px-2 sm:px-6">
              {/* Connecting Background Line */}
              <div className="absolute left-6 right-6 top-4 h-1 bg-gray-200 -z-0" />
              <div className="absolute left-6 w-1/3 top-4 h-1 bg-emerald-500 -z-0 transition-all" />

              {/* Step 1: Paid */}
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="flex size-9 items-center justify-center rounded-full bg-emerald-500 text-white font-extrabold text-xs shadow-md shadow-emerald-500/20 ring-4 ring-white">
                  ✓
                </div>
                <span className="mt-2 text-xs font-extrabold text-emerald-700">Paid &amp; Placed</span>
                <span className="text-[10px] text-gray-500">Confirmed</span>
              </div>

              {/* Step 2: Packing */}
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="flex size-9 items-center justify-center rounded-full bg-[#5B2C83] text-white font-extrabold text-xs shadow-md shadow-purple-900/20 ring-4 ring-white">
                  2
                </div>
                <span className="mt-2 text-xs font-extrabold text-[#5B2C83]">Kitchen Packing</span>
                <span className="text-[10px] text-purple-600 font-bold">In Progress</span>
              </div>

              {/* Step 3: Shipped */}
              <div className="relative z-10 flex flex-col items-center text-center opacity-60">
                <div className="flex size-9 items-center justify-center rounded-full bg-gray-200 text-gray-700 font-bold text-xs ring-4 ring-white">
                  3
                </div>
                <span className="mt-2 text-xs font-bold text-gray-700">Dispatched</span>
                <span className="text-[10px] text-gray-500">Shiprocket</span>
              </div>

              {/* Step 4: Delivered */}
              <div className="relative z-10 flex flex-col items-center text-center opacity-40">
                <div className="flex size-9 items-center justify-center rounded-full bg-gray-200 text-gray-600 font-bold text-xs ring-4 ring-white">
                  4
                </div>
                <span className="mt-2 text-xs font-semibold text-gray-600">Delivered</span>
                <span className="text-[10px] text-gray-400">At Doorstep</span>
              </div>
            </div>
          </div>

          {order && (
            <div className="mt-8 space-y-6">
              {/* Ordered Items Summary */}
              <div className="rounded-2xl border border-gray-200/80 bg-gray-50/60 p-5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-gray-200/70 pb-3 mb-3">
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-700 flex items-center gap-2">
                    <Package className="size-4 text-purple-600" />
                    <span>Items Ordered ({order.items.reduce((s, i) => s + i.quantity, 0)})</span>
                  </h2>
                  <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100">
                    Small-Batch Fresh
                  </span>
                </div>

                <ul className="divide-y divide-gray-200/60">
                  {order.items.map((item, idx) => (
                    <li key={idx} className="py-3 flex items-center justify-between text-xs sm:text-sm">
                      <div className="min-w-0 pr-3">
                        <p className="font-extrabold text-gray-900">
                          {item.quantity}× {item.flavorName}
                        </p>
                        <p className="text-[11px] text-gray-500 font-medium">{item.packLabel}</p>
                      </div>
                      <span className="font-extrabold text-gray-900 shrink-0 text-sm">
                        {formatINR(item.unitPrice * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Financial Breakdown */}
                <div className="mt-4 border-t border-dashed border-gray-300 pt-3.5 space-y-2 text-xs">
                  <div className="flex justify-between text-gray-600 font-medium">
                    <span>Items Subtotal</span>
                    <span className="font-bold text-gray-900">
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

                  <div className="flex justify-between text-gray-600 font-medium">
                    <span>Delivery &amp; Packaging</span>
                    {order.totals?.shipping === 0 || !order.totals?.shipping ? (
                      <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        FREE
                      </span>
                    ) : (
                      <span className="font-bold text-gray-900">{formatINR(order.totals.shipping)}</span>
                    )}
                  </div>

                  {Boolean(order.totals?.gst && order.totals.gst > 0) && (
                    <div className="flex justify-between text-gray-500">
                      <span>Taxes Included (GST)</span>
                      <span className="font-semibold text-gray-700">{formatINR(order.totals.gst)}</span>
                    </div>
                  )}

                  {/* Net Total Highlight Card */}
                  <div className="mt-3 flex items-center justify-between rounded-xl bg-purple-900 p-3.5 text-white shadow-md">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-purple-200 font-bold">Total Amount Paid</p>
                      <p className="text-[10px] text-purple-300">All Taxes &amp; Delivery Included</p>
                    </div>
                    <span className="text-xl font-extrabold text-emerald-400 tracking-tight">
                      {formatINR(order.totals?.total || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Delivery Address & Customer Profile Grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Delivery Address Card */}
                {order.address && (
                  <div className="rounded-2xl border border-purple-100 bg-purple-50/30 p-4 sm:p-5 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-purple-900 mb-2.5 flex items-center gap-1.5">
                        <MapPin className="size-4 text-purple-700" /> Shipping Address
                      </h3>
                      {order.address.tag && (
                        <span className="inline-block rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-extrabold text-purple-800 uppercase tracking-wider mb-1.5 border border-purple-200">
                          {order.address.tag}
                        </span>
                      )}
                      <p className="text-xs text-gray-800 font-bold leading-relaxed">
                        {order.address.houseNo ? `${order.address.houseNo}, ` : ""}
                        {order.address.street ? `${order.address.street}, ` : ""}
                        {order.address.landmark ? `(Landmark: ${order.address.landmark}), ` : ""}
                        {order.address.addressLine}
                      </p>
                      <p className="text-xs font-semibold text-gray-600 mt-1">
                        {order.address.city}, {order.address.state} — <span className="font-mono font-extrabold text-gray-900">{order.address.pincode}</span>
                      </p>
                    </div>
                  </div>
                )}

                {/* Customer Details & Payment Card */}
                <div className="rounded-2xl border border-purple-100 bg-purple-50/30 p-4 sm:p-5 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-purple-900 mb-2.5 flex items-center gap-1.5">
                      <User className="size-4 text-purple-700" /> Customer Info
                    </h3>
                    <p className="text-xs font-bold text-gray-900">{order.userName || "Valued Customer"}</p>
                    {order.userPhone && (
                      <p className="text-xs text-gray-600 font-medium flex items-center gap-1 mt-1">
                        <Phone className="size-3 text-purple-600" /> {order.userPhone}
                      </p>
                    )}
                    <div className="mt-3 pt-2.5 border-t border-purple-100/60 flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-medium flex items-center gap-1">
                        <CreditCard className="size-3.5 text-purple-700" /> Payment:
                      </span>
                      <span className="font-extrabold text-purple-900 bg-white px-2.5 py-0.5 rounded-full border border-purple-200 shadow-2xs">
                        {order.payment?.method || order.method || "Razorpay Online"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons Header/Footer */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 border-t border-gray-100 pt-6">
            <Button asChild size="lg" className="w-full sm:w-auto h-12 px-8 rounded-2xl bg-[#5B2C83] hover:bg-[#471f69] text-white font-extrabold text-xs sm:text-sm shadow-md shadow-purple-900/20 cursor-pointer transition-all">
              <Link href="/account?tab=orders" className="flex items-center justify-center gap-2">
                <Truck className="size-4" />
                <span>Track Order in My Account</span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>

            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-12 px-8 rounded-2xl border-gray-300 hover:bg-gray-50 font-bold text-xs sm:text-sm cursor-pointer transition-all">
              <Link href="/shop" className="flex items-center justify-center gap-2">
                <ShoppingBag className="size-4 text-purple-700" />
                <span>Continue Shopping</span>
              </Link>
            </Button>
          </div>

          {/* Help Support Footer */}
          <div className="mt-6 text-center border-t border-gray-100 pt-4">
            <p className="text-[11px] text-gray-500 font-medium">
              Need help with this order? Email us at{" "}
              <a href="mailto:support@yamorawafers.com" className="text-[#5B2C83] font-bold underline hover:text-purple-900">
                support@yamorawafers.com
              </a>{" "}
              or message on{" "}
              <a href="https://wa.me/919825022222" target="_blank" rel="noopener noreferrer" className="text-emerald-700 font-bold underline hover:text-emerald-800">
                WhatsApp
              </a>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 text-center bg-[#FDF8F0]">
        <Loader2 className="size-8 animate-spin text-[#5B2C83] mb-3" />
        <p className="text-xs font-bold text-gray-600">Loading order status...</p>
      </div>
    }>
      <OrderSuccessContent />
    </React.Suspense>
  );
}
