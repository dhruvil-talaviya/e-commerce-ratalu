"use client";

import {
  Leaf,
  Hand,
  Droplets,
  Ban,
  Sparkles,
  Clock,
  Sprout,
  Flame,
  Package,
  PackageCheck,
  HandHeart,
  Slice,
  Sun,
  MapPin,
  Truck,
  Shield,
  Star,
  Heart,
  Award,
  Zap,
  Gift,
  Check,
  ShieldCheck,
  RotateCcw,
  Wheat,
  Snowflake,
  Factory,
  type LucideIcon,
} from "lucide-react";

/**
 * The CMS stores an icon *name* (a string), not a component — a database can't
 * hold a React component, and letting content decide which component renders is
 * how you get arbitrary-code problems.
 *
 * This registry is the allowlist: an unknown or malicious name resolves to a
 * safe default rather than crashing the page. Add an icon here to make it
 * selectable in the Website Builder.
 */
export const ICONS: Record<string, LucideIcon> = {
  Leaf,
  Hand,
  Droplets,
  Ban,
  Sparkles,
  Clock,
  Sprout,
  Flame,
  Package,
  PackageCheck,
  HandHeart,
  Slice,
  Sun,
  MapPin,
  Truck,
  Shield,
  Star,
  Heart,
  Award,
  Zap,
  Gift,
  Check,
  ShieldCheck,
  RotateCcw,
  Wheat,
  Snowflake,
  Factory,
};

/** Names the admin can pick from in the icon dropdown. */
export const ICON_NAMES = Object.keys(ICONS);

/** Resolve a stored icon name. Falls back to a neutral icon if unknown. */
export function resolveIcon(name: string | undefined): LucideIcon {
  return (name && ICONS[name]) || Sparkles;
}

/** Renders an icon by name. */
export function CmsIcon({
  name,
  className,
}: {
  name: string | undefined;
  className?: string;
}) {
  const Icon = resolveIcon(name);
  return <Icon className={className} />;
}
