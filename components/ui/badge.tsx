import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full font-medium tracking-wide transition-colors",
  {
    variants: {
      variant: {
        primary: "bg-purple-500 text-cream",
        soft: "bg-purple-50 text-purple-700 border border-purple-100",
        gold: "bg-gold-400 text-purple-800",
        orange: "bg-orange-500 text-white",
        outline: "border border-purple-200 text-purple-700",
        cream: "bg-cream-100 text-charcoal-muted border border-[var(--color-border)]",
      },
      size: {
        sm: "px-2.5 py-0.5 text-[11px]",
        md: "px-3 py-1 text-xs",
        lg: "px-4 py-1.5 text-sm",
      },
    },
    defaultVariants: { variant: "soft", size: "md" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { Badge, badgeVariants };
