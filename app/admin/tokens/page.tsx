import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { signOutPreview } from "@/app/actions/auth";
import TokenControlPanel from "@/components/admin/token-control-panel";
import { assertAdmin } from "@/lib/auth/assertAdmin";
import { listAdminTokens } from "@/lib/markets/admin-service";

export default async function AdminTokensPage() {
  const session = await assertAdmin();
  const tokenData = await listAdminTokens();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-[36px] border border-border bg-surface-soft p-8">
        <div className="flex flex-col gap-6 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background/30 px-4 py-2 text-sm font-semibold text-foreground transition hover:border-brand"
            >
              <ArrowLeft size={16} />
              Back to admin
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand">
                Market control route
              </p>
              <h1 className="mt-3 font-display text-5xl tracking-tight text-foreground">
                /admin/tokens
              </h1>
            </div>
            <p className="max-w-3xl text-base leading-8 text-muted">
              Manage tradable pairs, feed source, scale, offset, volatility, and visibility from a
              single operator panel. Token icons now upload through the storage proxy and stay on
              the same server-only path as the rest of the app.
            </p>
          </div>

          <form action={signOutPreview}>
            <button
              type="submit"
              className="rounded-full border border-border bg-background/35 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-brand"
            >
              Sign out {session.username ? `(${session.username})` : ""}
            </button>
          </form>
        </div>

        <div className="mt-8">
          <TokenControlPanel initialData={tokenData} />
        </div>
      </section>
    </main>
  );
}
