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

/**
 * Sanitize a media URL from any Cloudinary form into a clean delivery URL.
 *
 * Handles:
 *  - res-console.cloudinary.com (admin preview)  → res.cloudinary.com delivery
 *  - res.cloudinary.com (already correct)         → pass through
 *  - Any other URL                                → pass through
 */
export function sanitizeMediaUrl(url: string): string {
  if (!url) return "";
  const trimmed = url.trim();

  // ── 1. Cloudinary *console* preview URL ─────────────────────────────────
  if (trimmed.includes("res-console.cloudinary.com")) {
    try {
      const urlObj = new URL(trimmed);
      const pathParts = urlObj.pathname.split("/").filter(Boolean);
      // pathname: /<cloudName>/assets/...
      const cloudName = pathParts[0];
      const isVideo = trimmed.includes("/video/") || trimmed.includes("resource_type=video");

      // Try to find the base64-encoded public_id after /v1/
      const v1Idx = pathParts.indexOf("v1");
      if (v1Idx !== -1 && pathParts[v1Idx + 1]) {
        const b64 = pathParts[v1Idx + 1].replace(/-/g, "+").replace(/_/g, "/");
        let publicId = "";
        try {
          if (typeof atob === "function") {
            publicId = atob(b64);
          } else if (typeof Buffer !== "undefined") {
            publicId = Buffer.from(b64, "base64").toString("utf-8");
          }
        } catch {
          // ignore decode error
        }
        if (publicId) {
          const type = isVideo ? "video" : "image";
          // Don't add extension if publicId already contains one
          const hasExt = /\.\w{2,4}$/.test(publicId);
          const suffix = hasExt ? "" : isVideo ? ".mp4" : ".jpg";
          return `https://res.cloudinary.com/${cloudName}/${type}/upload/${publicId}${suffix}`;
        }
      }

      // Fallback: try to extract public_id from query params
      const assetId = urlObj.searchParams.get("public_id") || urlObj.searchParams.get("asset_id");
      if (assetId && cloudName) {
        const type = isVideo ? "video" : "image";
        return `https://res.cloudinary.com/${cloudName}/${type}/upload/${assetId}`;
      }
    } catch {
      // ignore parse errors — fall through and return trimmed
    }
  }

  return trimmed;
}

