import { Metadata } from "next";
import AppShell from "@/components/layout/AppShell";
import ProfileShell from "@/components/profile/ProfileShell";
import { loadAccountIdentity } from "@/lib/account/profile-lookup";
import { assertUserApi } from "@/lib/auth/assert-user-api";
import { getProfile } from "@/lib/trades/service";

export const metadata: Metadata = {
  title: "My Profile | TrustPro",
  description: "Manage your TrustPro profile, avatar, account, and security.",
};

export default async function MePage() {
  const { userId } = await assertUserApi();
  const [profile, identity] = await Promise.all([
    getProfile(userId),
    loadAccountIdentity(userId),
  ]);

  const avatarUrl = profile.avatarPath
    ? `/api/media/avatars/${profile.avatarPath}`
    : null;

  return (
    <AppShell>
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <ProfileShell
          profile={profile}
          avatarUrl={avatarUrl}
          hasWithdrawalPin={identity.hasWithdrawalPin}
          emailVerified={identity.emailVerified}
        />
      </main>
    </AppShell>
  );
}
