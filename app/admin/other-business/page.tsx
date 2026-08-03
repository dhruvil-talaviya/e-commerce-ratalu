"use client";

import * as React from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  Edit2,
  Trash2,
  Calendar as CalendarIcon,
  Search,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Building2,
  X,
  FileSpreadsheet,
  RefreshCw,
  Tag,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  Filter,
  RotateCcw,
} from "lucide-react";
import { AdminShell } from "@/components/admin/console/admin-shell";
import { cn, formatINR } from "@/lib/utils";
import { apiFetchEnvelope } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { Button, Card, ConfirmDialog } from "@/components/admin/ui/primitives";

interface LedgerEntry {
  _id: string;
  date: string;
  type: "sale" | "expense" | "both";
  saleAmount?: number;
  expenseAmount?: number;
  amount: number;
  title: string;
  category: string;
  comments?: string;
  businessName?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CalendarDaySummary {
  sales: number;
  expenses: number;
  count: number;
}

const CATEGORIES = [
  "Sales Revenue",
  "Product Purchase / Inventory",
  "Raw Material",
  "Office Rent",
  "Utilities & Bills",
  "Salaries & Wages",
  "Logistics & Delivery",
  "Marketing & Ads",
  "Equipment & Maintenance",
  "Miscellaneous",
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function OtherBusinessLedgerPage() {
  const todayStr = new Date().toISOString().split("T")[0];

  // Global KPI & Date Filter States
  const [filterMode, setFilterMode] = React.useState<"month" | "year" | "day" | "all">("month");
  const [selectedYear, setSelectedYear] = React.useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = React.useState<number>(new Date().getMonth() + 1); // 1-indexed
  const [selectedDate, setSelectedDate] = React.useState<string>(todayStr);
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // Pagination States
  const [page, setPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(10);
  const [totalPages, setTotalPages] = React.useState<number>(1);
  const [totalRecords, setTotalRecords] = React.useState<number>(0);

  // Ledger Data States
  const [entries, setEntries] = React.useState<LedgerEntry[]>([]);
  const [calendarSummary, setCalendarSummary] = React.useState<Record<string, CalendarDaySummary>>({});
  const [loading, setLoading] = React.useState<boolean>(true);
  const [totals, setTotals] = React.useState({
    totalSales: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalCount: 0,
  });

  // Single Box Form State (Starts Completely Empty!)
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState({
    date: todayStr,
    saleAmount: "",
    expenseAmount: "",
    title: "",
    category: "Sales Revenue",
    comments: "",
  });
  const [formSubmitting, setFormSubmitting] = React.useState<boolean>(false);

  // Delete Dialog State
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  // Fetch entries based on filters & pagination
  const loadEntries = React.useCallback(async () => {
    setLoading(true);
    try {
      let endpoint = `/admin/other-business?page=${page}&limit=${pageSize}`;

      if (searchQuery.trim()) {
        endpoint += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }

      if (filterMode === "day" && selectedDate) {
        endpoint += `&date=${selectedDate}`;
      } else if (filterMode === "month") {
        endpoint += `&month=${selectedMonth}&year=${selectedYear}`;
      } else if (filterMode === "year") {
        endpoint += `&year=${selectedYear}`;
      }

      const envelope = await apiFetchEnvelope<LedgerEntry[]>(endpoint);
      setEntries(envelope.data || []);

      const meta = (envelope.meta as any) || {};
      setTotals({
        totalSales: meta.totalSales || 0,
        totalExpenses: meta.totalExpenses || 0,
        netProfit: meta.netProfit || 0,
        totalCount: meta.totalCount || 0,
      });

      if (envelope.pagination) {
        setTotalPages(envelope.pagination.totalPages || 1);
        setTotalRecords(envelope.pagination.totalRecords || 0);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load ledger entries");
    } finally {
      setLoading(false);
    }
  }, [filterMode, page, pageSize, selectedDate, selectedMonth, selectedYear, searchQuery]);

  // Load Calendar Summary for selected month & year
  const loadCalendarSummary = React.useCallback(async () => {
    try {
      const res = await apiFetchEnvelope<Record<string, CalendarDaySummary>>(
        `/admin/other-business/calendar-summary?month=${selectedMonth}&year=${selectedYear}`
      );
      setCalendarSummary(res.data || {});
    } catch {
      /* ignore */
    }
  }, [selectedMonth, selectedYear]);

  React.useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  React.useEffect(() => {
    loadCalendarSummary();
  }, [loadCalendarSummary]);

  // Reset page to 1 when changing filters
  React.useEffect(() => {
    setPage(1);
  }, [filterMode, selectedMonth, selectedYear, selectedDate, searchQuery]);

  // Calendar Day Click Handler (Keeps form inputs completely clean/empty!)
  const handleDateSelect = (dateStr: string) => {
    setSelectedDate(dateStr);
    setFilterMode("day");
    // Set date, but keep all text/amount fields clean and empty for new entry
    setFormData({
      date: dateStr,
      saleAmount: "",
      expenseAmount: "",
      title: "",
      category: "Sales Revenue",
      comments: "",
    });
    setEditingId(null);
  };

  // Populate form for editing existing entry
  const handleEditEntry = (entry: LedgerEntry) => {
    setEditingId(entry._id);
    const dStr = entry.date ? new Date(entry.date).toISOString().split("T")[0] : todayStr;
    setSelectedDate(dStr);
    setFormData({
      date: dStr,
      saleAmount: (entry.saleAmount && entry.saleAmount > 0) ? String(entry.saleAmount) : (entry.type === "sale" ? String(entry.amount) : ""),
      expenseAmount: (entry.expenseAmount && entry.expenseAmount > 0) ? String(entry.expenseAmount) : (entry.type === "expense" ? String(entry.amount) : ""),
      title: entry.title,
      category: entry.category || "Sales Revenue",
      comments: entry.comments || "",
    });

    window.scrollTo({ top: 320, behavior: "smooth" });
  };

  // Clear Form Box
  const handleResetForm = () => {
    setEditingId(null);
    setFormData({
      date: selectedDate || todayStr,
      saleAmount: "",
      expenseAmount: "",
      title: "",
      category: "Sales Revenue",
      comments: "",
    });
  };

  // Submit Form Box
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    const sAmt = parseFloat(formData.saleAmount || "0");
    const eAmt = parseFloat(formData.expenseAmount || "0");

    if (isNaN(sAmt) && isNaN(eAmt)) {
      toast.error("Please enter a valid Sale or Expense amount");
      return;
    }

    if ((sAmt <= 0 || isNaN(sAmt)) && (eAmt <= 0 || isNaN(eAmt))) {
      toast.error("Please enter at least one Sale or Expense amount");
      return;
    }

    if (!formData.title.trim()) {
      toast.error("Please enter a description / particulars");
      return;
    }

    setFormSubmitting(true);
    try {
      if (editingId) {
        await apiFetchEnvelope(`/admin/other-business/${editingId}`, {
          method: "PUT",
          body: {
            date: formData.date,
            saleAmount: sAmt > 0 ? sAmt : 0,
            expenseAmount: eAmt > 0 ? eAmt : 0,
            title: formData.title.trim(),
            category: formData.category,
            comments: formData.comments.trim(),
          },
        });
        toast.success("Transaction updated successfully!");
      } else {
        await apiFetchEnvelope(`/admin/other-business`, {
          method: "POST",
          body: {
            date: formData.date,
            saleAmount: sAmt > 0 ? sAmt : 0,
            expenseAmount: eAmt > 0 ? eAmt : 0,
            title: formData.title.trim(),
            category: formData.category,
            comments: formData.comments.trim(),
          },
        });
        toast.success(`Ledger entry recorded for ${formData.date}`);
      }

      handleResetForm();
      loadEntries();
      loadCalendarSummary();
    } catch (err: any) {
      toast.error(err.message || "Failed to save entry");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Entry
  const handleDeleteEntry = async () => {
    if (!deletingId) return;
    try {
      await apiFetchEnvelope(`/admin/other-business/${deletingId}`, {
        method: "DELETE",
      });
      toast.success("Entry deleted successfully");
      setDeletingId(null);
      if (editingId === deletingId) handleResetForm();
      loadEntries();
      loadCalendarSummary();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete entry");
    }
  };

  // Calendar Helpers
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const firstDayOfWeek = new Date(selectedYear, selectedMonth - 1, 1).getDay();

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  return (
    <AdminShell
      title="My Other Business Ledger"
      description="Professional day-wise sales and expenses tracking system."
    >
      <div className="space-y-6">
        {/* ─── Period Filter Header ───────────────────────────────────────── */}
        <Card className="p-3.5 sm:p-4 bg-white border border-gray-200 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-[#5B2C83]" />
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                KPI Filter Period:
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Filter Mode Selector */}
              <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setFilterMode("month")}
                  className={cn(
                    "rounded-md px-3 py-1 transition-all text-xs",
                    filterMode === "month" ? "bg-white text-[#5B2C83] shadow-sm font-bold" : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("year")}
                  className={cn(
                    "rounded-md px-3 py-1 transition-all text-xs",
                    filterMode === "year" ? "bg-white text-[#5B2C83] shadow-sm font-bold" : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  Yearly
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("day")}
                  className={cn(
                    "rounded-md px-3 py-1 transition-all text-xs",
                    filterMode === "day" ? "bg-white text-[#5B2C83] shadow-sm font-bold" : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  Day-wise
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("all")}
                  className={cn(
                    "rounded-md px-3 py-1 transition-all text-xs",
                    filterMode === "all" ? "bg-white text-[#5B2C83] shadow-sm font-bold" : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  All Time
                </button>
              </div>

              {/* Month & Year Controls */}
              {filterMode === "month" && (
                <div className="flex items-center gap-1.5">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-bold text-gray-800 focus:outline-none"
                  >
                    {MONTH_NAMES.map((name, idx) => (
                      <option key={name} value={idx + 1}>
                        {name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-bold text-gray-800 focus:outline-none"
                  >
                    {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {filterMode === "year" && (
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-bold text-gray-800 focus:outline-none"
                >
                  {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              )}

              {filterMode === "day" && (
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-bold text-gray-800 focus:outline-none"
                />
              )}
            </div>
          </div>
        </Card>

        {/* ─── Financial Summary KPI Cards ────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
          <Card className="p-4 border-l-4 border-l-emerald-500 bg-white shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Sales</span>
              <span className="grid size-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                <ArrowUpRight className="size-4" />
              </span>
            </div>
            <p className="mt-2 text-xl font-black text-emerald-700 sm:text-2xl">
              {formatINR(totals.totalSales)}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5 font-medium">
              Period: {filterMode === "day" ? selectedDate : filterMode === "month" ? `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}` : filterMode === "year" ? selectedYear : "All Time"}
            </p>
          </Card>

          <Card className="p-4 border-l-4 border-l-rose-500 bg-white shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Expenses</span>
              <span className="grid size-8 place-items-center rounded-lg bg-rose-50 text-rose-600">
                <ArrowDownRight className="size-4" />
              </span>
            </div>
            <p className="mt-2 text-xl font-black text-rose-700 sm:text-2xl">
              {formatINR(totals.totalExpenses)}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5 font-medium">Total Costs</p>
          </Card>

          <Card className={cn("p-4 border-l-4 bg-white shadow-sm", totals.netProfit >= 0 ? "border-l-[#5B2C83]" : "border-l-amber-500")}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Net Profit</span>
              <span className={cn("grid size-8 place-items-center rounded-lg text-white", totals.netProfit >= 0 ? "bg-[#5B2C83]" : "bg-amber-600")}>
                <DollarSign className="size-4" />
              </span>
            </div>
            <p className={cn("mt-2 text-xl font-black sm:text-2xl", totals.netProfit >= 0 ? "text-[#5B2C83]" : "text-amber-700")}>
              {formatINR(totals.netProfit)}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5 font-medium">Sales minus Expenses</p>
          </Card>

          <Card className="p-4 border-l-4 border-l-blue-500 bg-white shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Records</span>
              <span className="grid size-8 place-items-center rounded-lg bg-blue-50 text-blue-600">
                <FileSpreadsheet className="size-4" />
              </span>
            </div>
            <p className="mt-2 text-xl font-black text-gray-900 sm:text-2xl">
              {totals.totalCount}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5 font-medium">Ledger entries</p>
          </Card>
        </div>

        {/* ─── Main 2-Column Responsive Layout ───────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Interactive Month Calendar (7 cols on lg) */}
          <div className="lg:col-span-7">
            <Card className="overflow-hidden p-4 sm:p-5 shadow-sm border border-gray-200 bg-white">
              <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="size-5 text-[#5B2C83]" />
                  <h3 className="text-base font-bold text-gray-900">
                    {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="rounded-lg border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50"
                  >
                    <ChevronLeft className="size-4" />
                  </button>

                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-800 focus:outline-none"
                  >
                    {MONTH_NAMES.map((name, idx) => (
                      <option key={name} value={idx + 1}>
                        {name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-800 focus:outline-none"
                  >
                    {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="rounded-lg border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 text-center text-xs font-bold text-gray-500 mb-2">
                <span className="text-rose-600">Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              {/* Calendar Grid Days */}
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-16 sm:h-20 rounded-lg bg-gray-50/50" />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dayStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                  const isSelected = selectedDate === dayStr;
                  const isToday = todayStr === dayStr;

                  const summary = calendarSummary[dayStr];

                  return (
                    <div
                      key={dayStr}
                      onClick={() => handleDateSelect(dayStr)}
                      className={cn(
                        "flex h-16 sm:h-20 cursor-pointer flex-col justify-between rounded-lg border p-1.5 transition-all select-none",
                        isSelected
                          ? "border-[#5B2C83] bg-purple-50 ring-2 ring-[#5B2C83]/30"
                          : isToday
                          ? "border-amber-400 bg-amber-50/40"
                          : "border-gray-100 bg-white hover:border-purple-200 hover:bg-gray-50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            "grid size-5 place-items-center rounded-full text-[11px] font-bold",
                            isSelected
                              ? "bg-[#5B2C83] text-white"
                              : isToday
                              ? "bg-amber-500 text-white"
                              : "text-gray-700"
                          )}
                        >
                          {dayNum}
                        </span>
                      </div>

                      {summary && (
                        <div className="space-y-0.5 text-[9px] font-bold leading-tight sm:text-[10px]">
                          {summary.sales > 0 && (
                            <div className="truncate rounded bg-emerald-100 px-1 py-0.5 text-emerald-800">
                              +₹{summary.sales >= 1000 ? `${(summary.sales / 1000).toFixed(1)}k` : summary.sales}
                            </div>
                          )}
                          {summary.expenses > 0 && (
                            <div className="truncate rounded bg-rose-100 px-1 py-0.5 text-rose-800">
                              -₹{summary.expenses >= 1000 ? `${(summary.expenses / 1000).toFixed(1)}k` : summary.expenses}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Right Column: CLEAN UNIFIED FORM BOX (Starts Completely Blank!) (5 cols on lg) */}
          <div className="lg:col-span-5">
            <Card className="p-4 sm:p-5 shadow-sm border border-gray-200 bg-white">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Receipt className="size-5 text-[#5B2C83]" />
                    {editingId ? "Edit Transaction Entry" : "Record Daily Ledger Entry"}
                  </h3>
                  <p className="text-xs font-semibold text-[#5B2C83] mt-0.5">
                    Target Date: <span className="font-bold underline">{selectedDate}</span>
                  </p>
                </div>
                {(editingId || formData.saleAmount || formData.expenseAmount || formData.title) && (
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-800"
                  >
                    <RotateCcw className="size-3" /> Clear
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmitForm} className="space-y-4">
                {/* Entry Date */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Entry Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => {
                      setFormData({ ...formData, date: e.target.value });
                      setSelectedDate(e.target.value);
                    }}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-900 focus:border-[#5B2C83] focus:outline-none"
                  />
                </div>

                {/* Side-by-Side Sales Income & Expense Cost Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Daily Sales Input */}
                  <div className="rounded-lg bg-emerald-50/50 p-2.5 border border-emerald-200">
                    <label className="block text-xs font-bold text-emerald-800 mb-1 flex items-center gap-1">
                      <ArrowUpRight className="size-3.5 text-emerald-600" />
                      Sales Income (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={formData.saleAmount}
                      onChange={(e) => setFormData({ ...formData, saleAmount: e.target.value })}
                      className="w-full rounded-md border border-emerald-300 bg-white px-2.5 py-2 text-xs font-black text-emerald-900 focus:border-emerald-600 focus:outline-none placeholder:text-gray-400"
                    />
                  </div>

                  {/* Daily Expense Input */}
                  <div className="rounded-lg bg-rose-50/50 p-2.5 border border-rose-200">
                    <label className="block text-xs font-bold text-rose-800 mb-1 flex items-center gap-1">
                      <ArrowDownRight className="size-3.5 text-rose-600" />
                      Expense Cost (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={formData.expenseAmount}
                      onChange={(e) => setFormData({ ...formData, expenseAmount: e.target.value })}
                      className="w-full rounded-md border border-rose-300 bg-white px-2.5 py-2 text-xs font-black text-rose-900 focus:border-rose-600 focus:outline-none placeholder:text-gray-400"
                    />
                  </div>
                </div>

                {/* Description / Particulars */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Description / Particulars <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter description or transaction details..."
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-[#5B2C83] focus:outline-none placeholder:text-gray-400"
                  />
                </div>

                {/* Category Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-900 focus:border-[#5B2C83] focus:outline-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Remarks & Notes */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Notes & Remarks (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter optional notes, payment method, supplier details..."
                    value={formData.comments}
                    onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-[#5B2C83] focus:outline-none placeholder:text-gray-400"
                  />
                </div>

                {/* Single Submit Button */}
                <Button
                  type="submit"
                  disabled={formSubmitting}
                  className="w-full py-2.5 text-xs font-bold text-white bg-[#5B2C83] hover:bg-[#4A236E] transition-all shadow-md"
                >
                  {formSubmitting ? "Saving Entry..." : editingId ? "Update Entry" : "Save Daily Entry"}
                </Button>
              </form>
            </Card>
          </div>
        </div>

        {/* ─── Day-wise Transactions Ledger & Proper Pagination ────────────── */}
        <Card className="overflow-hidden shadow-sm border border-gray-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4 bg-gray-50/70">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900">
                Transaction Ledger ({totalRecords})
              </h3>
              <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-[#5B2C83]">
                {filterMode === "day"
                  ? `Day: ${selectedDate}`
                  : `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative min-w-[220px]">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search particulars..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-md border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-xs text-gray-900 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-gray-500">
              <RefreshCw className="mx-auto mb-2 size-5 animate-spin text-[#5B2C83]" />
              Loading ledger transactions...
            </div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-center">
              <Building2 className="mx-auto size-8 text-gray-300 mb-2" />
              <p className="text-sm font-bold text-gray-700">No ledger entries recorded</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Use the form above to record a new sale or expense entry.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View (Single Combined Row per Entry!) */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-gray-200 bg-gray-100/80 text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Description / Particulars</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 text-right">Sales Income</th>
                      <th className="px-4 py-3 text-right">Expense Cost</th>
                      <th className="px-4 py-3 text-right">Net Margin</th>
                      <th className="px-4 py-3">Notes & Remarks</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {entries.map((entry) => {
                      const dateStr = entry.date
                        ? new Date(entry.date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "-";

                      const sAmt = entry.saleAmount ?? (entry.type === "sale" ? entry.amount : 0);
                      const eAmt = entry.expenseAmount ?? (entry.type === "expense" ? entry.amount : 0);
                      const netAmt = sAmt - eAmt;

                      return (
                        <tr key={entry._id} className="hover:bg-purple-50/40 transition-colors">
                          <td className="whitespace-nowrap px-4 py-3.5 font-bold text-gray-900">
                            {dateStr}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5">
                            {sAmt > 0 && eAmt > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold text-purple-800 uppercase">
                                Combined
                              </span>
                            ) : sAmt > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 uppercase">
                                <ArrowUpRight className="size-3" /> Sale
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-800 uppercase">
                                <ArrowDownRight className="size-3" /> Expense
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 font-bold text-gray-900 max-w-xs">
                            {entry.title}
                          </td>
                          <td className="px-4 py-3.5 text-gray-600 text-xs">
                            {entry.category}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-right font-black text-emerald-700">
                            {sAmt > 0 ? `+${formatINR(sAmt)}` : "-"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-right font-black text-rose-700">
                            {eAmt > 0 ? `-${formatINR(eAmt)}` : "-"}
                          </td>
                          <td className={cn("whitespace-nowrap px-4 py-3.5 text-right font-black text-sm", netAmt >= 0 ? "text-[#5B2C83]" : "text-amber-700")}>
                            {formatINR(netAmt)}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-gray-600 max-w-xs truncate">
                            {entry.comments || <span className="text-gray-300 italic">-</span>}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleEditEntry(entry)}
                                className="rounded p-1.5 text-gray-600 hover:bg-gray-100 hover:text-[#5B2C83]"
                                title="Edit entry"
                              >
                                <Edit2 className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingId(entry._id)}
                                className="rounded p-1.5 text-rose-600 hover:bg-rose-50"
                                title="Delete entry"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View (Single Card Display per Entry!) */}
              <div className="divide-y divide-gray-100 md:hidden">
                {entries.map((entry) => {
                  const dateStr = entry.date
                    ? new Date(entry.date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "-";

                  const sAmt = entry.saleAmount ?? (entry.type === "sale" ? entry.amount : 0);
                  const eAmt = entry.expenseAmount ?? (entry.type === "expense" ? entry.amount : 0);
                  const netAmt = sAmt - eAmt;

                  return (
                    <div key={entry._id} className="p-4 space-y-2.5 bg-white">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-gray-500 font-bold">{dateStr}</span>
                            <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-700">
                              {entry.category}
                            </span>
                          </div>
                          <h4 className="mt-1 font-bold text-gray-900 text-sm">{entry.title}</h4>
                        </div>
                        <div className="text-right">
                          <p className={cn("text-base font-black", netAmt >= 0 ? "text-emerald-700" : "text-rose-700")}>
                            {formatINR(netAmt)}
                          </p>
                          <p className="text-[10px] text-gray-400">Net Margin</p>
                        </div>
                      </div>

                      {/* Side by side amount badges */}
                      <div className="grid grid-cols-2 gap-2 text-xs font-bold pt-1">
                        <div className="rounded bg-emerald-50 p-2 text-emerald-800 border border-emerald-100">
                          Sales: <span className="font-black">+{formatINR(sAmt)}</span>
                        </div>
                        <div className="rounded bg-rose-50 p-2 text-rose-800 border border-rose-100">
                          Expense: <span className="font-black">-{formatINR(eAmt)}</span>
                        </div>
                      </div>

                      {entry.comments && (
                        <div className="rounded-lg bg-gray-50 p-2.5 text-xs text-gray-700 border border-gray-100">
                          <p className="font-bold text-gray-400 text-[10px] uppercase">Notes:</p>
                          <p className="whitespace-pre-wrap">{entry.comments}</p>
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-50">
                        <button
                          type="button"
                          onClick={() => handleEditEntry(entry)}
                          className="flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-[#5B2C83] px-2.5 py-1 rounded bg-gray-100"
                        >
                          <Edit2 className="size-3" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(entry._id)}
                          className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800 px-2.5 py-1 rounded bg-rose-50"
                        >
                          <Trash2 className="size-3" /> Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ─── PAGINATION CONTROLS ──────────────────────────────────── */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-gray-50/80 px-4 py-3 text-xs font-medium text-gray-700">
                <div className="flex items-center gap-2">
                  <span>Records per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs font-bold text-gray-900 focus:outline-none"
                  >
                    {[10, 25, 50, 100].map((sz) => (
                      <option key={sz} value={sz}>
                        {sz}
                      </option>
                    ))}
                  </select>
                  <span className="text-gray-500 hidden sm:inline">
                    (Showing {entries.length} of {totalRecords} records)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 font-semibold">
                    Page {page} of {totalPages}
                  </span>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="gap-1 text-xs"
                    >
                      <ChevronLeft className="size-3.5" /> Previous
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="gap-1 text-xs"
                    >
                      Next <ChevronRight className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* ─── Delete Confirmation Dialog ──────────────────────────────────── */}
      <ConfirmDialog
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDeleteEntry}
        title="Delete Ledger Entry"
        description="Are you sure you want to delete this transaction entry? This action cannot be undone."
        confirmLabel="Delete Entry"
      />
    </AdminShell>
  );
}
