import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A consistent empty / zero-data state used across cart, orders,
 * wishlist, search results, admin tables, etc.
 *
 *   <EmptyState icon={Package} title="No orders yet"
 *     description="Your orders will appear here."
 *     action={<Button asChild><Link href="/shop">Shop</Link></Button>} />
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  tone = "brand",
}: {
  icon?: React.ElementType;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  tone?: "brand" | "muted";
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-3xl px-6 py-14 text-center",
        tone === "brand" ? "bg-cream-100/50" : "bg-transparent",
        className
      )}
    >
      {Icon && (
        <span className="grid size-16 place-items-center rounded-full bg-purple-50 text-purple-300">
          <Icon className="size-8" />
        </span>
      )}
      <div className="max-w-sm">
        <p className="font-serif text-xl font-semibold text-charcoal">{title}</p>
        {description && (
          <p className="mt-1.5 text-sm leading-relaxed text-charcoal-muted">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
