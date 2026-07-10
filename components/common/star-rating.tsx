import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  rating,
  size = "md",
  className,
}: {
  rating: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const px = size === "sm" ? "size-3.5" : size === "lg" ? "size-6" : "size-4";
  return (
    <div className={cn("flex items-center gap-0.5", className)} aria-label={`${rating} out of 5 stars`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star
          key={i}
          className={cn(
            px,
            i < Math.round(rating)
              ? "fill-gold-400 text-gold-400"
              : "fill-transparent text-gold-200"
          )}
        />
      ))}
    </div>
  );
}
