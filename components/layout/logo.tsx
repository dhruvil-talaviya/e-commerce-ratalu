"use client";

import * as React from "react";
import Link from "next/link";
import { cn, sanitizeMediaUrl } from "@/lib/utils";
import { useStoreSettings } from "@/components/common/settings-provider";
import { motion } from "motion/react";

/**
 * Clean, high-resolution Vector Brand Symbol without circular frame boundaries.
 */
export function YamoraSymbol({
  size = 80,
  onDark = false,
  className,
}: {
  size?: number;
  onDark?: boolean;
  className?: string;
}) {
  const mainColor = onDark ? "#FFFFFF" : "#4A1942";
  const goldColor = "#D4A017";
  const textColor = onDark ? "#FFFFFF" : goldColor;

  const width = Math.round(size * 1.35);
  const height = size;

  return (
    <svg
      width={width}
      height={height}
      viewBox="35 35 430 410"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-16 lg:h-20 w-auto transition-transform duration-300 transform-gpu overflow-visible", className)}
      aria-hidden
    >
      {/* Outer Golden Circular Double Frame */}
      <circle cx="250" cy="240" r="195" stroke={goldColor} strokeWidth="5" fill="none" />
      <circle cx="250" cy="240" r="184" stroke={goldColor} strokeWidth="2.5" strokeDasharray="320 20" fill="none" />

      {/* Wafer Chips Bowl */}
      <g transform="translate(0, 5)">
        <path d="M 215 140 Q 225 110 240 125 Q 255 105 270 120 Q 285 110 295 140 Z" fill="#E8B923" />
        <ellipse cx="232" cy="130" rx="14" ry="7" transform="rotate(-15 232 130)" fill="#F5D76E" stroke={goldColor} strokeWidth="1.5" />
        <ellipse cx="250" cy="122" rx="15" ry="7.5" transform="rotate(8 250 122)" fill="#FFE396" stroke={goldColor} strokeWidth="1.5" />
        <ellipse cx="268" cy="128" rx="14" ry="7" transform="rotate(25 268 128)" fill="#F5D76E" stroke={goldColor} strokeWidth="1.5" />

        <path d="M 210 142 L 220 188 L 280 188 L 290 142 Z" fill={mainColor} />
        <line x1="228" y1="142" x2="233" y2="188" stroke={onDark ? "#2E1148" : "#FFFFFF"} strokeWidth="4" opacity="0.35" />
        <line x1="242" y1="142" x2="245" y2="188" stroke={onDark ? "#2E1148" : "#FFFFFF"} strokeWidth="4" opacity="0.35" />
        <line x1="258" y1="142" x2="255" y2="188" stroke={onDark ? "#2E1148" : "#FFFFFF"} strokeWidth="4" opacity="0.35" />
        <line x1="272" y1="142" x2="267" y2="188" stroke={onDark ? "#2E1148" : "#FFFFFF"} strokeWidth="4" opacity="0.35" />
      </g>

      {/* Main Logotype: yamora */}
      <g fill={mainColor}>
        {/* Letter 'y' - Crisp descender stem & arms */}
        <path d="M 84 202 L 98 202 L 108 226 L 118 202 L 132 202 L 114 238 C 106 254 94 266 80 266 C 72 266 68 260 72 254 C 74 249 80 248 84 251 C 88 254 94 252 100 238 Z" />
        {/* Letter 'a' */}
        <path d="M 142 225 C 142 208 156 200 170 200 C 184 200 192 210 192 224 L 192 252 L 178 252 L 178 244 C 172 250 162 254 154 254 C 144 254 138 246 138 236 C 138 226 148 222 162 222 L 178 222 L 178 220 C 178 212 172 208 164 208 C 156 208 150 212 148 218 Z M 178 230 L 164 230 C 154 230 150 234 150 239 C 150 244 156 246 162 246 C 172 246 178 240 178 232 Z" />
        {/* Letter 'm' */}
        <path d="M 200 202 L 214 202 L 214 212 C 220 204 230 200 240 200 C 250 200 258 206 262 214 C 268 204 278 200 290 200 C 304 200 312 210 312 226 L 312 252 L 298 252 L 298 228 C 298 216 292 210 284 210 C 274 210 268 218 268 230 L 268 252 L 254 252 L 254 228 C 254 216 248 210 240 210 C 230 210 224 218 224 230 L 224 252 L 210 252 L 210 202 Z" />
        {/* Letter 'o' */}
        <path d="M 322 227 C 322 210 334 200 348 200 C 362 200 374 210 374 227 C 374 244 362 254 348 254 C 334 254 322 244 322 227 Z M 348 212 C 340 212 336 218 336 227 C 336 236 340 242 348 242 C 360 242 360 236 360 227 C 360 218 356 212 348 212 Z" />
        <rect x="345" y="214" width="6" height="26" rx="3" fill={onDark ? "#2E1148" : "#FFF8F0"} />
        {/* Letter 'r' */}
        <path d="M 382 202 L 396 202 L 396 214 C 402 204 412 200 422 202 L 420 216 C 410 214 402 220 398 228 L 398 252 L 384 252 Z" />
        {/* Letter 'a' */}
        <path d="M 426 225 C 426 208 440 200 454 200 C 468 200 476 210 476 224 L 476 252 L 462 252 L 462 244 C 456 250 446 254 438 254 C 428 254 422 246 422 236 C 422 226 432 222 446 222 L 462 222 L 462 220 C 462 212 456 208 448 208 C 440 208 434 212 434 239 C 434 244 440 246 446 246 C 456 246 462 240 462 232 Z" />
      </g>

      {/* Subheader: - WAFERS - */}
      <text x="245" y="282" textAnchor="middle" fontFamily="'Impact', 'Arial Black', sans-serif" fontSize="21" fontWeight="900" fill={textColor} letterSpacing="7">- WAFERS -</text>

      {/* Swoosh Waves */}
      <path d="M 50 310 Q 140 280 250 310 Q 360 335 435 270 C 442 285 430 305 390 325 Q 260 360 140 325 Q 80 310 50 310 Z" fill={mainColor} />
      <path d="M 75 320 Q 160 295 250 322 Q 350 345 425 295 C 430 305 420 318 385 335 Q 255 372 145 338 Q 95 325 75 320 Z" fill={goldColor} />

      {/* Slogan */}
      <text x="250" y="375" textAnchor="middle" fontFamily="'Brush Script MT', 'Georgia', cursive, serif" fontSize="20" fontWeight="bold" fontStyle="italic" fill={mainColor}>Crispy. Tasty. Naturally Yours.</text>
    </svg>
  );
}

