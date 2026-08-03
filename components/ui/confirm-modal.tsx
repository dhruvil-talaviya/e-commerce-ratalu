"use client";

import * as React from "react";
import { AlertTriangle, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "warning" | "purple";
  loading?: boolean;
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  loading = false,
}: ConfirmModalProps) {
  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [open, onClose, loading]);

  if (!open) return null;

  const toneStyles = {
    danger: {
      badgeBg: "bg-rose-50 text-rose-600 border-rose-100",
      confirmBtn: "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200",
    },
    warning: {
      badgeBg: "bg-amber-50 text-amber-600 border-amber-100",
      confirmBtn: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200",
    },
    purple: {
      badgeBg: "bg-purple-50 text-purple-600 border-purple-100",
      confirmBtn: "bg-[#5B2C83] hover:bg-[#4a236c] text-white shadow-purple-200",
    },
  }[tone];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/50 backdrop-blur-xs transition-opacity"
        onClick={() => !loading && onClose()}
      />

      {/* Modal Dialog Box — Screen-centered in the middle of page */}
      <div className="relative w-full max-w-md my-auto flex flex-col max-h-[85vh] rounded-3xl bg-white shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200 p-6 text-left">
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors disabled:opacity-50"
        >
          <X className="size-4" />
        </button>

        {/* Content */}
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-2xl border shadow-inner",
              toneStyles.badgeBg
            )}
          >
            <AlertTriangle className="size-5" />
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="text-base font-extrabold text-gray-900">{title}</h3>
            <p className="mt-1.5 text-xs text-gray-600 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 sm:flex-initial text-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "flex-1 sm:flex-initial text-center justify-center inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap",
              toneStyles.confirmBtn
            )}
          >
            {loading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
