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

            <div className="rounded-[28px] border border-border bg-background/30 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                New module
              </p>
              <h2 className="mt-3 font-display text-3xl text-foreground">Chart price engine</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-muted">
                Freeze tokens, set drift bias, hard-set any price, import CSV replay, or pull live
                historical candles from Binance with one click.
              </p>
              <Link
                href="/admin/candles"
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-background/35 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-brand"
              >
                Open chart control
                <ArrowUpRight size={16} />
              </Link>
            </div>

            <div className="rounded-[28px] border border-border bg-background/30 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                New module
              </p>
              <h2 className="mt-3 font-display text-3xl text-foreground">Deposit wallet ops</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-muted">
                Manage deposit addresses per token and network. Address edits require last-8-char
                confirmation to prevent accidental misroutes.
              </p>
              <Link
                href="/admin/wallets"
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-background/35 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-brand"
              >
                Open wallets
                <ArrowUpRight size={16} />
              </Link>
            </div>

            <div className="rounded-[28px] border border-border bg-background/30 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand">
                Sprint 3 — live
              </p>
              <h2 className="mt-3 font-display text-3xl text-foreground">Settlement queue</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-muted">
                Live decision queue sorted by expiry. Win / Lose / Void per row, or bulk-select
                and settle dozens at once. Keyboard shortcuts W / L / V. Expiring trades pulse red.
              </p>
              <Link
                href="/admin/trades"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background transition hover:bg-brand"
              >
                Open trade queue
                <ArrowUpRight size={16} />
              </Link>
            </div>

            <div className="rounded-[28px] border border-border bg-background/30 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand">
                Sprint 3 — live
              </p>
              <h2 className="mt-3 font-display text-3xl text-foreground">User management</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-muted">
                Search users by email or username, view full balance breakdowns, freeze or unfreeze
                accounts, and apply manual balance adjustments with a required audit note.
              </p>
              <Link
                href="/admin/users"
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-background/35 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-brand"
              >
                Open users
                <ArrowUpRight size={16} />
              </Link>
            </div>

            <div className="rounded-[28px] border border-border bg-background/30 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand">
                Sprint 3 — live
              </p>
              <h2 className="mt-3 font-display text-3xl text-foreground">Audit log</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-muted">
                Immutable record of every admin action — who, when, what, before/after JSON and
                IP address. Filter by action type. Expand any row for the full diff.
              </p>
              <Link
                href="/admin/audit"
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-background/35 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-brand"
              >
                Open audit log
                <ArrowUpRight size={16} />
              </Link>
            </div>

            <div className="rounded-[28px] border border-border bg-background/30 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand">
                Sprint 4 — live
              </p>
              <h2 className="mt-3 font-display text-3xl text-foreground">Deposit queue</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-muted">
                Review user deposit claims. Approve credits balance and fires referral commissions.
                Reject with a reason visible to the user. Lightbox screenshot review.
              </p>
              <Link
                href="/admin/deposits"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background transition hover:bg-brand"
              >
                Open deposits
                <ArrowUpRight size={16} />
              </Link>
            </div>

            <div className="rounded-[28px] border border-border bg-background/30 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand">
                Sprint 4 — live
              </p>
              <h2 className="mt-3 font-display text-3xl text-foreground">Withdrawal queue</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-muted">
                Two-phase payout flow. Review queue → approve or reject. Payout tab → paste tx hash
                with last-8-char address confirmation before marking paid.
              </p>
              <Link
                href="/admin/withdrawals"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background transition hover:bg-brand"
              >
                Open withdrawals
                <ArrowUpRight size={16} />
              </Link>
            </div>

            <div className="rounded-[28px] border border-border bg-background/30 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand">
                Sprint 3.5 — live
              </p>
              <h2 className="mt-3 font-display text-3xl text-foreground">Referrals</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-muted">
                5-level pyramid controls. Commission approval queue, fraud flag review, per-user
                bps overrides, and full upline/downline tree inspection.
              </p>
              <Link
                href="/admin/referrals"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background transition hover:bg-brand"
              >
                Open referrals
                <ArrowUpRight size={16} />
              </Link>
            </div>

            <div className="rounded-[28px] border border-border bg-background/30 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand">
                Sprint 5 — live
              </p>
              <h2 className="mt-3 font-display text-3xl text-foreground">Promo CMS</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-muted">
                Edit landing page hero, trust badges, and feature cards — no redeploy required.
                Toggle slots on/off and update copy instantly.
              </p>
              <Link
                href="/admin/promo"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background transition hover:bg-brand"
              >
                Open promo CMS
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
