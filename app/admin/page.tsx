import { signOutPreview } from "@/app/actions/auth";
import { assertAdmin } from "@/lib/auth/assertAdmin";
import { settlementRows } from "@/lib/constants/platform";
import { formatUsdFromCents } from "@/lib/utils/format";

export default async function AdminPage() {
  const session = await assertAdmin();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-[36px] border border-border bg-surface-soft p-8">
        <div className="flex flex-col gap-6 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand">
              Admin control route
            </p>
            <h1 className="font-display text-5xl tracking-tight text-foreground">/admin</h1>
            <p className="max-w-2xl text-base leading-8 text-muted">
              Admin redirect scaffold is live. The real queue, audit views, and user controls can
              now land behind a stable protected route.
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

        <div className="mt-8 overflow-hidden rounded-[28px] border border-border">
          <table className="min-w-full divide-y divide-border text-left">
            <thead className="bg-background/55">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                  Trade
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                  User
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                  Stake
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                  Flag
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {settlementRows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-4 text-sm font-semibold text-foreground">{row.pair}</td>
                  <td className="px-4 py-4 text-sm text-foreground">{row.user}</td>
                  <td className="px-4 py-4 text-sm text-foreground">
                    {formatUsdFromCents(row.stakeCents)}
                  </td>
                  <td className="px-4 py-4 text-sm text-muted">{row.flag}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
