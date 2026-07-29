"use client";

import * as React from "react";
import {
  Truck,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  RefreshCw,
  Search,
  Plus,
  FileText,
  MapPin,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  TrendingUp,
  Settings,
  Filter,
  Printer,
  ChevronRight
} from "lucide-react";
import { cn, formatINR } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api";
import { AdminShell } from "@/components/admin/console/admin-shell";
import { Button, Card, Skeleton, Modal, Badge, ConfirmDialog } from "@/components/admin/ui/primitives";

const INPUT =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#111827] focus:border-[#5B2C83] focus:outline-none focus:ring-2 focus:ring-[#5B2C83]/15";

export default function AdminLogisticsPage() {
  const [activeTab, setActiveTab] = React.useState<"overview" | "shipments" | "locations" | "calculator">("overview");

  // Dashboard & Stats
  const [stats, setStats] = React.useState<any>(null);
  const [loadingStats, setLoadingStats] = React.useState(true);

  // Shipments List
  const [shipments, setShipments] = React.useState<any[]>([]);
  const [loadingShipments, setLoadingShipments] = React.useState(true);
  const [shipmentPage, setShipmentPage] = React.useState(1);
  const [totalShipmentPages, setTotalShipmentPages] = React.useState(1);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");

  // Pickup Locations
  const [locations, setLocations] = React.useState<any[]>([]);
  const [loadingLocations, setLoadingLocations] = React.useState(true);
  const [showAddLocationModal, setShowAddLocationModal] = React.useState(false);
  const [locationForm, setLocationForm] = React.useState({
    pickupLocation: "",
    name: "",
    email: "",
    phone: "",
    address: "",
    address2: "",
    city: "",
    state: "",
    pinCode: "",
    isDefault: false
  });

  // Serviceability Calculator State
  const [calcForm, setCalcForm] = React.useState({
    deliveryPincode: "",
    weight: "0.5",
    cod: true
  });
  const [calcResult, setCalcResult] = React.useState<any>(null);
  const [calcLoading, setCalcLoading] = React.useState(false);
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);

  // Fetch Dashboard Stats
  const fetchDashboardStats = React.useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await apiFetch<any>("/admin/logistics/dashboard");
      setStats(res);
    } catch (err: any) {
      console.error("Failed to load logistics dashboard stats:", err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // Fetch Shipments
  const fetchShipments = React.useCallback(async () => {
    setLoadingShipments(true);
    try {
      const params = new URLSearchParams({
        page: String(shipmentPage),
        limit: "15"
      });
      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter) params.append("status", statusFilter);

      const res = await apiFetch<any>(`/admin/logistics/shipments?${params.toString()}`);
      setShipments(res || []);
      setTotalShipmentPages(1);
    } catch (err) {
      console.error("Failed to fetch shipments:", err);
    } finally {
      setLoadingShipments(false);
    }
  }, [shipmentPage, searchQuery, statusFilter]);

  // Fetch Pickup Locations
  const fetchLocations = React.useCallback(async () => {
    setLoadingLocations(true);
    try {
      const res = await apiFetch<any[]>("/admin/logistics/pickup-locations");
      setLocations(res || []);
    } catch (err) {
      console.error("Failed to fetch locations:", err);
    } finally {
      setLoadingLocations(false);
    }
  }, []);

  React.useEffect(() => {
    fetchDashboardStats();
    fetchLocations();
  }, [fetchDashboardStats, fetchLocations]);

  React.useEffect(() => {
    if (activeTab === "shipments") {
      fetchShipments();
    }
  }, [activeTab, fetchShipments]);

  // Handle Shipment Actions
  const handleGenerateAWB = async (shipmentId: string) => {
    setActionLoadingId(shipmentId);
    try {
      await apiFetch(`/admin/logistics/shipments/${shipmentId}/awb`, { method: "POST" });
      toast.success("AWB generated successfully!");
      fetchShipments();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate AWB");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSchedulePickup = async (shipmentId: string) => {
    setActionLoadingId(shipmentId);
    try {
      await apiFetch(`/admin/logistics/shipments/${shipmentId}/pickup`, { method: "POST" });
      toast.success("Pickup scheduled successfully!");
      fetchShipments();
    } catch (err: any) {
      toast.error(err.message || "Failed to schedule pickup");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDownloadDoc = async (shipmentId: string, type: "label" | "manifest" | "invoice") => {
    setActionLoadingId(`${shipmentId}-${type}`);
    try {
      const res = await apiFetch<any>(`/admin/logistics/shipments/${shipmentId}/document?type=${type}`);
      if (res?.url) {
        window.open(res.url, "_blank");
        toast.success(`${type.toUpperCase()} downloaded successfully`);
      } else {
        toast.error(`Failed to download ${type}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Download failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleTrackShipment = async (shipmentId: string) => {
    setActionLoadingId(shipmentId);
    try {
      await apiFetch(`/admin/logistics/shipments/${shipmentId}/track`);
      toast.success("Shipment tracking updated!");
      fetchShipments();
    } catch (err: any) {
      toast.error(err.message || "Tracking update failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  const [cancelShipmentTarget, setCancelShipmentTarget] = React.useState<string | null>(null);

  const handleCancelShipment = async () => {
    if (!cancelShipmentTarget) return;
    const shipmentId = cancelShipmentTarget;
    setActionLoadingId(shipmentId);
    try {
      await apiFetch(`/admin/logistics/shipments/${shipmentId}/cancel`, { method: "POST" });
      toast.success("Shipment cancelled");
      setCancelShipmentTarget(null);
      fetchShipments();
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel shipment");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/admin/logistics/pickup-locations", {
        method: "POST",
        body: locationForm
      });
      toast.success("Pickup location created successfully!");
      setShowAddLocationModal(false);
      fetchLocations();
    } catch (err: any) {
      toast.error(err.message || "Failed to add location");
    }
  };

  const handleSetPrimaryLocation = async (locationId: string) => {
    try {
      await apiFetch(`/admin/logistics/pickup-locations/${locationId}/primary`, { method: "POST" });
      toast.success("Default pickup location updated");
      fetchLocations();
    } catch (err: any) {
      toast.error(err.message || "Failed to set default location");
    }
  };

  const handleCheckServiceability = async (e: React.FormEvent) => {
    e.preventDefault();
    setCalcLoading(true);
    setCalcResult(null);
    try {
      const res = await apiFetch<any>("/logistics/check-serviceability", {
        method: "POST",
        body: {
          deliveryPincode: calcForm.deliveryPincode,
          weight: parseFloat(calcForm.weight),
          cod: calcForm.cod
        }
      });
      setCalcResult(res);
    } catch (err: any) {
      toast.error(err.message || "Pincode lookup failed");
    } finally {
      setCalcLoading(false);
    }
  };

  return (
    <AdminShell
      title="Shiprocket Logistics Hub"
      description="Enterprise Logistics Automation, Courier Dispatch & Real-Time Tracking"
    >
      <div className="flex flex-col gap-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { id: "overview", label: "Overview & Analytics", icon: TrendingUp },
              { id: "shipments", label: "Shipment Management", icon: Package },
              { id: "locations", label: "Pickup Locations", icon: MapPin },
              { id: "calculator", label: "Rate & Pincode Checker", icon: ShieldCheck }
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-colors whitespace-nowrap",
                    active
                      ? "bg-[#5B2C83] text-white shadow-sm"
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <Icon className="size-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                fetchDashboardStats();
                if (activeTab === "shipments") fetchShipments();
              }}
            >
              <RefreshCw className="size-3.5" />
              Refresh
            </Button>
            <a
              href="/admin/settings"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 text-[#5B2C83] border border-purple-200 hover:bg-purple-100 text-xs font-bold transition"
            >
              <Settings className="size-3.5" />
              Logistics Settings
            </a>
          </div>
        </div>

        {/* TAB 1: OVERVIEW & ANALYTICS */}
        {activeTab === "overview" && (
          <div className="flex flex-col gap-6">
            {/* Widget Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
              {[
                { label: "Today's Shipments", value: stats?.widgets?.todaysShipments || 0, icon: Package, tone: "text-purple-600 bg-purple-50" },
                { label: "Pending Pickups", value: stats?.widgets?.pendingPickups || 0, icon: Clock, tone: "text-sky-600 bg-sky-50" },
                { label: "In Transit", value: stats?.widgets?.inTransit || 0, icon: Truck, tone: "text-indigo-600 bg-indigo-50" },
                { label: "Delivered", value: stats?.widgets?.delivered || 0, icon: CheckCircle2, tone: "text-emerald-600 bg-emerald-50" },
                { label: "RTO Orders", value: stats?.widgets?.rto || 0, icon: RotateCcw, tone: "text-orange-600 bg-orange-50" },
                { label: "Cancelled", value: stats?.widgets?.cancelled || 0, icon: XCircle, tone: "text-rose-600 bg-rose-50" },
                { label: "Delivery Success", value: stats?.widgets?.deliverySuccessRate || "100%", icon: ShieldCheck, tone: "text-teal-600 bg-teal-50" }
              ].map((card, i) => {
                const Icon = card.icon;
                return (
                  <Card key={i} className="p-3.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-500">{card.label}</span>
                      <span className={cn("grid size-7 place-items-center rounded-lg border border-gray-200/60", card.tone)}>
                        <Icon className="size-3.5" />
                      </span>
                    </div>
                    <div className="mt-2">
                      <span className="text-xl font-extrabold text-[#111827]">{loadingStats ? <Skeleton className="h-6 w-12" /> : card.value}</span>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Courier Performance Breakdown */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-lg bg-purple-50 text-[#5B2C83]">
                    <Truck className="size-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-[#111827]">Courier Partner Performance</h3>
                    <p className="text-xs text-gray-500">Live delivery metrics by carrier</p>
                  </div>
                </div>
              </div>

              {stats?.courierPerformance && stats.courierPerformance.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 font-bold text-gray-500 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3">Courier Partner</th>
                        <th className="px-4 py-3">Total Shipments</th>
                        <th className="px-4 py-3">Delivered</th>
                        <th className="px-4 py-3">Success Rate</th>
                        <th className="px-4 py-3">Total Freight</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {stats.courierPerformance.map((c: any, idx: number) => (
                        <tr key={idx} className="hover:bg-purple-50/20">
                          <td className="px-4 py-3 font-bold text-[#111827]">{c.courierName}</td>
                          <td className="px-4 py-3 font-semibold">{c.totalShipments}</td>
                          <td className="px-4 py-3 font-semibold text-emerald-600">{c.deliveredCount}</td>
                          <td className="px-4 py-3 font-bold text-purple-700">{c.successRate}%</td>
                          <td className="px-4 py-3 font-semibold">{formatINR(c.totalFreightCost || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-gray-400 font-medium">
                  No courier performance analytics collected yet.
                </div>
              )}
            </Card>
          </div>
        )}

        {/* TAB 2: SHIPMENT MANAGEMENT */}
        {activeTab === "shipments" && (
          <div className="flex flex-col gap-4">
            {/* Filters Bar */}
            <Card className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="size-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by Order #, AWB or Courier..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchShipments()}
                  className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#5B2C83]"
                />
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <Filter className="size-3.5 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#5B2C83]"
                >
                  <option value="">All Shipment Statuses</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Packed">Packed</option>
                  <option value="Pickup Scheduled">Pickup Scheduled</option>
                  <option value="Picked Up">Picked Up</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Out For Delivery">Out For Delivery</option>
                  <option value="Delivered">Delivered</option>
                  <option value="RTO">RTO</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Failed">Failed</option>
                </select>
                <Button variant="primary" size="sm" onClick={fetchShipments}>
                  Search
                </Button>
              </div>
            </Card>

            {/* Table Card */}
            <Card className="overflow-hidden">
              {loadingShipments ? (
                <div className="p-12 text-center text-xs font-semibold text-gray-400">Loading live shipments...</div>
              ) : shipments.length === 0 ? (
                <div className="p-12 text-center text-xs font-semibold text-gray-400">No shipments found matching filters.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3">Order Number</th>
                        <th className="px-4 py-3">Customer</th>
                        <th className="px-4 py-3">Courier Partner</th>
                        <th className="px-4 py-3">AWB / Tracking</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Location</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {shipments.map((s) => (
                        <tr key={s._id} className="hover:bg-purple-50/20">
                          <td className="px-4 py-3 font-bold text-[#111827]">{s.orderId}</td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-gray-900">{s.order?.userName || "N/A"}</div>
                            <div className="text-[10px] text-gray-400">{s.order?.userPhone}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-gray-800">{s.courierName || "Unassigned"}</span>
                            {s.freightCharge > 0 && <span className="block text-[10px] text-gray-400">{formatINR(s.freightCharge)}</span>}
                          </td>
                          <td className="px-4 py-3">
                            {s.awbCode ? (
                              <a
                                href={s.trackingUrl || `https://shiprocket.co/tracking/${s.awbCode}`}
                                target="_blank"
                                rel="noreferrer"
                                className="font-mono text-purple-700 font-bold hover:underline flex items-center gap-1"
                              >
                                {s.awbCode}
                                <ExternalLink className="size-3" />
                              </a>
                            ) : (
                              <span className="text-[10px] text-gray-400">Pending AWB</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ",
                                s.status === "Delivered"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : s.status === "In Transit" || s.status === "Out For Delivery"
                                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                  : s.status === "Pickup Scheduled" || s.status === "Packed"
                                  ? "bg-sky-50 text-sky-700 border-sky-200"
                                  : s.status === "Cancelled" || s.status === "Failed"
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : "bg-gray-100 text-gray-700 border-gray-200"
                              )}
                            >
                              {s.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[10px] text-gray-500">{s.currentLocation || s.pickupLocation || "—"}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {!s.awbCode && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleGenerateAWB(s._id)}
                                  disabled={actionLoadingId === s._id}
                                >
                                  Generate AWB
                                </Button>
                              )}

                              {s.awbCode && s.status === "Packed" && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleSchedulePickup(s._id)}
                                  disabled={actionLoadingId === s._id}
                                >
                                  Schedule Pickup
                                </Button>
                              )}

                              {s.awbCode && (
                                <>
                                  <button
                                    onClick={() => handleDownloadDoc(s._id, "label")}
                                    title="Download Shipping Label"
                                    className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
                                  >
                                    <Printer className="size-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleTrackShipment(s._id)}
                                    title="Refresh Tracking"
                                    className="p-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition"
                                  >
                                    <RefreshCw className="size-3.5" />
                                  </button>
                                  {s.status !== "Cancelled" && s.status !== "Delivered" && (
                                    <button
                                      onClick={() => setCancelShipmentTarget(s._id)}
                                      title="Cancel Shipment"
                                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition"
                                    >
                                      <XCircle className="size-3.5" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* TAB 3: PICKUP LOCATIONS */}
        {activeTab === "locations" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#111827]">Warehouse Pickup Addresses</h3>
                <p className="text-xs text-gray-500">Configured pickup locations synced with Shiprocket</p>
              </div>
              <Button variant="primary" size="sm" onClick={() => setShowAddLocationModal(true)}>
                <Plus className="size-4" />
                Add Pickup Location
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {locations.map((loc) => (
                <Card key={loc._id} className="p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-[#111827] text-sm">{loc.pickupLocation}</span>
                      {loc.isDefault ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Default Primary
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetPrimaryLocation(loc._id)}
                          className="text-[11px] text-purple-700 font-semibold hover:underline"
                        >
                          Set as Default
                        </button>
                      )}
                    </div>
                    <div className="space-y-1 text-xs text-gray-600">
                      <p className="font-bold text-gray-900">{loc.name}</p>
                      <p className="text-gray-500">{loc.address}, {loc.city}, {loc.state} - {loc.pinCode}</p>
                      <p className="text-gray-500 font-mono text-[11px]">Phone: {loc.phone} | {loc.email}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Add Location Modal */}
            {showAddLocationModal && (
              <Modal
                open={showAddLocationModal}
                onClose={() => setShowAddLocationModal(false)}
                title="Add Pickup Address to Shiprocket"
                description="Register a warehouse pickup address for courier dispatch."
                width="max-w-md"
              >
                <form onSubmit={handleAddLocation} className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Pickup Location Nickname</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Surat Primary Warehouse"
                      value={locationForm.pickupLocation}
                      onChange={(e) => setLocationForm({ ...locationForm, pickupLocation: e.target.value })}
                      className={INPUT}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Contact Name</label>
                      <input
                        type="text"
                        required
                        value={locationForm.name}
                        onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                        className={INPUT}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Phone</label>
                      <input
                        type="text"
                        required
                        value={locationForm.phone}
                        onChange={(e) => setLocationForm({ ...locationForm, phone: e.target.value })}
                        className={INPUT}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={locationForm.email}
                      onChange={(e) => setLocationForm({ ...locationForm, email: e.target.value })}
                      className={INPUT}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Address</label>
                    <input
                      type="text"
                      required
                      value={locationForm.address}
                      onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })}
                      className={INPUT}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">City</label>
                      <input
                        type="text"
                        required
                        value={locationForm.city}
                        onChange={(e) => setLocationForm({ ...locationForm, city: e.target.value })}
                        className={INPUT}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">State</label>
                      <input
                        type="text"
                        required
                        value={locationForm.state}
                        onChange={(e) => setLocationForm({ ...locationForm, state: e.target.value })}
                        className={INPUT}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Pincode</label>
                      <input
                        type="text"
                        required
                        value={locationForm.pinCode}
                        onChange={(e) => setLocationForm({ ...locationForm, pinCode: e.target.value })}
                        className={INPUT}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                    <Button type="button" variant="secondary" onClick={() => setShowAddLocationModal(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary">
                      Save Location
                    </Button>
                  </div>
                </form>
              </Modal>
            )}
          </div>
        )}

        {/* TAB 4: RATE & SERVICEABILITY CALCULATOR */}
        {activeTab === "calculator" && (
          <div className="max-w-xl mx-auto flex flex-col gap-5">
            <Card className="p-5">
              <h3 className="text-sm font-bold text-[#111827] mb-1">Check Pincode Serviceability &amp; Live Rates</h3>
              <p className="text-xs text-gray-500 mb-4">Validate delivery availability and fetch rates from live Shiprocket API.</p>

              <form onSubmit={handleCheckServiceability} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Destination Delivery Pincode</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 395006, 400001, 110001"
                    value={calcForm.deliveryPincode}
                    onChange={(e) => setCalcForm({ ...calcForm, deliveryPincode: e.target.value })}
                    className={INPUT}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Shipment Weight (KG)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={calcForm.weight}
                      onChange={(e) => setCalcForm({ ...calcForm, weight: e.target.value })}
                      className={INPUT}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Payment Method</label>
                    <select
                      value={calcForm.cod ? "cod" : "prepaid"}
                      onChange={(e) => setCalcForm({ ...calcForm, cod: e.target.value === "cod" })}
                      className={INPUT}
                    >
                      <option value="cod">Cash on Delivery (COD)</option>
                      <option value="prepaid">Prepaid Online</option>
                    </select>
                  </div>
                </div>
                <Button type="submit" variant="primary" disabled={calcLoading} className="w-full mt-2">
                  {calcLoading ? "Checking Serviceability..." : "Fetch Live Rates"}
                </Button>
              </form>
            </Card>

            {calcResult && (
              <Card className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[#111827] text-sm">Available Couriers ({calcResult.couriers?.length || 0})</h4>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2.5 py-0.5 rounded-full border",
                      calcResult.serviceable ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                    )}
                  >
                    {calcResult.serviceable ? "Serviceable" : "Not Serviceable"}
                  </span>
                </div>

                <div className="space-y-2">
                  {calcResult.couriers?.map((c: any, i: number) => (
                    <div key={i} className="p-3 rounded-xl border border-gray-150 bg-gray-50/60 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#111827] text-xs">{c.courierName}</span>
                          {c.isRecommended && (
                            <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold">
                              Recommended
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5">Est. Delivery: {c.estimatedDeliveryDays || 3} Days | Rating: {c.rating}★</p>
                      </div>
                      <span className="text-sm font-extrabold text-purple-700">{formatINR(c.rate)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(cancelShipmentTarget)}
        onClose={() => setCancelShipmentTarget(null)}
        onConfirm={handleCancelShipment}
        title="Cancel Shipment?"
        description="Are you sure you want to cancel this shipment in Shiprocket? This action cannot be undone."
        confirmLabel="Cancel Shipment"
        tone="danger"
        busy={Boolean(actionLoadingId)}
      />
    </AdminShell>
  );
}
