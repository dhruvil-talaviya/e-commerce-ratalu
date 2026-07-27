"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
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
  const mainColor = onDark ? "#FFFFFF" : "#3D2663";
  const accentColor = onDark ? "#FACC15" : "#C9921A";

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
      {/* Outer double arc ring (gold & purple) */}
      <circle cx="100" cy="100" r="94" stroke={accentColor} strokeWidth="3" fill="none" />
      <circle cx="100" cy="100" r="88" stroke={mainColor} strokeWidth="1.8" fill="none" />

      {/* Chips bucket */}
      <path d="M78 70 L82 101 L118 101 L122 70 Z" fill={mainColor} />
      <rect x="88"  y="70" width="5"  height="31" fill="white" opacity="0.2" rx="1" />
      <rect x="97"  y="70" width="5"  height="31" fill="white" opacity="0.2" rx="1" />
      <rect x="106" y="70" width="5"  height="31" fill="white" opacity="0.2" rx="1" />

      {/* Golden chips */}
      <ellipse cx="82" cy="68" rx="11" ry="5.5" transform="rotate(-25 82 68)" fill="#D4A017" />
      <ellipse cx="100" cy="64" rx="12" ry="5" transform="rotate(5 100 64)" fill="#E0B020" />
      <ellipse cx="118" cy="68" rx="11" ry="5.5" transform="rotate(22 118 68)" fill="#D4A017" />

      {/* Wordmark "yamora" */}
      <text
        x="100"
        y="124"
        textAnchor="middle"
        fontFamily="Georgia, 'Palatino Linotype', serif"
        fontSize="29"
        fontWeight="900"
        fill={mainColor}
        letterSpacing="-0.5"
      >
        yamora
      </text>

      {/* Sub-label "- WAFERS -" */}
      <text
        x="100"
        y="138"
        textAnchor="middle"
        fontFamily="'Arial', sans-serif"
        fontSize="10"
        fontWeight="700"
        fill={accentColor}
        letterSpacing="3.5"
      >
        - WAFERS -
      </text>

      {/* Swoosh */}
      <path d="M30 147 Q60 139 100 143 Q140 147 170 139" stroke={mainColor} strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M30 152 Q60 144 100 148 Q140 152 170 144" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" fill="none" />

      {/* Twin green leaves */}
      <ellipse cx="150" cy="138" rx="11" ry="6" transform="rotate(-50 150 138)" fill="#5A8A3C" />
      <ellipse cx="157" cy="132" rx="10" ry="5.5" transform="rotate(-65 157 132)" fill="#4A7A2C" />

      {/* Tagline */}
      <text
        x="100"
        y="163"
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontSize="8.5"
        fontStyle="italic"
        fill={mainColor}
        opacity="0.85"
      >
        Crispy. Tasty. Naturally Yours.
      </text>

      {/* Three stars */}
      <path d="M74 177 L75.4 181.2 L79.8 181.2 L76.2 183.8 L77.6 188 L74 185.4 L70.4 188 L71.8 183.8 L68.2 181.2 L72.6 181.2 Z" fill={mainColor} />
      <path d="M100 175 L101.7 180.2 L107.2 180.2 L102.8 183.3 L104.5 188.5 L100 185.4 L95.5 188.5 L97.2 183.3 L92.8 180.2 L98.3 180.2 Z" fill={mainColor} />
      <path d="M126 177 L127.4 181.2 L131.8 181.2 L128.2 183.8 L129.6 188 L126 185.4 L122.4 188 L123.8 183.8 L120.2 181.2 L124.6 181.2 Z" fill={mainColor} />
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

  const rawLogo = settings?.storeLogo?.trim() ?? "";
  const hasLogo = rawLogo.length > 0;
  const name = settings?.storeName?.trim() || "Yamora Wafers";

  const logoSrc = rawLogo;
  const isSvg = isSvgUrl(rawLogo);

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
            className="h-16 sm:h-20 w-auto max-w-[300px] object-contain"
            style={{ background: "transparent" }}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoSrc}
            alt={`${name} logo`}
            className="h-16 sm:h-20 w-auto max-w-[300px] object-contain"
          />
        )
      ) : (
        <YamoraSymbol size={80} onDark={onDark} />
      )}
    </Link>
  );
}
