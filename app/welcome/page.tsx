import { Metadata } from "next";
import { redirect } from "next/navigation";
import WelcomeClaim from "@/components/welcome/WelcomeClaim";
import { assertUserApi } from "@/lib/auth/assert-user-api";
import { getSignupBonusStatus } from "@/lib/bonus/service";
import { getProfile } from "@/lib/trades/service";

export const metadata: Metadata = {
  title: "Claim your welcome bonus | TrustTrade",
  description: "Open your welcome gift to claim your signup bonus.",
};

export default async function WelcomePage() {
  const { userId } = await assertUserApi();
  const status = await getSignupBonusStatus(userId);

  if (status.state !== "pending") {
    redirect("/trade/BTC");
  }

  const profile = await getProfile(userId);

  return (
    <WelcomeClaim
      amountCents={status.amountCents}
      displayName={profile.displayName ?? profile.username ?? null}
    />
  );
}
