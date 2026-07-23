"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useStoreSettings } from "@/components/common/settings-provider";

/**
 * The brand wordmark. Logo image and store name come from Settings (managed in
 * the admin console), so changing them there updates the header and footer
 * everywhere — the image and name used to be hardcoded here.
 */
export function Logo({
  className,
  onDark = false,
}: {
  className?: string;
  onDark?: boolean;
}) {
  const { settings } = useStoreSettings();

  const logoSrc = settings?.storeLogo?.trim() || "/logo.jpg";
  const name = settings?.storeName?.trim() || "Ratalu Wafers";

  // Split the name so the first word reads as the wordmark and the rest as the
  // small caps tagline underneath — "Ratalu Wafers" → "Ratalu" / "WAFERS".
  const [firstWord, ...restWords] = name.split(" ");
  const suffix = restWords.join(" ");

  return (
    <Link
      href="/"
      className={cn("group flex items-center gap-2.5", className)}
      aria-label={`${name} — home`}
    >
      <span className="relative grid size-10 place-items-center overflow-hidden rounded-full border-2 border-orange-200 bg-white p-0.5 shadow-[0_2px_8px_rgb(249_115_22/0.25)] transition-all duration-500 group-hover:border-orange-400 group-hover:rotate-[12deg] group-hover:scale-105 group-hover:shadow-[0_4px_16px_rgb(249_115_22/0.4)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          alt={`${name} logo`}
          width={40}
          height={40}
          className="size-full rounded-full object-cover"
        />
      </span>

      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-brand text-[1.15rem] font-bold tracking-tight leading-none",
            onDark ? "text-white" : "text-gray-800"
          )}
        >
          {firstWord}
        </span>
        {suffix && (
          <span
            className={cn(
              "mt-0.5 text-[9px] font-semibold uppercase tracking-[0.28em]",
              onDark ? "text-orange-300" : "text-orange-500"
            )}
          >
            {suffix}
          </span>
        )}
      </span>
    </Link>
  );
}
