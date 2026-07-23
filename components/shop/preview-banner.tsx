"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, Rocket, X, Loader2, PenLine } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api";

/**
 * Sits above the real product page while an admin previews an unpublished draft.
 *
 * Two jobs: make it impossible to mistake a draft for the live page, and let the
 * admin publish from the exact screen they just approved — so what they sign off
 * is literally what ships.
 */
export function PreviewBanner({ slug }: { slug: string }) {
  const router = useRouter();
  const [publishing, setPublishing] = React.useState(false);

  const publish = async () => {
    setPublishing(true);
    try {
      await apiFetch(`/admin/products/${slug}/publish`, { method: "POST" });

      // The storefront caches server-rendered content; bust it so the change is
      // live immediately rather than up to a minute later.
      await fetch("/api/revalidate", { method: "POST" }).catch(() => {});

      toast.success("Published", {
        description: "Customers can see this now.",
      });

      // Drop out of preview onto the real, live page.
      router.replace(`/shop/${slug}`);
      router.refresh();
    } catch (err) {
      toast.error("Could not publish", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="sticky top-0 z-50 w-full bg-amber-500 text-white">
      <div className="container-px mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 py-2">
        <span className="flex min-w-0 items-center gap-2 text-[11px] font-semibold sm:text-xs">
          <Eye className="size-3.5 shrink-0 sm:size-4" />
          <span className="truncate">
            <strong className="font-bold">Draft preview</strong>
            <span className="hidden sm:inline">
              {" "}— this is exactly how the page will look. Customers still see the
              published version.
            </span>
          </span>
        </span>

        <div className="flex shrink-0 items-center gap-1.5">
          {/*
            Back to the editor you came from — reopened on this exact product,
            with your draft still in it. Leaving preview used to drop you on the
            dashboard, losing the thread of what you were editing.
          */}
          <button
            onClick={() => router.push(`/admin/products?edit=${slug}`)}
            className="inline-flex items-center gap-1 rounded-full border border-white/40 px-3 py-1 text-[11px] font-bold text-white transition-colors hover:bg-white/20 sm:text-xs"
          >
            <PenLine className="size-3" />
            <span className="hidden xs:inline">Back to </span>editor
          </button>

          <button
            onClick={publish}
            disabled={publishing}
            className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[11px] font-bold text-amber-700 transition-colors hover:bg-amber-50 disabled:opacity-60 sm:text-xs"
          >
            {publishing ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Rocket className="size-3" />
            )}
            {publishing ? "Publishing…" : "Publish"}
          </button>

          <button
            onClick={() => router.replace(`/shop/${slug}`)}
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
