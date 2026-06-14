import { Metadata } from "next";
import ProfileShell from "@/components/profile/ProfileShell";
import { loadAccountIdentity } from "@/lib/account/profile-lookup";
import { assertUserApi } from "@/lib/auth/assert-user-api";
import { getProfile } from "@/lib/trades/service";
import { getSupportContacts } from "@/lib/admin/config-service";

export const metadata: Metadata = {
  title: "My Profile | TrustTrade",
  description: "Manage your TrustTrade profile, avatar, account, and security.",
};

export default async function MePage() {
  const { userId } = await assertUserApi();
  const [profile, identity, support] = await Promise.all([
    getProfile(userId),
    loadAccountIdentity(userId),
    getSupportContacts(),
  ]);

  const avatarUrl = profile.avatarPath
    ? `/api/media/avatars/${profile.avatarPath}`
    : null;

  return (
    <main className="flex w-full flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-16">
      <ProfileShell
        profile={profile}
        avatarUrl={avatarUrl}
        hasWithdrawalPin={identity.hasWithdrawalPin}
        emailVerified={identity.emailVerified}
        support={support}
      />
    </main>
  );
}
