import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { assertAdmin } from "@/lib/auth/assertAdmin";
import { listAdminWithdrawals } from "@/lib/withdrawals/admin-service";
import WithdrawalsQueue from "@/components/admin/withdrawals-queue";

export default async function AdminWithdrawalsPage() {
  await assertAdmin();

  // Load both pending (review queue) and approved (payout queue) at once
  const [pendingResult, approvedResult] = await Promise.all([
    listAdminWithdrawals({ status: "pending", limit: 100, offset: 0 }),
    listAdminWithdrawals({ status: "approved", limit: 100, offset: 0 }),
  ]);

  const allItems = [...pendingResult.items, ...approvedResult.items];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          className="flex items-center gap-2 rounded-full border border-border bg-background/30 px-4 py-2 text-sm font-semibold text-muted transition hover:border-brand hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Admin
        </Link>
        <div className="flex flex-col gap-0.5">
          <h1 className="font-display text-3xl text-foreground">Withdrawal Queue</h1>
          <p className="text-xs text-muted">
            Two-phase flow: review → approve/reject, then pay and paste tx hash.
          </p>
        </div>
      </div>

      <section className="rounded-[28px] border border-border bg-surface-soft p-6 sm:p-8">
        <WithdrawalsQueue initialWithdrawals={allItems} />
      </section>
    </main>
  );
}
