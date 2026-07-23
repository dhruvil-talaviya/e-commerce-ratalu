"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch, apiFetchEnvelope } from "@/lib/api";
import { AdminShell } from "@/components/admin/console/admin-shell";
import { DataTable, type Column } from "@/components/admin/ui/data-table";
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  TableSkeleton,
} from "@/components/admin/ui/primitives";
import { formatMoney, formatDate } from "@/components/admin/ui/tokens";

interface CustomerRow {
  _id: string;
  name?: string;
  phone: string;
  email?: string;
  status: "Active" | "Blocked";
  profileComplete: boolean;
  totalOrders: number;
  lifetimeSpend: number;
  lastOrderAt?: string | null;
  createdAt: string;
}

const INPUT =
  "w-full rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-xs text-[#111827] focus:border-[#5B2C83] focus:outline-none focus:ring-2 focus:ring-[#5B2C83]/15";

export default function CustomersPage() {
  const router = useRouter();
  const [rows, setRows] = React.useState<CustomerRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [stats, setStats] = React.useState<{ total: number; active: number; blocked: number; newCustomers: number } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [status, setStatus] = React.useState("");

  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [totalPages, setTotalPages] = React.useState(1);

  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      });
      if (debounced) params.set("search", debounced);
      if (status) params.set("status", status);

      const env = await apiFetchEnvelope<CustomerRow[]>(`/admin/customers?${params}`);
      setRows(env.data ?? []);
      setTotal(env.pagination?.total ?? env.pagination?.totalRecords ?? env.data?.length ?? 0);
      setTotalPages(env.pagination?.pages ?? env.pagination?.totalPages ?? 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, [debounced, status, page, pageSize]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    apiFetch<typeof stats>("/admin/customers/stats")
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  const columns: Column<CustomerRow>[] = [
    {
      key: "name",
      header: "Customer",
      cell: (c) => (
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-purple-100 text-xs font-bold text-[#5B2C83]">
            {(c.name || c.phone || "?").slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-[#111827]">
              {c.name || <span className="italic text-gray-400">Unnamed</span>}
            </p>
            <p className="truncate text-[11px] text-[#6B7280]">{c.phone}</p>
          </div>
        </div>
      ),
    },
    {
      key: "email",
      header: "Email",
      hideBelow: "lg",
      cell: (c) =>
        c.email ? (
          <span className="text-[11px] text-[#6B7280]">{c.email}</span>
        ) : (
          <span className="text-[11px] text-gray-300">—</span>
        ),
    },
    {
      key: "totalOrders",
      header: "Orders",
      cell: (c) => <span className="text-xs font-semibold text-[#111827]">{c.totalOrders}</span>,
    },
    {
      key: "lifetimeSpend",
      header: "Lifetime spend",
      cell: (c) => (
        <span className="text-xs font-bold text-[#111827]">{formatMoney(c.lifetimeSpend)}</span>
      ),
    },
    {
      key: "lastOrderAt",
      header: "Last order",
      hideBelow: "lg",
      cell: (c) => (
        <span className="text-[11px] text-[#6B7280]">
          {c.lastOrderAt ? formatDate(c.lastOrderAt) : "Never"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (c) => (
        <Badge tone={c.status === "Active" ? "success" : "danger"}>{c.status}</Badge>
      ),
    },
  ];

  return (
    <AdminShell
      title="Customers"
      description="Everyone who has signed in, with their orders, addresses and spend."
    >
      {/* Summary */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total customers" value={stats?.total ?? total} />
        <StatCard label="Active" value={stats?.active} tone="success" />
        <StatCard label="Blocked" value={stats?.blocked} tone="danger" />
        <StatCard label="New (30 days)" value={stats?.newCustomers} tone="primary" />
      </div>

      <Card className="mb-4 flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone or email…"
            className={cn(INPUT, "pl-9")}
          />
        </label>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className={cn(INPUT, "sm:w-40")}
        >
          <option value="">All statuses</option>
          <option value="Active">Active</option>
          <option value="Blocked">Blocked</option>
        </select>
      </Card>

      {loading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title={debounced || status ? "No customers match" : "No customers yet"}
          description={
            debounced || status
              ? "Try a different search or filter."
              : "Customers appear here once they verify their mobile number."
          }
        />
      ) : (
        <DataTable<CustomerRow>
          rows={rows}
          columns={columns}
          rowKey={(c) => c._id}
          page={page}
          totalPages={totalPages}
          totalRecords={total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
          }}
          onRowClick={(c) => router.push(`/admin/customers/${c._id}`)}
        />
      )}
    </AdminShell>
  );
}

function StatCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value?: number;
  tone?: "neutral" | "success" | "danger" | "primary";
}) {
  const color = {
    neutral: "text-[#111827]",
    success: "text-green-600",
    danger: "text-red-600",
    primary: "text-[#5B2C83]",
  }[tone];

  return (
    <Card className="p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">{label}</p>
      <p className={cn("mt-1 text-xl font-extrabold", color)}>
        {value ?? <span className="text-gray-300">—</span>}
      </p>
    </Card>
  );
}
