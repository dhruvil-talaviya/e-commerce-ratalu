"use client";

import * as React from "react";
import { Store, ShieldCheck, KeyRound, Copy, Check, Eye, EyeOff, Loader2, CreditCard, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api";
import { useAccount } from "@/components/account/account-provider";
import { AdminShell } from "@/components/admin/console/admin-shell";
import { MediaField } from "@/components/admin/ui/media-field";
import { Button, Card, Skeleton } from "@/components/admin/ui/primitives";

interface BrandSettings {
  storeName: string;
  storeTagline: string;
  storeDescription: string;
  storeLogo: string;
  storeFavicon: string;
}

const INPUT =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#111827] focus:border-[#5B2C83] focus:outline-none focus:ring-2 focus:ring-[#5B2C83]/15";

export default function SettingsPage() {
  return (
    <AdminShell
      title="Settings"
      description="Your brand identity and how the admin account is secured."
    >
      <div className="flex flex-col gap-5">
        <BrandCard />
        <PaymentCard />
        <TaxCard />
        <SecurityCard />
      </div>
    </AdminShell>
  );
}

/* ------------------------------------------------------------------ */
/* PAYMENT METHODS                                                     */
/* ------------------------------------------------------------------ */

interface PaymentSettings {
  codEnabled: boolean;
  razorpayEnabled: boolean;
  razorpayKeyId: string;
}

function PaymentCard() {
  const [form, setForm] = React.useState<PaymentSettings | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    apiFetch<Record<string, unknown>>("/admin/settings")
      .then((s) =>
        setForm({
          codEnabled: s.codEnabled !== false,
          razorpayEnabled: s.razorpayEnabled !== false,
          razorpayKeyId: (s.razorpayKeyId as string) ?? "",
        })
      )
      .catch(() => setForm({ codEnabled: true, razorpayEnabled: true, razorpayKeyId: "" }));
  }, []);

  const save = async () => {
    if (!form) return;
    if (!form.codEnabled && !form.razorpayEnabled) {
      return toast.error("Enable at least one payment method.");
    }
    setSaving(true);
    try {
      await apiFetch("/admin/settings", { method: "PUT", body: form });
      toast.success("Payment methods saved", {
        description: "Customers see the enabled options at checkout.",
      });
    } catch (err) {
      toast.error("Could not save", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-purple-50 text-[#5B2C83]">
          <CreditCard className="size-5" />
        </span>
        <div>
          <h2 className="text-sm font-bold text-[#111827]">Payment methods</h2>
          <p className="text-xs text-[#6B7280]">Which ways customers can pay at checkout.</p>
        </div>
      </div>

      {!form ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <PayToggle
            title="Pay Online (Razorpay)"
            desc="UPI & QR, Google Pay / PhonePe / Paytm, cards, net-banking and wallets — all handled by Razorpay's secure screen."
            checked={form.razorpayEnabled}
            onChange={(v) => setForm((f) => (f ? { ...f, razorpayEnabled: v } : f))}
          />
          {form.razorpayEnabled && (
            <label className="ml-1 flex flex-col gap-1.5 rounded-lg border border-gray-200 bg-gray-50/60 p-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Razorpay Key ID
              </span>
              <input
                value={form.razorpayKeyId}
                onChange={(e) => setForm((f) => (f ? { ...f, razorpayKeyId: e.target.value } : f))}
                placeholder="rzp_live_… or rzp_test_…"
                className={cn(INPUT, "font-mono")}
              />
              <span className="text-xs text-gray-400">
                Your publishable key from the Razorpay dashboard. UPI QR is built into Razorpay&apos;s
                checkout — no extra setup needed.
              </span>
            </label>
          )}

          <PayToggle
            title="Cash on Delivery"
            desc="Customer pays in cash when the order arrives."
            checked={form.codEnabled}
            onChange={(v) => setForm((f) => (f ? { ...f, codEnabled: v } : f))}
          />
        </div>
      )}

      <div className="mt-5 flex justify-end border-t border-gray-100 pt-4">
        <Button variant="primary" onClick={save} disabled={saving || !form}>
          {saving ? "Saving…" : "Save payment methods"}
        </Button>
      </div>
    </Card>
  );
}

function PayToggle({
  title,
  desc,
  checked,
  onChange,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#111827]">{title}</p>
        <p className="text-xs leading-relaxed text-[#6B7280]">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-[#5B2C83]" : "bg-gray-300"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          )}
        />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* GST / TAX                                                           */
/* ------------------------------------------------------------------ */

interface TaxSettings {
  gstEnabled: boolean;
  taxRate: number;
  taxInclusive: boolean;
  gstNumber: string;
}

function TaxCard() {
  const [form, setForm] = React.useState<TaxSettings | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    apiFetch<Record<string, unknown>>("/admin/settings")
      .then((s) =>
        setForm({
          gstEnabled: s.gstEnabled !== false,
          taxRate: typeof s.taxRate === "number" ? s.taxRate : 5,
          taxInclusive: s.taxInclusive !== false,
          gstNumber: (s.gstNumber as string) ?? "",
        })
      )
      .catch(() => setForm({ gstEnabled: true, taxRate: 5, taxInclusive: true, gstNumber: "" }));
  }, []);

  const set = <K extends keyof TaxSettings>(key: K, value: TaxSettings[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const save = async () => {
    if (!form) return;
    if (form.gstEnabled && (form.taxRate < 0 || form.taxRate > 100)) {
      return toast.error("GST rate must be between 0 and 100%.");
    }
    setSaving(true);
    try {
      await apiFetch("/admin/settings", {
        method: "PUT",
        body: {
          gstEnabled: form.gstEnabled,
          taxRate: Number(form.taxRate),
          taxInclusive: form.taxInclusive,
          gstNumber: form.gstNumber.trim().toUpperCase(),
        },
      });
      toast.success("Tax settings saved", {
        description: form.gstEnabled
          ? `Orders are taxed at ${form.taxRate}% GST.`
          : "GST is now switched off — no tax is added at checkout.",
      });
    } catch (err) {
      toast.error("Could not save", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-purple-50 text-[#5B2C83]">
          <Receipt className="size-5" />
        </span>
        <div>
          <h2 className="text-sm font-bold text-[#111827]">GST &amp; tax</h2>
          <p className="text-xs text-[#6B7280]">
            Whether GST is applied to orders, at what rate, and how it&apos;s shown.
          </p>
        </div>
      </div>

      {!form ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <PayToggle
            title="Charge GST on orders"
            desc="When off, no tax line is added — customers pay the item price plus shipping only."
            checked={form.gstEnabled}
            onChange={(v) => set("gstEnabled", v)}
          />

          {form.gstEnabled && (
            <div className="ml-1 flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50/60 p-3.5">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    GST rate (%)
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={form.taxRate}
                    onChange={(e) => set("taxRate", Number(e.target.value))}
                    className={INPUT}
                  />
                  <span className="text-xs text-gray-400">
                    Applies to items without their own tax override.
                  </span>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    GSTIN <span className="font-normal normal-case text-gray-400">(optional)</span>
                  </span>
                  <input
                    value={form.gstNumber}
                    onChange={(e) => set("gstNumber", e.target.value)}
                    placeholder="27AAAAA0000A1Z5"
                    className={cn(INPUT, "font-mono uppercase")}
                  />
                  <span className="text-xs text-gray-400">
                    15-character registration number, shown on invoices.
                  </span>
                </label>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Price display
                </span>
                <div className="grid gap-2 sm:grid-cols-2">
                  <TaxModeOption
                    label="Tax-inclusive"
                    desc="Listed prices already include GST. No tax is added on top."
                    active={form.taxInclusive}
                    onClick={() => set("taxInclusive", true)}
                  />
                  <TaxModeOption
                    label="Tax-exclusive"
                    desc="GST is added on top of listed prices at checkout."
                    active={!form.taxInclusive}
                    onClick={() => set("taxInclusive", false)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-5 flex justify-end border-t border-gray-100 pt-4">
        <Button variant="primary" onClick={save} disabled={saving || !form}>
          {saving ? "Saving…" : "Save tax settings"}
        </Button>
      </div>
    </Card>
  );
}

function TaxModeOption({
  label,
  desc,
  active,
  onClick,
}: {
  label: string;
  desc: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors",
        active
          ? "border-[#5B2C83] bg-purple-50/60 ring-1 ring-[#5B2C83]/20"
          : "border-gray-200 bg-white hover:border-gray-300"
      )}
    >
      <span
        className={cn(
          "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border-2 transition-colors",
          active ? "border-[#5B2C83]" : "border-gray-300"
        )}
      >
        {active && <span className="size-2 rounded-full bg-[#5B2C83]" />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-[#111827]">{label}</span>
        <span className="block text-xs leading-relaxed text-[#6B7280]">{desc}</span>
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* BRAND & IDENTITY                                                    */
/* ------------------------------------------------------------------ */

function BrandCard() {
  const [form, setForm] = React.useState<BrandSettings | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    apiFetch<Record<string, unknown>>("/admin/settings")
      .then((s) =>
        setForm({
          storeName: (s.storeName as string) ?? "",
          storeTagline: (s.storeTagline as string) ?? "",
          storeDescription: (s.storeDescription as string) ?? "",
          storeLogo: (s.storeLogo as string) ?? "",
          storeFavicon: (s.storeFavicon as string) ?? "",
        })
      )
      .catch(() => setForm({ storeName: "", storeTagline: "", storeDescription: "", storeLogo: "", storeFavicon: "" }));
  }, []);

  const set = <K extends keyof BrandSettings>(key: K, value: BrandSettings[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      await apiFetch("/admin/settings", { method: "PUT", body: form });
      await fetch("/api/revalidate", { method: "POST" }).catch(() => {});
      toast.success("Brand settings saved", {
        description: "The header and footer update across the site.",
      });
    } catch (err) {
      toast.error("Could not save", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-purple-50 text-[#5B2C83]">
          <Store className="size-5" />
        </span>
        <div>
          <h2 className="text-sm font-bold text-[#111827]">Brand &amp; identity</h2>
          <p className="text-xs text-[#6B7280]">
            Store name, tagline and logo — shown in the header, footer and browser tab.
          </p>
        </div>
      </div>

      {!form ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="flex flex-col gap-3.5">
            <Labeled label="Store name" hint="First word becomes the wordmark; the rest sits under it.">
              <input
                value={form.storeName}
                onChange={(e) => set("storeName", e.target.value)}
                placeholder="Ratalu Wafers"
                className={INPUT}
              />
            </Labeled>
            <Labeled label="Tagline">
              <input
                value={form.storeTagline}
                onChange={(e) => set("storeTagline", e.target.value)}
                placeholder="India's finest purple yam wafers"
                className={INPUT}
              />
            </Labeled>
            <Labeled label="Description" hint="Used for SEO and social previews.">
              <textarea
                rows={3}
                value={form.storeDescription}
                onChange={(e) => set("storeDescription", e.target.value)}
                className={cn(INPUT, "resize-y")}
              />
            </Labeled>
          </div>

          <div className="flex flex-col gap-3.5">
            <MediaField
              label="Logo"
              value={form.storeLogo}
              onChange={(url) => set("storeLogo", url)}
              accept="image/*"
              aspect="aspect-square"
              hint="Square image works best. Blank = the default mark."
            />
            <MediaField
              label="Favicon"
              value={form.storeFavicon}
              onChange={(url) => set("storeFavicon", url)}
              accept="image/*"
              aspect="aspect-square"
              hint="The small browser-tab icon."
            />
          </div>
        </div>
      )}

      <div className="mt-5 flex justify-end border-t border-gray-100 pt-4">
        <Button variant="primary" onClick={save} disabled={saving || !form}>
          {saving ? "Saving…" : "Save brand settings"}
        </Button>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* ADMIN SECURITY                                                      */
/* ------------------------------------------------------------------ */

function SecurityCard() {
  const { user } = useAccount();

  const [passwordEnabled, setPasswordEnabled] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [generated, setGenerated] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const [customPassword, setCustomPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showCustom, setShowCustom] = React.useState(false);

  React.useEffect(() => {
    if (user) setPasswordEnabled(Boolean((user as { passwordLoginEnabled?: boolean }).passwordLoginEnabled));
  }, [user]);

  /** apiFetch stringifies the body itself — pass a plain object, never JSON.stringify. */
  const callSecurity = async (body: Record<string, unknown>) =>
    apiFetch<{ passwordLoginEnabled: boolean; generatedPassword?: string }>("/admin/security", {
      method: "PUT",
      body,
    });

  const toggle = async (enabled: boolean) => {
    setBusy(true);
    try {
      const res = await callSecurity({ passwordLoginEnabled: enabled });
      setPasswordEnabled(res.passwordLoginEnabled);
      toast.success(enabled ? "Password login enabled" : "Password login disabled — OTP only");
    } catch (err) {
      toast.error("Could not update", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  const generate = async () => {
    setBusy(true);
    setGenerated(null);
    setCopied(false);
    try {
      const res = await callSecurity({ generateNewPassword: true });
      setGenerated(res.generatedPassword ?? null);
      setPasswordEnabled(res.passwordLoginEnabled);
      toast.success("New password generated", { description: "Copy it now — it won't be shown again." });
    } catch (err) {
      toast.error("Could not generate", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  const saveCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (customPassword.length < 6) return toast.error("Password must be at least 6 characters.");
    if (customPassword !== confirmPassword) return toast.error("Passwords do not match.");

    setBusy(true);
    try {
      const res = await callSecurity({ customPassword });
      setPasswordEnabled(res.passwordLoginEnabled);
      setCustomPassword("");
      setConfirmPassword("");
      setGenerated(null);
      toast.success("Password updated");
    } catch (err) {
      toast.error("Could not update", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!generated) return;
    try {
      await navigator.clipboard.writeText(generated);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the value is visible to copy manually */
    }
  };

  const phone = (user as { phone?: string })?.phone ?? "the admin number";

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-purple-50 text-[#5B2C83]">
          <ShieldCheck className="size-5" />
        </span>
        <div>
          <h2 className="text-sm font-bold text-[#111827]">Admin security</h2>
          <p className="text-xs text-[#6B7280]">Protect the admin account with a password instead of OTP.</p>
        </div>
      </div>

      {/* Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50/60 p-3.5">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#111827]">Password-protected login</p>
          <p className="text-xs text-[#6B7280]">
            When on, signing in with <span className="font-semibold">+91 {phone}</span> needs the secure
            password and skips OTP.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={passwordEnabled}
          disabled={busy}
          onClick={() => toggle(!passwordEnabled)}
          className={cn(
            "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50",
            passwordEnabled ? "bg-[#5B2C83]" : "bg-gray-300"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform",
              passwordEnabled ? "translate-x-[22px]" : "translate-x-0.5"
            )}
          />
        </button>
      </div>

      {/* Generate */}
      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Generate a secure password</p>
        <p className="mt-0.5 text-xs text-[#6B7280]">
          Creates a strong random password and replaces any existing one.
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <Button variant="primary" onClick={generate} disabled={busy}>
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <KeyRound className="size-3.5" />}
            Generate new password
          </Button>
        </div>

        {generated && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
            <code className="min-w-0 truncate font-mono text-sm font-bold text-green-800">{generated}</code>
            <Button variant="secondary" size="sm" onClick={copy}>
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        )}
      </div>

      {/* Custom password */}
      <form onSubmit={saveCustom} className="mt-5 border-t border-gray-100 pt-4">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Set a custom password</p>
        <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
          <div className="relative">
            <input
              type={showCustom ? "text" : "password"}
              value={customPassword}
              onChange={(e) => setCustomPassword(e.target.value)}
              placeholder="New password (min 6 chars)"
              className={cn(INPUT, "pr-10")}
            />
            <button
              type="button"
              onClick={() => setShowCustom((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label={showCustom ? "Hide password" : "Show password"}
            >
              {showCustom ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <input
            type={showCustom ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
            className={INPUT}
          />
        </div>
        <div className="mt-3 flex justify-end">
          <Button variant="secondary" type="submit" disabled={busy || !customPassword}>
            Update password
          </Button>
        </div>
      </form>
    </Card>
  );
}

function Labeled({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</span>
      {children}
      {hint && <span className="text-xs text-gray-400">{hint}</span>}
    </label>
  );
}
