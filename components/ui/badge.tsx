import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full font-medium tracking-wide transition-colors",
  {
    variants: {
      variant: {
        primary: "bg-purple-500 text-white",
        soft:    "bg-purple-50 text-purple-700 border border-purple-100",
        gold:    "bg-yellow-400 text-yellow-950",
        orange:  "bg-orange-500 text-white",
        green:   "bg-green-50 text-green-700 border border-green-100",
        red:     "bg-red-50 text-red-700 border border-red-100",
        outline: "border border-purple-200 text-purple-700",
        cream:   "bg-gray-50 text-gray-600 border border-[var(--color-border)]",
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
