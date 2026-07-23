"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, PenLine, X } from "lucide-react";
import { useCmsPreview } from "./cms-provider";

/**
 * Sits above the homepage while an admin previews unpublished Website Builder
 * drafts (`/?preview=1`). Mirrors the product preview banner: make it obvious
 * this isn't the live page, and offer a one-click way back to the editor.
 *
 * Renders nothing for a normal visitor — `useCmsPreview` is only true when the
 * admin content actually loaded.
 */
export function CmsPreviewBanner() {
  const preview = useCmsPreview();
  const router = useRouter();

  if (!preview) return null;

  return (
    <div className="sticky top-0 z-[60] w-full bg-amber-500 text-white">
      <div className="container-px mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 py-2">
        <span className="flex min-w-0 items-center gap-2 text-[11px] font-semibold sm:text-xs">
          <Eye className="size-3.5 shrink-0 sm:size-4" />
          <span className="truncate">
            <strong className="font-bold">Draft preview</strong>
            <span className="hidden sm:inline">
              {" "}
              — this is how the homepage will look once published. Customers still see
              the live version.
            </span>
          </span>
        </span>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={() => router.push("/admin/website")}
            className="inline-flex items-center gap-1 rounded-full border border-white/40 px-3 py-1 text-[11px] font-bold text-white transition-colors hover:bg-white/20 sm:text-xs"
          >
            <PenLine className="size-3" />
            <span className="hidden xs:inline">Back to </span>editor
          </button>

          <button
            onClick={() => router.replace("/")}
            aria-label="Exit preview"
            className="rounded-full p-1 transition-colors hover:bg-white/20"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
