import { assertAuthenticated } from "@/lib/auth/session";
import TradeRedirect from "@/components/trade/TradeRedirect";
import { TOP_COINS } from "@/lib/markets/top-coins";

export default async function TradePage() {
  await assertAuthenticated();
  return <TradeRedirect fallbackSymbol={TOP_COINS[0].symbol} />;
}
