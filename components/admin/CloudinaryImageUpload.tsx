"use client";

import * as React from "react";
import {
  Upload,
  X,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  FileImage,
  Loader2,
  AlertCircle,
  CheckCircle2,
  CloudUpload
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { apiFetchEnvelope } from "@/lib/api";
import { getCloudinaryUrl } from "@/lib/cloudinary";

export interface CloudinaryImageUploadProps {
  value?: string | string[];
  onChange: (value: any) => void;
  folder?: string;
  multiple?: boolean;
  maxFiles?: number;
  label?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
}

const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "avif", "gif", "svg", "mp4", "webm", "mov", "m4v", "mkv"];
const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export function CloudinaryImageUpload({
  value,
  onChange,
  folder = "products",
  multiple = false,
  maxFiles = 10,
  label = "Upload Image",
  hint = "JPG, PNG, WEBP, or AVIF up to 5MB",
  disabled = false,
  className
}: CloudinaryImageUploadProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [progress, setProgress] = React.useState<number>(0);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [failedFiles, setFailedFiles] = React.useState<File[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Helper arrays for single vs multiple modes
  const imageList: string[] = React.useMemo(() => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    return [value].filter(Boolean);
  }, [value]);

  // Simulated smooth progress updates for responsive user feedback
  const startProgress = () => {
    setProgress(15);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 15;
      });
    }, 150);
    return interval;
  };

  const validateFile = (file: File): string | null => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Format .${ext} is not allowed. Only JPG, PNG, WEBP, and AVIF are supported.`;
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `File "${file.name}" exceeds the 5MB maximum limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`;
    }
    return null;
  };

  const uploadFiles = async (files: File[]) => {
    if (!files.length || disabled) return;
    setErrorMsg(null);

    // Validate all files first
    const invalidErrors: string[] = [];
    const validFiles: File[] = [];

    files.forEach((file) => {
      const err = validateFile(file);
      if (err) invalidErrors.push(err);
      else validFiles.push(file);
    });

    if (invalidErrors.length > 0) {
      const msg = invalidErrors[0];
      setErrorMsg(msg);
      toast.error(msg);
      if (!validFiles.length) return;
    }

    setUploading(true);
    const progressTimer = startProgress();

    try {
      if (!multiple) {
        // Single file upload mode
        const fileToUpload = validFiles[0];
        const formData = new FormData();
        formData.append("file", fileToUpload);
        formData.append("folder", folder);

        const res = await apiFetchEnvelope<{ secure_url?: string; url?: string; public_id?: string }>(
          "/upload/single",
          {
            method: "POST",
            body: formData
          }
        );

        if (res.success && (res.data?.secure_url || res.data?.url)) {
          const uploadedUrl = res.data.secure_url || res.data.url!;
          onChange(uploadedUrl);
          toast.success("Image uploaded to Cloudinary!");
          setProgress(100);
          setFailedFiles([]);
        } else {
          throw new Error(res.message || "Failed to upload image to Cloudinary.");
        }
      } else {
        // Multiple files upload mode
        const formData = new FormData();
        validFiles.forEach((file) => formData.append("files", file));
        formData.append("folder", folder);

        const res = await apiFetchEnvelope<Array<{ secure_url?: string; url?: string }>>(
          "/upload/multiple",
          {
            method: "POST",
            body: formData
          }
        );

        if (res.success && Array.isArray(res.data)) {
          const newUrls = res.data.map((item) => item.secure_url || item.url!).filter(Boolean);
          const combined = Array.from(new Set([...imageList, ...newUrls])).slice(0, maxFiles);
          onChange(combined);
          toast.success(`${newUrls.length} image(s) uploaded to Cloudinary!`);
          setProgress(100);
          setFailedFiles([]);
        } else {
          throw new Error(res.message || "Failed to upload multiple images to Cloudinary.");
        }
      }
    } catch (err: any) {
      clearInterval(progressTimer);
      const message = err?.message || "Upload failed. Please check your network and try again.";
      setErrorMsg(message);
      setFailedFiles(validFiles);
      toast.error(message);
    } finally {
      clearInterval(progressTimer);
      setUploading(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled || uploading) return;

    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      uploadFiles(multiple ? files : [files[0]]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !uploading) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      uploadFiles(multiple ? files : [files[0]]);
    }
    // Reset file input value so re-selecting same file triggers onChange
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemove = async (indexToRemove: number) => {
    const targetUrl = imageList[indexToRemove];
    if (!targetUrl) return;

    // Clear state immediately for instant UI feedback
    if (multiple) {
      const nextList = imageList.filter((_, idx) => idx !== indexToRemove);
      onChange(nextList);
    } else {
      onChange("");
    }

    // Extract public_id from Cloudinary URL before sending to delete API
    let publicIdToDelete = targetUrl;
    if (targetUrl.includes("cloudinary.com")) {
      try {
        const parts = targetUrl.split("/upload/");
        if (parts.length >= 2) {
          let path = parts[1].replace(/^v\d+\//, "");
          const lastDot = path.lastIndexOf(".");
          if (lastDot !== -1) path = path.substring(0, lastDot);
          publicIdToDelete = path;
        }
      } catch {
        // fallback: send the full URL — server will handle it
      }
    }

    // Fire-and-forget Cloudinary deletion
    try {
      await apiFetchEnvelope("/upload/delete", {
        method: "POST",
        body: JSON.stringify({ public_id: publicIdToDelete })
      });
      toast.success("Image removed");
    } catch (err) {
      console.warn("Cloudinary delete notice:", err);
    }
  };

  const handleMove = (index: number, direction: "left" | "right") => {
    if (!multiple || imageList.length < 2) return;
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= imageList.length) return;

    const newList = [...imageList];
    const temp = newList[index];
    newList[index] = newList[targetIndex];
    newList[targetIndex] = temp;
    onChange(newList);
  };

  const handleRetry = () => {
    if (failedFiles.length > 0) {
      uploadFiles(failedFiles);
    } else if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {label && (
        <div className="flex items-center justify-between text-sm font-medium text-amber-100">
          <span>{label}</span>
          {multiple && (
            <span className="text-xs text-stone-400 font-normal">
              {imageList.length} / {maxFiles} images
            </span>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml"
        multiple={multiple}
        disabled={disabled || uploading}
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Image Preview Grid / Card */}
      {imageList.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-3">
          {imageList.map((url, idx) => (
            <div
              key={`${url}-${idx}`}
              className="group relative aspect-square rounded-xl overflow-hidden bg-stone-900 border border-stone-800 shadow-md hover:border-amber-500/50 transition-all duration-200"
            >
              {/* Render SVG as object tag so it displays correctly, images as img */}
              {url.includes(".svg") || url.includes("image/svg") ? (
                <object
                  data={url}
                  type="image/svg+xml"
                  className="w-full h-full object-contain p-2 bg-white/5"
                  aria-label={`Uploaded SVG ${idx + 1}`}
                />
              ) : (
                <img
                  src={getCloudinaryUrl(url, "thumbnail")}
                  alt={`Uploaded ${idx + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              )}

              {/* Always-visible delete button (top-right corner) */}
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-red-600 text-white shadow-md hover:bg-red-700 transition-colors"
                title="Delete"
              >
                <X className="size-3.5" />
              </button>

              {/* Replace button (bottom) — single mode only */}
              {!multiple && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-lg bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-black/80 transition-colors whitespace-nowrap"
                >
                  <RefreshCw className="size-2.5" />
                  Replace
                </button>
              )}

              {/* Reorder controls — multi mode only */}
              {multiple && imageList.length > 1 && (
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMove(idx, "left")}
                    className="p-1 rounded bg-stone-800 hover:bg-stone-700 disabled:opacity-30 text-stone-200"
                    title="Move Left"
                  >
                    <ArrowLeft className="size-3" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === imageList.length - 1}
                    onClick={() => handleMove(idx, "right")}
                    className="p-1 rounded bg-stone-800 hover:bg-stone-700 disabled:opacity-30 text-stone-200"
                    title="Move Right"
                  >
                    <ArrowRight className="size-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Drag & Drop Upload Zone (Shown when single image is empty or multiple mode has capacity) */}
      {(!multiple && imageList.length === 0) || (multiple && imageList.length < maxFiles) ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
          className={cn(
            "relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer select-none",
            isDragging
              ? "border-amber-400 bg-amber-500/10 scale-[1.01]"
              : "border-stone-800 hover:border-amber-500/50 bg-stone-900/40 hover:bg-stone-900/80",
            disabled && "opacity-50 cursor-not-allowed",
            uploading && "pointer-events-none opacity-80"
          )}
        >
          {uploading ? (
            <div className="space-y-3 py-2">
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-amber-200">
                  Uploading directly to Cloudinary...
                </p>
                {/* Progress bar */}
                <div className="w-48 h-1.5 bg-stone-800 rounded-full mx-auto overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <CloudUpload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-stone-200">
                  <span className="text-amber-400 underline underline-offset-2">Click to upload</span> or drag and drop
                </p>
                <p className="text-[11px] text-stone-400 mt-0.5">{hint}</p>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Error state alert & retry */}
      {errorMsg && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-red-950/40 border border-red-800/40 text-red-300 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="px-2.5 py-1 rounded bg-red-800/40 hover:bg-red-700/50 text-white text-[11px] font-medium transition-colors shrink-0"
          >
            Retry Upload
          </button>
        </div>
      )}
    </div>
  );
}
