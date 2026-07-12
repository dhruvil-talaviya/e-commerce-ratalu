"use client";

import * as React from "react";
import { Truck, MapPin, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { estimateDelivery } from "@/lib/data/product-meta";
import { cn } from "@/lib/utils";

/** Pincode → delivery-estimate widget (mock; backend-ready). */
export function DeliveryEstimate() {
  const [pin, setPin] = React.useState("");
  const [result, setResult] = React.useState<ReturnType<typeof estimateDelivery>>(null);
  const [error, setError] = React.useState("");

  const check = () => {
    const est = estimateDelivery(pin);
    if (!est) {
      setError("Enter a valid 6-digit PIN code.");
      setResult(null);
      return;
    }
    setError("");
    setResult(est);
  };

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-white/60 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-charcoal">
        <Truck className="size-4 text-purple-600" /> Check delivery time
      </p>
      <div className="mt-3 flex gap-2">
        <div className="relative flex-1">
          <MapPin className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-charcoal-soft" />
          <input
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, ""));
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && check()}
            placeholder="Enter PIN code"
            aria-label="PIN code"
            className="h-11 w-full rounded-full border border-[var(--color-border)] bg-white pl-10 pr-4 text-sm text-charcoal shadow-sm transition-all placeholder:text-charcoal-soft focus-visible:border-purple-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-200"
          />
        </div>
        <Button onClick={check} variant="outline" className="shrink-0">Check</Button>
      </div>

      {error && <p className="mt-2 text-xs text-[var(--color-danger)]">{error}</p>}

      {result && (
        <div className={cn("mt-3 flex items-start gap-2 rounded-xl bg-green-50 p-3 text-sm text-green-800")}>
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600" />
          <span>
            Delivering in <span className="font-semibold">{result.minDays}–{result.maxDays} business days</span>{" "}
            ({result.zone}). Order before 2 PM for same-day dispatch.
          </span>
        </div>
      )}
    </div>
  );
}
