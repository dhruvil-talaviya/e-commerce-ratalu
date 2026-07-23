"use client";

import * as React from "react";
import { ImagePlus, Loader2, X, Link2, FileVideo } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { getTokens } from "@/lib/api";

/**
 * Pick an image or video for any CMS slot: upload a file, or paste a URL.
 *
 * The upload endpoint (`POST /media/upload`) has existed all along, but nothing
 * in the Website Builder ever called it — there was no way to put a picture on
 * a page from the console at all. Every "image" on the site was either a
 * generated gradient or a URL hardcoded in the source.
 *
 * Multipart, so it cannot go through `apiFetch` (which sets a JSON content type
 * and would corrupt the boundary).
 */
export function MediaField({
  label,
  hint,
  value,
  onChange,
  accept = "image/*,video/*",
  aspect = "aspect-video",
}: {
  label: string;
  hint?: string;
  value?: string;
  onChange: (url: string) => void;
  accept?: string;
  aspect?: string;
}) {
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const isVideo = /\.(mp4|webm|ogg)(\?|$)/i.test(value ?? "");

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);

      const res = await fetch("/api/v1/media/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${getTokens()?.accessToken ?? ""}` },
        body,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || `Upload failed (${res.status})`);
      }

      const url = json.data?.url ?? json.data?.media?.url ?? "";
      if (!url) throw new Error("The server didn't return a URL for the file.");

      onChange(url);
      toast.success("Uploaded");
    } catch (err) {
      toast.error("Could not upload", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setUploading(false);
    }
  };

  const acceptsVideo = accept.includes("video");
  const formatHint = acceptsVideo ? "PNG, JPG, GIF, MP4 or WebM" : "PNG, JPG or GIF";

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</span>

      {value ? (
        <div
          className={cn(
            "group relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50",
            aspect
          )}
        >
          {isVideo ? (
            <video src={value} className="size-full object-cover" autoPlay loop muted playsInline />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="size-full object-cover" />
          )}

          {/* Type badge, so it's obvious what's in the slot at a glance. */}
          <span className="absolute left-2 top-2 rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            {isVideo ? "Video" : "Image"}
          </span>

          {/* Replace / remove overlay. */}
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="rounded-lg bg-white/90 px-3 py-1.5 text-xs font-bold text-gray-800 shadow-sm transition-colors hover:bg-white"
            >
              {uploading ? "Uploading…" : "Replace"}
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              aria-label="Remove"
              className="grid size-8 place-items-center rounded-lg bg-white/90 text-red-600 shadow-sm transition-colors hover:bg-white"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/60 px-4 text-gray-500",
            "transition-colors hover:border-[#5B2C83] hover:bg-purple-50/40 hover:text-[#5B2C83] disabled:opacity-60",
            aspect
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="size-6 animate-spin" />
              <span className="text-xs font-semibold">Uploading…</span>
            </>
          ) : (
            <>
              <span className="grid size-11 place-items-center rounded-full bg-white shadow-sm">
                {acceptsVideo ? <FileVideo className="size-5" /> : <ImagePlus className="size-5" />}
              </span>
              <span className="text-sm font-bold">Click to upload {acceptsVideo ? "image or video" : "an image"}</span>
              <span className="text-[11px] text-gray-400">{formatHint}</span>
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
          e.target.value = "";
        }}
      />

      {/* A URL is just as valid as an upload — don't force one route. */}
      <label className="relative block">
        <Link2 className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" />
        <input
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="…or paste an image / video URL"
          className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-2.5 text-xs text-[#111827] focus:border-[#5B2C83] focus:outline-none focus:ring-2 focus:ring-[#5B2C83]/15"
        />
      </label>

      {hint && <span className="text-xs leading-relaxed text-gray-400">{hint}</span>}
    </div>
  );
}
