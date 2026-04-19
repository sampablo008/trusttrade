import type { Metadata } from "next";
import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import GlobalConfigPanel from "@/components/admin/global-config-panel";

export const metadata: Metadata = { title: "Global Config — Admin" };

export default function AdminConfigPage() {
  return (
    <>
      <AdminPageHeader
        eyebrow="Platform"
        title="Global config"
        description="Trade freeze, expiry policy, bonus wager multiplier, withdrawal minimums, and default referral rates — editable without redeploy."
      />
      <GlobalConfigPanel />
    </>
  );
}
