"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LiveCountdownProps {
  deadline: string | Date | null | undefined;
  onExpire?: () => void;
  className?: string;
  badgeMode?: boolean;
}

export function LiveCountdown({
  deadline,
  onExpire,
  className,
  badgeMode = true,
}: LiveCountdownProps) {
  const [secondsLeft, setSecondsLeft] = React.useState<number>(0);
  const expiredFired = React.useRef(false);

  React.useEffect(() => {
    if (!deadline) {
      setSecondsLeft(0);
      return;
    }

    const targetTime = new Date(deadline).getTime();

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((targetTime - Date.now()) / 1000));
      setSecondsLeft(remaining);

      if (remaining === 0 && !expiredFired.current) {
        expiredFired.current = true;
        if (onExpire) onExpire();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [deadline, onExpire]);

  if (!deadline || secondsLeft <= 0) {
    if (badgeMode) {
      return (
        <span className={cn("inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200", className)}>
          <span>Confirmed</span>
        </span>
      );
    }
    return null;
  }

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const formatted = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  if (badgeMode) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-200 shadow-2xs animate-pulse",
          className
        )}
      >
        <Clock className="size-3 text-amber-600" />
        <span>Pending Confirmation ({formatted})</span>
      </span>
    );
  }

  return (
    <div className={cn("flex items-center gap-1.5 font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200", className)}>
      <Clock className="size-3.5 text-amber-600 animate-spin" />
      <span>{formatted} Remaining</span>
    </div>
  );
}
