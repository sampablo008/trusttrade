import { redirect } from "next/navigation";
import { assertAuthenticated } from "@/lib/auth/session";
import { listMarketTokens } from "@/lib/markets/service";

export default async function TradePage() {
  await assertAuthenticated();

  const { items } = await listMarketTokens();
  const first = items[0];

  redirect(`/trade/${first?.symbol ?? "BTC"}`);
}
