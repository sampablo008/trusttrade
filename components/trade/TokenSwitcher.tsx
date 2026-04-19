"use client";

import { usePathname, useRouter } from "next/navigation";
import CoinIcon from "@/components/ui/CoinIcon";
import type { TopCoin } from "@/lib/markets/top-coins";

interface TokenSwitcherProps {
  coins: TopCoin[];
  iconPaths?: Record<string, string | null | undefined>;
}

export default function TokenSwitcher({ coins, iconPaths = {} }: TokenSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();

  const currentSymbol = pathname.split("/").pop()?.toUpperCase() ?? "";

  const navigate = (symbol: string) => {
    if ("startViewTransition" in document) {
      (document as Document & { startViewTransition: (cb: () => void) => void })
        .startViewTransition(() => { router.push(`/trade/${symbol}`); });
    } else {
      router.push(`/trade/${symbol}`);
    }
  };

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {coins.map((coin) => {
        const active = coin.symbol === currentSymbol;
        return (
          <button
            key={coin.symbol}
            type="button"
            onClick={() => !active && navigate(coin.symbol)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              active
                ? "bg-brand text-background"
                : "border border-border bg-background/30 text-muted hover:border-brand hover:text-foreground"
            }`}
          >
            <CoinIcon symbol={coin.symbol} iconPath={iconPaths[coin.symbol]} size={16} />
            {coin.symbol}
          </button>
        );
      })}
    </div>
  );
}
