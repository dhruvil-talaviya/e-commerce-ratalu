"use client";

import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const Accordion = AccordionPrimitive.Root;

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn(
      "overflow-hidden rounded-xl sm:rounded-2xl border border-[#E8DED4] bg-white/80 backdrop-blur-sm transition-all data-[state=open]:bg-white data-[state=open]:shadow-md",
      className
    )}
    {...props}
  />
));
AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "group flex flex-1 items-center justify-between gap-3 px-3.5 py-3 sm:px-5 sm:py-4 text-left font-serif text-sm sm:text-base font-bold text-[#4A1942] outline-none transition-colors hover:text-[#6B2D5B] w-full min-w-0",
        className
      )}
      {...props}
    >
      <div className="min-w-0 flex-1 text-left">{children}</div>
      <span className="grid size-6 sm:size-7 shrink-0 place-items-center rounded-full bg-[#E8C8E4]/40 text-[#4A1942] transition-all duration-300 group-data-[state=open]:rotate-[135deg] group-data-[state=open]:bg-[#4A1942] group-data-[state=open]:text-white">
        <Plus className="size-3.5 sm:size-4" />
      </span>
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = "AccordionTrigger";

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-[#3D2B1F] data-[state=closed]:animate-[accordion-up_0.25s_ease] data-[state=open]:animate-[accordion-down_0.3s_ease]"
    {...props}
  >
    <div className={cn("px-3.5 pb-3.5 pt-0 sm:px-5 sm:pb-4 text-xs sm:text-sm leading-relaxed text-[#3D2B1F]/90", className)}>{children}</div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = "AccordionContent";

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
