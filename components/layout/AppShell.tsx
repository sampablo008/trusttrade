import "server-only";
import AppHeaderNav from "@/components/layout/AppHeaderNav";
import { assertAuthenticated } from "@/lib/auth/session";
import { getOptionalServerEnv } from "@/lib/env/server";
import { buildMediaUrl } from "@/lib/media/path";
import { getProfile } from "@/lib/trades/service";
import type { UserProfile } from "@/types/trade";

interface AppShellProps {
  children: React.ReactNode;
}

export default async function AppShell({ children }: AppShellProps) {
  const session = await assertAuthenticated();

  let userId: string | null = null;
  if (getOptionalServerEnv()) {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const client = await createSupabaseServerClient();
    try {
      const { data: { user } } = await client.auth.getUser();
      if (user) userId = user.id;
    } catch {
      // no supabase session — cookie login only
    }
  }

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
  const availableCents = Math.max(
    profile.balanceCents - profile.lockedInTradesCents - profile.lockedBonusCents,
    0,
  );

  const avatarUrl = profile.avatarPath ? buildMediaUrl("avatars", profile.avatarPath) : null;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeaderNav
        availableCents={availableCents}
        balanceCents={profile.balanceCents}
        displayName={profile.displayName}
        username={profile.username ?? session.username}
        avatarUrl={avatarUrl}
      />
      <div className="flex-1">{children}</div>
    </div>
  );
}
