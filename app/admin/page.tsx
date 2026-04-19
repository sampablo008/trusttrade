import type { Metadata } from "next";
import AdminPageHeader from "@/components/admin/shell/AdminPageHeader";
import OverviewPanel from "@/components/admin/overview/OverviewPanel";

export const metadata: Metadata = { title: "Admin Dashboard" };

export default function AdminOverviewPage() {
  return (
    <>
      <AdminPageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Live platform health — exposure, house P&L, pending queues, and recent admin activity. Refreshes every 15s."
      />
      <OverviewPanel />
    </>
  );
}
