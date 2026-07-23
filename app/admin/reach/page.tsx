"use client";

import * as React from "react";
import { Users, Eye, UserPlus, ShoppingCart, IndianRupee, TrendingUp, Repeat, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { AdminShell } from "@/components/admin/console/admin-shell";
import { Button, Card, ErrorState, Skeleton } from "@/components/admin/ui/primitives";
import { formatMoney } from "@/components/admin/ui/tokens";

interface Reach {
  today: {
    visitors: number;
    views: number;
    signups: number;
    orders: number;
    revenue: number;
    returningVisitors: number;
    conversionRate: number;
  };
  totals: { customers: number };
  series: {
    date: string;
    label: string;
    visitors: number;
    signups: number;
    orders: number;
    revenue: number;
  }[];
}

export default function ReachPage() {
  const [data, setData] = React.useState<Reach | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await apiFetch<Reach>("/admin/reach"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <AdminShell
      title="Reach"
      description="Today's traffic, sign-ups and orders — real numbers, updated live."
      actions={
        <Button variant="secondary" onClick={load} disabled={loading}>
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          Refresh
        </Button>
      }
    >
      {loading ? (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : data ? (
        <div className="flex flex-col gap-5">
          {/* ── Today ─────────────────────────────────────────────── */}
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Today</p>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi icon={Users} tone="primary" label="Unique visitors" value={data.today.visitors} />
              <Kpi icon={Eye} tone="info" label="Page views" value={data.today.views} />
              <Kpi icon={UserPlus} tone="success" label="New sign-ups" value={data.today.signups} />
              <Kpi icon={ShoppingCart} tone="warning" label="Orders" value={data.today.orders} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
              <Kpi
                icon={IndianRupee}
                tone="success"
                label="Revenue today"
                value={formatMoney(data.today.revenue)}
              />
              <Kpi
                icon={TrendingUp}
                tone="primary"
                label="Visitor → order"
                value={`${data.today.conversionRate}%`}
                hint="Share of today's visitors who ordered"
              />
              <Kpi
                icon={Repeat}
                tone="neutral"
                label="Signed-in visitors"
                value={data.today.returningVisitors}
                hint="Returning / logged-in today"
              />
            </div>
          </div>

          {/* ── 7-day trend ───────────────────────────────────────── */}
          <TrendChart series={data.series} />

          {/* ── Context ───────────────────────────────────────────── */}
          <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-xs text-[#6B7280]">
              <span className="font-bold text-[#111827]">{data.totals.customers.toLocaleString("en-IN")}</span>{" "}
              total registered customers all-time.
            </p>
            <p className="text-[11px] text-gray-400">
              Visitor counts are privacy-light — a random browser id, no IP or personal data.
            </p>
          </Card>
        </div>
      ) : null}
    </AdminShell>
  );
}

const TONE_BG: Record<string, string> = {
  primary: "bg-purple-50 text-[#5B2C83]",
  info: "bg-blue-50 text-blue-600",
  success: "bg-green-50 text-green-600",
  warning: "bg-amber-50 text-amber-600",
  neutral: "bg-gray-100 text-gray-600",
};

function Kpi({
  icon: Icon,
  label,
  value,
  tone = "neutral",
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  tone?: keyof typeof TONE_BG;
  hint?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2.5">
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", TONE_BG[tone])}>
          <Icon className="size-4.5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
            {label}
          </p>
          <p className="text-xl font-extrabold text-[#111827]">{value}</p>
        </div>
      </div>
      {hint && <p className="mt-2 text-[10px] leading-relaxed text-gray-400">{hint}</p>}
    </Card>
  );
}

/** Simple, dependency-free bar chart for the 7-day trend. */
function TrendChart({ series }: { series: Reach["series"] }) {
  const [metric, setMetric] = React.useState<"visitors" | "signups" | "orders">("visitors");

  const metrics = [
    { key: "visitors" as const, label: "Visitors", color: "bg-[#5B2C83]" },
    { key: "signups" as const, label: "Sign-ups", color: "bg-green-500" },
    { key: "orders" as const, label: "Orders", color: "bg-amber-500" },
  ];

  const max = Math.max(1, ...series.map((d) => d[metric]));
  const active = metrics.find((m) => m.key === metric)!;

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-[#111827]">Last 7 days</h2>
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {metrics.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors",
                metric === m.key ? "bg-white text-[#111827] shadow-sm" : "text-[#6B7280] hover:text-[#111827]"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex h-48 items-end justify-between gap-2 sm:gap-4">
        {series.map((d) => {
          const value = d[metric];
          const heightPct = (value / max) * 100;
          return (
            <div key={d.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="flex w-full flex-1 items-end">
                <div
                  className={cn("w-full rounded-t-md transition-all", active.color)}
                  style={{ height: `${Math.max(heightPct, value > 0 ? 6 : 0)}%` }}
                  title={`${d.label}: ${value}`}
                >
                  <span className="sr-only">
                    {d.label}: {value}
                  </span>
                </div>
              </div>
              <span className="text-xs font-bold text-[#111827]">{value}</span>
              <span className="text-[10px] font-medium text-gray-400">{d.label}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
