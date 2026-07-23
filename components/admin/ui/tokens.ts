/**
 * Admin console design system.
 *
 * The storefront has its own warm cream/purple identity; the console is a
 * separate product with a colder, denser, enterprise palette. Keeping the tokens
 * here (rather than in Tailwind config) avoids leaking console colours into the
 * storefront theme, and gives every module one place to agree on.
 *
 * Light theme only, per spec.
 */

export const ADMIN = {
  primary: "#5B2C83",
  primaryHover: "#4B236E",
  background: "#F8FAFC",
  surface: "#FFFFFF",
  border: "#E5E7EB",
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#3B82F6",
} as const;

/** Shared shape language: 12px radius, soft shadow, 200ms motion. */
export const CARD = "rounded-xl border border-[#E5E7EB] bg-white shadow-sm";
export const TRANSITION = "transition-all duration-200";

/** Semantic tone → Tailwind classes. One source of truth for every badge. */
export type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "primary";

export const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-gray-100 text-gray-700 border-gray-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
  success: "bg-green-50 text-green-700 border-green-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-red-50 text-red-700 border-red-200",
  primary: "bg-purple-50 text-[#5B2C83] border-purple-200",
};

/**
 * Every order status the backend can emit, mapped to a tone and a position in
 * the fulfilment flow. Derived from Order.status's enum — keep in sync with
 * server/src/models/Order.js.
 */
/**
 * The order statuses — EXACTLY the values the Order schema accepts.
 *
 * This list used to be a parallel invention: "Ready for Dispatch", "In Transit",
 * "Return Requested" and "Return Approved" appear nowhere in the database enum,
 * so every one of them threw a validation error when an admin picked it out of
 * the status dropdown. Mirrors server/src/services/fulfilment.service.js.
 */
export const ORDER_STATUS: Record<string, { tone: Tone; progress: number }> = {
  Pending: { tone: "neutral", progress: 8 },
  Confirmed: { tone: "primary", progress: 18 },
  Preparing: { tone: "primary", progress: 30 },
  Packed: { tone: "info", progress: 42 },
  "Ready to Ship": { tone: "info", progress: 54 },
  "Assigned to Logistics": { tone: "info", progress: 66 },
  Shipped: { tone: "warning", progress: 76 },
  "Out for Delivery": { tone: "warning", progress: 88 },
  Delivered: { tone: "success", progress: 100 },
  Cancelled: { tone: "danger", progress: 100 },
  Returned: { tone: "danger", progress: 100 },
  "Refund Requested": { tone: "warning", progress: 100 },
  "Refund Approved": { tone: "warning", progress: 100 },
  "Refund Completed": { tone: "danger", progress: 100 },
  "Payment Failed": { tone: "danger", progress: 100 },
  Expired: { tone: "neutral", progress: 100 },
};

export const PAYMENT_STATUS: Record<string, Tone> = {
  Paid: "success",
  Pending: "warning",
  Failed: "danger",
  Refunded: "neutral",
  "Partially Refunded": "neutral",
  Cancelled: "danger",
};

/** The happy path, in order — drawn as the progress track on an order. */
export const FULFILMENT_FLOW = [
  "Pending",
  "Confirmed",
  "Preparing",
  "Packed",
  "Ready to Ship",
  "Assigned to Logistics",
  "Shipped",
  "Out for Delivery",
  "Delivered",
] as const;

export const EXCEPTION_FLOW = [
  "Cancelled",
  "Returned",
  "Refund Requested",
  "Refund Approved",
  "Refund Completed",
  "Payment Failed",
  "Expired",
] as const;

/**
 * Where an order can go from here — the client half of the lifecycle.
 *
 * Kept identical to fulfilment.service.js on the server, which is what actually
 * enforces it. The console uses this to offer only moves that will succeed.
 */
export const NEXT_STATUSES: Record<string, readonly string[]> = {
  Pending: ["Confirmed", "Cancelled"],
  Confirmed: ["Preparing", "Cancelled"],
  Preparing: ["Packed", "Cancelled"],
  Packed: ["Ready to Ship", "Cancelled"],
  "Ready to Ship": ["Assigned to Logistics", "Cancelled"],
  "Assigned to Logistics": ["Shipped", "Cancelled"],
  Shipped: ["Out for Delivery"],
  "Out for Delivery": ["Delivered", "Returned"],
  Delivered: ["Returned"],
  Cancelled: [],
  Returned: [],
  "Refund Requested": [],
  "Refund Approved": [],
  "Refund Completed": [],
  "Payment Failed": [],
  Expired: [],
};

/** The one move that needs a courier and an AWB before it can happen. */
export const REQUIRES_COURIER = "Assigned to Logistics";

/** What the button says, rather than the raw status name. */
export const STATUS_ACTION_LABEL: Record<string, string> = {
  Confirmed: "Confirm order",
  Preparing: "Start preparing",
  Packed: "Mark packed",
  "Ready to Ship": "Mark ready to ship",
  "Assigned to Logistics": "Dispatch…",
  Shipped: "Mark shipped",
  "Out for Delivery": "Out for delivery",
  Delivered: "Mark delivered",
  Cancelled: "Cancel order",
  Returned: "Mark returned",
};

export const formatMoney = (n: number | undefined | null) =>
  `₹${Number(n ?? 0).toLocaleString("en-IN")}`;

export const formatDate = (iso: string | Date | undefined | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

export const formatDateTime = (iso: string | Date | undefined | null) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
