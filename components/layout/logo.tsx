"use client";

import Link from "next/link";
import { cn, sanitizeMediaUrl } from "@/lib/utils";
import { useStoreSettings } from "@/components/common/settings-provider";
import { isSvgUrl } from "@/lib/cloudinary";

/**
 * Fallback vector SVG logo used when no custom logo is uploaded.
 * Completely transparent background — no solid cream fill circle.
 */
function YamoraSymbol({
  size = 56,
  onDark = false,
  className,
}: {
  size?: number;
  onDark?: boolean;
  className?: string;
}) {
  const bgFill = onDark ? "#4A1942" : "#5B2C83";
  const mainColor = "#FFFFFF";
  const accentColor = "#F4C542";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* Background squircle card */}
      <rect x="4" y="4" width="192" height="192" rx="44" fill={bgFill} />

      {/* Outer double arc ring (gold & white) */}
      <circle cx="100" cy="100" r="90" stroke={accentColor} strokeWidth="4.5" fill="none" />
      <circle cx="100" cy="100" r="83" stroke="#FFFFFF" strokeWidth="2" fill="none" />

      {/* Chips bucket */}
      <path d="M78 67 L82 98 L118 98 L122 67 Z" fill="#FFFFFF" />
      <rect x="88" y="67" width="5" height="31" fill="#4A1942" opacity="0.25" rx="1" />
      <rect x="97" y="67" width="5" height="31" fill="#4A1942" opacity="0.25" rx="1" />
      <rect x="106" y="67" width="5" height="31" fill="#4A1942" opacity="0.25" rx="1" />

      {/* Golden chips */}
      <ellipse cx="82" cy="65" rx="11" ry="5.5" transform="rotate(-25 82 65)" fill="#F4C542" />
      <ellipse cx="100" cy="61" rx="12" ry="5" transform="rotate(5 100 61)" fill="#FFE17D" />
      <ellipse cx="118" cy="65" rx="11" ry="5.5" transform="rotate(22 118 65)" fill="#F4C542" />

      {/* Wordmark "yamora" */}
      <text
        x="100"
        y="121"
        textAnchor="middle"
        fontFamily="Georgia, 'Palatino Linotype', serif"
        fontSize="30"
        fontWeight="900"
        fill={mainColor}
        letterSpacing="-0.5"
      >
        yamora
      </text>

      {/* Sub-label "- WAFERS -" */}
      <text
        x="100"
        y="135"
        textAnchor="middle"
        fontFamily="'Arial', sans-serif"
        fontSize="10.5"
        fontWeight="800"
        fill={accentColor}
        letterSpacing="3.5"
      >
        - WAFERS -
      </text>

      {/* Swoosh */}
      <path d="M30 144 Q60 136 100 140 Q140 144 170 136" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M30 149 Q60 141 100 145 Q140 149 170 141" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" fill="none" />

      {/* Twin green leaves */}
      <ellipse cx="150" cy="135" rx="11" ry="6" transform="rotate(-50 150 135)" fill="#7CB342" />
      <ellipse cx="157" cy="129" rx="10" ry="5.5" transform="rotate(-65 157 129)" fill="#558B2F" />

      {/* Three stars */}
      <path d="M74 168 L75.4 172.2 L79.8 172.2 L76.2 174.8 L77.6 179 L74 176.4 L70.4 179 L71.8 174.8 L68.2 172.2 L72.6 172.2 Z" fill={accentColor} />
      <path d="M100 166 L101.7 171.2 L107.2 171.2 L102.8 174.3 L104.5 179.5 L100 176.4 L95.5 178.4 L97.2 174.3 L92.8 171.2 L98.3 171.2 Z" fill={accentColor} />
      <path d="M126 168 L127.4 172.2 L131.8 172.2 L128.2 174.8 L129.6 179 L126 176.4 L122.4 179 L123.8 174.8 L120.2 172.2 L124.6 172.2 Z" fill={accentColor} />
    </svg>
  );
}

/**
 * Site-wide brand logo for navbar and footer.
 *
 * Renders cleanly with a transparent background:
 *  1. Uploaded SVG / Image from admin settings
 *  2. Fallback vector YamoraSymbol SVG badge
 */
export function Logo({
  className,
  onDark = false,
}: {
  className?: string;
  onDark?: boolean;
}) {
  const { settings } = useStoreSettings();

  const lightLogo = settings?.storeLogo?.trim() ?? "";
  const darkLogo = settings?.storeLogoDark?.trim() ?? "";
  const rawLogo = onDark && darkLogo ? darkLogo : lightLogo;
  const logoSrc = sanitizeMediaUrl(rawLogo);
  const hasLogo = logoSrc.length > 0;
  const name = settings?.storeName?.trim() || "Yamora Wafers";
  const isSvg = isSvgUrl(logoSrc);

  return (
    <Link
      href="/"
      className={cn(
        "group inline-flex items-center shrink-0 transition-transform duration-300 hover:scale-[1.03]",
        className
      )}
      aria-label={`${name} — home`}
    >
      {hasLogo ? (
        isSvg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoSrc}
            alt={`${name} logo`}
            className="h-10 sm:h-12 lg:h-13 w-auto max-w-[240px] object-contain"
            style={{ background: "transparent" }}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoSrc}
            alt={`${name} logo`}
            className="h-10 sm:h-12 lg:h-13 w-auto max-w-[240px] object-contain"
          />
        )
      ) : (
        <YamoraSymbol size={52} onDark={onDark} className="h-10 sm:h-12 lg:h-13 w-auto" />
      )}
    </Link>
  );
}
