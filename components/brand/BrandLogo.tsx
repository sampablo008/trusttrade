import Image from "next/image";
import { Logo } from "@/assets";

interface BrandLogoProps {
  size?: number;
  withWordmark?: boolean;
  wordmarkClassName?: string;
  className?: string;
}

export default function BrandLogo({
  size = 32,
  withWordmark = true,
  wordmarkClassName,
  className,
}: BrandLogoProps) {
  return (
    <span className={["inline-flex items-center gap-2.5", className].filter(Boolean).join(" ")}>
      <Image
        src={Logo}
        alt="TrustTrade"
        width={size}
        height={size}
        priority
        className="shrink-0"
        style={{ height: size, width: size }}
      />
      {withWordmark && (
        <span
          className={[
            "font-display text-base font-semibold tracking-tight text-foreground",
            wordmarkClassName,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          Trust<span className="text-brand">Trade</span>
        </span>
      )}
    </span>
  );
}
