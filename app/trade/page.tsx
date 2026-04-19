import { redirect } from "next/navigation";
import { assertAuthenticated } from "@/lib/auth/session";
import { TOP_COINS } from "@/lib/markets/top-coins";

export default async function TradePage() {
  await assertAuthenticated();
  redirect(`/trade/${TOP_COINS[0].symbol}`);
}
