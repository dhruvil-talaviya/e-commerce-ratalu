import { cn } from "@/lib/utils";

/**
 * Content placeholder for loading states. Backend-ready: render these
 * while data is in-flight, then swap for real content.
 *
 *   {isLoading ? <Skeleton className="h-40 w-full rounded-2xl" /> : <Card … />}
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-charcoal/10", className)}
      aria-hidden
      {...props}
    />
  );
}

/** A ready-made product-card skeleton matching the storefront card shape. */
export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-3xl border border-[var(--color-border)] bg-white/60">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="flex flex-col gap-3 p-6">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <div className="mt-2 grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-11 rounded-xl" />
          ))}
        </div>
        <Skeleton className="mt-3 h-11 w-full rounded-full" />
      </div>
    </div>
  );
}

/** A ready-made table-row skeleton for admin/dashboard tables. */
export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 border-b border-[var(--color-border)] py-4">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className={cn("h-4", i === 0 ? "w-16" : "flex-1")} />
      ))}
    </div>
  );
}
