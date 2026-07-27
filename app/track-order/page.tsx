"use client";

import React, { useState } from "react";
import { Search, Truck, CheckCircle2, Clock, MapPin, AlertCircle, Calendar, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function TrackOrderPage() {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [trackingData, setTrackingData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;

    setLoading(true);
    setError(null);
    setTrackingData(null);

    try {
      const res = await fetch(`/api/v1/logistics/track/${encodeURIComponent(identifier.trim())}`);
      const data = await res.json();

      if (data.success && data.data) {
        setTrackingData(data.data);
      } else {
        setError(data.message || "No tracking information found for this Order ID or AWB.");
      }
    } catch {
      setError("Unable to fetch tracking updates. Please check your Order ID and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-50 font-sans pb-16">
      <PageHeader
        eyebrow="Shipment Tracking"
        title="Track Your Order"
        description="Enter your Order Number (e.g. RW-000101) or Airway Bill (AWB) code for real-time delivery status."
        crumbs={[{ label: "Home", href: "/" }, { label: "Track Order" }]}
      />

      <div className="container-px mx-auto max-w-3xl pt-8 space-y-8">
        {/* Search Input Card */}
        <div className="rounded-3xl border border-[var(--color-border)] bg-white/90 p-6 shadow-sm backdrop-blur-sm sm:p-8">
          <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="size-5 text-gray-400 absolute left-4 top-3.5" />
              <Input
                type="text"
                required
                placeholder="Enter Order ID or AWB Code..."
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="pl-11 h-12 text-sm border-gray-200 bg-white font-mono"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              size="lg"
              className="h-12 px-6 bg-[#5B2C83] hover:bg-purple-800 text-white font-bold"
            >
              {loading ? "Searching..." : (
                <>
                  Track Order
                  <ArrowRight className="size-4 ml-1" />
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-3 text-xs font-semibold">
            <AlertCircle className="size-5 text-red-500 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Tracking Details Results */}
        {trackingData && (
          <div className="rounded-3xl border border-[var(--color-border)] bg-white/90 p-6 sm:p-8 shadow-sm space-y-6">
            {/* Status Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-150">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Order #{trackingData.orderId}</span>
                <div className="flex items-center gap-3 mt-1">
                  <h2 className="text-xl font-bold text-gray-900">{trackingData.courierName || "Shiprocket Express"}</h2>
                  {trackingData.awbCode && (
                    <span className="text-xs font-mono bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md border border-purple-200 font-bold">
                      AWB: {trackingData.awbCode}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="soft" className="bg-purple-50 text-purple-700 border-purple-200 font-bold">
                  {trackingData.shipmentStatus}
                </Badge>
                <Badge variant="soft" className="bg-green-50 text-green-700 border-green-200 font-bold">
                  Payment: {trackingData.paymentStatus}
                </Badge>
              </div>
            </div>

            {/* Overview Key Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-150">
                <span className="text-[10px] text-gray-500 font-bold flex items-center gap-1.5 mb-1">
                  <Calendar className="size-3.5 text-purple-600" />
                  Est. Delivery
                </span>
                <span className="text-xs font-bold text-gray-900">
                  {trackingData.estimatedDelivery ? new Date(trackingData.estimatedDelivery).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "In Progress"}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-150">
                <span className="text-[10px] text-gray-500 font-bold flex items-center gap-1.5 mb-1">
                  <MapPin className="size-3.5 text-sky-600" />
                  Current Location
                </span>
                <span className="text-xs font-bold text-gray-900 truncate block">
                  {trackingData.currentLocation || "In Transit"}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-150">
                <span className="text-[10px] text-gray-500 font-bold flex items-center gap-1.5 mb-1">
                  <Truck className="size-3.5 text-indigo-600" />
                  Delivery Attempts
                </span>
                <span className="text-xs font-bold text-gray-900">
                  {trackingData.deliveryAttempts || 0}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-150">
                <span className="text-[10px] text-gray-500 font-bold flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="size-3.5 text-emerald-600" />
                  Delivered Date
                </span>
                <span className="text-xs font-bold text-gray-900">
                  {trackingData.deliveredDate ? new Date(trackingData.deliveredDate).toLocaleDateString("en-IN") : "Pending"}
                </span>
              </div>
            </div>

            {/* Tracking Activity History */}
            <div className="space-y-4 pt-4 border-t border-gray-150">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Clock className="size-4 text-purple-600" />
                Live Tracking Activity History
              </h3>

              {trackingData.timeline && trackingData.timeline.length > 0 ? (
                <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                  {trackingData.timeline.map((act: any, idx: number) => (
                    <div key={idx} className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className={`absolute -left-6 top-1.5 size-3 rounded-full border-2 ${idx === 0 ? "bg-purple-600 border-purple-300 ring-4 ring-purple-500/20" : "bg-gray-300 border-gray-100"}`} />
                      <div>
                        <p className="text-xs font-bold text-gray-900">{act.activity || act.status}</p>
                        {act.location && <p className="text-[11px] text-gray-500">Location: {act.location}</p>}
                      </div>
                      <span className="text-[10px] font-mono text-gray-400 font-semibold">
                        {new Date(act.date).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">Order confirmed. Waiting for courier scan updates...</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
