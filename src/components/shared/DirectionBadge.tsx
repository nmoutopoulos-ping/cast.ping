import { cn } from "@/lib/utils";
import type { Direction } from "@/types/wallet";

interface DirectionBadgeProps {
  direction: Direction;
  className?: string;
}

export function DirectionBadge({ direction, className }: DirectionBadgeProps) {
  return (
    <span
      className={cn(
        "pill-badge",
        direction === "IN" && "pill-in",
        direction === "OUT" && "pill-out",
        direction === "SELF" && "pill-self",
        className
      )}
    >
      {direction}
    </span>
  );
}
