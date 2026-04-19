import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { signOutPreview } from "@/app/actions/auth";
import ReferralTreeInspector from "@/components/admin/referral-tree-inspector";
import { assertAdmin } from "@/lib/auth/assertAdmin";
import { listAdminUsers } from "@/lib/admin/users-service";

export const metadata = { title: "Referral Tree Inspector — Admin" };

export default async function AdminReferralTreePage() {
  const session = await assertAdmin();
  const usersData = await listAdminUsers("", 500, 0);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-[36px] border border-border bg-surface-soft p-8">
        <div className="flex flex-col gap-6 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <Link
              href="/admin/referrals"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background/30 px-4 py-2 text-sm font-semibold text-foreground transition hover:border-brand"
            >
              <ArrowLeft size={16} />
              Back to referrals
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand">
                Admin / Referrals
              </p>
              <h1 className="mt-3 font-display text-5xl tracking-tight text-foreground">
                Tree inspector
              </h1>
            </div>
            <p className="max-w-3xl text-base leading-8 text-muted">
              Search any user and see their full upline (who they came through) and downline (who
              they recruited). For dispute resolution and fraud review.
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
          <ReferralTreeInspector users={usersData.items} />
        </div>
      </section>
    </main>
  );
}
