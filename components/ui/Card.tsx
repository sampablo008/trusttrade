import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type Surface = "surface" | "soft" | "strong";
type Elevation = "none" | "card" | "pop" | "deep";

const surfaces: Record<Surface, string> = {
  surface: "bg-surface",
  soft: "bg-surface-soft",
  strong: "bg-surface-strong",
};

const elevations: Record<Elevation, string> = {
  none: "",
  card: "shadow-card",
  pop: "shadow-pop",
  deep: "shadow-deep",
};

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  surface?: Surface;
  elevation?: Elevation;
};

export function Card({
  surface = "surface",
  elevation = "none",
  className,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border",
        surfaces[surface],
        elevations[elevation],
        className,
      )}
      {...rest}
    />
  );
}
