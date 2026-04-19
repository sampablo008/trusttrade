"use client";

import { usePathname, useRouter } from "next/navigation";
import type { PublicToken } from "@/types/market";

interface TokenSwitcherProps {
  tokens: PublicToken[];
}

export default function TokenSwitcher({ tokens }: TokenSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();

  const currentSymbol = pathname.split("/").pop()?.toUpperCase() ?? "";

  const navigate = (symbol: string) => {
    // Use View Transitions API when available, fallback to regular navigation
    if ("startViewTransition" in document) {
      (document as Document & { startViewTransition: (cb: () => void) => void })
        .startViewTransition(() => { router.push(`/trade/${symbol}`); });
    } else {
      router.push(`/trade/${symbol}`);
    }
  };

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {tokens.map((token) => {
        const active = token.symbol.toUpperCase() === currentSymbol;
        return (
          <button
            key={token.id}
            type="button"
            onClick={() => !active && navigate(token.symbol)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              active
                ? "bg-brand text-background"
                : "border border-border bg-background/30 text-muted hover:border-brand hover:text-foreground"
            }`}
          >
            {token.symbol}
          </button>
        );
      })}
    </div>
  );
}
