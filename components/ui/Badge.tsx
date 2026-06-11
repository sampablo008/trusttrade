import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export type Tone = "neutral" | "brand" | "up" | "down" | "warning";

const tones: Record<Tone, string> = {
  neutral: "border-border bg-background/40 text-muted",
  brand: "border-brand/30 bg-brand-soft text-brand",
  up: "border-up/30 bg-up/10 text-up",
  down: "border-down/30 bg-down/10 text-down",
  warning: "border-warning/30 bg-warning/10 text-warning",
};

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone;
  /** leading icon — pair color with a glyph so meaning isn't color-only */
  icon?: ReactNode;
};

export function Badge({ tone = "neutral", icon, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
        tones[tone],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </span>
  );
}
