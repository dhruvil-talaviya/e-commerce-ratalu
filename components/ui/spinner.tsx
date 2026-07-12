import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const sizes = { sm: "size-4", md: "size-6", lg: "size-8" } as const;

/** Accessible loading spinner. */
export function Spinner({
  size = "md",
  className,
  label = "Loading",
}: {
  size?: keyof typeof sizes;
  className?: string;
  label?: string;
}) {
  return (
    <span role="status" aria-live="polite" className={cn("inline-flex", className)}>
      <Loader2 className={cn("animate-spin text-purple-500", sizes[size])} />
      <span className="sr-only">{label}…</span>
    </span>
  );
}

/** Full-area centered loader for page/section suspense fallbacks. */
export function LoadingBlock({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-charcoal-muted">
      <Spinner size="lg" />
      <p className="text-sm">{label}…</p>
    </div>
  );
}
