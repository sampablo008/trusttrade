import "server-only";
import AppHeaderNav from "@/components/layout/AppHeaderNav";
import { assertAuthenticated } from "@/lib/auth/session";
import { getSignupBonusStatus } from "@/lib/bonus/service";
import { getOptionalServerEnv } from "@/lib/env/server";
import { buildMediaUrl } from "@/lib/media/path";
import { getProfile } from "@/lib/trades/service";
import { getWalletBalances } from "@/lib/wallet-balances/service";
import type { UserProfile } from "@/types/trade";

interface AppShellProps {
  children: React.ReactNode;
}

export default async function AppShell({ children }: AppShellProps) {
  const session = await assertAuthenticated();
  const userId = session.userId;

  const emptyProfile: UserProfile = {
    avatarPath: null,
    balanceCents: 0,
    displayName: null,
    email: "",
    lockedBonusCents: 0,
    lockedInTradesCents: 0,
    role: session.role ?? "user",
    userId: userId ?? "",
    username: session.username ?? "",
  };

  let profile: UserProfile = emptyProfile;
  if (userId) {
    profile = await getProfile(userId).catch(() => emptyProfile);
  } else if (!getOptionalServerEnv()) {
    const { getPreviewProfile } = await import("@/lib/trades/preview-data");
    profile = getPreviewProfile();
  }

  let totalCents = 0;
  let availableCents = 0;
  if (userId) {
    const walletBalances = await getWalletBalances(userId).catch(() => null);
    totalCents = walletBalances?.totalUsdValueCents ?? 0;
    availableCents = walletBalances?.totalFreeUsdValueCents ?? 0;
  } else if (!getOptionalServerEnv()) {
    const { getPreviewWalletBalances } = await import("@/lib/wallet-balances/preview-data");
    const wb = getPreviewWalletBalances();
    totalCents = wb.totalUsdValueCents;
    availableCents = wb.totalFreeUsdValueCents;
  }

  const avatarUrl = profile.avatarPath ? buildMediaUrl("avatars", profile.avatarPath) : null;

  let pendingBonusCents = 0;
  if (userId) {
    const status = await getSignupBonusStatus(userId).catch(() => null);
    if (status?.state === "pending") {
      pendingBonusCents = status.amountCents;
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeaderNav
        availableCents={availableCents}
        balanceCents={totalCents}
        displayName={profile.displayName}
        username={profile.username ?? session.username}
        avatarUrl={avatarUrl}
        pendingBonusCents={pendingBonusCents}
      />
      <div className="flex-1 pb-[calc(env(safe-area-inset-bottom)+72px)] lg:pb-0">{children}</div>
    </div>
  );
}
