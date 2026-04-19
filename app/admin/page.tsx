import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
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
              Protected shell is live. Invite control now has a real route. Trade queue and audit
              views can keep landing here phase by phase.
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

        <div className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-4">
            <div className="rounded-[28px] border border-border bg-background/30 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                Live module
              </p>
              <h2 className="mt-3 font-display text-3xl text-foreground">Invitation gate ops</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-muted">
                Mint root codes, inspect invite status, revoke active codes, and export the latest
                batch from one control surface.
              </p>
              <Link
                href="/admin/invites"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background transition hover:bg-brand"
              >
                Open invites
                <ArrowUpRight size={16} />
              </Link>
            </div>

            <div className="rounded-[28px] border border-border bg-background/30 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                New module
              </p>
              <h2 className="mt-3 font-display text-3xl text-foreground">Token market ops</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-muted">
                Create pairs, tune scale and offset, choose feed source, and disable symbols before
                the live chart layer lands.
              </p>
              <Link
                href="/admin/tokens"
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-background/35 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-brand"
              >
                Open tokens
                <ArrowUpRight size={16} />
              </Link>
            </div>

            <div className="rounded-[28px] border border-border bg-background/30 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                New module
              </p>
              <h2 className="mt-3 font-display text-3xl text-foreground">Period config ops</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-muted">
                Tune durations, ticket size ranges, payout bands, and enabled states before the
                real order ticket reads from the admin-configured period registry.
              </p>
              <Link
                href="/admin/periods"
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-background/35 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-brand"
              >
                Open periods
                <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-border">
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
        </div>
      </section>
    </main>
  );
}