export interface LogoProps {
  className?: string;
  onDark?: boolean;
  size?: number;
  zoomOnHover?: boolean;
}

/**
 * Perfectly aligned, frameless Logo component.
 * Blends custom logo images seamlessly and touches top/bottom navbar edges.
 */
export function Logo({
  className,
  onDark = false,
  size = 80,
  zoomOnHover = true,
}: LogoProps) {
  const { settings } = useStoreSettings();
  const [imgError, setImgError] = React.useState(false);

  const lightLogo = settings?.storeLogo?.trim() || "/logo.png";
  const darkLogo = settings?.storeLogoDark?.trim() || lightLogo;
  const rawLogo = onDark ? darkLogo : lightLogo;
  const logoSrc = sanitizeMediaUrl(rawLogo) || "/logo.png";
  const name = settings?.storeName?.trim() || "Yamora Wafers";

  return (
    <Link
      href="/"
      className={cn(
        "group relative inline-flex items-center shrink-0 border-none outline-none focus:outline-none focus-visible:ring-0 select-none overflow-hidden bg-transparent",
        className
      )}
      aria-label={`${name} — home`}
    >
      {!imgError ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={logoSrc}
          alt={`${name} logo`}
          onError={() => setImgError(true)}
          // suppressHydrationWarning prevents React from erroring when the
          // server-rendered src (/logo.png) differs from the post-mount src
          // (Cloudinary URL loaded from localStorage / API). The correct URL
          // is applied immediately after mount with no visible flash.
          suppressHydrationWarning
          className={cn(
            "h-14 sm:h-16 lg:h-18 w-auto max-w-[220px] sm:max-w-[280px] object-contain border-none outline-none ring-0 shadow-none transition-transform duration-300 group-hover:scale-105"
          )}
        />
      ) : (
        <YamoraSymbol size={size} onDark={onDark} />
      )}
    </Link>
  );
}

