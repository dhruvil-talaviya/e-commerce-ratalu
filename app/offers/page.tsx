"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Ticket, Copy, Check, RefreshCw, ArrowRight, Percent } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api";
import { formatINR, cn } from "@/lib/utils";

/** Matches the Coupon model returned by GET /api/v1/coupons (Active only). */
interface Coupon {
  _id: string;
  code: string;
  type: "percent" | "flat";
  value: number;
  minSubtotal?: number;
  maxDiscount?: number;
  expiryDate?: string;
  description: string;
}

export default function OffersPage() {
  const [coupons, setCoupons] = React.useState<Coupon[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Coupon[]>("/coupons");
      setCoupons(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load offers.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      /* clipboard may be unavailable */
    }
    setCopied(code);
    toast.success("Coupon copied!", { description: `Paste ${code} at checkout to save.` });
    setTimeout(() => setCopied(null), 1800);
  };

  return (
    <>
      <PageHeader
        eyebrow="Today's offers"
        title={
          <>
            Deals & <span className="text-gradient-warm">Coupons</span>
          </>
        }
        description="Live offers straight from our store — copy a code and save at checkout."
        crumbs={[{ label: "Home", href: "/" }, { label: "Offers" }]}
      />

      <section className="container-px mx-auto max-w-7xl py-10">
        {/* Loading */}
        {loading && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
        )}

        {/* Error + retry */}
        {!loading && error && (
          <EmptyState
            icon={RefreshCw}
            title="Couldn't load offers"
            description={error}
            action={
              <Button onClick={load} variant="outline">
                <RefreshCw className="size-4" /> Try again
              </Button>
            }
          />
        )}

        {/* Empty */}
        {!loading && !error && coupons.length === 0 && (
          <EmptyState
            icon={Ticket}
            title="No active offers right now"
            description="New coupons are added regularly — check back soon or start shopping."
            action={
              <Button asChild>
                <Link href="/products">
                  Browse products <ArrowRight />
                </Link>
              </Button>
            }
          />
        )}

        {/* Live coupons */}
        {!loading && !error && coupons.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {coupons.map((c, i) => {
              const isCopied = copied === c.code;
              const headline =
                c.type === "percent" ? `${c.value}% OFF` : `${formatINR(c.value)} OFF`;
              return (
                <motion.div
                  key={c._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: i * 0.05 }}
                  className="relative flex items-center gap-4 overflow-hidden rounded-2xl border border-dashed border-purple-300 bg-white p-5 shadow-[var(--shadow-soft)]"
                >
                  {/* ticket notches */}
                  <span className="absolute -left-3 top-1/2 size-6 -translate-y-1/2 rounded-full bg-[var(--color-background)]" aria-hidden />
                  <span className="absolute -right-3 top-1/2 size-6 -translate-y-1/2 rounded-full bg-[var(--color-background)]" aria-hidden />

                  <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-purple-500 text-white">
                    <Percent className="size-6" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-orange-600">
                      {headline}
                    </p>
                    <p className="text-lg font-bold tracking-wide text-purple-700">{c.code}</p>
                    <p className="truncate text-sm text-gray-500">{c.description}</p>
                    {!!c.minSubtotal && c.minSubtotal > 0 && (
                      <p className="mt-0.5 text-[11px] text-gray-400">
                        On orders above {formatINR(c.minSubtotal)}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => copy(c.code)}
                    aria-label={`Copy coupon ${c.code}`}
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-xl border transition-all",
                      isCopied
                        ? "border-green-200 bg-green-50 text-green-600"
                        : "border-gray-200 bg-white text-gray-500 hover:border-purple-300 hover:text-purple-700"
                    )}
                  >
                    {isCopied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
