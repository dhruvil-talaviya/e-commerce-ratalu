"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A centered, responsive modal dialog (distinct from the side Sheet).
 * Used for Quick View, confirmations, and future forms.
 */
const Modal = DialogPrimitive.Root;
const ModalTrigger = DialogPrimitive.Trigger;
const ModalClose = DialogPrimitive.Close;

const ModalContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { showClose?: boolean }
>(({ className, children, showClose = true, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-purple-900/45 backdrop-blur-sm data-[state=open]:animate-[fade-in_0.25s_ease] data-[state=closed]:animate-[fade-out_0.2s_ease]" />
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-4">
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "relative w-full max-w-lg rounded-t-3xl bg-[var(--color-cream)] shadow-[var(--shadow-lift)] outline-none",
          "data-[state=open]:animate-[modal-in_0.3s_var(--ease-premium)] data-[state=closed]:animate-[fade-out_0.2s_ease]",
          "sm:rounded-3xl",
          className
        )}
        {...props}
      >
        {children}
        {showClose && (
          <DialogPrimitive.Close
            className="absolute right-4 top-4 z-10 grid size-9 place-items-center rounded-full bg-white/80 text-charcoal-muted shadow-sm backdrop-blur transition-colors hover:bg-white hover:text-purple-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-200"
            aria-label="Close"
          >
            <X className="size-5" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </div>
  </DialogPrimitive.Portal>
));
ModalContent.displayName = "ModalContent";

const ModalTitle = DialogPrimitive.Title;
const ModalDescription = DialogPrimitive.Description;

export { Modal, ModalTrigger, ModalClose, ModalContent, ModalTitle, ModalDescription };
