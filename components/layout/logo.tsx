import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

/** The Ratalu wordmark with the custom brand logo. */
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
      <span className="relative grid size-10 place-items-center overflow-hidden rounded-full border border-purple-100 bg-white p-0.5 shadow-sm transition-transform duration-500 group-hover:rotate-[12deg] group-hover:scale-105">
        <Image
          src="/logo.jpg"
          alt="Ratalu Chips Logo"
          width={40}
          height={40}
          className="rounded-full object-cover"
        />
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-serif text-lg font-bold tracking-tight",
            onDark ? "text-cream" : "text-charcoal"
          )}
        >
          Ratalu
        </span>
        <span
          className={cn(
            "text-[9px] font-semibold uppercase tracking-[0.28em]",
            onDark ? "text-gold-300" : "text-orange-500"
          )}
        >
          Chips
        </span>
      </span>
    </Link>
  );
}

