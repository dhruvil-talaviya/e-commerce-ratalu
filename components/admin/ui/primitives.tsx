"use client";

import * as React from "react";
import { AlertTriangle, RefreshCw, Inbox, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CARD, TONE_CLASSES, TRANSITION, type Tone } from "./tokens";

/* ------------------------------------------------------------------ */
/* BADGE                                                              */
/* ------------------------------------------------------------------ */

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-semibold",
        TONE_CLASSES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* CARD                                                               */
/* ------------------------------------------------------------------ */

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn(CARD, className)}>{children}</div>;
}

/* ------------------------------------------------------------------ */
/* SKELETON                                                           */
/* ------------------------------------------------------------------ */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-gray-200/70", className)} />;
}

/** Placeholder rows shaped like the table they're standing in for. */
export function TableSkeleton({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3.5">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              className={cn("h-4", c === 0 ? "w-24" : c === cols - 1 ? "ml-auto w-16" : "flex-1")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* EMPTY / ERROR STATES                                               */
/* ------------------------------------------------------------------ */

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-xl bg-gray-50 text-gray-400">
        <Icon className="size-6" />
      </span>
      <div>
        <p className="text-sm font-semibold text-[#111827]">{title}</p>
        {description && (
          <p className="mx-auto mt-1 max-w-sm text-xs text-[#6B7280]">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-xl bg-red-50 text-red-500">
        <AlertTriangle className="size-6" />
      </span>
      <div>
        <p className="text-sm font-semibold text-[#111827]">Something went wrong</p>
        <p className="mx-auto mt-1 max-w-sm text-xs text-[#6B7280]">
          {message || "We couldn't load this data."}
        </p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#111827] hover:bg-gray-50",
            TRANSITION
          )}
        >
          <RefreshCw className="size-3.5" />
          Try again
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* BUTTON                                                             */
/* ------------------------------------------------------------------ */

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-[#5B2C83] text-white hover:bg-[#4B236E] focus-visible:outline-[#5B2C83] disabled:bg-purple-300",
  secondary:
    "border border-gray-200 bg-white text-[#111827] hover:bg-gray-50 focus-visible:outline-[#5B2C83]",
  danger:
    "border border-red-200 bg-white text-red-600 hover:bg-red-50 focus-visible:outline-red-500",
  ghost: "text-[#6B7280] hover:bg-gray-100 hover:text-[#111827] focus-visible:outline-[#5B2C83]",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md";
}) {
  return (
    <button
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-semibold",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-60",
        size === "sm" ? "px-2.5 py-1.5 text-[11px]" : "px-3.5 py-2 text-xs",
        BUTTON_VARIANTS[variant],
        TRANSITION,
        className
      )}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ */
/* MODAL + CONFIRM DIALOG                                             */
/* ------------------------------------------------------------------ */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  width?: string;
}) {
  // Esc closes, and the body doesn't scroll behind the dialog.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative z-10 w-full overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-xl",
          width
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-[#111827]">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-[#6B7280]">{description}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="max-h-[85vh] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  tone = "danger",
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  tone?: "danger" | "primary";
  busy?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-md">
      <p className="text-xs leading-relaxed text-[#6B7280]">{description}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant={tone === "danger" ? "danger" : "primary"}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? "Working…" : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
