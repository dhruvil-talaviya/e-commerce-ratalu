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

export function sanitizeMediaUrl(url: string): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (trimmed.includes("res-console.cloudinary.com")) {
    try {
      const parts = trimmed.split("/");
      const cloudName = parts[3];
      const isVideo = trimmed.includes("/video/");
      const v1Index = parts.lastIndexOf("v1");
      if (v1Index !== -1 && parts[v1Index + 1]) {
        const base64Segment = parts[v1Index + 1];
        const decode = (str: string) => {
          if (typeof window !== "undefined" && typeof window.atob === "function") {
            return window.atob(str);
          }
          return Buffer.from(str, "base64").toString("utf-8");
        };
        const publicId = decode(base64Segment);
        if (publicId) {
          const type = isVideo ? "video" : "image";
          const ext = isVideo ? "mp4" : "jpg";
          return `https://res.cloudinary.com/${cloudName}/${type}/upload/${publicId}.${ext}`;
        }
      }
    } catch (e) {
      console.error("Failed to parse Cloudinary Console URL:", e);
    }
  }
  return trimmed;
}
