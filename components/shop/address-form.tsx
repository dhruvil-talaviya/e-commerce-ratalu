"use client";

import * as React from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useAccount, type SavedAddress } from "@/components/account/account-provider";

// Every Indian state + union territory. Real e-commerce doesn't guess the
// customer's town from a short list — it derives city & state from the PIN code
// (India Post) and lets them pick the exact locality, so any address works.
const INDIAN_STATES: string[] = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  // Union Territories
  "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir",
  "Ladakh", "Lakshadweep", "Puducherry",
];

interface AddressFormProps {
  initialAddress?: SavedAddress | null;
  onSubmit: (address: Omit<SavedAddress, "id" | "_id">) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function AddressForm({ initialAddress, onSubmit, onCancel, loading }: AddressFormProps) {
  /**
   * The recipient is the signed-in customer — checkout already shows their name
   * and number above this form, so asking for both again was pure duplication.
   * They're still saved on the address (the API requires them), just taken from
   * the account instead of retyped.
   */
  const { user } = useAccount();

  const [fullName, setFullName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [houseNo, setHouseNo] = React.useState("");
  const [building, setBuilding] = React.useState("");
  const [street, setStreet] = React.useState("");
  const [area, setArea] = React.useState("");
  const [landmark, setLandmark] = React.useState("");
  const [city, setCity] = React.useState("");
  const [state, setState] = React.useState("");
  const [pinCode, setPinCode] = React.useState("");
  const [country, setCountry] = React.useState("India");
  const [addressType, setAddressType] = React.useState<"Home" | "Work" | "Other">("Home");
  const [isDefault, setIsDefault] = React.useState(false);

  // New address: the recipient defaults to the signed-in customer.
  React.useEffect(() => {
    if (initialAddress) return;
    setFullName((v) => v || user?.name || "");
    setPhone((v) => v || (user?.phone || "").replace(/\D/g, "").slice(-10));
  }, [initialAddress, user?.name, user?.phone]);

  // Load initial address if editing
  React.useEffect(() => {
    if (initialAddress) {
      setFullName(initialAddress.fullName || "");
      setPhone(initialAddress.phone || "");
      setHouseNo(initialAddress.houseNo || "");
      setBuilding(initialAddress.building || "");
      setStreet(initialAddress.street || "");
      setArea(initialAddress.area || "");
      setLandmark(initialAddress.landmark || "");
      setCity(initialAddress.city || "");
      setState(initialAddress.state || "");
      setPinCode(initialAddress.pinCode || "");
      setCountry(initialAddress.country || "India");
      setAddressType(initialAddress.addressType || "Home");
      setIsDefault(!!initialAddress.isDefault);
    }
  }, [initialAddress]);

  /**
   * PIN-code lookup — the backbone of an Indian address form.
   *
   * The old version guessed city/state from ten hardcoded PIN prefixes and only
   * called the API when none matched. That guessed wrong for every town sharing
   * a prefix with a metro (395xxx is the whole Surat district, not just Surat)
   * and the city dropdown only listed a handful of metros, so anyone outside
   * them literally could not complete checkout. India Post is now the single
   * source of truth, and it also gives us the real localities for the PIN.
   */
  const [localities, setLocalities] = React.useState<string[]>([]);
  const [pinStatus, setPinStatus] = React.useState<"idle" | "loading" | "ok" | "invalid">("idle");

  React.useEffect(() => {
    const pin = pinCode.trim();

    if (!/^\d{6}$/.test(pin)) {
      setPinStatus("idle");
      setLocalities([]);
      return;
    }

    let cancelled = false;
    setPinStatus("loading");

    (async () => {
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const data = await res.json();
        if (cancelled) return;

        const entry = Array.isArray(data) ? data[0] : null;
        const offices: { Name?: string; State?: string; District?: string; Division?: string }[] =
          entry?.Status === "Success" && Array.isArray(entry.PostOffice) ? entry.PostOffice : [];

        if (offices.length === 0) {
          setLocalities([]);
          setPinStatus("invalid");
          return;
        }

        const first = offices[0];
        setState(first.State || "");
        setCity(first.District || first.Division || "");
        setLocalities([...new Set(offices.map((o) => o.Name).filter(Boolean) as string[])]);
        setPinStatus("ok");
      } catch {
        // Offline or API down — don't block the sale, let them type it in.
        if (!cancelled) {
          setLocalities([]);
          setPinStatus("invalid");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pinCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    /**
     * The recipient comes from the account, not this form, so if it's missing
     * the fix is in the profile — say that instead of naming a field that
     * isn't on screen.
     */
    if (!fullName.trim() || !/^\d{10}$/.test(phone.trim())) {
      return toast.error("Add your name and mobile number to your profile first.");
    }

    // Validation checks
    if (!houseNo.trim()) return toast.error("House / Flat No. is required");
    if (!street.trim()) return toast.error("Street / Road is required");
    if (!area.trim()) return toast.error("Area / Locality is required");
    if (!city.trim()) return toast.error("City is required");
    if (!state.trim()) return toast.error("State is required");
    if (!pinCode.trim()) return toast.error("PIN Code is required");
    if (!/^\d{6}$/.test(pinCode.trim())) return toast.error("PIN Code must be exactly 6 digits");

    try {
      await onSubmit({
        fullName: fullName.trim(),
        phone: phone.trim(),
        houseNo: houseNo.trim(),
        building: building.trim(),
        street: street.trim(),
        area: area.trim(),
        landmark: landmark.trim(),
        city: city.trim(),
        state: state.trim(),
        country: country || "India",
        pinCode: pinCode.trim(),
        latitude: null,
        longitude: null,
        accuracy: null,
        addressType,
        isDefault
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to save address details.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full max-w-xl mx-auto bg-white px-1 py-4 sm:p-0">
      <div className="flex flex-col gap-5">
        {/* Delivery Address */}
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700">House / Flat No. *</label>
              <Input
                required
                placeholder=""
                className="h-11 rounded-xl border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-400"
                value={houseNo}
                onChange={(e) => setHouseNo(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700">Apartment / Building</label>
              <Input
                placeholder=""
                className="h-11 rounded-xl border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-400"
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700">Street / Road *</label>
              <Input
                required
                placeholder=""
                className="h-11 rounded-xl border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-400"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700">Area / Locality *</label>
              <Input
                required
                list="locality-options"
                placeholder={localities.length > 0 ? "Pick or type your locality" : "e.g. Adajan"}
                className="h-11 rounded-xl border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-400"
                value={area}
                onChange={(e) => setArea(e.target.value)}
              />
              {/* Real localities for the entered PIN — typing a custom one still works. */}
              <datalist id="locality-options">
                {localities.map((l) => (
                  <option key={l} value={l} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700">Landmark</label>
              <Input
                placeholder=""
                className="h-11 rounded-xl border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-400"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700">Country</label>
              <Input
                readOnly
                placeholder="India"
                className="h-11 rounded-xl text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                value={country}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700">PIN Code *</label>
              <div className="relative">
                <Input
                  required
                  inputMode="numeric"
                  placeholder="6-digit PIN"
                  className="h-11 rounded-xl border-gray-300 bg-white pr-10 text-sm text-gray-900 font-numbers placeholder:text-gray-400"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value.replace(/\D/g, "").substring(0, 6))}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                  {pinStatus === "loading" && <Loader2 className="size-4 animate-spin text-purple-500" />}
                  {pinStatus === "ok" && <CheckCircle2 className="size-4 text-green-600" />}
                  {pinStatus === "invalid" && <AlertCircle className="size-4 text-amber-500" />}
                </span>
              </div>

            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700">State *</label>
              <select
                required
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3.5 text-sm text-gray-900 outline-none transition-all focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
              >
                <option value="" disabled>Select State</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
                {/* India Post may return a name not in our list — never drop it. */}
                {state && !INDIAN_STATES.includes(state) && <option value={state}>{state}</option>}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700">City / District *</label>
              <Input
                required
                placeholder="e.g. Surat"
                className="h-11 rounded-xl border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-400"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Address Type radio buttons */}
        <div className="flex flex-col gap-3 border-t border-gray-100 pt-4">
          <label className="text-xs font-extrabold uppercase tracking-wider text-purple-700">Address Type</label>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {(["Home", "Work", "Other"] as const).map((t) => (
              <label
                key={t}
                className={cn(
                  "flex cursor-pointer select-none items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition-all sm:gap-2 sm:rounded-2xl sm:p-3.5 sm:text-sm",
                  addressType === t
                    ? "border-purple-600 bg-purple-50 text-purple-800 shadow-sm"
                    : "border-gray-200 bg-white text-gray-600 hover:border-purple-200 hover:bg-gray-50/50"
                )}
              >
                <input
                  type="radio"
                  name="addressType"
                  value={t}
                  checked={addressType === t}
                  onChange={() => setAddressType(t)}
                  className="sr-only"
                />
                <span>{t === "Home" ? "🏠" : t === "Work" ? "💼" : "📍"}</span>
                <span>{t}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Save as default */}
        <div className="flex items-center gap-3 py-1 select-none">
          <input
            type="checkbox"
            id="isDefault"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="size-4.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          />
          <label htmlFor="isDefault" className="text-xs font-semibold text-gray-600">
            Set as default delivery address
          </label>
        </div>
      </div>

      {/* Sticky Save Button Bar (perfectly touch-friendly and responsive) */}
      <div className="sticky bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 py-4 -mx-1 sm:mx-0 flex items-center gap-3 shadow-lg sm:shadow-none sm:relative sm:border-none sm:py-0">
        <Button
          type="submit"
          disabled={loading}
          className="flex-1 h-12 rounded-xl text-sm font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md active:scale-98 transition-transform"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" /> Saving...
            </>
          ) : (
            "Save Address"
          )}
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          disabled={loading}
          variant="outline"
          className="h-12 px-6 rounded-xl text-sm font-bold text-gray-600 border-gray-250 hover:bg-gray-50 active:scale-98 transition-transform"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
