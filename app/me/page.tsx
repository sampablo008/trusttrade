import { Metadata } from "next";
import { assertUserApi } from "@/lib/auth/assert-user-api";
import { getProfile } from "@/lib/trades/service";
import ProfileShell from "@/components/profile/ProfileShell";

export const metadata: Metadata = {
  title: "My Profile | TrustPro",
  description: "Manage your TrustPro profile, avatar, and account details.",
};

export default async function MePage() {
  const { userId } = await assertUserApi();
  const profile = await getProfile(userId);

  const avatarUrl = profile.avatarPath
    ? `/api/media/avatars/${profile.avatarPath}`
    : null;

  return <ProfileShell profile={profile} avatarUrl={avatarUrl} />;
}
