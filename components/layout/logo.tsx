"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useStoreSettings } from "@/components/common/settings-provider";

/**
 * Simplified Yamora Wafers badge mark — optimised for small navbar sizes.
 * Shows the core iconic elements only: double arc ring + chips bucket +
 * brand initial — no tiny text or stars that would blur at small sizes.
 */
export function YamoraSymbol({
  size = 48,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* ── Cream fill background ───────────────────────────── */}
      <circle cx="50" cy="50" r="49" fill="#FEFAF0" />

      {/* ── Outer ring (gold) ───────────────────────────────── */}
      <circle cx="50" cy="50" r="47" stroke="#C9921A" strokeWidth="2.2" fill="none" />

      {/* ── Inner ring (purple) ─────────────────────────────── */}
      <circle cx="50" cy="50" r="43" stroke="#3D2663" strokeWidth="1.2" fill="none" />

      {/* ── Chips bucket body (purple) ──────────────────────── */}
      {/* trapezoid: wider at top, narrower at bottom */}
      <path d="M33 44 L36 66 L64 66 L67 44 Z" fill="#3D2663" rx="2" />

      {/* Bucket vertical ribs (cream) */}
      <line x1="42" y1="44" x2="42" y2="66" stroke="#FEFAF0" strokeWidth="2.5" opacity="0.25" />
      <line x1="50" y1="44" x2="50" y2="66" stroke="#FEFAF0" strokeWidth="2.5" opacity="0.25" />
      <line x1="58" y1="44" x2="58" y2="66" stroke="#FEFAF0" strokeWidth="2.5" opacity="0.25" />

      {/* ── Golden wafer chips overflowing the bucket ───────── */}
      {/* Back chips (slightly dimmer) */}
      <ellipse cx="42" cy="42" rx="9"  ry="4.2" transform="rotate(-18 42 42)" fill="#C89010" />
      <ellipse cx="58" cy="42" rx="9"  ry="4.2" transform="rotate(18 58 42)"  fill="#C89010" />

      {/* Front chips (brighter) */}
      <ellipse cx="36" cy="38" rx="8.5" ry="4"   transform="rotate(-30 36 38)"  fill="#E0B020" />
      <ellipse cx="50" cy="35" rx="11"  ry="4.5"  transform="rotate(3 50 35)"    fill="#E8BC28" />
      <ellipse cx="64" cy="38" rx="8.5" ry="4"   transform="rotate(28 64 38)"   fill="#E0B020" />

      {/* Chip shine lines */}
      <line x1="46" y1="34" x2="54" y2="34" stroke="#FEFAF0" strokeWidth="0.8" opacity="0.45" />
      <line x1="47" y1="36.5" x2="53" y2="36.5" stroke="#FEFAF0" strokeWidth="0.6" opacity="0.3" />

      {/* ── Swoosh below bucket (purple + gold) ─────────────── */}
      <path d="M18 74 Q34 69 50 71.5 Q66 74 82 69"
        stroke="#3D2663" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M18 77.5 Q34 72.5 50 75 Q66 77.5 82 72.5"
        stroke="#C9921A" strokeWidth="1.1" strokeLinecap="round" fill="none" />

      {/* ── Twin taro leaves (right of swoosh) ──────────────── */}
      <ellipse cx="75" cy="69" rx="7"   ry="4"   transform="rotate(-45 75 69)" fill="#4A8030" />
      <ellipse cx="80" cy="65" rx="6.5" ry="3.8" transform="rotate(-60 80 65)" fill="#5A9840" />
      {/* vein lines */}
      <line x1="73" y1="71" x2="77" y2="67" stroke="#FEFAF0" strokeWidth="0.7" opacity="0.55" />
      <line x1="78" y1="67" x2="82" y2="63" stroke="#FEFAF0" strokeWidth="0.7" opacity="0.55" />

      {/* ── Three small stars at bottom ─────────────────────── */}
      {/* left */}
      <path d="M35 84 l1 3 h3 l-2.5 1.8 1 3L35 90l-2.5 1.8 1-3L31 87h3Z"
        fill="#3D2663" opacity="0.85" transform="scale(0.9) translate(3,3)" />
      {/* centre */}
      <path d="M50 83 l1.2 3.5 h3.5 l-2.8 2 1.2 3.5L50 90.2l-3.1 1.8 1.2-3.5-2.8-2h3.5Z"
        fill="#3D2663" transform="scale(0.9) translate(5,3)" />
      {/* right */}
      <path d="M65 84 l1 3 h3 l-2.5 1.8 1 3L65 90l-2.5 1.8 1-3L61 87h3Z"
        fill="#3D2663" opacity="0.85" transform="scale(0.9) translate(8,3)" />
    </svg>
  );
}

/**
 * Site-wide brand wordmark for navbar / footer.
 * Always renders the inline SVG badge — no uploaded photo used.
 */
export function Logo({
  className,
  onDark = false,
}: {
  className?: string;
  onDark?: boolean;
}) {
  const { settings } = useStoreSettings();
  const name = settings?.storeName?.trim() || "Yamora Wafers";

  const [firstWord, ...restWords] = name.split(" ");
  const suffix = restWords.join(" ");

  return (
    <Link
      href="/"
      className={cn("group flex items-center gap-2", className)}
      aria-label={`${name} — home`}
    >
      {/* SVG badge mark — always shown, never a photo */}
      <span className="transition-all duration-500 group-hover:rotate-[8deg] group-hover:scale-105">
        <YamoraSymbol size={52} />
      </span>

      {/* Wordmark */}
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-brand text-[1.2rem] font-extrabold tracking-tight leading-none",
            onDark ? "text-white" : "text-[#3D2663]"
          )}
        >
          {firstWord}
        </span>
        {suffix && (
          <span
            className={cn(
              "mt-[3px] text-[9px] font-bold uppercase tracking-[0.3em]",
              onDark ? "text-amber-300" : "text-[#C9921A]"
            )}
          >
            {suffix}
          </span>
        )}
      </span>
    </Link>
  );
}
