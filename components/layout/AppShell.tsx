import "server-only";
import { Suspense } from "react";
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

/**
 * Static app frame. The nav chrome paints instantly as part of the route's
 * static shell; per-user header data (balance, avatar, bonus) streams in via
 * `<AppHeaderData>` so navigation is never blocked on it.
 */
export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense
        fallback={
          <AppHeaderNav
            availableCents={0}
            balanceCents={0}
            displayName={null}
            username={null}
            avatarUrl={null}
            pendingBonusCents={0}
          />
        }
      >
        <AppHeaderData />
      </Suspense>
      <div className="flex-1 pb-[calc(env(safe-area-inset-bottom)+72px)] lg:pb-0">{children}</div>
    </div>
  );
}

async function AppHeaderData() {
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
    <AppHeaderNav
      availableCents={availableCents}
      balanceCents={totalCents}
      displayName={profile.displayName}
      username={profile.username ?? session.username}
      avatarUrl={avatarUrl}
      pendingBonusCents={pendingBonusCents}
    />
  );
}
