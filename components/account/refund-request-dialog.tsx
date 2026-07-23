"use client";

import * as React from "react";
import { Upload, X, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { apiFetch, getTokens } from "@/lib/api";
import type { Order } from "@/components/shop/order-provider";

interface Eligibility {
  eligible: boolean;
  reason: string | null;
  maxRefundable: number;
  reasons: string[];
  returnWindowDays: number;
}

/**
 * Lets a customer open a refund / return request against an order.
 *
 * Eligibility is checked by the server and mirrored here, so the form can
 * explain *why* a refund isn't possible instead of failing on submit. The
 * server re-checks everything regardless — this is convenience, not control.
 */
export function RefundRequestDialog({
  order,
  onClose,
  onSubmitted,
}: {
  order: Order;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [eligibility, setEligibility] = React.useState<Eligibility | null>(null);
  const [loading, setLoading] = React.useState(true);

  const [type, setType] = React.useState<"Refund" | "Replacement">("Refund");
  const [reason, setReason] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [images, setImages] = React.useState<string[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);

  React.useEffect(() => {
    apiFetch<Eligibility>(`/orders/${order.id}/refund-eligibility`)
      .then(setEligibility)
      .catch(() => setEligibility(null))
      .finally(() => setLoading(false));
  }, [order.id]);

  const upload = async (files: FileList) => {
    setUploading(true);
    try {
      const uploaded: string[] = [];

      for (const file of Array.from(files).slice(0, 8 - images.length)) {
        const body = new FormData();
        body.append("file", file);

        // FormData must not be JSON-encoded, so this bypasses apiFetch.
        const res = await fetch("/api/v1/media/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${getTokens()?.accessToken ?? ""}` },
          body,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Upload failed");
        uploaded.push(json.data?.url ?? json.data);
      }

      setImages((prev) => [...prev, ...uploaded]);
    } catch (err) {
      toast.error("Could not upload", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      await apiFetch(`/orders/${order.id}/refund`, {
        method: "POST",
        body: { reason, description, type, images },
      });
      toast.success("Request submitted", {
        description: "We'll review it and get back to you shortly.",
      });
      onSubmitted();
      onClose();
    } catch (err) {
      toast.error("Could not submit", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSubmitting(false);
      setConfirming(false);
    }
  };

  const canSubmit = Boolean(reason) && !submitting && eligibility?.eligible;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-gray-900/50" onClick={onClose} aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Request a refund"
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Request a refund or return</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Order {order.displayId || order.id}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
          >
            <X className="size-4" />
          </button>
        </div>

        {loading ? (
          <p className="py-10 text-center text-xs text-gray-500">Checking eligibility…</p>
        ) : !eligibility?.eligible ? (
          <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <div>
              <p className="text-xs font-bold text-amber-900">
                This order can&apos;t be refunded
              </p>
              <p className="mt-0.5 text-xs text-amber-800">
                {eligibility?.reason ?? "Please contact support."}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-5 flex flex-col gap-4">
            {/* Resolution */}
            <Field label="What would you like?">
              <div className="grid grid-cols-2 gap-2">
                {(["Refund", "Replacement"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={cn(
                      "rounded-xl border p-2.5 text-xs font-bold transition-all",
                      type === t
                        ? "border-purple-600 bg-purple-50 text-purple-700"
                        : "border-gray-200 text-gray-600 hover:border-purple-200"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </Field>

            {/* Reason */}
            <Field label="Reason">
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs focus:border-purple-500 focus:outline-none"
              >
                <option value="">Choose a reason…</option>
                {eligibility.reasons.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>

            {/* Description */}
            <Field label="Tell us what happened" hint="Optional, but it speeds up the review.">
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Two packs arrived crushed and the seal was broken."
                className="w-full resize-y rounded-xl border border-gray-200 px-3 py-2.5 text-xs focus:border-purple-500 focus:outline-none"
              />
            </Field>

            {/* Evidence */}
            <Field label="Photos" hint="Up to 8. Images or video of the problem help a lot.">
              <div className="flex flex-wrap gap-2">
                {images.map((src) => (
                  <div key={src} className="relative size-16 overflow-hidden rounded-lg border border-gray-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="Evidence" className="size-full object-cover" />
                    <button
                      onClick={() => setImages((p) => p.filter((i) => i !== src))}
                      aria-label="Remove"
                      className="absolute right-0.5 top-0.5 grid size-4 place-items-center rounded-full bg-black/60 text-white"
                    >
                      <X className="size-2.5" />
                    </button>
                  </div>
                ))}

                {images.length < 8 && (
                  <label className="grid size-16 cursor-pointer place-items-center rounded-lg border border-dashed border-gray-300 text-gray-400 hover:border-purple-400 hover:text-purple-600">
                    {uploading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Upload className="size-4" />
                    )}
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      className="hidden"
                      onChange={(e) => e.target.files && upload(e.target.files)}
                    />
                  </label>
                )}
              </div>
            </Field>

            {/* Amount notice */}
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs text-gray-600">
                You&apos;ll be refunded up to{" "}
                <span className="font-bold text-gray-900">
                  ₹{eligibility.maxRefundable.toLocaleString("en-IN")}
                </span>{" "}
                to your original payment method, once our team approves the request.
              </p>
            </div>

            {confirming ? (
              <div className="rounded-xl border border-purple-200 bg-purple-50 p-3">
                <p className="text-xs font-semibold text-purple-900">
                  Submit this {type.toLowerCase()} request?
                </p>
                <p className="mt-0.5 text-[11px] text-purple-700">
                  Reason: {reason}. Our team reviews every request before any money moves.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>
                    Back
                  </Button>
                  <Button size="sm" onClick={submit} disabled={submitting}>
                    {submitting ? <Loader2 className="animate-spin" /> : null}
                    Confirm &amp; submit
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                className="w-full"
                disabled={!canSubmit}
                onClick={() => setConfirming(true)}
              >
                Review request
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
        {label}
      </span>
      {children}
      {hint && <span className="text-[10px] text-gray-400">{hint}</span>}
    </label>
  );
}
