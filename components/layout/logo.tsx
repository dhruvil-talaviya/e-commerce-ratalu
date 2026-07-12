import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

/** The Ratalu wordmark — Baloo 2 brand font, orange-dominant palette. */
export function Logo({
  className,
  onDark = false,
}: {
  className?: string;
  onDark?: boolean;
}) {
  return (
    <Link
      href="/"
      className={cn("group flex items-center gap-2.5", className)}
      aria-label="Ratalu Chips — home"
    >
      {/* Logo icon with orange ring + spin on hover */}
      <span className="relative grid size-10 place-items-center overflow-hidden rounded-full border-2 border-orange-200 bg-white p-0.5 shadow-[0_2px_8px_rgb(249_115_22/0.25)] transition-all duration-500 group-hover:border-orange-400 group-hover:rotate-[12deg] group-hover:scale-105 group-hover:shadow-[0_4px_16px_rgb(249_115_22/0.4)]">
        <Image
          src="/logo.jpg"
          alt="Ratalu Chips Logo"
          width={40}
          height={40}
          className="rounded-full object-cover"
        />
      </span>

      {/* Wordmark — Baloo 2 */}
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-brand text-[1.15rem] font-bold tracking-tight leading-none",
            onDark ? "text-white" : "text-gray-800"
          )}
        >
          Ratalu
        </span>
        <span
          className={cn(
            "text-[9px] font-semibold uppercase tracking-[0.28em] mt-0.5",
            onDark ? "text-orange-300" : "text-orange-500"
          )}
        >
          Chips
        </span>
      </span>
    </Link>
  );
}
