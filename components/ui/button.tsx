"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B2C83] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFF8EC] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] select-none cursor-pointer [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /** Deep Purple #5B2C83 background — primary brand CTA with Golden Wafer #F4B400 hover */
        primary:
          "bg-[#5B2C83] text-white shadow-[var(--shadow-soft)] hover:bg-[#F4B400] hover:text-[#2D2D2D] hover:shadow-[var(--shadow-lift)] hover:-translate-y-0.5 font-semibold",
        /** Royal Purple #7B3FA0 background — secondary CTA */
        secondary:
          "bg-[#7B3FA0] text-white shadow-[var(--shadow-soft)] hover:bg-[#5B2C83] hover:shadow-[var(--shadow-lift)] hover:-translate-y-0.5",
        /** Golden Wafer #F4B400 accent — accent CTA */
        accent:
          "bg-[#F4B400] text-[#2D2D2D] shadow-[var(--shadow-soft)] hover:bg-[#5B2C83] hover:text-white hover:shadow-[var(--shadow-glow)] hover:-translate-y-0.5 font-bold",
        /** Purple outline */
        outline:
          "border border-[#5B2C83]/30 bg-transparent text-[#5B2C83] hover:bg-[#5B2C83] hover:text-white hover:border-[#5B2C83]",
        ghost: "bg-transparent text-[#555555] hover:bg-[#f5ebfc] hover:text-[#5B2C83]",
        subtle:
          "bg-white/80 text-[#2D2D2D] backdrop-blur border border-[#e8d9eb] hover:bg-white hover:shadow-[var(--shadow-soft)]",
        link: "text-[#5B2C83] underline-offset-4 hover:underline hover:text-[#F4B400] rounded-none px-0",
      },
      size: {
        sm:      "h-9 px-3.5 text-[13px] [&_svg]:size-4 sm:px-4 sm:text-sm",
        md:      "h-11 px-4 text-sm [&_svg]:size-4 sm:px-6",
        lg:      "h-12 px-5 text-sm [&_svg]:size-5 sm:h-13 sm:px-8 sm:text-base",
        xl:      "h-12 px-5 text-sm [&_svg]:size-5 sm:h-14 sm:px-9 sm:text-base",
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
