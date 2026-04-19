import Image from "next/image";
import { buildMediaUrl } from "@/lib/media/path";

interface CoinIconProps {
  symbol: string;
  iconPath?: string | null;
  size?: number;
  className?: string;
}

export default function CoinIcon({ symbol, iconPath, size = 24, className = "" }: CoinIconProps) {
  if (iconPath) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`relative shrink-0 overflow-hidden rounded-full ${className}`}
      >
        <Image
          src={buildMediaUrl("token-icons", iconPath)}
          alt={symbol}
          fill
          className="object-contain"
          unoptimized
        />
      </div>
    );
  }

  return (
    <span
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      className={`flex shrink-0 items-center justify-center rounded-full bg-brand/20 font-bold text-brand ${className}`}
    >
      {symbol.slice(0, 2)}
    </span>
  );
}
