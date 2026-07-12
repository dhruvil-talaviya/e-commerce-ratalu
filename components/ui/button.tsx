"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] select-none cursor-pointer [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /** Purple background — primary brand CTA */
        primary:
          "bg-purple-500 text-white shadow-[var(--shadow-soft)] hover:bg-purple-600 hover:shadow-[var(--shadow-lift)] hover:-translate-y-0.5",
        /** Orange background — secondary CTA */
        secondary:
          "bg-orange-500 text-white shadow-[var(--shadow-soft)] hover:bg-orange-600 hover:shadow-[var(--shadow-lift)] hover:-translate-y-0.5",
        /** Yellow accent — accent CTA */
        accent:
          "bg-yellow-400 text-gray-900 shadow-[var(--shadow-soft)] hover:bg-yellow-300 hover:shadow-[var(--shadow-glow)] hover:-translate-y-0.5",
        /** Purple outline */
        outline:
          "border border-purple-200 bg-transparent text-purple-700 hover:bg-purple-50 hover:border-purple-300",
        ghost: "bg-transparent text-gray-700 hover:bg-purple-50 hover:text-purple-700",
        subtle:
          "bg-white/70 text-gray-700 backdrop-blur border border-[var(--color-border)] hover:bg-white hover:shadow-[var(--shadow-soft)]",
        link: "text-purple-600 underline-offset-4 hover:underline rounded-none px-0",
      },
      size: {
        sm:      "h-9 px-4 text-sm [&_svg]:size-4",
        md:      "h-11 px-6 text-sm [&_svg]:size-4",
        lg:      "h-13 px-8 text-base [&_svg]:size-5",
        xl:      "h-14 px-9 text-base [&_svg]:size-5",
        icon:    "size-11 [&_svg]:size-5",
        "icon-sm": "size-9 [&_svg]:size-4",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
