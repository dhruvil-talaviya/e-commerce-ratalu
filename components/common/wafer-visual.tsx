"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { Flavor } from "@/lib/types";

/**
 * Art-directed product visual. Until real Cloudinary photography is
 * wired in, each flavour is represented by a premium, generative stack
 * of kettle-cooked wafer chips rendered in its own gradient — so the
 * catalogue looks intentional and on-brand, never like a broken image.
 *
 * Swap this component's internals for <CldImage /> when assets land;
 * the surrounding layout stays identical.
 */
export function WaferVisual({
  flavor,
  className,
  seed = 0,
}: {
  flavor: Flavor;
  className?: string;
  seed?: number;
}) {
  const uid = React.useId().replace(/[:]/g, "");
  const { from, via, to } = flavor.gradient;

  // Deterministic seasoning speckles so SSR and client render match.
  const specks = React.useMemo(() => {
    const rnd = mulberry32(hash(flavor.id) + seed * 97);
    return Array.from({ length: 26 }, () => ({
      x: 60 + rnd() * 200,
      y: 70 + rnd() * 150,
      r: 1 + rnd() * 2.4,
      o: 0.25 + rnd() * 0.5,
    }));
  }, [flavor.id, seed]);

  return (
    <svg
      viewBox="0 0 320 320"
      role="img"
      aria-label={`${flavor.name} Ratalu Chips`}
      className={cn("h-full w-full", className)}
    >
      <defs>
        <radialGradient id={`glow-${uid}`} cx="50%" cy="42%" r="60%">
          <stop offset="0%" stopColor={via} stopOpacity="0.55" />
          <stop offset="70%" stopColor={via} stopOpacity="0.12" />
          <stop offset="100%" stopColor={via} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`chip-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="55%" stopColor={via} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
        <linearGradient id={`rim-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.12" />
        </linearGradient>
        <filter id={`soft-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="10" stdDeviation="14" floodColor={to} floodOpacity="0.35" />
        </filter>
        <clipPath id={`clip-${uid}`}>
          <ChipPath cx={160} cy={168} rx={120} ry={104} />
        </clipPath>
      </defs>

      {/* ambient glow */}
      <circle cx="160" cy="150" r="150" fill={`url(#glow-${uid})`} />

      {/* stacked chips behind — depth */}
      <g filter={`url(#soft-${uid})`}>
        <g transform="rotate(-13 160 168)" opacity="0.9">
          <ChipPath cx={160} cy={182} rx={118} ry={100} fill={`url(#chip-${uid})`} />
        </g>
        <g transform="rotate(9 160 168)" opacity="0.94">
          <ChipPath cx={160} cy={176} rx={120} ry={102} fill={`url(#chip-${uid})`} />
        </g>

        {/* hero chip */}
        <g transform="rotate(-3 160 168)">
          <ChipPath cx={160} cy={168} rx={122} ry={106} fill={`url(#chip-${uid})`} />
          <ChipPath cx={160} cy={168} rx={122} ry={106} fill={`url(#rim-${uid})`} />

          {/* seasoning speckles clipped to the chip */}
          <g clipPath={`url(#clip-${uid})`}>
            {specks.map((s, i) => (
              <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={flavor.accent} opacity={s.o} />
            ))}
            {/* glossy sheen */}
            <ellipse cx="128" cy="126" rx="58" ry="26" fill="#ffffff" opacity="0.18" transform="rotate(-24 128 126)" />
          </g>
        </g>
      </g>
    </svg>
  );
}

/** An organic, slightly wavy wafer-chip shape (rounded square with soft lobes). */
function ChipPath({
  cx,
  cy,
  rx,
  ry,
  fill,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  fill?: string;
}) {
  const k = 0.86; // control-point pull for gentle waviness
  const d = `
    M ${cx} ${cy - ry}
    C ${cx + rx * k} ${cy - ry} ${cx + rx} ${cy - ry * k} ${cx + rx} ${cy}
    C ${cx + rx} ${cy + ry * k} ${cx + rx * k} ${cy + ry} ${cx} ${cy + ry}
    C ${cx - rx * k} ${cy + ry} ${cx - rx} ${cy + ry * k} ${cx - rx} ${cy}
    C ${cx - rx} ${cy - ry * k} ${cx - rx * k} ${cy - ry} ${cx} ${cy - ry}
    Z`;
  return <path d={d} fill={fill} />;
}

// --- tiny deterministic PRNG so speckles are stable between SSR & CSR ---
function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
