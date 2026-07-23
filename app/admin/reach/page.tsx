"use client";

import * as React from "react";
import { Users, Eye, UserPlus, ShoppingCart, IndianRupee, TrendingUp, Repeat, RefreshCw, Heart, Crown, Sparkles, BarChart3, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { AdminShell } from "@/components/admin/console/admin-shell";
import { Button, Card, ErrorState, Skeleton } from "@/components/admin/ui/primitives";
import { formatMoney } from "@/components/admin/ui/tokens";

interface TopLikedProduct {
  flavorId: string;
  name: string;
  image?: string | null;
  gradient?: { from: string; via: string; to: string } | null;
  likesCount: number;
}

interface Reach {
  today: {
    visitors: number;
    views: number;
    signups: number;
    orders: number;
    revenue: number;
    returningVisitors: number;
    conversionRate: number;
    totalLikes?: number;
  };
  totals: {
    customers: number;
    likes?: number;
    avgLikesPerProduct?: number;
    engagementRate?: number;
    accountsWithLikes?: number;
  };
  mostLikedProduct?: TopLikedProduct | null;
  topLikedProducts?: TopLikedProduct[];
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

  const maxLikes = React.useMemo(() => {
    if (!data?.topLikedProducts || data.topLikedProducts.length === 0) return 1;
    return Math.max(1, ...data.topLikedProducts.map((p) => p.likesCount));
  }, [data]);

  return (
    <AdminShell
      title="Reach & Product Engagement"
      description="Real-time visitor traffic, customer sign-ups, orders, and product ❤️ likes analytics."
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
        <div className="flex flex-col gap-6">
          {/* ── Today Traffic & Sales ─────────────────────────────── */}
          <div>
            <p className="mb-2.5 text-xs font-extrabold uppercase tracking-wider text-gray-400">Traffic & Conversions Today</p>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi icon={Users} tone="primary" label="Unique Visitors" value={data.today.visitors} />
              <Kpi icon={Eye} tone="info" label="Page Views" value={data.today.views} />
              <Kpi icon={UserPlus} tone="success" label="New Sign-ups" value={data.today.signups} />
              <Kpi icon={ShoppingCart} tone="warning" label="Orders Today" value={data.today.orders} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
              <Kpi
                icon={IndianRupee}
                tone="success"
                label="Revenue Today"
                value={formatMoney(data.today.revenue)}
              />
              <Kpi
                icon={TrendingUp}
                tone="primary"
                label="Visitor → Order Rate"
                value={`${data.today.conversionRate}%`}
                hint="Share of today's visitors who placed an order"
              />
              <Kpi
                icon={Repeat}
                tone="neutral"
                label="Signed-in Visitors"
                value={data.today.returningVisitors}
                hint="Logged-in users active today"
              />
            </div>
          </div>

          {/* ── Product Likes & Customer Engagement KPI Cards ────── */}
          <div>
            <p className="mb-2.5 text-xs font-extrabold uppercase tracking-wider text-gray-400">Product Likes & Customer Intent KPIs</p>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi
                icon={Heart}
                tone="danger"
                label="Total Product Likes"
                value={data.totals.likes ?? 0}
                hint="1 user = 1 unique like per product"
              />
              <Kpi
                icon={Crown}
                tone="warning"
                label="Top Liked Flavor"
                value={data.mostLikedProduct ? `${data.mostLikedProduct.name}` : "None"}
                hint={data.mostLikedProduct ? `${data.mostLikedProduct.likesCount} customer likes` : "No likes yet"}
              />
              <Kpi
                icon={BarChart3}
                tone="info"
                label="Avg. Likes / Flavor"
                value={data.totals.avgLikesPerProduct ?? 0}
                hint="Average likes per active product"
              />
              <Kpi
                icon={Sparkles}
                tone="primary"
                label="Customer Like Rate"
                value={`${data.totals.engagementRate ?? 0}%`}
                hint={`${data.totals.accountsWithLikes ?? 0} of ${data.totals.customers} customers saved likes`}
              />
            </div>
          </div>

          {/* ── Product Likes Analytics Breakdown Leaderboard ─────── */}
          {data.topLikedProducts && data.topLikedProducts.length > 0 && (
            <Card className="p-5">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-4">
                <div>
                  <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                    <Flame className="size-5 text-orange-500 fill-orange-500" />
                    Product Likes Breakdown & Leaderboard
                  </h2>
                  <p className="text-xs text-gray-500">
                    Exact number of unique customer likes for each product flavor across all user accounts.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-extrabold text-red-600 border border-red-200 flex items-center gap-1">
                    <Heart className="size-3.5 fill-red-500" /> {data.totals.likes ?? 0} Total Likes
                  </span>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {data.topLikedProducts.map((prod, idx) => {
                  const pctOfMax = Math.round((prod.likesCount / maxLikes) * 100);
                  const pctOfTotal = (data.totals.likes ?? 0) > 0 
                    ? Math.round((prod.likesCount / (data.totals.likes ?? 1)) * 1000) / 10 
                    : 0;

                  return (
                    <div key={prod.flavorId} className="flex items-center gap-3 py-3 hover:bg-gray-50/60 px-2 rounded-xl transition-colors">
                      <span className={cn(
                        "w-7 text-center text-xs font-extrabold shrink-0",
                        idx === 0 ? "text-amber-500 text-sm" : idx === 1 ? "text-slate-400" : idx === 2 ? "text-amber-700" : "text-gray-400"
                      )}>
                        {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                      </span>

                      <div className="size-10 rounded-xl overflow-hidden shrink-0 border border-gray-200 bg-gray-50 flex items-center justify-center shadow-2xs">
                        {prod.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={prod.image} alt={prod.name} className="size-full object-cover" />
                        ) : (
                          <div
                            className="size-full"
                            style={{
                              background: prod.gradient
                                ? `radial-gradient(120% 120% at 30% 20%, ${prod.gradient.from}, ${prod.gradient.to})`
                                : "#9333ea",
                            }}
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                          <span className="font-extrabold text-gray-900 truncate">{prod.name}</span>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[11px] font-semibold text-gray-400 hidden sm:inline">
                              {pctOfTotal}% of all likes
                            </span>
                            <span className="font-extrabold text-red-600 bg-red-50 border border-red-100 rounded-lg px-2 py-0.5 flex items-center gap-1">
                              <Heart className="size-3 fill-red-500" /> {prod.likesCount} {prod.likesCount === 1 ? "like" : "likes"}
                            </span>
                          </div>
                        </div>
                        <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 transition-all duration-500"
                            style={{ width: `${Math.max(pctOfMax, prod.likesCount > 0 ? 5 : 0)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* ── 7-day trend ───────────────────────────────────────── */}
          <TrendChart series={data.series} />

          {/* ── Context ───────────────────────────────────────────── */}
          <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-xs text-[#6B7280]">
              <span className="font-bold text-[#111827]">{data.totals.customers.toLocaleString("en-IN")}</span>{" "}
              total registered customers all-time.
            </p>
            <p className="text-[11px] text-gray-400">
              Product likes are strictly unique per customer account (1 customer = max 1 like per product).
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
