"use client";

import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A lightweight, dependency-free toast system in the style of `sonner`.
 *
 * It uses a module-level store instead of React context so it can be
 * called from anywhere — providers, event handlers, future API service
 * layers — without worrying about provider nesting order. Mount a single
 * <Toaster /> once near the app root.
 *
 *   import { toast } from "@/components/ui/toast";
 *   toast.success("Added to cart");
 *   toast.error("Something went wrong", { description: "Please retry." });
 */

type ToastType = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: number;
  type: ToastType;
  title: string;
  description?: string;
  duration: number;
}

interface ToastOptions {
  description?: string;
  duration?: number;
}

let counter = 0;
let items: ToastItem[] = [];
const listeners = new Set<(items: ToastItem[]) => void>();

function emit() {
  for (const l of listeners) l(items);
}

function push(type: ToastType, title: string, opts?: ToastOptions): number {
  const id = ++counter;
  const item: ToastItem = {
    id,
    type,
    title,
    description: opts?.description,
    duration: opts?.duration ?? 3800,
  };
  items = [item, ...items].slice(0, 4); // cap the visible stack
  emit();
  if (item.duration > 0) {
    setTimeout(() => dismiss(id), item.duration);
  }
  return id;
}

function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

export const toast = {
  success: (title: string, opts?: ToastOptions) => push("success", title, opts),
  error: (title: string, opts?: ToastOptions) => push("error", title, opts),
  info: (title: string, opts?: ToastOptions) => push("info", title, opts),
  warning: (title: string, opts?: ToastOptions) => push("warning", title, opts),
  dismiss,
};

const CONFIG: Record<
  ToastType,
  { icon: React.ElementType; accent: string; iconClass: string; border: string; bg: string }
> = {
  success: {
    icon: CheckCircle2,
    accent: "bg-emerald-500",
    iconClass: "text-emerald-500",
    border: "border-emerald-100",
    bg: "bg-emerald-50/50",
  },
  error: {
    icon: XCircle,
    accent: "bg-red-500",
    iconClass: "text-red-500",
    border: "border-red-100",
    bg: "bg-red-50/50",
  },
  info: {
    icon: Info,
    accent: "bg-purple-600",
    iconClass: "text-purple-600",
    border: "border-purple-100",
    bg: "bg-purple-50/50",
  },
  warning: {
    icon: AlertTriangle,
    accent: "bg-orange-500",
    iconClass: "text-orange-500",
    border: "border-orange-100",
    bg: "bg-orange-50/50",
  },
};

/** Mount once near the root (already wired in app/providers.tsx). */
export function Toaster() {
  const [list, setList] = React.useState<ToastItem[]>([]);
  const reduce = useReducedMotion();

  React.useEffect(() => {
    listeners.add(setList);
    setList(items);
    return () => {
      listeners.delete(setList);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-3 sm:inset-x-auto sm:right-4 sm:top-4 sm:items-end"
      role="region"
      aria-live="polite"
      aria-atomic="false"
    >
      <AnimatePresence initial={false}>
        {list.map((t) => {
          const c = CONFIG[t.type];
          const Icon = c.icon;
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: reduce ? 0 : -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "pointer-events-auto flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-2xl border p-3.5 pr-10 shadow-lg backdrop-blur-md transition-all",
                c.border,
                c.bg
              )}
              role="status"
            >
              <span className={cn("mt-0.5 shrink-0", c.iconClass)}>
                <Icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-gray-900 leading-tight">{t.title}</p>
                {t.description && (
                  <p className="mt-1 text-[10px] leading-relaxed text-gray-500 font-semibold">{t.description}</p>
                )}
              </div>
              <span className={cn("absolute inset-y-0 left-0 w-1", c.accent)} aria-hidden />
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="absolute right-2.5 top-2.5 grid size-6 place-items-center rounded-full text-gray-400 hover:bg-white/60 hover:text-gray-700 transition-colors"
              >
                <X className="size-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
