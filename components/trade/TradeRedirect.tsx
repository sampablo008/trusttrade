"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadLastTradeSymbol } from "@/lib/trade/last-symbol";

interface TradeRedirectProps {
  fallbackSymbol: string;
}

export default function TradeRedirect({ fallbackSymbol }: TradeRedirectProps) {
  const router = useRouter();

  useEffect(() => {
    const target = loadLastTradeSymbol() ?? fallbackSymbol;
    router.replace(`/trade/${target}`);
  }, [fallbackSymbol, router]);

  return null;
}
