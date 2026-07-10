import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { HEAT_LABELS } from "@/lib/data/flavors";
import type { HeatLevel } from "@/lib/types";

export function HeatMeter({
  level,
  showLabel = true,
  className,
}: {
  level: HeatLevel;
  showLabel?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center gap-0.5" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <Flame
            key={i}
            className={cn(
              "size-4 transition-colors",
              i < level ? "fill-orange-500 text-orange-500" : "fill-transparent text-orange-200"
            )}
          />
        ))}
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-charcoal-muted">{HEAT_LABELS[level]}</span>
      )}
      <span className="sr-only">Heat level: {HEAT_LABELS[level]}</span>
    </div>
  );
}
