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
  const mainColor = onDark ? "#FFFFFF" : "#3D1E53";
  const goldColor = "#D98A2B";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 500 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <circle cx="250" cy="250" r="240" fill={onDark ? "#3D1E53" : "#FDF8EF"} />
      <circle cx="250" cy="250" r="230" stroke={onDark ? "#FFFFFF" : "#3D1E53"} strokeWidth="7" fill="none" />
      <circle cx="250" cy="250" r="215" stroke={goldColor} strokeWidth="4.5" fill="none" />

      <g transform="translate(0, 5)">
        <path d="M 215 140 Q 225 110 240 125 Q 255 105 270 120 Q 285 110 295 140 Z" fill="#EBB338" />
        <ellipse cx="232" cy="130" rx="14" ry="7" transform="rotate(-15 232 130)" fill="#F9D776" stroke={goldColor} strokeWidth="1.5" />
        <ellipse cx="250" cy="122" rx="15" ry="7.5" transform="rotate(8 250 122)" fill="#FFE396" stroke={goldColor} strokeWidth="1.5" />
        <ellipse cx="268" cy="128" rx="14" ry="7" transform="rotate(25 268 128)" fill="#F9D776" stroke={goldColor} strokeWidth="1.5" />

        <path d="M 210 142 L 220 188 L 280 188 L 290 142 Z" fill={onDark ? "#FFFFFF" : "#3D1E53"} />
        <line x1="228" y1="142" x2="233" y2="188" stroke={onDark ? "#3D1E53" : "#FFFFFF"} strokeWidth="4" opacity="0.3" />
        <line x1="242" y1="142" x2="245" y2="188" stroke={onDark ? "#3D1E53" : "#FFFFFF"} strokeWidth="4" opacity="0.3" />
        <line x1="258" y1="142" x2="255" y2="188" stroke={onDark ? "#3D1E53" : "#FFFFFF"} strokeWidth="4" opacity="0.3" />
        <line x1="272" y1="142" x2="267" y2="188" stroke={onDark ? "#3D1E53" : "#FFFFFF"} strokeWidth="4" opacity="0.3" />
      </g>

      <g fill={mainColor}>
        <path d="M 98 215 C 98 200 110 200 118 200 C 126 200 132 208 132 220 L 132 245 C 132 268 118 276 98 276 C 90 276 86 270 86 264 C 86 256 94 254 102 254 C 114 254 118 248 118 240 L 118 234 C 110 242 100 244 94 238 C 88 232 88 222 98 215 Z M 118 214 C 112 214 104 218 104 226 C 104 233 110 236 118 232 Z" />
        <path d="M 142 225 C 142 208 156 200 170 200 C 184 200 192 210 192 224 L 192 252 L 178 252 L 178 244 C 172 250 162 254 154 254 C 144 254 138 246 138 236 C 138 226 148 222 162 222 L 178 222 L 178 220 C 178 212 172 208 164 208 C 156 208 150 212 148 218 Z M 178 230 L 164 230 C 154 230 150 234 150 239 C 150 244 156 246 162 246 C 172 246 178 240 178 232 Z" />
        <path d="M 200 202 L 214 202 L 214 212 C 220 204 230 200 240 200 C 250 200 258 206 262 214 C 268 204 278 200 290 200 C 304 200 312 210 312 226 L 312 252 L 298 252 L 298 228 C 298 216 292 210 284 210 C 274 210 268 218 268 230 L 268 252 L 254 252 L 254 228 C 254 216 248 210 240 210 C 230 210 224 218 224 230 L 224 252 L 210 252 L 210 202 Z" />
        <path d="M 322 227 C 322 210 334 200 348 200 C 362 200 374 210 374 227 C 374 244 362 254 348 254 C 334 254 322 244 322 227 Z M 348 212 C 340 212 336 218 336 227 C 336 236 340 242 348 242 C 360 242 360 236 360 227 C 360 218 356 212 348 212 Z" />
        <rect x="345" y="214" width="6" height="26" rx="3" fill={onDark ? "#3D1E53" : "#FDF8EF"} />
        <path d="M 382 202 L 396 202 L 396 214 C 402 204 412 200 422 202 L 420 216 C 410 214 402 220 398 228 L 398 252 L 384 252 Z" />
        <path d="M 426 225 C 426 208 440 200 454 200 C 468 200 476 210 476 224 L 476 252 L 462 252 L 462 244 C 456 250 446 254 438 254 C 428 254 422 246 422 236 C 422 226 432 222 446 222 L 462 222 L 462 220 C 462 212 456 208 448 208 C 440 208 434 212 432 218 Z M 462 230 L 448 230 C 438 230 434 234 434 239 C 434 244 440 246 446 246 C 456 246 462 240 462 232 Z" />
      </g>

      <text x="245" y="282" textAnchor="middle" fontFamily="'Impact', 'Arial Black', sans-serif" fontSize="21" fontWeight="900" fill={goldColor} letterSpacing="7">- WAFERS -</text>

      <g transform="translate(325, 252)">
        <path d="M 12 38 C 2 20 18 0 32 6 C 46 12 42 36 28 42 C 20 45 15 43 12 38 Z" fill="#679555" stroke={mainColor} strokeWidth="2" />
        <path d="M 28 32 C 18 14 34 -6 48 0 C 62 6 58 30 44 36 C 36 39 31 37 28 32 Z" fill="#4E783E" stroke={mainColor} strokeWidth="2" />
      </g>

      <path d="M 50 310 Q 140 280 250 310 Q 360 335 435 270 C 442 285 430 305 390 325 Q 260 360 140 325 Q 80 310 50 310 Z" fill={mainColor} />
      <path d="M 75 320 Q 160 295 250 322 Q 350 345 425 295 C 430 305 420 318 385 335 Q 255 372 145 338 Q 95 325 75 320 Z" fill={goldColor} />

      <text x="250" y="375" textAnchor="middle" fontFamily="'Brush Script MT', 'Georgia', cursive, serif" fontSize="20" fontWeight="bold" fontStyle="italic" fill={mainColor}>Crispy. Tasty. Naturally Yours.</text>

      <g fill={mainColor}>
        <path d="M 215 400 L 218 408 L 226 408 L 220 413 L 222 421 L 215 416 L 208 421 L 210 413 L 204 408 L 212 408 Z" />
        <path d="M 250 388 L 254.5 400 L 267 400 L 257 407.5 L 261 419.5 L 250 412 L 239 419.5 L 243 407.5 L 233 400 L 245.5 400 Z" />
        <path d="M 285 400 L 288 408 L 296 408 L 290 413 L 292 421 L 285 416 L 278 421 L 280 413 L 274 408 L 282 408 Z" />
      </g>
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
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoSrc}
          alt={`${name} logo`}
          className="h-10 sm:h-12 lg:h-13 w-auto max-w-[240px] object-contain"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/logo.png"
          alt={`${name} logo`}
          className="h-10 sm:h-12 lg:h-13 w-auto max-w-[240px] object-contain rounded-full shadow-xs"
        />
      )}
    </Link>
  );
}
