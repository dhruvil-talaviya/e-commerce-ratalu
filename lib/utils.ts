import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class names intelligently, resolving conflicting
 * utilities (the last one wins) while keeping conditional classes.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number of paise/rupees into an Indian Rupee string. */
export function formatINR(amount: number, opts?: { withDecimals?: boolean }) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: opts?.withDecimals ? 2 : 0,
    minimumFractionDigits: opts?.withDecimals ? 2 : 0,
  }).format(amount);
}

/** Slugify a string for stable, URL-safe identifiers. */
export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
