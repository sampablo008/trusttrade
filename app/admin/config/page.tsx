import type { Metadata } from "next";
import GlobalConfigPanel from "@/components/admin/global-config-panel";

export const metadata: Metadata = { title: "Global Config" };

export default function AdminConfigPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
        Global Controls
      </h1>
      <p className="mt-2 text-sm text-muted">
        Platform-wide settings. Changes take effect immediately — no redeploy.
      </p>

      <div className="mt-10">
        <GlobalConfigPanel />
      </div>
    </main>
  );
}
