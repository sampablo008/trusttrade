import type { Metadata } from "next";
import BusinessDashboardPanel from "@/components/admin/business-dashboard";

export const metadata: Metadata = { title: "Business Dashboard" };

export default function AdminDashboardPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
        Business Dashboard
      </h1>
      <p className="mt-2 text-sm text-muted">
        Live exposure, daily P&amp;L, top winners and losers. Refreshes every 15 seconds.
      </p>

      <div className="mt-10">
        <BusinessDashboardPanel />
      </div>
    </main>
  );
}
