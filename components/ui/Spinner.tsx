import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const sizeMap = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
} as const;

export type SpinnerProps = {
  size?: keyof typeof sizeMap;
  className?: string;
  label?: string;
};

export function Spinner({ size = "md", className, label = "Loading" }: SpinnerProps) {
  return (
    <Loader2
      role="status"
      aria-label={label}
      className={cn("animate-spin", sizeMap[size], className)}
    />
  );
}
